// core/adobe_driver.js - Adobe Express Master Automation Driver (Ultra-Precise & Robust)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AdobeExpressDriver {
  constructor(cdpClient, config = {}) {
    this.cdp = cdpClient;
    this.config = config;
  }

  async ensureComposerOpen(timeoutSec = 15) {
    console.log('🌐 Membuka & memastikan halaman composer siap (postId=new)...');
    await this.cdp.navigate('https://express.adobe.com/schedule?postId=new');
    
    for (let i = 0; i < timeoutSec; i++) {
      await this.cdp.sleep(1000);
      const status = await this.cdp.eval(`(() => {
        const url = window.location.href;
        if (url.includes('auth.services.adobe.com') || url.includes('account.adobe.com') || url.includes('/login') || url.includes('/signin')) {
          return { isLoggedOut: true, url };
        }

        const btn = document.querySelector('#button-as-dropdown-ref') || 
                    document.querySelector('button[aria-haspopup="dialog"]') ||
                    document.querySelector('hz-media-dropzone') ||
                    document.querySelector('input[type="file"]') ||
                    document.querySelector('div[contenteditable="true"]');
        return { isReady: Boolean(btn), isLoggedOut: false, url };
      })()`);

      if (status && status.isLoggedOut) {
        throw new Error(`⚠️ AKUN TER-LOGOUT: Browser teralihkan ke halaman login (${status.url}).`);
      }

      if (status && status.isReady) {
        console.log(`   ✅ Form composer siap (pada detik ke-${i + 1}).`);
        return true;
      }
    }
    console.log('   ⚠️ Timeout menunggu form composer, melanjutkan...');
    return false;
  }

  async selectChannels(targetNames = ['Pptmorph', 'MahirPpt', 'ArifEx2146730', 'NAZWANURULILMI', 'EKA SYARIF MAULANA', 'ARIF-EX21'], fallbackAll = true) {
    console.log(`👥 [1/6] Memilih Channels Target: [${targetNames.join(', ')}]...`);
    
    // Step 1: Open dropdown popover if not open
    await this.cdp.eval(`(() => {
      function queryDeep(predicate, root = document) {
        const results = [];
        function traverse(node) {
          if (!node) return;
          if (node.nodeType === Node.ELEMENT_NODE) {
            try { if (predicate(node)) results.push(node); } catch(e){}
            if (node.shadowRoot) traverse(node.shadowRoot);
          }
          let child = node.firstChild;
          while (child) { traverse(child); child = child.nextSibling; }
        }
        traverse(root);
        return results;
      }

      function findEl(selector, root = document) {
        if (!root) return null;
        let el = root.querySelector(selector);
        if (el) return el;
        let elements = root.querySelectorAll('*');
        for (let e of elements) {
          if (e.shadowRoot) {
            el = findEl(selector, e.shadowRoot);
            if (el) return el;
          }
        }
        return null;
      }

      const btn = findEl('#button-as-dropdown-ref') || queryDeep(el => {
        const txt = (el.textContent || '').trim();
        return (txt.startsWith('Select channels') || txt.startsWith('Multiple channels') || txt.startsWith('Personal calendar')) && el.offsetParent !== null;
      })[0];

      const popover = findEl('sp-popover');
      const isPopOpen = popover && popover.hasAttribute('open');
      if (btn && !isPopOpen) {
        btn.click();
      }
      return { clickedOpen: Boolean(btn && !isPopOpen) };
    })()`);

    // Sleep in Node.js to allow popover render
    await this.cdp.sleep(600);

    // Step 2: Synchronously tick checkboxes and close
    const result = await this.cdp.eval(`((targets, allowFallback) => {
      function queryDeep(predicate, root = document) {
        const results = [];
        function traverse(node) {
          if (!node) return;
          if (node.nodeType === Node.ELEMENT_NODE) {
            try { if (predicate(node)) results.push(node); } catch(e){}
            if (node.shadowRoot) traverse(node.shadowRoot);
          }
          let child = node.firstChild;
          while (child) { traverse(child); child = child.nextSibling; }
        }
        traverse(root);
        return results;
      }

      function findEl(selector, root = document) {
        if (!root) return null;
        let el = root.querySelector(selector);
        if (el) return el;
        let elements = root.querySelectorAll('*');
        for (let e of elements) {
          if (e.shadowRoot) {
            el = findEl(selector, e.shadowRoot);
            if (el) return el;
          }
        }
        return null;
      }

      const checkboxes = queryDeep(el => el.tagName === 'SP-CHECKBOX' || el.getAttribute('role') === 'checkbox');
      let checkedList = [];
      const lowerTargets = targets.map(t => t.toLowerCase());

      for (const cb of checkboxes) {
        const txt = (cb.textContent || '').trim();
        const lowerTxt = txt.toLowerCase();
        const matchesTarget = lowerTargets.some(target => lowerTxt.includes(target));

        if (matchesTarget || (allowFallback && checkboxes.length === 1)) {
          if (!cb.checked) {
            cb.click();
            checkedList.push(txt + ' (checked)');
          } else {
            checkedList.push(txt + ' (already checked)');
          }
        }
      }

      // If no target match found, fallback to checking all
      if (checkedList.length === 0 && allowFallback && checkboxes.length > 0) {
        for (const cb of checkboxes) {
          const txt = (cb.textContent || '').trim();
          if (!cb.checked) {
            cb.click();
            checkedList.push(txt + ' (fallback checked)');
          } else {
            checkedList.push(txt + ' (already checked)');
          }
        }
      }

      // Close dropdown cleanly
      const popoverNow = findEl('sp-popover');
      const btn = findEl('#button-as-dropdown-ref');
      if (popoverNow && popoverNow.hasAttribute('open') && btn) {
        btn.click();
      }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return { success: true, count: checkedList.length, list: checkedList };
    })(${JSON.stringify(targetNames)}, ${fallbackAll})`);

    console.log('   📊 Status Channels:', JSON.stringify(result));
    return result;
  }

  async setFormatReels() {
    console.log('🎬 [2/6] Mengatur format tipe konten ke "Reel / Reels"...');
    const result = await this.cdp.eval(`(() => {
      function queryDeep(predicate, root = document) {
        const results = [];
        function traverse(node) {
          if (!node) return;
          if (node.nodeType === Node.ELEMENT_NODE) {
            try { if (predicate(node)) results.push(node); } catch(e){}
            if (node.shadowRoot) traverse(node.shadowRoot);
          }
          let child = node.firstChild;
          while (child) { traverse(child); child = child.nextSibling; }
        }
        traverse(root);
        return results;
      }

      const options = queryDeep(el => {
        const txt = (el.textContent || '').trim().toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        return (txt === 'reel' || txt === 'reels' || aria === 'reel' || aria === 'reels') && el.offsetParent !== null;
      });

      const clicked = [];
      for (const opt of options) {
        const clickable = opt.closest('sp-radio, sp-tab, button, [role="radio"], [role="tab"], label') || opt;
        if (clickable && !clickable.hasAttribute('checked') && clickable.getAttribute('aria-checked') !== 'true') {
          clickable.click();
          clicked.push((opt.textContent || '').trim());
        } else {
          clicked.push((opt.textContent || '').trim() + ' (already selected)');
        }
      }

      return { found: options.length, clicked };
    })()`);

    console.log('   📊 Format Reels:', JSON.stringify(result));
    return result;
  }

  async uploadVideo(filePath) {
    // 0. Auto-check & ensure video integrity & minimum 4.5s duration for Adobe Express Reels
    let actualFilePath = filePath;
    try {
      const { execSync } = require('child_process');
      const tempDir = path.join(__dirname, '..', 'temp_processed');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      // Check stream error / bitstream corruption
      let isCorrupt = false;
      try {
        execSync(`ffmpeg -v error -xerror -i "${filePath}" -f null -`, { stdio: 'pipe' });
      } catch (err) {
        isCorrupt = true;
      }

      if (isCorrupt) {
        const repairedOut = path.join(tempDir, 'repaired_' + path.basename(filePath));
        console.log(`   🔧 [Auto-Stream Repair] Terdeteksi stream video bermasalah. Memperbaiki bitstream video via FFmpeg...`);
        execSync(`ffmpeg -y -err_detect ignore_err -i "${filePath}" -c:v libx264 -preset ultrafast -c:a aac -movflags +faststart "${repairedOut}"`, { stdio: 'ignore' });
        if (fs.existsSync(repairedOut) && fs.statSync(repairedOut).size > 1000) {
          actualFilePath = repairedOut;
          console.log(`   ✅ Bitstream video berhasil diperbaiki!`);
        }
      }

      const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${actualFilePath}"`, { encoding: 'utf8' }).trim();
      const dur = parseFloat(out);
      if (dur < 4.2) {
        const padDur = Math.max(1.5, (5.0 - dur)).toFixed(2);
        const tempOut = path.join(tempDir, 'pad_' + path.basename(filePath));
        console.log(`   ⚡ [Auto-Duration Fix] Video (${dur.toFixed(2)}s < 4.0s). Menambahkan padding +${padDur}s agar valid Reels...`);
        
        // Check if input has an audio stream
        const audioInfo = execSync(`ffprobe -v error -select_streams a -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${actualFilePath}"`, { encoding: 'utf8' }).trim();
        const hasAudio = audioInfo.length > 0;
        
        if (hasAudio) {
          execSync(`ffmpeg -y -i "${actualFilePath}" -filter_complex "[0:v]setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${padDur}[v];[0:a]asetpts=PTS-STARTPTS,apad=pad_dur=${padDur}[a]" -map "[v]" -map "[a]" -c:v libx264 -preset ultrafast -c:a aac -movflags +faststart "${tempOut}"`, { stdio: 'ignore' });
        } else {
          execSync(`ffmpeg -y -i "${actualFilePath}" -filter_complex "[0:v]setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${padDur}[v];aevalsrc=0:d=${(dur + parseFloat(padDur)).toFixed(2)}[a]" -map "[v]" -map "[a]" -c:v libx264 -preset ultrafast -c:a aac -movflags +faststart "${tempOut}"`, { stdio: 'ignore' });
        }
        
        if (fs.existsSync(tempOut) && fs.statSync(tempOut).size > 1000) {
          actualFilePath = tempOut;
          console.log(`   ✅ Video berhasil dipad menjadi ${(dur + parseFloat(padDur)).toFixed(2)}s (file valid Reels).`);
        }
      }

      // Check video aspect ratio (must be 9:16 = 0.5625 for TikTok/Reels)
      const probeDim = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${actualFilePath}"`, { encoding: 'utf8' }).trim();
      const dimData = JSON.parse(probeDim);
      if (dimData.streams && dimData.streams[0]) {
        const w = dimData.streams[0].width;
        const h = dimData.streams[0].height;
        const ratio = w / h;
        const targetRatio = 9 / 16; // 0.5625

        if (Math.abs(ratio - targetRatio) > 0.03) {
          const out916 = path.join(tempDir, '916_' + path.basename(filePath));
          console.log(`   🎨 [Auto-Aspect Fix] Video (${w}x${h}, ratio ${ratio.toFixed(3)} != 9:16). Menyesuaikan ke 1080x1920 (Blurred 9:16 Container)...`);
          execSync(`ffmpeg -y -i "${actualFilePath}" -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]" -map "[v]" -map 0:a? -c:v libx264 -preset ultrafast -c:a aac -movflags +faststart "${out916}"`, { stdio: 'ignore' });
          if (fs.existsSync(out916) && fs.statSync(out916).size > 1000) {
            actualFilePath = out916;
            console.log(`   ✅ Video berhasil diubah ke format 1080x1920 (9:16 Reels standard)!`);
          }
        }
      }
    } catch (e) {
      console.warn('   ⚠️ Gagal auto-fix duration/aspect/stream:', e.message);
    }

    console.log(`📁 [3/6] Mengunggah file Video: "${path.basename(actualFilePath)}"...`);
    
    if (!fs.existsSync(actualFilePath)) {
      throw new Error(`File video tidak ditemukan di: ${actualFilePath}`);
    }

    // 1. Create or Find hidden file input
    await this.cdp.eval(`(() => {
      let input = document.getElementById('automation-video-injector');
      if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'automation-video-injector';
        input.style.display = 'none';
        document.body.appendChild(input);
      }
    })()`);

    // 2. Lookup input nodeId and set file via CDP
    const doc = await this.cdp.send('DOM.getDocument', { depth: -1 });
    function findNodeById(node, targetId) {
      if (!node) return null;
      if (node.attributes) {
        for (let i = 0; i < node.attributes.length; i += 2) {
          if (node.attributes[i] === 'id' && node.attributes[i+1] === targetId) return node;
        }
      }
      if (node.children) {
        for (const c of node.children) {
          const f = findNodeById(c, targetId);
          if (f) return f;
        }
      }
      if (node.shadowRoots) {
        for (const s of node.shadowRoots) {
          const f = findNodeById(s, targetId);
          if (f) return f;
        }
      }
      return null;
    }

    const injectorNode = findNodeById(doc.root, 'automation-video-injector');
    if (injectorNode) {
      await this.cdp.send('DOM.setFileInputFiles', {
        nodeId: injectorNode.nodeId,
        files: [actualFilePath]
      });

      // 3. Dispatch official hz-media-dropzone-new-files custom event
      await this.cdp.eval(`(() => {
        function queryDeep(predicate, root = document) {
          const results = [];
          function traverse(node) {
            if (!node) return;
            if (node.nodeType === Node.ELEMENT_NODE) {
              try { if (predicate(node)) results.push(node); } catch(e){}
              if (node.shadowRoot) traverse(node.shadowRoot);
            }
            let child = node.firstChild;
            while (child) { traverse(child); child = child.nextSibling; }
          }
          traverse(root);
          return results;
        }

        const input = document.getElementById('automation-video-injector');
        const hz = queryDeep(el => el.tagName === 'HZ-MEDIA-DROPZONE')[0];
        if (input && input.files && input.files[0] && hz) {
          hz.dispatchEvent(new CustomEvent('hz-media-dropzone-new-files', {
            detail: { files: [input.files[0]] },
            bubbles: true,
            composed: true
          }));
        }
      })()`);
      console.log('   ✅ Event injeksi media dipancarkan ke dropzone...');
    }

    // 4. Wait for media picker confirm button if shown and click it
    for (let attempt = 1; attempt <= 15; attempt++) {
      await this.cdp.sleep(1000);
      const confirmRes = await this.cdp.eval(`(() => {
        function queryDeep(predicate, root = document) {
          const results = [];
          function traverse(node) {
            if (!node) return;
            if (node.nodeType === Node.ELEMENT_NODE) {
              try { if (predicate(node)) results.push(node); } catch(e){}
              if (node.shadowRoot) traverse(node.shadowRoot);
            }
            let child = node.firstChild;
            while (child) { traverse(child); child = child.nextSibling; }
          }
          traverse(root);
          return results;
        }

        const confirmBtn = queryDeep(el => el.getAttribute('data-testid') === 'confirm-button' || ((el.tagName === 'SP-BUTTON' || el.tagName === 'BUTTON') && (el.textContent||'').trim() === 'Upload'))[0];
        if (confirmBtn && confirmBtn.offsetParent !== null && !confirmBtn.disabled && !confirmBtn.hasAttribute('disabled')) {
          confirmBtn.click();
          return { clicked: true, text: confirmBtn.textContent.trim() };
        }
        return { clicked: false };
      })()`);

      if (confirmRes && confirmRes.clicked) {
        console.log(`   ✅ Media picker dikonfirmasi (Upload clicked pada attempt ${attempt})!`);
        break;
      }
    }

    return true;
  }

  async fillCaption(captionText) {
    console.log(`✍️ [4/6] Mengisi Caption & Hashtag (${captionText.length} karakter)...`);
    const result = await this.cdp.eval(`((caption) => {
      function queryDeep(predicate, root = document) {
        const results = [];
        function traverse(node) {
          if (!node) return;
          if (node.nodeType === Node.ELEMENT_NODE) {
            try { if (predicate(node)) results.push(node); } catch(e){}
            if (node.shadowRoot) traverse(node.shadowRoot);
          }
          let child = node.firstChild;
          while (child) { traverse(child); child = child.nextSibling; }
        }
        traverse(root);
        return results;
      }

      function findEl(selector, root = document) {
        if (!root) return null;
        let el = root.querySelector(selector);
        if (el) return el;
        let elements = root.querySelectorAll('*');
        for (let e of elements) {
          if (e.shadowRoot) {
            el = findEl(selector, e.shadowRoot);
            if (el) return el;
          }
        }
        return null;
      }

      const editor = findEl('[contenteditable="true"]') || queryDeep(el => el.contentEditable === 'true' || el.getAttribute('contenteditable') === 'true')[0];

      if (editor) {
        editor.focus();
        editor.innerHTML = '';
        
        const ok = document.execCommand('insertText', false, caption);
        if (!ok || editor.innerText.trim() !== caption.trim()) {
          editor.innerText = caption;
        }

        editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        return { success: true, editorTag: editor.tagName, length: editor.innerText.length };
      }

      const textarea = findEl('textarea') || document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
        textarea.value = caption;
        textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        return { success: true, editorTag: 'TEXTAREA', length: textarea.value.length };
      }

      return { success: false, reason: 'Caption editor not found' };
    })(${JSON.stringify(captionText)})`);

    console.log('   📊 Status Caption:', JSON.stringify(result));
    return result;
  }

  async fillInstagramFirstComment(commentText) {
    console.log(`💬 [4.1/6] Mengisi Instagram First Comment (${commentText.length} karakter)...`);
    const result = await this.cdp.eval(`((comment) => {
      function queryDeep(predicate, root = document) {
        const results = [];
        function traverse(node) {
          if (!node) return;
          if (node.nodeType === Node.ELEMENT_NODE) {
            try { if (predicate(node)) results.push(node); } catch(e){}
            if (node.shadowRoot) traverse(node.shadowRoot);
          }
          let child = node.firstChild;
          while (child) { traverse(child); child = child.nextSibling; }
        }
        traverse(root);
        return results;
      }

      // Look for First comment editor
      const editors = queryDeep(el => {
        const ph = (el.getAttribute('placeholder') || '').toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        return (el.contentEditable === 'true' || el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') && 
               (ph.includes('first comment') || ph.includes('keep your caption') || aria.includes('first comment'));
      });

      let targetEditor = editors[0];
      if (!targetEditor) {
        // Fallback: search within container with "Options for Instagram"
        const igSections = queryDeep(el => (el.textContent || '').includes('Options for Instagram') && (el.textContent || '').includes('First comment'));
        if (igSections.length > 0) {
          const innermost = igSections[igSections.length - 1];
          targetEditor = queryDeep(el => el.contentEditable === 'true' || el.tagName === 'TEXTAREA' || el.tagName === 'INPUT', innermost)[0];
        }
      }

      if (targetEditor) {
        targetEditor.focus();
        if (targetEditor.contentEditable === 'true') {
          targetEditor.innerHTML = '';
          const ok = document.execCommand('insertText', false, comment);
          if (!ok || targetEditor.innerText.trim() !== comment.trim()) {
            targetEditor.innerText = comment;
          }
        } else {
          targetEditor.value = comment;
        }
        targetEditor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        targetEditor.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        return { success: true, tag: targetEditor.tagName, textLength: comment.length };
      }

      return { success: false, reason: 'Instagram first comment editor not found' };
    })(${JSON.stringify(commentText)})`);

    console.log('   📊 Status Instagram First Comment:', JSON.stringify(result));
    return result;
  }

  async fillPinterestOptions({ board = 'PPT MORPH', section = '', pinTitle = '', destinationWebsite = 'https://clicky.id/arifex21' } = {}) {
    console.log(`📌 [4.2/6] Mengisi Pinterest Options (Board: "${board}", Web: "${destinationWebsite}")...`);
    
    const result = await this.cdp.eval(`((boardName, title, url) => {
      function queryDeep(predicate, root = document) {
        const results = [];
        function traverse(node) {
          if (!node) return;
          if (node.nodeType === Node.ELEMENT_NODE) {
            try { if (predicate(node)) results.push(node); } catch(e){}
            if (node.shadowRoot) traverse(node.shadowRoot);
          }
          let child = node.firstChild;
          while (child) { traverse(child); child = child.nextSibling; }
        }
        traverse(root);
        return results;
      }

      const actions = {};

      // 1. Select Pinterest Board via SP-PICKER and SP-MENU-ITEM
      if (boardName) {
        const asyncPickers = queryDeep(el => el.tagName === 'HZ-COMPOSER-ASYNC-PICKER' || (el.parentElement && (el.parentElement.textContent||'').includes('Board *')));
        const picker = queryDeep(el => el.tagName === 'SP-PICKER', asyncPickers[0] || document)[0] || queryDeep(el => el.tagName === 'SP-PICKER')[0];
        const targetItem = queryDeep(el => el.tagName === 'SP-MENU-ITEM' && (el.textContent||'').trim().toLowerCase() === boardName.toLowerCase())[0];

        if (picker && targetItem) {
          const val = targetItem.value || targetItem.getAttribute('value') || targetItem.textContent.trim();
          picker.value = val;
          targetItem.click();
          picker.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          picker.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          actions.boardSelected = boardName;
        } else if (picker) {
          const items = queryDeep(el => el.tagName === 'SP-MENU-ITEM');
          const matched = items.find(el => (el.textContent||'').toLowerCase().includes(boardName.toLowerCase()));
          if (matched) {
            const val = matched.value || matched.getAttribute('value') || matched.textContent.trim();
            picker.value = val;
            matched.click();
            picker.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
            actions.boardSelected = matched.textContent.trim();
          }
        }
      }

      // 2. Fill Pin Title
      if (title) {
        const titleContainers = queryDeep(el => (el.textContent || '').includes('Pin title') || (el.getAttribute('placeholder') || '').toLowerCase().includes('discovery of your pin'));
        let titleInp = queryDeep(el => (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.contentEditable === 'true' || el.getAttribute('role') === 'textbox') && 
          ((el.getAttribute('placeholder') || '').toLowerCase().includes('discovery of your pin') || (el.getAttribute('placeholder') || '').toLowerCase().includes('title') || el.getAttribute('data-lexical-editor') === 'true'))[0];
        
        if (!titleInp && titleContainers.length > 0) {
          titleInp = queryDeep(el => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.contentEditable === 'true' || el.getAttribute('role') === 'textbox', titleContainers[0])[0];
        }

        if (titleInp) {
          titleInp.focus();
          if (titleInp.contentEditable === 'true' || titleInp.getAttribute('role') === 'textbox') {
            titleInp.innerHTML = '';
            document.execCommand('insertText', false, title);
          } else {
            titleInp.value = title;
          }
          titleInp.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          titleInp.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          actions.pinTitle = title;
        }
      }

      // 3. Fill Destination Website
      if (url) {
        const urlInp = queryDeep(el => (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && 
          ((el.getAttribute('placeholder') || '').toLowerCase().includes('link your pin') || (el.getAttribute('placeholder') || '').toLowerCase().includes('website')))[0];
        if (urlInp) {
          urlInp.focus();
          urlInp.value = url;
          urlInp.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          urlInp.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          actions.destinationWebsite = url;
        }
      }

      return { success: true, actions };
    })(${JSON.stringify(board)}, ${JSON.stringify(pinTitle)}, ${JSON.stringify(destinationWebsite)})`);

    console.log('   📊 Status Pinterest Options:', JSON.stringify(result));
    return result;
  }

  async setPublishModeAndSchedule(mode = 'schedule', scheduledIsoDate = null) {
    console.log(`⏰ [5/6] Mengatur Mode Publikasi: [${mode.toUpperCase()}]${scheduledIsoDate ? ` (Jadwal: ${scheduledIsoDate})` : ''}...`);
    const expr = '(' + function(targetMode, targetDateStr) {
      function queryDeep(predicate, root = document) {
        const results = [];
        function traverse(node) {
          if (!node) return;
          if (node.nodeType === Node.ELEMENT_NODE) {
            try { if (predicate(node)) results.push(node); } catch(e){}
            if (node.shadowRoot) traverse(node.shadowRoot);
          }
          let child = node.firstChild;
          while (child) { traverse(child); child = child.nextSibling; }
        }
        traverse(root);
        return results;
      }

      let modeSelected = null;

      if (targetMode === 'publish_now' || targetMode === 'publish') {
        const pubRadio = queryDeep(el => {
          const txt = (el.textContent || '').trim().toLowerCase();
          return (el.tagName === 'SP-RADIO' || el.getAttribute('role') === 'radio') && txt.includes('publish now');
        })[0];
        if (pubRadio) {
          pubRadio.click();
          modeSelected = 'Publish now';
        }
      } else if (targetMode === 'draft') {
        const draftBox = queryDeep(el => {
          const txt = (el.textContent || '').trim().toLowerCase();
          return (el.tagName === 'SP-CHECKBOX' || el.tagName === 'INPUT') && txt.includes('draft');
        })[0];
        if (draftBox && !draftBox.checked) {
          draftBox.click();
          modeSelected = 'Set as draft';
        }
      } else {
        // Mode Schedule
        const schedRadio = queryDeep(el => {
          const txt = (el.textContent || '').trim().toLowerCase();
          return (el.tagName === 'SP-RADIO' || el.getAttribute('role') === 'radio') && txt === 'schedule';
        })[0];
        if (schedRadio) {
          schedRadio.click();
          modeSelected = 'Schedule';
        }

        // Set Datetime if specified
        if (targetDateStr && typeof targetDateStr === 'string' && targetDateStr.includes('T')) {
          try {
            const parts = targetDateStr.split('T');
            const dPart = parts[0];
            const tPart = parts[1] || '09:00';
            const [year, month, day] = dPart.split('-');
            const [hourStr, minStr] = tPart.split(':');
            const h = parseInt(hourStr || '9', 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 === 0 ? 12 : h % 12;
            const pad = n => String(n).padStart(2, '0');
            const formatted12h = pad(month) + '/' + pad(day) + '/' + year + ' ' + pad(h12) + ':' + pad(minStr) + ' ' + ampm;

            const allInputs = queryDeep(el => el.tagName === 'INPUT' || el.tagName === 'SP-TEXTFIELD');
            const dtInputs = allInputs.filter(el => {
              const val = el.value || '';
              const aria = (el.getAttribute('aria-label') || '').toLowerCase();
              const ph = (el.getAttribute('placeholder') || '').toLowerCase();
              return el.type === 'datetime-local' || aria.includes('date') || aria.includes('schedule') || aria.includes('time') || ph.includes('date') || /\d{2}\/\d{2}\/\d{4}/.test(val);
            });

            for (const inp of dtInputs) {
              inp.focus();
              const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              if (inp.type === 'datetime-local') {
                if (nativeSetter) nativeSetter.call(inp, targetDateStr);
                else inp.value = targetDateStr;
              } else {
                if (nativeSetter) nativeSetter.call(inp, formatted12h);
                else inp.value = formatted12h;
              }
              inp.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
              inp.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
            }
          } catch(e) {}
        }
      }

      return { modeSelected, dateApplied: targetDateStr };
    }.toString() + ')(' + JSON.stringify(mode) + ', ' + JSON.stringify(scheduledIsoDate) + ')';

    const result = await this.cdp.eval(expr);
    console.log('   📊 Status Mode:', JSON.stringify(result));
    return result;
  }

  async waitForVideoProcessing(maxWaitSec = 60) {
    console.log(`⏳ Menunggu Adobe Express memproses video & mengaktifkan tombol Submit (Maks: ${maxWaitSec}s)...`);
    const startTime = Date.now();
    
    while ((Date.now() - startTime) < maxWaitSec * 1000) {
      await this.cdp.sleep(2500);
      const elapsedSec = Math.round((Date.now() - startTime) / 1000);
      
      const isReady = await this.cdp.eval(`(() => {
        function queryDeep(predicate, root = document) {
          const results = [];
          function traverse(node) {
            if (!node) return;
            if (node.nodeType === Node.ELEMENT_NODE) {
              try { if (predicate(node)) results.push(node); } catch(e){}
              if (node.shadowRoot) traverse(node.shadowRoot);
            }
            let child = node.firstChild;
            while (child) { traverse(child); child = child.nextSibling; }
          }
          traverse(root);
          return results;
        }

        const btn = queryDeep(el => (el.tagName === 'SP-BUTTON' || el.tagName === 'BUTTON') && ((el.textContent || '').trim() === 'Schedule' || (el.textContent || '').trim() === 'Publish now'))[0];
        return Boolean(btn && !btn.disabled && !btn.hasAttribute('disabled'));
      })()`);

      if (isReady) {
        console.log(`   ✅ Video selesai diproses dan tombol Submit AKTIF (pada detik ke-${elapsedSec})!`);
        return true;
      }
    }
    console.log('   ⚠️ Waktu tunggu pemrosesan video selesai.');
    return false;
  }

  async getComposerSummary() {
    return await this.cdp.eval(`(() => {
      function queryDeep(predicate, root = document) {
        const results = [];
        function traverse(node) {
          if (!node) return;
          if (node.nodeType === Node.ELEMENT_NODE) {
            try { if (predicate(node)) results.push(node); } catch(e){}
            if (node.shadowRoot) traverse(node.shadowRoot);
          }
          let child = node.firstChild;
          while (child) { traverse(child); child = child.nextSibling; }
        }
        traverse(root);
        return results;
      }

      const channels = queryDeep(el => el.tagName === 'SP-CHECKBOX' && el.checked).map(c => c.textContent.trim());
      const editor = queryDeep(el => el.contentEditable === 'true' || el.getAttribute('contenteditable') === 'true')[0] || document.querySelector('textarea');
      const dtInput = queryDeep(el => el.tagName === 'INPUT' && (el.type === 'datetime-local' || el.getAttribute('aria-label') === 'Scheduled Date and Time'))[0];
      const submitBtn = queryDeep(el => (el.tagName === 'SP-BUTTON' || el.tagName === 'BUTTON') && (
        (el.textContent || '').trim() === 'Schedule' || (el.textContent || '').trim() === 'Publish now' || (el.textContent || '').trim() === 'Set as draft'
      ))[0];

      return {
        channelsSelected: channels,
        captionLength: editor ? (editor.innerText || editor.value || '').length : 0,
        captionPreview: editor ? (editor.innerText || editor.value || '').substring(0, 70) + '...' : 'None',
        scheduledDateTime: dtInput ? dtInput.value : 'N/A',
        submitButton: submitBtn ? {
          text: (submitBtn.textContent || '').trim(),
          disabled: submitBtn.disabled || submitBtn.hasAttribute('disabled')
        } : null
      };
    })()`);
  }

  async submit(mode = 'schedule') {
    console.log(`🚀 [6/6] Menjalankan Submit Post (Mode: ${mode})...`);
    const result = await this.cdp.eval(`((targetMode) => {
      function queryDeep(predicate, root = document) {
        const results = [];
        function traverse(node) {
          if (!node) return;
          if (node.nodeType === Node.ELEMENT_NODE) {
            try { if (predicate(node)) results.push(node); } catch(e){}
            if (node.shadowRoot) traverse(node.shadowRoot);
          }
          let child = node.firstChild;
          while (child) { traverse(child); child = child.nextSibling; }
        }
        traverse(root);
        return results;
      }

      const buttons = queryDeep(el => {
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'sp-button' || tag === 'button') {
          const txt = (el.textContent || '').trim().toLowerCase();
          const aria = (el.getAttribute('aria-label') || '').toLowerCase();
          if (targetMode === 'publish_now' || targetMode === 'publish') {
            return txt === 'publish now' || aria === 'publish now' || txt.includes('publish now');
          } else if (targetMode === 'draft') {
            return txt.includes('draft') || aria.includes('draft');
          } else {
            return (txt === 'schedule' || aria === 'schedule') && !txt.includes('re-schedule');
          }
        }
        return false;
      });

      if (buttons.length > 0) {
        const btn = buttons[buttons.length - 1];
        if (!btn.disabled && !btn.hasAttribute('disabled')) {
          btn.click();
          return { success: true, buttonClicked: (btn.textContent || '').trim() };
        }
        return { success: false, reason: 'Tombol submit masih disabled (Form belum lengkap / video masih diproses)' };
      }

      return { success: false, reason: 'Submit button not found for mode: ' + targetMode };
    })(${JSON.stringify(mode)})`);

    console.log('   📊 Status Submit:', JSON.stringify(result));
    return result;
  }
}

module.exports = AdobeExpressDriver;
