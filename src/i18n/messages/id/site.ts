import type { Dictionary } from "@/i18n/messages/en";

/** Situs pemasaran: navbar, sepuluh bagian, footer. */
export const site: Dictionary["site"] = {
  nav: {
    label: "Utama",
    links: {
      features: "Fitur",
      who: "Untuk siapa",
      how: "Cara kerja",
      faq: "FAQ",
    },
    connectWallet: "Hubungkan wallet",
    checkCv: "Cek CV saya",
    openMenu: "Buka menu",
    closeMenu: "Tutup menu",
    home: "Callback — beranda",
  },

  hero: {
    photoAlt: "Seorang pencari kerja tersenyum saat menerima telepon di mejanya",
    callFrom: "Tim rekrutmen · Acme",
    incoming: "Panggilan masuk…",
    jobMatch: "Kecocokan",
    rechecked: "Dicek ulang",
    rewritesNote: "3 perbaikan diterima · tidak ada yang dikarang",
    sampleTag: "Contoh laporan",
    sampleLine: "Lihat bagaimana Alex naik dari 58% ke 81%",
    sampleTagShort: "Contoh",
    title: "Dapatkan panggilan itu.",
    titleAccent: "panggilan",
    lede: "Unggah CV, tempel lowongan, lalu lihat skor ATS, tingkat kecocokan, dan apa saja yang perlu diubah — kemudian cek ulang.",
    ledeShort:
      "Unggah CV, tempel lowongan, lalu lihat skor ATS, tingkat kecocokan, dan apa saja yang perlu diubah.",
    cta: "Cek CV saya",
    sample: "Lihat contoh laporan",
    readsFrom: "Membaca CV dan lowongan dari",
    careerPages: "Halaman karier perusahaan",
  },

  whatItDoes: {
    eyebrow: "Apa yang dilakukan",
    title: "Callback menggarap lamaranmu dari awal sampai akhir, dari CV hingga melamar.",
    titleAccent: "awal",
    learnMore: "Selengkapnya",
    blocks: [
      {
        label: "Cek ATS",
        title: "Lihat apa yang dilihat robot",
        lines:
          "Tujuh pemeriksaan berbobot untuk melihat apakah sistem pelacak pelamar (ATS) benar-benar bisa membaca CV-mu. Setiap poin dijelaskan, lengkap dengan satu baris perbaikan.",
      },
      {
        label: "Kecocokan",
        title: "Setiap syarat, lengkap dengan bukti",
        lines:
          "Kami pecah lowongan menjadi syarat wajib dan nilai tambah, lalu mencocokkan masing-masing dengan CV-mu — dan mengutip baris yang membuktikannya.",
      },
      {
        label: "Yang perlu diubah",
        title: "Kata-katamu, sudut pandang baru",
        lines:
          "Poin CV ditulis ulang dengan bahasa lowongan, hanya dari apa yang sudah ada di CV-mu. Kata kunci yang tidak bisa kamu buktikan masuk ke daftar yang kamu setujui sendiri.",
      },
      {
        label: "Cek ulang & ekspor",
        title: "Bukti bahwa ini berhasil",
        lines:
          "Terima perubahan yang kamu setujui, cek ulang, dan lihat kedua skor bergerak. Lalu ekspor CV sebagai .docx yang ramah ATS.",
      },
    ],
    ats: {
      eyebrow: "Cek ATS",
      sections: "Pengalaman, Pendidikan, dan Keahlian ditemukan",
      contact: "Email, telepon, dan LinkedIn tersedia",
      twoColumn: "Tata letak 2 kolom",
      twoColumnNote: "kolom terbaca dengan urutan salah",
    },
    requirement: {
      eyebrow: "Kecocokan · syarat 4 dari 16",
      text: "Membangun dan merawat dashboard SQL untuk pemangku kepentingan non-teknis",
      mustHave: "Wajib",
      missing: "Tidak ada",
      note: "CV-mu menulis “mengelola data” — tidak ada kutipan yang mendukung dashboard SQL, jadi ini tidak dihitung.",
    },
    rewrite: {
      eyebrow: "Yang perlu diubah · tulis ulang",
      before: "Sebelum",
      beforeText: "Bertanggung jawab mengelola data dan pelaporan",
      after: "Sesudah",
      afterStart: "Membangun laporan",
      afterEnd: "mingguan untuk 4 tim, memangkas pelaporan manual 6 jam per minggu",
      note: "Fakta yang sama, bahasa lowongan.",
      accept: "Terima",
    },
    recheck: {
      eyebrow: "Cek ulang",
      rechecked: "Dicek ulang",
      ats: "Skor ATS",
      match: "Kecocokan",
    },
  },

  stats: {
    eyebrow: "Kenapa ini penting",
    title: "Aturan melamar kerja, ditulis ulang.",
    titleAccent: "ditulis",
    checks: {
      label: "pemeriksaan ATS berbobot",
      note: "Keterbacaan, bagian, kontak, tanggal, format, panjang, poin.",
    },
    ways: {
      label: "cara menambahkan CV",
      note: "Unggah file PDF atau Word, tempel teksnya, atau beri tautan publik.",
    },
    stamped: {
      label: "laporan dicap di BOT Chain",
      note: "Semuanya bisa diverifikasi di explorer, tanpa data pribadi di on-chain.",
    },
    rechecks: {
      label: "cek ulang tercatat",
      note: "Cek ulang tertaut ke laporan yang diperbaikinya, jadi kemajuanmu bisa dibuktikan.",
    },
    show: "Tampilkan: {label}",
    previous: "Kartu sebelumnya",
    next: "Kartu berikutnya",
    cards: [
      { title: "Lolos dari ATS", line: "Tujuh pemeriksaan berbobot tentang apa yang benar-benar bisa dibaca parser." },
      { title: "Kirim lamaran yang lebih baik", line: "Satu CV, disesuaikan per lowongan, bukan file yang sama empat puluh kali." },
      { title: "Temukan kata kunci yang tepat", line: "Istilah yang dicari lowongan ini, dan mana yang sudah kamu punya." },
      { title: "Dapatkan panggilan itu", line: "Pantau setiap lamaran sampai salah satunya berdering." },
      { title: "Hemat berjam-jam per lamaran", line: "Empat puluh detik pengecekan mengalahkan semalaman menebak-nebak." },
      { title: "Tetap dengan suaramu sendiri", line: "Tulisan ulang memakai fakta dan kata-katamu — bukan template." },
    ],
  },

  collage: {
    magnifier: "Kaca pembesar di atas halaman CV",
    plane: "Pesawat kertas di atas sobekan kertas ungu muda",
    key: "Kunci di dalam lingkaran kertas sobek",
    phone: "Telepon retro berdering di atas sobekan kertas ungu muda",
    clock: "Jam di atas kertas sobek",
    bust: "Patung dada klasik di dalam lingkaran kertas sobek",
    desk: "Ilustrasi seseorang memeriksa CV-nya di meja",
  },

  sample: {
    eyebrow: "Contoh laporan",
    quote:
      "CV saya menulis ‘mengelola data’. Lowongannya meminta ‘dashboard SQL untuk pemangku kepentingan’. Callback menunjukkan celahnya — dan cara menyampaikan apa yang benar-benar saya kerjakan.",
    quoteAccent: "celahnya",
    persona: "Persona contoh",
    cite: "Junior Data Analyst · bukan pelanggan sungguhan",
    before: "Sebelum",
    after: "Setelah tiga perbaikan",
    story:
      "Alex menerima tiga tulisan ulang poin dan ringkasan baru, lalu mengecek ulang. Tidak ada pengalaman baru yang ditambahkan — fakta yang sama, dengan bahasa lowongan.",
    open: "Buka contoh laporan",
    photoAlt: "Foto stok yang menggambarkan Alex, persona contoh, sedang bekerja dengan laptop",
    evidence: "Bukti dari CV",
    evidenceQuote: "Membangun laporan SQL mingguan untuk 4 tim",
    match: "Kecocokan 81% ✦",
  },

  trusted: {
    eyebrow: "Dibuat untuk dipercaya",
    title: "Panduan yang bisa kamu periksa, bukan kotak hitam.",
    titleAccent: "periksa,",
    photoAlt: "Pria tersenyum dalam foto hitam putih, menggambarkan pencari kerja",
    pillars: [
      {
        heading: "Membaca format apa pun",
        body: "File PDF dan Word diurai di browser-mu, termasuk tata letak dua kolom — yang kami tandai, karena ATS membacanya dengan urutan salah. Atau tempel teksnya, atau beri kami tautan publik.",
        cardLabel: "Format",
        cardText: "Tata letak 2 kolom terdeteksi",
      },
      {
        heading: "Menjelaskan setiap skor",
        body: "Tujuh pemeriksaan ATS, masing-masing dengan poin, alasan, dan satu baris perbaikan. Persentase kecocokan menunjukkan hitungannya: syarat wajib 60%, nilai tambah 20%, kata kunci 20%.",
        cardLabel: "Skor",
        cardText: "Poin: 9 dari 15",
      },
      {
        heading: "Tidak pernah mengarang pengalaman",
        body: "Sebuah syarat hanya dihitung jika kami bisa mengutip baris di CV-mu yang membuktikannya. Tulisan ulang hanya menyusun ulang fakta yang sudah kamu punya. Kata kunci yang tidak bisa kamu buktikan masuk ke daftar yang kamu setujui, bukan ke CV-mu.",
        cardLabel: "Bukti",
        cardText: "“Membangun laporan SQL mingguan untuk 4 tim” ✓",
      },
      {
        heading: "Privat sejak awal",
        body: "CV-mu dikirim hanya untuk pengecekan AI — tidak pernah disimpan, tidak pernah dicatat. Laporan tetap di browser-mu. Pencapan hanya menaruh dua hash bergaram di on-chain, tanpa data pribadi sama sekali.",
        cardLabel: "On-chain",
        cardText: "0x7f3a…c21e · tanpa data pribadi",
      },
    ],
  },

  how: {
    eyebrow: "Cara kerja",
    title: "Bagaimana kalau setiap lamaran dapat panggilan?",
    titleAccent: "panggilan?",
    steps: [
      { title: "Tambahkan CV", body: "Unggah file PDF atau Word, tempel teksnya, atau arahkan kami ke tautan publik." },
      { title: "Tambahkan lowongan", body: "Tempel deskripsinya, atau beri kami URL halaman kariernya." },
      { title: "Lihat kecocokanmu", body: "Skor ATS, persentase kecocokan, dan setiap syarat dicek beserta buktinya." },
      { title: "Perbaiki & cek ulang", body: "Terima tulisan ulang yang kamu setujui, cek ulang, dan lihat kedua skor bergerak." },
    ],
    synced: {
      job: "Lowongan: Product Analyst",
      report: "Laporan kecocokan",
      improved: "CV yang diperbaiki",
      read: "dibaca",
      ready: "siap",
      rechecked: "dicek ulang",
      justNow: "{status} · baru saja",
      waiting: "menunggu",
    },
  },

  tracker: {
    eyebrow: "Pelacak lamaranmu",
    title: "Simpan semua lamaran di satu tempat.",
    titleAccent: "satu",
    statuses: ["Belum melamar", "Sudah melamar", "Wawancara", "Tawaran", "📞 Dipanggil!"],
    ats: "ATS",
    match: "Cocok",
    builtStart: "Membangun laporan",
    builtEnd: "mingguan untuk 4 tim",
    seal: "Dicap di {chain} · tanpa data pribadi ·",
    cards: {
      history: {
        title: "Riwayat kecocokan",
        body: "Setiap lowongan yang kamu cek, dengan skor ATS, persentase kecocokan, dan tanggalnya. Disimpan di browser-mu, bukan di server.",
      },
      beforeAfter: {
        title: "Sebelum / sesudah",
        body: "Lihat setiap perubahan yang kamu terima, poin yang digantikannya, dan pengaruh cek ulang pada kedua skor.",
      },
      proof: {
        title: "Bukti di BOT Chain",
        body: "Kalau mau, cap laporan di {chain}. Dua hash bergaram, dua skor, judul pekerjaan, dan tanggal — tanpa nama, tanpa email, tanpa isi CV.",
        detail: "Butuh wallet. Fitur lain di sini tidak.",
      },
    },
    open: "Buka lamaran saya",
    deleteNote: "— atau hapus semuanya dengan sekali klik, kapan saja.",
  },

  integrations: {
    eyebrow: "Bekerja dengan apa yang kamu punya",
    title: "Tanpa alat baru. Tanpa akun baru.",
    titleAccent: "Tanpa",
    lede: "Bawa CV yang sudah kamu punya, dalam format apa pun, dan lowongan dari mana pun kamu menemukannya.",
    tiles: {
      pdf: { name: "PDF", how: "Dibaca di browser-mu" },
      word: { name: "Word", how: ".docx, termasuk tabelnya" },
      docs: { name: "Google Docs", how: "Dipublikasikan ke web" },
      notion: { name: "Notion", how: "Halaman publik apa pun" },
      linkedin: { name: "LinkedIn", how: "Tempel teksnya — mereka memblokir pembacaan" },
      careers: { name: "Halaman karier", how: "Greenhouse, Lever, Workable, Ashby" },
    },
    disclaimer:
      "Nama pihak ketiga hanya dipakai untuk menjelaskan kompatibilitas. Callback tidak berafiliasi dengan, atau didukung oleh, satu pun di antaranya.",
  },

  faq: {
    eyebrow: "FAQ",
    title: "Pertanyaan yang layak diajukan.",
    titleAccent: "layak",
    items: [
      {
        question: "Apakah gratis?",
        answer:
          "Ya. Ada batas pemakaian wajar {limit} analisis per hari supaya satu orang tidak menghabiskan kuota AI untuk semua orang. Tidak ada yang berbayar, dan tidak perlu membuat akun.",
      },
      {
        question: "Apakah CV saya disimpan?",
        answer:
          "Tidak. File diurai di browser-mu, jadi file-nya sendiri tidak pernah meninggalkan perangkatmu. Teksnya dikirim ke server kami untuk pengecekan AI dan tidak disimpan maupun dicatat — teks itu hanya ada selama satu permintaan tersebut. Laporanmu hanya disimpan di browser-mu, dan ada tombol untuk menghapus semuanya.",
      },
      {
        question: "Kenapa tautan lowongan LinkedIn saya tidak bisa dibaca?",
        answer:
          "LinkedIn dan beberapa situs lowongan memblokir pembacaan otomatis halaman mereka, jadi tidak ada yang bisa diambil. Buka lowongannya, salin deskripsinya, lalu tempel — hasil analisisnya sama persis. Halaman karier perusahaan, termasuk Greenhouse, Lever, Workable, dan Ashby, bisa dibaca dari URL.",
      },
      {
        question: "Apakah akan mengarang hal yang tidak benar?",
        answer:
          "Tidak, dan ini dipastikan, bukan sekadar dijanjikan. Sebuah syarat hanya dihitung cocok jika model mengutip baris di CV-mu yang mendukungnya, dan kami memeriksa bahwa kutipan itu benar-benar ada di CV-mu sebelum menghitungnya. Tulisan ulang hanya menyusun ulang fakta yang sudah kamu punya. Kata kunci yang tidak didukung CV-mu tidak pernah dituliskan untukmu — kata kunci itu masuk ke daftar “tambahkan hanya jika benar” untuk kamu putuskan.",
      },
      {
        question: "Apa itu ATS?",
        answer:
          "Applicant tracking system atau sistem pelacak pelamar: perangkat lunak yang dipakai kebanyakan perusahaan untuk menerima dan menyaring lamaran. Sistem ini mengubah CV-mu menjadi teks lalu mencarinya. Karena itu tata letak penting — CV dua kolom dibaca melintasi kolom, sehingga “Keahlian: SQL” dan “Acme Corp” bisa berakhir di baris yang sama tanpa makna.",
      },
      {
        question: "Apa yang masuk ke BOT Chain?",
        answer:
          "Hanya jika kamu memilih untuk mencap laporan: hash laporan, hash bergaram dari teks CV-mu, kedua skormu, judul pekerjaan, id laporan sebelumnya yang diperbaiki, dan cap waktu. Tanpa nama, tanpa email, tanpa isi CV. Hash CV diberi garam dengan nilai acak yang hanya disimpan di browser-mu, jadi tidak ada yang bisa mencocokkan tebakan CV dengannya. Kontraknya berjalan di {chain}, chain {chainId}, tanpa admin, tanpa token, dan tanpa pembayaran.",
      },
      {
        question: "Apakah saya butuh wallet?",
        answer:
          "Hanya untuk mencap. Cek CV, kecocokan lowongan, saran, cek ulang, ekspor, dan riwayat lamaranmu semuanya berjalan tanpa wallet.",
      },
      {
        question: "Bahasa apa saja yang didukung?",
        answer:
          "Inggris, Indonesia, dan Melayu. Situs dan laporan mengikuti bahasa yang kamu pilih di bagian atas halaman, dan pemeriksaan ATS mengenali judul bagian, kata kerja aksi, dan tanggal dalam ketiga bahasa itu. Tulisan ulang tetap memakai bahasa CV-mu, jadi CV berbahasa Inggris tidak akan tiba-tiba berubah menjadi bahasa Indonesia. Bahasa lain tetap menghasilkan laporan, tetapi anggap bagian kualitas poin dan kata kunci sebagai perkiraan kasar.",
      },
    ],
  },

  closing: {
    eyebrow: "Siap kapan pun kamu siap",
    title: "Panggilan berikutnya dimulai di sini.",
    titleAccent: "Panggilan",
    lede: "Satu CV, satu lowongan, empat puluh detik. Kamu akan tahu skor ATS, kecocokanmu, dan tiga perubahan yang paling layak dilakukan.",
    cta: "Cek CV saya",
    sample: "Lihat contoh laporan",
    small: "Gratis · Tanpa akun · CV-mu tidak pernah disimpan",
  },

  footer: {
    label: "Footer",
    tagline:
      "Tambahkan CV dan lowongan. Lihat seberapa ramah ATS CV-mu, seberapa cocok, dan apa saja yang perlu diubah.",
    columns: {
      product: {
        heading: "Produk",
        check: "Cek CV saya",
        sample: "Contoh laporan",
        applications: "Lamaran saya",
      },
      who: {
        heading: "Untuk siapa",
        students: "Mahasiswa",
        graduates: "Lulusan baru",
        changers: "Pindah karier",
        tech: "Peran teknologi",
      },
      resources: {
        heading: "Sumber",
        ats: "Apa itu ATS?",
        tips: "Tips CV",
        faq: "FAQ",
      },
      company: {
        heading: "Tentang",
        about: "Tentang kami",
        github: "GitHub",
      },
    },
    builtOn: "Dibangun di BOT Chain",
    botChainLogo: "Logo BOT Chain",
    verified: "Terverifikasi on-chain",
    chainLine: "Chain {chainId} · {chain}",
    copied: "Alamat disalin",
    copy: "Salin alamat kontrak",
    explorer: "Lihat di explorer",
    notDeployed: "Alamat kontrak diumumkan setelah dideploy ke {chain}",
    stamped: "Laporan dicap: {count}",
    disclaimer:
      "Callback adalah proyek independen dan tidak berafiliasi dengan situs lowongan atau penyedia ATS mana pun. Nama produk pihak ketiga hanya dipakai untuk tujuan kompatibilitas dan tetap merupakan merek dagang pemiliknya masing-masing. Skor adalah panduan, bukan jaminan diterima kerja. CV-mu tidak pernah disimpan dan tidak pernah dimasukkan ke on-chain.",
    rights: "© 2026 Callback. Hak cipta dilindungi.",
    privacy: "Kebijakan Privasi",
    terms: "Ketentuan",
    follow: "Ikuti kami",
    onX: "Callback di X",
    onGithub: "Callback di GitHub",
  },
};
