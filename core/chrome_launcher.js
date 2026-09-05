// core/chrome_launcher.js - Persistent Full-Access Chrome Launcher
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\NCN0C\\.chrome-automation';
const PORT = 9222;

function cleanLocks(dir) {
  try {
    if (fs.existsSync(dir)) {
      const singletonLock = path.join(dir, 'SingletonLock');
      if (fs.existsSync(singletonLock)) {
        try { fs.unlinkSync(singletonLock); } catch (e) {}
      }
      const singletonCookie = path.join(dir, 'SingletonCookie');
      if (fs.existsSync(singletonCookie)) {
        try { fs.unlinkSync(singletonCookie); } catch (e) {}
      }
      const singletonSocket = path.join(dir, 'SingletonSocket');
      if (fs.existsSync(singletonSocket)) {
        try { fs.unlinkSync(singletonSocket); } catch (e) {}
      }
    }
  } catch (e) {}
}

async function isPortListening(port = 9222) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function launchPersistentChrome() {
  const isRunning = await isPortListening(PORT);
  if (isRunning) {
    console.log(`✅ Chrome Remote Debugging sudah aktif dan siap di port ${PORT}!`);
    return true;
  }

  console.log('🧹 Membersihkan lock files Chrome...');
  cleanLocks(USER_DATA_DIR);

  console.log('🚀 Menjalankan Google Chrome dengan Akses Penuh & Anti-Throttling...');
  const args = [
    `--remote-debugging-port=${PORT}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=CalculateNativeWinOcclusion',
    '--disable-component-update',
    '--disable-ipc-flooding-protection',
    '--password-store=basic',
    'https://express.adobe.com/schedule?postId=new'
  ];

  const subprocess = spawn(CHROME_PATH, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  });

  subprocess.unref();
  console.log(`📌 Chrome berjalan di background (PID: ${subprocess.pid})`);

  // Wait up to 10 seconds for port 9222 to become ready
  for (let i = 1; i <= 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const ready = await isPortListening(PORT);
    if (ready) {
      console.log(`🎯 Chrome CDP Port ${PORT} berhasil aktif dan siap digunakan!`);
      return true;
    }
  }

  console.warn('⚠️ Port 9222 belum merespons setelah 10 detik.');
  return false;
}

if (require.main === module) {
  launchPersistentChrome().then((ok) => {
    process.exit(ok ? 0 : 1);
  });
}

module.exports = { launchPersistentChrome, isPortListening };
