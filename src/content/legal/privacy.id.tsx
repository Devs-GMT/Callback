import { LegalSection } from "@/components/site/legal-page";
import { ACTIVE_CHAIN, LIMITS } from "@/lib/config";
import type { LegalContent } from "@/content/legal/types";

export const privacyId: LegalContent = {
  title: "Kebijakan Privasi",
  description:
    "Apa yang Callback lakukan dan tidak lakukan dengan CV Anda. Versi singkat: file diurai di peramban Anda, teks tidak pernah disimpan, dan tidak ada data pribadi yang masuk ke rantai.",
  updated: "Terakhir diperbarui 1 November 2026",
  intro:
    "Callback dibangun agar hanya sedikit yang perlu ditulis dalam kebijakan privasi. CV Anda diurai di peramban Anda, teksnya dikirim ke satu layanan AI untuk satu permintaan dan tidak pernah disimpan, dan laporan Anda tersimpan di peramban Anda sendiri. Halaman ini menjelaskan hal itu secara lebih rinci.",
  Body: function PrivacyBodyId() {
    return (
      <>
        <p className="text-[12.5px] italic leading-relaxed text-muted">
          Halaman ini adalah terjemahan untuk kenyamanan. Jika terdapat
          perbedaan penafsiran, versi bahasa Inggris yang berlaku.
        </p>

        <LegalSection heading="Apa yang terjadi pada CV Anda">
          <p>
            Saat Anda mengunggah file PDF atau Word, file itu <strong>dibaca
            sepenuhnya di peramban Anda</strong>. File itu sendiri tidak pernah
            diunggah ke mana pun.
          </p>
          <p>
            Teks yang diekstrak dikirim ke server kami untuk satu tujuan:
            menjalankan analisis AI yang menghasilkan kecocokan lowongan dan
            saran Anda. Kami tidak menuliskannya ke basis data, file, atau log.
            Setelah permintaan selesai, server tidak memiliki salinannya.
          </p>
          <p>
            Penyedia AI adalah API Gemini dari Google. Permintaan dikirim dengan
            retensi dimatikan, sehingga penyedia juga diinstruksikan untuk tidak
            menyimpan konten.
          </p>
          <p>
            Jika Anda menggunakan opsi <strong>Tautan</strong>, server kami
            mengambil halaman publik yang Anda sebutkan dan mengekstrak teksnya.
            Server akan menolak apa pun yang bukan halaman web publik.
          </p>
        </LegalSection>

        <LegalSection heading="Apa yang disimpan, dan di mana">
          <p>
            Laporan Anda, CV yang diperbaiki, dan status lamaran Anda disimpan
            di <strong>localStorage</strong> peramban Anda. Data itu tidak
            mencapai server kami dan tidak disinkronkan antar perangkat Anda.
          </p>
          <p>
            Artinya juga: menghapus data peramban akan menghapusnya, dan data
            itu tidak dapat dipulihkan. Ada tombol <strong>Hapus semua data
            saya</strong> di halaman Lamaran saya yang menghapus semuanya,
            termasuk salt hash yang dijelaskan di bawah.
          </p>
          <p>
            Kami menyimpan <strong>jumlah permintaan per alamat IP</strong>
            hingga 24 jam, untuk menegakkan batas penggunaan wajar{" "}
            {LIMITS.analysesPerDay} analisis per hari. Yang disimpan hanya
            penghitung dan tidak ada yang lain — tanpa teks CV, tanpa teks
            lowongan, dan tanpa catatan apa yang dianalisis.
          </p>
        </LegalSection>

        <LegalSection heading="Apa yang masuk ke blockchain">
          <p>
            Tidak ada, kecuali Anda menekan <strong>Segel di BOT Chain</strong>.
            Itu opsional, dan semua fitur lain berfungsi tanpanya.
          </p>
          <p>Jika Anda menyegel laporan, transaksi mencatat:</p>
          <ul className="flex flex-col gap-1.5">
            <li>hash dari skor laporan, judul lowongan, dan tanggal;</li>
            <li>
              hash SHA-256 <strong>bersalt</strong> dari teks CV Anda;
            </li>
            <li>skor ATS dan persentase kecocokan Anda;</li>
            <li>judul lowongan, hingga 60 karakter;</li>
            <li>id laporan sebelumnya yang diperbaiki laporan ini, jika ada;</li>
            <li>stempel waktu, dan alamat dompet yang mengirimnya.</li>
          </ul>
          <p>
            Transaksi <strong>tidak</strong> mencatat nama Anda, alamat email
            Anda, nama perusahaan, atau bagian mana pun dari teks CV Anda.
          </p>
          <p>
            Salt adalah nilai acak yang dihasilkan di peramban Anda dan tidak
            pernah meninggalkannya. Tanpa salt, seseorang yang memiliki salinan
            CV Anda dapat meng-hash-nya dan memastikan kecocokannya dengan
            catatan di rantai. Dengan salt, mereka tidak bisa.
          </p>
          <p>
            Blockchain bersifat permanen dan publik. Segel tidak dapat dihapus
            atau diedit setelahnya — oleh Anda, kami, atau siapa pun. Alamat
            dompet Anda terlihat di {ACTIVE_CHAIN.name}, seperti pada transaksi
            apa pun.
          </p>
        </LegalSection>

        <LegalSection heading="Cookie dan pelacakan">
          <p>
            Callback tidak menetapkan cookie, tidak menjalankan analitik, dan
            tidak menyematkan pelacak pihak ketiga, piksel iklan, atau widget
            sosial.
          </p>
          <p>
            Situs ini dihosting di Vercel, yang menyimpan log akses server
            standar — termasuk alamat IP — sebagai bagian dari pengoperasian
            platform.
          </p>
        </LegalSection>

        <LegalSection heading="Hak Anda">
          <p>
            Karena data Anda ada di peramban Anda sendiri, Anda menjalankan
            sebagian besar hak data secara langsung: Anda dapat melihat semua
            yang disimpan, dan menghapus semuanya, dari halaman Lamaran saya.
          </p>
          <p>
            Kami tidak menyimpan akun untuk Anda, jadi tidak ada profil untuk
            diekspor atau diperbaiki. Jika Anda berada di Inggris atau UE dan
            yakin ada yang salah di sini, ajukan di repositori GitHub proyek.
          </p>
        </LegalSection>

        <LegalSection heading="Anak-anak">
          <p>
            Callback ditujukan untuk orang yang cukup usia untuk mencari kerja.
            Layanan ini tidak diarahkan kepada anak di bawah 13 tahun.
          </p>
        </LegalSection>

        <LegalSection heading="Perubahan">
          <p>
            Jika kebijakan ini berubah dengan cara yang memengaruhi apa yang
            terjadi pada CV Anda, perubahan akan tercermin di sini dan di
            riwayat repositori, yang bersifat publik.
          </p>
        </LegalSection>
      </>
    );
  },
};
