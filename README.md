# 🚀 Adobe Express Video Reels Browser Automation Suite (v4.0.0)

Sistem otomasi tingkat lanjut berbasis **Node.js + Chrome DevTools Protocol (CDP)** untuk mengunggah dan menjadwalkan konten Reels/Video massal secara otomatis di **Adobe Express Schedule** (`https://express.adobe.com/schedule*`).

---

## 🌟 Fitur Utama

1. **⚡ Fast Direct CDP Injection**:
   - Menyuntikkan file video `.mp4` langsung ke node input file Adobe Express via CDP `DOM.setFileInputFiles` tanpa jeda.

2. **🌐 Multi-Channel Social Auto-Selection**:
   - Otomatis membuka dropdown `Channels *`, menembus Shadow DOM `<sp-popover>`, dan memilih akun media sosial (`Pptmorph`, `MahirPpt`, `adalahitu46`, atau Semua akun Personal Calendar).

3. **🎬 Auto Format Reels**:
   - Mendeteksi dan memilih format Reels untuk format video pendek di Facebook, Instagram, dan TikTok.

4. **✍️ Smart Caption & Hashtag Injector**:
   - Mengambil caption & hashtag langsung dari nama file video secara instan atau melalui integrasi **Gemini AI Vision** (Pool 92 API Keys).

5. **📅 Batch Upload & Interval Scheduling**:
   - Mengunggah seluruh video dari folder target secara otomatis berurutan.

6. **📸 Visual Verification Screenshots**:
   - Menyimpan screenshot hasil eksekusi untuk memastikan form siap dijadwalkan.

---

## 🚀 Cara Menjalankan

### Langkah 1: Jalankan Chrome dengan Port Debugging 9222
Klik dua kali file **`start_chrome.bat`** atau jalankan via terminal:
```powershell
.\start_chrome.bat
```

### Langkah 2: Eksekusi Script Otomatisasi
```powershell
# 1. Upload video demo tunggal (Mode Preview / Siap Klik)
node uploader.js

# 2. Upload video spesifik dengan auto submit (Schedule)
node uploader.js --file "C:\Users\NCN0C\Videos\tiktok-automation\vidio\sample.mp4" --submit

# 3. Upload massal semua video dalam folder
node uploader.js --folder "C:\Users\NCN0C\Videos\tiktok-automation\vidio" --mode schedule --submit

# 4. Upload massal dengan caption yang dioptimasi AI
node uploader.js --folder "C:\Users\NCN0C\Videos\tiktok-automation\vidio" --ai --submit
```

---

## ⚙️ Konfigurasi (`config/config.json`)

```json
{
  "cdp": {
    "host": "127.0.0.1",
    "port": 9222
  },
  "targets": {
    "channels": ["Pptmorph", "MahirPpt", "adalahitu46"],
    "fallback_all_personal_channels": true
  },
  "automation": {
    "default_mode": "schedule",
    "default_interval_hours": 2,
    "video_folder": "c:\\Users\\NCN0C\\Videos\\tiktok-automation\\vidio",
    "auto_format_reels": true,
    "wait_for_video_render_sec": 6,
    "save_screenshots": true
  }
}
```
