import { LegalSection } from "@/components/site/legal-page";
import { ACTIVE_CHAIN, LIMITS } from "@/lib/config";
import type { LegalContent } from "@/content/legal/types";

export const termsId: LegalContent = {
  title: "Ketentuan",
  description:
    "Ketentuan penggunaan Callback. Versi singkat: ini adalah alat panduan gratis, skor adalah pendapat kami dan bukan pendapat pemberi kerja, dan Anda bertanggung jawab atas isi CV Anda.",
  updated: "Terakhir diperbarui 1 November 2026",
  intro:
    "Callback adalah alat gratis yang menilai CV Anda terhadap lowongan dan menyarankan perubahan. Ketentuan ini menjelaskan apa yang dijanjikan dan tidak dijanjikan.",
  Body: function TermsBodyId() {
    return (
      <>
        <p className="text-[12.5px] italic leading-relaxed text-muted">
          Halaman ini adalah terjemahan untuk kenyamanan. Jika terdapat
          perbedaan penafsiran, versi bahasa Inggris yang berlaku.
        </p>

        <LegalSection heading="Apa itu Callback">
          <p>
            Callback membaca CV Anda dan deskripsi lowongan, lalu mengembalikan
            skor ATS, persentase kecocokan, dan saran edit. Ini adalah{" "}
            <strong>panduan, bukan jaminan perekrutan</strong>.
          </p>
          <p>
            Skor dihitung oleh aplikasi ini, menggunakan aturan yang
            dipublikasikan di tab Pemeriksaan ATS dan di repositori. Tidak ada
            pemberi kerja, perekrut, atau sistem pelacak pelamar yang meninjau
            atau mendukungnya. Skor tinggi di sini bukan berarti pemberi kerja
            akan setuju, dan skor rendah bukan berarti Anda tidak cocok untuk
            pekerjaan itu.
          </p>
        </LegalSection>

        <LegalSection heading="CV Anda adalah tanggung jawab Anda">
          <p>
            Saran penulisan ulang hanya dibuat dari fakta yang sudah ada di CV
            Anda, dan kata kunci apa pun yang tidak didukung CV Anda ditampilkan
            terpisah untuk Anda terima atau tolak, bukan dituliskan untuk Anda.
          </p>
          <p>
            Meskipun demikian, <strong>Anda bertanggung jawab atas isi CV
            Anda</strong>. Baca setiap perubahan sebelum Anda menggunakannya.
            Jangan menerima saran yang membuat klaim yang tidak dapat Anda
            pertahankan dalam wawancara.
          </p>
        </LegalSection>

        <LegalSection heading="Penggunaan wajar">
          <p>
            Analisis dibatasi {LIMITS.analysesPerDay} per hari per alamat IP,
            agar kuota AI bersama tidak habis oleh satu pengguna. Jangan mencoba
            menghindari batas itu, dan jangan menggunakan layanan ini untuk
            memproses CV orang lain tanpa pengetahuan mereka.
          </p>
          <p>
            Fitur pembaca tautan hanya mengambil halaman web publik. Jangan
            menggunakannya untuk menyelidiki sistem yang bukan milik Anda.
          </p>
        </LegalSection>

        <LegalSection heading="Nama pihak ketiga">
          <p>
            Callback adalah <strong>proyek independen</strong> dan tidak
            berafiliasi dengan, disponsori oleh, atau didukung oleh papan
            lowongan, sistem pelacak pelamar, atau vendor dokumen mana pun. Nama
            seperti Greenhouse, Lever, Workable, Ashby, LinkedIn, Notion, Google
            Docs, dan Microsoft Word digunakan hanya untuk menjelaskan
            kompatibilitas, dan tetap merupakan merek dagang pemiliknya
            masing-masing.
          </p>
        </LegalSection>

        <LegalSection heading="Segel di rantai">
          <p>
            Menyegel laporan bersifat opsional dan menulis transaksi ke{" "}
            {ACTIVE_CHAIN.name}. Anda membayar biaya jaringan dari dompet Anda
            sendiri; Callback tidak menerima pembayaran dan tidak ada token.
          </p>
          <p>
            Transaksi bersifat <strong>permanen dan publik</strong>, dan tidak
            dapat dibalik, diedit, atau dihapus oleh siapa pun setelah
            dikonfirmasi. Segel mencatat kemajuan Anda sendiri seiring waktu.
            Itu bukan kredensial, dan tidak mensertifikasi apa pun tentang
            keterampilan atau riwayat kerja Anda.
          </p>
          <p>Anda bertanggung jawab atas keamanan dompet Anda sendiri.</p>
        </LegalSection>

        <LegalSection heading="Tanpa jaminan">
          <p>
            Layanan disediakan apa adanya, tanpa jaminan apa pun. Ekstraksi teks
            dapat salah membaca tata letak yang tidak biasa, dan analisis AI
            dapat keliru — itulah sebabnya setiap kecocokan menampilkan kutipan
            yang menjadi dasarnya, sehingga Anda dapat memeriksanya.
          </p>
          <p>
            Sejauh diizinkan hukum, Callback dan kontributornya tidak
            bertanggung jawab atas kerugian apa pun yang timbul dari penggunaan
            layanan ini, termasuk hasil apa pun dari lamaran kerja.
          </p>
        </LegalSection>

        <LegalSection heading="Ketersediaan">
          <p>
            Ini adalah proyek gratis tanpa komitmen waktu aktif. Fitur AI
            bergantung pada API pihak ketiga dan mungkin tidak tersedia. Saat
            itu terjadi, pemeriksaan ATS berbasis aturan tetap berjalan,
            sehingga Anda tidak dibiarkan tanpa apa-apa.
          </p>
        </LegalSection>
      </>
    );
  },
};
