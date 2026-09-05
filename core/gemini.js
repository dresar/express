// core/gemini.js - Gemini AI Pool & Caption Generator
const https = require('https');
const fs = require('fs');
const path = require('path');

class GeminiPool {
  constructor(poolConfigPath = null) {
    this.poolPath = poolConfigPath || path.join(__dirname, '../config/gemini_pool.json');
    this.keys = [];
    this.keyIndex = 0;
    this.models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
    this.loadPool();
  }

  loadPool() {
    try {
      if (fs.existsSync(this.poolPath)) {
        const raw = fs.readFileSync(this.poolPath, 'utf8');
        const data = JSON.parse(raw);
        if (data.api_keys && data.api_keys.length > 0) {
          this.keys = data.api_keys;
          if (data.primary_model) {
            this.models = [data.primary_model, data.fallback_model, data.stable_model].filter(Boolean);
          }
          console.log(`🤖 [Gemini AI] Pool dimuat: ${this.keys.length} API Keys aktif.`);
        }
      }
    } catch (e) {
      console.warn('⚠️ Gagal memuat pool Gemini:', e.message);
    }
  }

  getNextApiKey() {
    if (!this.keys || this.keys.length === 0) {
      return null;
    }
    const key = this.keys[this.keyIndex];
    this.keyIndex = (this.keyIndex + 1) % this.keys.length;
    return key;
  }

  async generateCaptionFromTitle(videoTitle, retryCount = 0) {
    const apiKey = this.getNextApiKey();
    if (!apiKey) {
      // Return original title with hashtags if no API key
      return videoTitle;
    }

    const model = this.models[Math.min(retryCount, this.models.length - 1)] || 'gemini-2.5-flash';
    const promptText = `Kamu adalah Social Media Content Specialist (Instagram Reels, Facebook Reels, TikTok).
Buatkan caption postingan video Reels yang sangat menarik, engaging, santai, dan profesional berdasarkan judul video berikut:
"${videoTitle}"

Aturan Caption:
1. Hook kalimat pertama yang bikin penasaran / eye-catching.
2. Deskripsi singkat 1-2 baris yang to the point.
3. Call-to-action singkat (misal: "Save biar ga lupa!", "Coba sekarang!").
4. 4-6 hashtag relevan dan viral (seperti #PowerPoint #TutorialPPT #DesignHack #FYP).
5. Jangan gunakan format markdown tebal bintang berlebihan atau pembuka klise.`;

    const payload = JSON.stringify({
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 10000
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.candidates && json.candidates[0] && json.candidates[0].content) {
              const text = json.candidates[0].content.parts[0].text.trim();
              return resolve(text);
            }
            if (retryCount < 3) {
              return resolve(this.generateCaptionFromTitle(videoTitle, retryCount + 1));
            }
            resolve(videoTitle);
          } catch (e) {
            if (retryCount < 3) {
              return resolve(this.generateCaptionFromTitle(videoTitle, retryCount + 1));
            }
            resolve(videoTitle);
          }
        });
      });

      req.on('error', () => {
        if (retryCount < 3) {
          return resolve(this.generateCaptionFromTitle(videoTitle, retryCount + 1));
        }
        resolve(videoTitle);
      });

      req.write(payload);
      req.end();
    });
  }
}

module.exports = GeminiPool;
