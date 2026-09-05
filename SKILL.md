---
name: adobe-express-automation
description: >
  Sistem otomatisasi browser upload video Reels & penjadwalan/publikasi massal Adobe Express Schedule (https://express.adobe.com/schedule?postId=new).
  - Versi: 4.7.0
  - Metode: Chrome DevTools Protocol (CDP) WebSocket murni (Port 9222) + Node.js (100% Pure Synchronous DOM Execution Engine)
  - Fokus Utama: Upload massal video Reels, seleksi simultan 6 akun sosial, Instagram First Comment tanpa hashtag, opsi Pinterest (Board 'PPT MORPH', Web 'https://clicky.id/arifex21'), penembusan Shadow DOM berlapis, perbaikan otomatis durasi & bitstream video, pencegahan duplikat proses (Mutex Lock), deteksi logout otomatis, dan penjadwalan massal 200 video (5 video/hari).
---

# 🚀 Adobe Express Browser Automation Master Suite (CDP Engine v4.7.0)

Sistem otomasi mutakhir berbasis **Pure Browser Automation (CDP WebSocket Port 9222)** dengan **100% Synchronous DOM Execution Engine** untuk mengunggah video Reels/Video, menyebarkan ke **6 Channel Media Sosial Sekaligus**, mengisi caption & CTA Link di Bio, mengatur **First Comment Instagram**, mengonfigurasi **Pinterest Board & Website Destination**, memperbaiki durasi video otomatis dengan deteksi audio stream, serta menjadwalkan produksi massal (**5 Video/Hari**) di **Adobe Express Schedule**.

---

## 📌 1. SPESIFIKASI TARGET & WORKFLOW PRODUKSI (200 VIDEO)

| Komponen | Nilai Target / Konfigurasi |
| :--- | :--- |
| **Metode Kontrol** | **Chrome DevTools Protocol (CDP)** WebSocket Port `9222` |
| **Endpoint Composer** | `https://express.adobe.com/schedule?postId=new` |
| **Target 6 Akun Sosial** | 1. **Facebook**: `Pptmorph` (Format: **Reel**)<br>2. **Instagram**: `MahirPpt` (Format: **Reel**)<br>3. **Twitter / X**: `ArifEx2146730`<br>4. **Pinterest**: `NAZWANURULILMI`<br>5. **LinkedIn**: `EKA SYARIF MAULANA`<br>6. **TikTok**: `ARIF-EX21` |
| **Distribusi Jadwal** | **5 Video / Hari** pada jam: `09:00`, `12:00`, `15:00`, `18:00`, `21:00` WIB |
| **CTA Link di Bio** | Ditambahkan di akhir caption: `👉 Cek link di bio untuk download template & info selengkapnya! 🔗✨` |
| **Instagram First Comment** | Diisi otomatis dengan **Caption Bersih + CTA** (tanpa `#hashtag`) |
| **Pinterest Options** | - **Board \***: `PPT MORPH`<br>- **Pin title**: Judul bersih (maks 100 karakter)<br>- **Destination website**: `https://clicky.id/arifex21` |
| **Durasi Minimal Reels** | Auto-Padding FFmpeg ke **5.0 detik** dengan sintesis audio hening jika video tanpa audio |
| **Integritas Video Stream** | **Auto-Stream Repair** via FFmpeg bitstream reconstruction untuk video dengan NAL / decoding error |
| **Proteksi Eksekusi** | **Single-Instance Mutex Lock (`config/runner.lock`)** mencegah duplikasi runner |
| **Ketahanan Koneksi** | **Self-Healing Auto-Reconnect** & **Non-Blocking Domain Enablement** |
| **Kebijakan Error** | **Stop-On-Error**: Ulangi 3x pada video yang sama. Jika tetap gagal, hentikan antrean untuk pemeriksaan. |

---

## 🏗️ 2. ATURAN & ARSITEKTUR MESIN OTOMASI (WAJIB DIIKUTI AI)

### 🔹 A. Audio-Aware Duration Fixer untuk Reels (< 4.2 Detik)
Jika video berdurasi `< 4.2s`, periksa apakah file memiliki stream audio. Jika tidak ada audio, buat synthetic silence via `aevalsrc` agar FFmpeg tidak error:
```javascript
const audioInfo = execSync(`ffprobe -v error -select_streams a -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf8' }).trim();
if (audioInfo.length > 0) {
  execSync(`ffmpeg -y -i "${filePath}" -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=${padDur}[v];[0:a]apad=pad_dur=${padDur}[a]" -map "[v]" -map "[a]" -c:v libx264 -preset ultrafast -c:a aac -movflags +faststart "${tempOut}"`, { stdio: 'ignore' });
} else {
  execSync(`ffmpeg -y -i "${filePath}" -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=${padDur}[v];aevalsrc=0:d=${(dur + parseFloat(padDur)).toFixed(2)}[a]" -map "[v]" -map "[a]" -c:v libx264 -preset ultrafast -c:a aac -movflags +faststart "${tempOut}"`, { stdio: 'ignore' });
}
```

### 🔹 B. Non-Blocking Domain Enablement (`core/cdp.js`)
Jangan pernah menunggu secara blocking atau melempar fatal error saat `Runtime.enable`, `DOM.enable`, atau `Page.enable` dijalankan:
```javascript
async enableDomains() {
  try {
    await Promise.allSettled([
      this.send('Runtime.enable', {}, 4000),
      this.send('DOM.enable', {}, 4000),
      this.send('Page.enable', {}, 4000)
    ]);
  } catch (e) {}
}
```

### 🔹 C. Proteksi Single-Instance Mutex Lock
Untuk mencegah dua proses Node.js berjalan bersamaan dan saling mengacaukan tab browser:
```javascript
const lockFilePath = path.join(__dirname, 'config', 'runner.lock');
function acquireLock() {
  if (fs.existsSync(lockFilePath)) {
    const pid = parseInt(fs.readFileSync(lockFilePath, 'utf8').trim());
    try {
      process.kill(pid, 0); // Check if alive
      console.warn(`⚠️ Runner sudah aktif di PID: ${pid}. Mencegah duplikasi!`);
      process.exit(0);
    } catch(e) {}
  }
  fs.writeFileSync(lockFilePath, String(process.pid), 'utf8');
}
```

---

## ⚡ 3. PERINTAH EKSEKUSI PRODUKSI

### 1️⃣ Buka Chrome dengan Port Debugging 9222
```powershell
node core/chrome_launcher.js
```

### 2️⃣ Jalankan Produksi Batch 200 Video (5 Video/Hari)
```powershell
node uploader.js --production --submit
```
