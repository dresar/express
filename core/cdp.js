// core/cdp.js - Chrome DevTools Protocol Client (Native Node.js 22+ WebSocket)
const http = require('http');
const path = require('path');
const fs = require('fs');

class CDPClient {
  constructor(options = {}) {
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 9222;
    this.wsUrl = options.wsUrl || null;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
  }

  static async getActivePages(host = '127.0.0.1', port = 9222, maxAttempts = 5) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const list = await new Promise((resolve, reject) => {
          const req = http.get(`http://${host}:${port}/json/list`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(new Error(`Gagal parse JSON dari Chrome CDP: ${e.message}`));
              }
            });
          });
          req.on('error', (err) => reject(err));
          req.setTimeout(3000, () => {
            req.destroy();
            reject(new Error('Timeout menghubungi Chrome CDP'));
          });
        });
        return list;
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    throw new Error(`Tidak dapat terhubung ke Chrome Remote Debugging di ${host}:${port}. Pastikan Chrome sudah aktif. Detail: ${lastError ? lastError.message : 'Unknown'}`);
  }

  static async findTargetTab(host = '127.0.0.1', port = 9222, urlFilter = 'express.adobe.com') {
    const list = await CDPClient.getActivePages(host, port);
    let page = list.find(p => p.type === 'page' && p.url && p.url.includes(urlFilter));
    if (!page) {
      page = await new Promise((resolve) => {
        const req = http.request({
          hostname: host,
          port: port,
          path: `/json/new?https://${urlFilter}/schedule?postId=new`,
          method: 'PUT'
        }, res => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            try { resolve(JSON.parse(d)); } catch(e){ resolve(null); }
          });
        });
        req.on('error', () => resolve(null));
        req.end();
      });
    }
    return page || list.find(p => p.type === 'page');
  }

  async connect(targetWsUrl = null) {
    const wsUrl = targetWsUrl || this.wsUrl;
    if (!wsUrl) {
      const target = await CDPClient.findTargetTab(this.host, this.port);
      if (!target || !target.webSocketDebuggerUrl) {
        throw new Error('Tidak ditemukan tab Adobe Express aktif di Chrome Remote Debugging.');
      }
      this.wsUrl = target.webSocketDebuggerUrl;
      console.log(`🔌 Terhubung ke Tab Chrome: "${target.title}"`);
    } else {
      this.wsUrl = wsUrl;
    }

    return new Promise((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout to ' + this.wsUrl));
      }, 5000);

      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => {
        clearTimeout(connectTimeout);
        resolve(this);
      };
      this.ws.onerror = (err) => {
        clearTimeout(connectTimeout);
        reject(err);
      };
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.callbacks.has(msg.id)) {
            const cb = this.callbacks.get(msg.id);
            this.callbacks.delete(msg.id);
            if (msg.error) {
              cb.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              cb.resolve(msg.result);
            }
          }
        } catch (e) {}
      };
    });
  }

  async reconnect() {
    try {
      if (this.ws) {
        try { this.ws.close(); } catch(e){}
      }
      this.callbacks.clear();
      this.wsUrl = null;
      await this.connect();
      this.enableDomains().catch(() => {});
      console.log('🔄 [CDP Client] Berhasil re-koneksi otomatis ke tab Chrome!');
      return true;
    } catch (e) {
      console.warn('⚠️ Re-koneksi CDP gagal:', e.message);
      return false;
    }
  }

  async send(method, params = {}, timeoutMs = 20000) {
    if (!this.ws || this.ws.readyState !== 1) {
      console.log('⚠️ WebSocket terputus, melakukan reconnect...');
      const ok = await this.reconnect();
      if (!ok || !this.ws || this.ws.readyState !== 1) {
        throw new Error(`Gagal mengirim [${method}]: WebSocket tidak aktif.`);
      }
    }

    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          const errMsg = `Timeout CDP [${method}] setelah ${timeoutMs}ms`;
          reject(new Error(errMsg));
        }
      }, timeoutMs);

      this.callbacks.set(id, {
        resolve: (val) => { clearTimeout(timer); resolve(val); },
        reject: (err) => { clearTimeout(timer); reject(err); }
      });

      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        this.callbacks.delete(id);
        reject(err);
      }
    });
  }

  async enableDomains() {
    try {
      await Promise.allSettled([
        this.send('Runtime.enable', {}, 4000),
        this.send('DOM.enable', {}, 4000),
        this.send('Page.enable', {}, 4000)
      ]);
    } catch (e) {}
  }

  async eval(expression, timeoutMs = 20000) {
    try {
      const res = await this.send('Runtime.evaluate', {
        expression: expression,
        returnByValue: true,
        awaitPromise: true
      }, timeoutMs);
      return res && res.result ? res.result.value : null;
    } catch (e) {
      console.warn('eval error:', e.message);
      return null;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async humanDelay(minMs = 1000, maxMs = 2500) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async navigate(url) {
    try {
      await this.send('Page.navigate', { url }, 8000);
    } catch (e) {
      await this.eval(`window.location.href = ${JSON.stringify(url)}`);
    }
  }

  async clearMemoryAndCache() {
    try {
      await Promise.allSettled([
        this.send('HeapProfiler.collectGarbage', {}, 4000),
        this.send('Network.clearBrowserCache', {}, 4000),
        this.send('Storage.clearDataForOrigin', {
          origin: 'https://express.adobe.com',
          storageTypes: 'cache_storage'
        }, 4000)
      ]);
    } catch (e) {}
  }

  async captureScreenshot(name = 'screenshot', outputDir = null) {
    try {
      const res = await this.send('Page.captureScreenshot', { format: 'png' });
      if (res && res.data) {
        const outPath = outputDir ? path.join(outputDir, `${name}.png`) : path.join(process.cwd(), `${name}.png`);
        fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
        return outPath;
      }
    } catch (e) {
      console.warn('Gagal ambil screenshot:', e.message);
    }
    return null;
  }

  async injectFiles(filePathList) {
    const paths = Array.isArray(filePathList) ? filePathList : [filePathList];

    // Method 1: Target specific file input by querySelector
    try {
      const doc = await this.send('DOM.getDocument', { depth: 0 });
      if (doc && doc.root) {
        // Query for #file-input or input[type="file"]
        const queryTargets = ['#file-input', 'input[type="file"][accept*="video"]', 'input[type="file"]'];
        for (const selector of queryTargets) {
          try {
            const queryRes = await this.send('DOM.querySelector', {
              nodeId: doc.root.nodeId,
              selector: selector
            });
            if (queryRes && queryRes.nodeId && queryRes.nodeId > 0) {
              await this.send('DOM.setFileInputFiles', {
                nodeId: queryRes.nodeId,
                files: paths
              });
              return true;
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    // Method 2: Recursive DOM document lookup
    try {
      const docFull = await this.send('DOM.getDocument', { depth: -1, pierce: true });
      function findFileNodeIds(node) {
        let result = [];
        if (!node) return result;
        if (node.nodeName === 'INPUT' && node.attributes) {
          for (let i = 0; i < node.attributes.length; i += 2) {
            if (node.attributes[i] === 'type' && node.attributes[i+1] === 'file') {
              result.push(node.nodeId);
            }
          }
        }
        if (node.children) {
          for (const c of node.children) result = result.concat(findFileNodeIds(c));
        }
        if (node.shadowRoots) {
          for (const sr of node.shadowRoots) result = result.concat(findFileNodeIds(sr));
        }
        return result;
      }

      const fileNodeIds = findFileNodeIds(docFull.root);
      if (fileNodeIds.length > 0) {
        for (const nid of fileNodeIds) {
          try {
            await this.send('DOM.setFileInputFiles', {
              nodeId: nid,
              files: paths
            });
          } catch (e) {}
        }
        return true;
      }
    } catch (e) {}

    return false;
  }

  async close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  }
}

module.exports = CDPClient;
