// uploader.js - Master Production Uploader & Schedule Suite (CDP Engine v4.3.0)
const path = require('path');
const fs = require('fs');
const CDPClient = require('./core/cdp');
const AdobeExpressDriver = require('./core/adobe_driver');
const ProductionScheduler = require('./core/scheduler');
const GeminiPool = require('./core/gemini');

const { launchPersistentChrome } = require('./core/chrome_launcher');

// Load Config
const configPath = path.join(__dirname, 'config', 'config.json');
let config = {};
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  config = {
    cdp: { host: '127.0.0.1', port: 9222 },
    targets: { channels: ['Pptmorph', 'MahirPpt', 'ArifEx2146730', 'NAZWANURULILMI', 'EKA SYARIF MAULANA', 'ARIF-EX21'], fallback_all_personal_channels: true },
    production: {
      folder: 'C:\\Users\\NCN0C\\Music\\editor_berkelas\\1\\outputs',
      daily_quota: 5,
      time_slots: ['09:00', '12:00', '15:00', '18:00', '21:00'],
      start_date: '2026-08-16',
      cta_text: '👉 Cek link di bio untuk download template & info selengkapnya! 🔗✨'
    },
    automation: { auto_format_reels: true, wait_for_video_render_sec: 45, save_screenshots: true }
  };
}

// Parse CLI Arguments
const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}
const hasFlag = flag => args.includes(flag);

const isProduction = hasFlag('--production') || (!getArg('--file') && !getArg('--folder'));
const fileArg = getArg('--file');
const folderArg = getArg('--folder') || (isProduction ? config.production.folder : null);
const modeArg = (getArg('--mode') || config.automation.default_mode || 'schedule').toLowerCase();
const autoSubmit = hasFlag('--submit');
const useAi = hasFlag('--ai');
const isDryRun = hasFlag('--dry-run');
const lockFilePath = path.join(__dirname, 'config', 'runner.lock');

function acquireLock() {
  if (fs.existsSync(lockFilePath)) {
    try {
      const pid = parseInt(fs.readFileSync(lockFilePath, 'utf8').trim());
      if (pid && !isNaN(pid) && pid !== process.pid) {
        try {
          process.kill(pid, 0);
          console.warn(`⚠️ [Single-Instance Lock] Runner proses sudah AKTIF berjalan (PID: ${pid}). Mencegah duplikasi eksekusi!`);
          process.exit(0);
        } catch (e) {
          // Stale lock
        }
      }
    } catch (e) {}
  }
  fs.writeFileSync(lockFilePath, String(process.pid), 'utf8');
}

function releaseLock() {
  try {
    if (fs.existsSync(lockFilePath)) fs.unlinkSync(lockFilePath);
  } catch (e) {}
}

process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(0); });
process.on('SIGTERM', () => { releaseLock(); process.exit(0); });

async function run() {
  acquireLock();
  console.log('================================================================');
  console.log('🚀 ADOBE EXPRESS MASTER PRODUCTION UPLOADER & SCHEDULER (CDP)');
  console.log('================================================================');
  console.log(`📡 Remote Debug : ${config.cdp.host}:${config.cdp.port}`);
  console.log(`🎯 Target Akun  : [${config.targets.channels.join(', ')}]`);
  console.log(`⚙️  Mode         : ${isProduction ? 'PRODUCTION BATCH (5 Video/Hari + Smart Resume)' : modeArg.toUpperCase()}`);
  console.log(`🚀 Eksekusi     : ${autoSubmit ? 'AUTO-SUBMIT (Otomatis Jadwalkan)' : 'PREVIEW ONLY'}`);
  console.log('================================================================\n');

  // Initialize Scheduler if in Production Mode
  const scheduler = new ProductionScheduler(config);
  let queueState = null;

  if (isProduction) {
    queueState = scheduler.loadOrCreateQueue(
      config.production.folders || config.production.folder,
      config.production.start_date || '2026-09-06',
      config.production.time_slots || ['09:00', '12:00', '15:00', '18:00', '21:00'],
      config.production.cta_text
    );
    const stats = scheduler.getStats();
    console.log(`📊 Status Antrean Produksi:`);
    console.log(`   - Total Video      : ${stats.total} file`);
    console.log(`   - Sudah Terjadwal  : ${stats.completed} (${stats.percent})`);
    console.log(`   - Menunggu Antrean : ${stats.pending}`);
    console.log(`   - Gagal/Perlu Ulang: ${stats.failed}`);
    console.log(`   - Rentang Tanggal  : ${queueState.queue[0]?.targetSchedule?.split('T')[0]} s/d ${queueState.queue[queueState.queue.length - 1]?.targetSchedule?.split('T')[0]}`);
    console.log('================================================================\n');
  }

  // Ensure Chrome is running with full access & anti-throttling
  await launchPersistentChrome();

  // Connect to Chrome via CDP
  const cdp = new CDPClient(config.cdp);
  try {
    await cdp.connect();
  } catch (err) {
    console.error(`❌ ${err.message}`);
    console.log('\n💡 Jalankan Chrome terlebih dahulu dengan: .\\start_chrome.bat');
    process.exit(1);
  }

  await cdp.enableDomains();
  const driver = new AdobeExpressDriver(cdp, config);

  if (isProduction) {
    // Production Loop: Process Pending / Failed items 1-by-1
    let processedThisSession = 0;

    while (true) {
      const item = scheduler.getNextPendingItem();
      if (!item) {
        console.log('\n🎉 SEMUA VIDEO DALAM ANTREAN PRODUKSI TELAH SELESAI DIJADWALKAN!');
        break;
      }

      processedThisSession++;
      const stats = scheduler.getStats();
      console.log(`\n================================================================`);
      console.log(`🎬 [Item ${item.index}/${stats.total}] [Progress: ${stats.percent}]`);
      console.log(`📁 File    : "${item.filename}"`);
      console.log(`📅 Jadwal  : ${item.targetSchedule.replace('T', ' ')} WIB`);
      console.log(`🔄 Percobaan: ke-${item.retryCount + 1}`);
      console.log(`================================================================`);

      try {
        // 1. Open New Composer & Ensure Ready
        await driver.ensureComposerOpen(15);
        await cdp.humanDelay(1500, 2500);

        // 2. Select All 6 Channels
        await driver.selectChannels(config.targets.channels, config.targets.fallback_all_personal_channels);
        await cdp.humanDelay(1200, 2000);

        // 3. Format Reels for Facebook & Instagram
        if (config.automation.auto_format_reels) {
          await driver.setFormatReels();
          await cdp.humanDelay(1000, 1800);
        }

        // 4. Inject Video File & Confirm
        await driver.uploadVideo(item.filePath);
        await cdp.humanDelay(2000, 3500);

        // 5. Fill Main Caption (Clean Title + CTA + Hashtags)
        await driver.fillCaption(item.mainCaption);
        await cdp.humanDelay(1200, 2200);

        // 6. Fill Instagram First Comment
        if (config.instagram && config.instagram.enable_first_comment) {
          await driver.fillInstagramFirstComment(item.igFirstComment);
          await cdp.humanDelay(1000, 1800);
        }

        // 7. Fill Pinterest Options (Board PPT MORPH & Link Clicky)
        if (config.pinterest) {
          await driver.fillPinterestOptions({
            board: config.pinterest.board || 'PPT MORPH',
            section: config.pinterest.section || '',
            pinTitle: item.pinterestTitle,
            destinationWebsite: config.pinterest.destination_website || 'https://clicky.id/arifex21'
          });
          await cdp.humanDelay(1200, 2000);
        }

        // 8. Set Schedule Date & Time
        await driver.setPublishModeAndSchedule('schedule', item.targetSchedule);
        await cdp.humanDelay(1500, 2500);

        // 9. Smart Polling for Video Render & Submit Button
        const renderOk = await driver.waitForVideoProcessing(config.automation.wait_for_video_render_sec || 60);

        // 10. Submit if enabled
        if (autoSubmit && !isDryRun) {
          await cdp.humanDelay(1200, 2000);
          const submitRes = await driver.submit('schedule');
          if (submitRes && submitRes.success) {
            scheduler.markCompleted(item.index, submitRes);
            console.log(`✅ [Item ${item.index}] BERHASIL DIJADWALKAN: ${item.targetSchedule}`);

            // 🧹 SMART MEMORY & CACHE PURGE (Per-Item)
            console.log('🧹 [Smart Memory Purge] Melepaskan V8 Heap, membersihkan cache media & temp video...');
            await cdp.clearMemoryAndCache();
            
            // Clean temp_processed directory
            try {
              const tempDir = path.join(__dirname, 'temp_processed');
              if (fs.existsSync(tempDir)) {
                const tempFiles = fs.readdirSync(tempDir);
                for (const tf of tempFiles) {
                  try { fs.unlinkSync(path.join(tempDir, tf)); } catch (e) {}
                }
              }
            } catch (e) {}

            // Navigate to about:blank to destroy previous video canvas & WASM render tree
            await cdp.navigate('about:blank');
            await cdp.sleep(500);
          } else {
            throw new Error(submitRes ? submitRes.reason : 'Submit button click failed');
          }
        } else {
          console.log(`\n👁️ [Preview Mode] Form item ${item.index} telah siap di layar.`);
          scheduler.markCompleted(item.index, { previewOnly: true });
        }

        // Save progress screenshot if enabled
        if (config.automation.save_screenshots && processedThisSession <= 5) {
          await cdp.captureScreenshot(`production_item_${item.index}`);
        }

        // Natural Human Cooldown between videos (10s)
        console.log('⏳ Jeda santai antar video (10 detik) agar menyerupai tindakan manusia & anti-bot...');
        for (let cd = 10; cd > 0; cd--) {
          process.stdout.write(`\r   ⏳ Melanjutkan ke video berikutnya dalam ${cd}s... `);
          await cdp.sleep(1000);
        }
        console.log('');

      } catch (err) {
        console.error(`❌ [Item ${item.index}] Gagal: ${err.message}`);
        scheduler.markFailed(item.index, err.message);
        await cdp.captureScreenshot(`error_item_${item.index}`);
        
        if (item.retryCount < 3) {
          console.log(`🔄 [Item ${item.index}] Mengulang proses (Percobaan ke-${item.retryCount + 1}/3) dalam 3 detik...`);
          await cdp.sleep(3000);
        } else {
          console.error(`\n🛑 [STOP ON ERROR] Item ${item.index} gagal setelah 3x percobaan!`);
          console.error(`🛑 Proses antrean DIHENTIKAN agar Anda dapat memeriksa kendala pada video ini.`);
          console.error(`💡 Detail Error: ${err.message}`);
          console.error(`📸 Screenshot tersimpan: error_item_${item.index}.png\n`);
          break;
        }
      }
    }

  } else {
    // Single / Ad-hoc Mode
    const targetVideo = fileArg || path.join(__dirname, 'Bikin foto biasa di slide jadi sinematik! 😱 Mau presentasi kamu kelihatan estetik dan profesional Cobain #PowerPoint #MorphTransition #PresentasiEstetik #TutorialPPT #SlideKreatif.mp4');
    const baseName = path.basename(targetVideo, path.extname(targetVideo));
    const cleanTitle = baseName.replace(/#\S+/g, '').replace(/\s+/g, ' ').trim();
    const hashtagsMatch = baseName.match(/(#\S+)/g);
    const hashtags = hashtagsMatch ? hashtagsMatch.join(' ') : '';
    const mainCaption = hashtags ? `${cleanTitle}\n\n${config.production.cta_text}\n\n${hashtags}` : `${cleanTitle}\n\n${config.production.cta_text}`;
    const igFirstComment = `${cleanTitle}\n\n${config.production.cta_text}`;

    console.log(`🎬 Mengunggah Single Video: "${path.basename(targetVideo)}"`);
    await cdp.navigate('https://express.adobe.com/schedule?postId=new');
    await cdp.sleep(4000);

    await driver.selectChannels(config.targets.channels, config.targets.fallback_all_personal_channels);
    if (config.automation.auto_format_reels) await driver.setFormatReels();
    await driver.uploadVideo(targetVideo);
    await driver.fillCaption(mainCaption);
    await driver.fillInstagramFirstComment(igFirstComment);
    await driver.fillPinterestOptions({
      board: config.pinterest.board || 'PPT MORPH',
      pinTitle: cleanTitle.substring(0, 100),
      destinationWebsite: config.pinterest.destination_website || 'https://clicky.id/arifex21'
    });
    await driver.setPublishModeAndSchedule(modeArg, null);
    await driver.waitForVideoProcessing(config.automation.wait_for_video_render_sec || 45);

    if (autoSubmit && !isDryRun) {
      const submitRes = await driver.submit(modeArg);
      console.log('🎉 Hasil Submit:', JSON.stringify(submitRes));
    }
  }

  const finalStats = scheduler.getStats();
  console.log('\n================================================================');
  console.log('✨ LAPORAN AKHIR SESI PRODUKSI:');
  console.log(`   - Total Terjadwal : ${finalStats.completed} / ${finalStats.total} (${finalStats.percent})`);
  console.log(`   - Gagal / Pending : ${finalStats.pending + finalStats.failed}`);
  console.log('================================================================\n');

  await cdp.close();
}

run().catch((err) => {
  console.error('❌ Terjadi kesalahan kritis:', err);
});
