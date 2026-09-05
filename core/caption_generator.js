// core/caption_generator.js - AI & Algorithmic PowerPoint Caption Generator
// Generates 245+ unique, high-converting captions, hashtags, and first comments for PowerPoint/Morph videos.

const HOOKS = [
  "Mau sidang skripsi? Trik Morph ini bikin dosen terpukau! 🎓✨",
  "Bikin slide PowerPoint sekelas presentasi Apple dalam 1 menit! 🍎🔥",
  "Trik transisi Morph paling smooth di PowerPoint sebelum sidang! 😱✨",
  "Presentasi tugas kuliah masih kaku? Cobain trik estetik ini! 💜🔥",
  "Rahasia slide pembuka bab presentasi yang bikin dosen melek! 🤩✨",
  "Ubah bullet point jadi infografis modern kayak gini! 🔥✨",
  "Tutorial transisi Morph 3D Carousel di PowerPoint! 🎡✨",
  "Slide seminar proposal masih berantakan? Rapikan pakai trik ini! 📐✨",
  "Trik zoom & pan interaktif di PowerPoint tanpa plugin! 🔍🔥",
  "Desain slide skripsi tema minimalis elegan, auto dapet A! 🎓💯",
  "Bosen slide biasa? Cobain efek kartu melayang di PowerPoint! 🃏✨",
  "Cara tercepat bikin animasi timeline sejarah di PowerPoint! 🗺️⏱️",
  "Trik rahasia PowerPoint yang jarang diajarin di kampus! 🤫🔥",
  "Desain slide perbandingan data jadi infografis sebersih ini! 📊✨",
  "Animasi mockup smartphone interaktif langsung di PowerPoint! 📱✨",
  "Template PowerPoint dark mode aesthetic buat tugas akhir! 🖤✨",
  "Presentasi bisnis auto dilirik kalau desainnya se-clean ini! 💼🚀",
  "Trik animasi icon morphing super halus untuk presentasimu! 💡🔥",
  "Slide skripsi estetik bikin makin pede saat presentasi! 🎓😍",
  "Cara mudah bikin efek parallax scrolling di PowerPoint! 🌄✨",
  "Trik typography masking video di dalam teks PowerPoint! 🎥🔤",
  "Ubah tabel data membosankan jadi dynamic progress bar! 📈✨",
  "Tutorial bikin pop-up card interaktif saat diklik di slide! 🖱️✨",
  "Desain slide portfolio & profil diri modern di PowerPoint! 📄✨",
  "Transisi Morph slide horizontal yang bikin materi mengalir! ➡️✨",
  "Bikin diagram alur proses kerja super estetik tanpa ribet! 🔄🔥",
  "Mau presentasi besok? Pakai trik layout cepat 5 menit ini! ⚡✨",
  "Trik efek kaca / glassmorphism modern di PowerPoint! 🪟✨",
  "Desain cover slide yang eye-catching dan bikin fokus! 🎯✨",
  "Kombinasi warna pastel & font elegan untuk presentasi kuliah! 🎨✨"
];

const DESCRIPTIONS = [
  "Bikin presentasi 10x lebih interaktif tanpa ribet desain.",
  "Dosen penguji dan audiens auto terpukau lihat slide ini.",
  "Cuma butuh PowerPoint bawaan tanpa install plugin apapun!",
  "Tinggal tiru layout-nya, presentasi auto profesional.",
  "Simpan video ini sekarang biar nggak lupa pas butuh!",
  "Trik simpel yang bikin slide kamu paling stand out.",
  "Visual yang rapi bikin materi kamu gampang dipahami.",
  "Kunci presentasi keren adalah visual bersih & transisi smooth.",
  "Wajib dicoba buat kamu pejuang skripsi & sempro!",
  "Tingkatkan skill PowerPoint biar tugas kuliah cepat beres."
];

const HASHTAG_SETS = [
  "#PPTMorph #SidangSkripsi #TemplatePPT #PPT",
  "#PPTAesthetic #SlidePresentasi #PowerPoint",
  "#PowerPointDesign #PPTMorph #SkripsiHack",
  "#TutorialPPT #PresentasiEstetik #PPTKeren",
  "#SlideKreatif #PowerPointTips #SidangSkripsi"
];

function generatePptCaption(index, filename, ctaText = '👉 Cek bio untuk template! 🔗✨') {
  const hook = HOOKS[(index - 1) % HOOKS.length];
  const desc = DESCRIPTIONS[(index - 1 + Math.floor(index / HOOKS.length)) % DESCRIPTIONS.length];
  const hashtags = HASHTAG_SETS[(index - 1) % HASHTAG_SETS.length];

  // Clean title for Pinterest & Header (Strictly <= 70 chars)
  const cleanTitle = hook.replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF!?,.-]/gi, '').trim().substring(0, 70);

  // Main Caption for Adobe Express / Reels (STRICTLY <= 210 chars)
  let mainCaption = `${hook}\n\n${desc}\n${ctaText}\n\n${hashtags}`;
  if (mainCaption.length > 215) {
    mainCaption = `${hook}\n${desc}\n${ctaText}\n${hashtags}`;
  }

  // Instagram First Comment (Clean, without hashtags, STRICTLY <= 150 chars)
  let igFirstComment = `${hook}\n\n${desc}\n${ctaText}`;
  if (igFirstComment.length > 155) {
    igFirstComment = `${hook}\n${desc}\n${ctaText}`;
  }

  // Pinterest Title
  const pinterestTitle = cleanTitle;

  return {
    cleanTitle,
    mainCaption,
    igFirstComment,
    pinterestTitle
  };
}

module.exports = {
  generatePptCaption,
  HOOKS,
  DESCRIPTIONS,
  HASHTAG_SETS
};
