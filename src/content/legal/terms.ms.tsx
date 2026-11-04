import { LegalSection } from "@/components/site/legal-page";
import { ACTIVE_CHAIN, LIMITS } from "@/lib/config";
import type { LegalContent } from "@/content/legal/types";

export const termsMs: LegalContent = {
  title: "Terma",
  description:
    "Terma penggunaan Callback. Versi ringkas: ia ialah alat panduan percuma, skor ialah pendapat kami dan bukan pendapat majikan, dan anda bertanggungjawab atas apa yang tertulis dalam CV anda.",
  updated: "Terakhir dikemas kini 1 November 2026",
  intro:
    "Callback ialah alat percuma yang menilai CV anda berbanding jawatan dan mencadangkan perubahan. Terma ini menetapkan apa yang dijanjikan dan tidak dijanjikan.",
  Body: function TermsBodyMs() {
    return (
      <>
        <p className="text-[12.5px] italic leading-relaxed text-muted">
          Halaman ini ialah terjemahan untuk kemudahan. Jika terdapat perbezaan
          tafsiran, versi bahasa Inggeris yang terpakai.
        </p>

        <LegalSection heading="Apa itu Callback">
          <p>
            Callback membaca CV anda dan penerangan jawatan, dan mengembalikan
            skor ATS, peratus padanan, dan cadangan suntingan. Ia ialah{" "}
            <strong>panduan, bukan jaminan pengambilan kerja</strong>.
          </p>
          <p>
            Skor dikira oleh aplikasi ini, menggunakan peraturan yang diterbitkan
            pada tab Semakan ATS dan dalam repositori. Tiada majikan, perekrut
            atau sistem penjejak pemohon yang menyemak atau menyokongnya. Skor
            tinggi di sini tidak bermakna majikan akan bersetuju, dan skor rendah
            tidak bermakna anda tidak sesuai untuk jawatan itu.
          </p>
        </LegalSection>

        <LegalSection heading="CV anda ialah tanggungjawab anda">
          <p>
            Cadangan penulisan semula dibina hanya daripada fakta yang sudah ada
            dalam CV anda, dan mana-mana kata kunci yang tidak disokong CV anda
            ditunjukkan secara berasingan untuk anda terima atau tolak, bukan
            ditulis untuk anda.
          </p>
          <p>
            Walaupun begitu, <strong>anda bertanggungjawab atas apa yang
            tertulis dalam CV anda</strong>. Baca setiap perubahan sebelum anda
            menggunakannya. Jangan terima cadangan yang membuat dakwaan yang
            tidak boleh anda pertahankan dalam temuduga.
          </p>
        </LegalSection>

        <LegalSection heading="Penggunaan wajar">
          <p>
            Analisis dihadkan kepada {LIMITS.analysesPerDay} sehari bagi setiap
            alamat IP, supaya kuota AI bersama tidak habis oleh seorang
            pengguna. Jangan cuba mengelak had itu, dan jangan gunakan
            perkhidmatan ini untuk memproses CV orang lain tanpa pengetahuan
            mereka.
          </p>
          <p>
            Ciri pembaca pautan mengambil halaman web awam sahaja. Jangan
            gunakannya untuk menyiasat sistem yang bukan milik anda.
          </p>
        </LegalSection>

        <LegalSection heading="Nama pihak ketiga">
          <p>
            Callback ialah <strong>projek bebas</strong> dan tidak bergabung
            dengan, ditaja oleh, atau disokong oleh mana-mana papan jawatan,
            sistem penjejak pemohon atau vendor dokumen. Nama seperti Greenhouse,
            Lever, Workable, Ashby, LinkedIn, Notion, Google Docs dan Microsoft
            Word digunakan hanya untuk menerangkan keserasian, dan kekal sebagai
            tanda dagangan pemilik masing-masing.
          </p>
        </LegalSection>

        <LegalSection heading="Cap di rantai">
          <p>
            Mengecap laporan adalah pilihan dan menulis transaksi ke{" "}
            {ACTIVE_CHAIN.name}. Anda membayar yuran rangkaian daripada dompet
            anda sendiri; Callback tidak mengambil bayaran dan tiada token.
          </p>
          <p>
            Transaksi adalah <strong>kekal dan awam</strong>, dan tidak boleh
            diterbalikkan, diedit atau dipadam oleh sesiapa pun setelah
            disahkan. Cap merekodkan kemajuan anda sendiri dari semasa ke
            semasa. Ia bukan kelayakan, dan tidak mengesahkan apa-apa tentang
            kemahiran atau sejarah pekerjaan anda.
          </p>
          <p>Anda bertanggungjawab atas keselamatan dompet anda sendiri.</p>
        </LegalSection>

        <LegalSection heading="Tiada jaminan">
          <p>
            Perkhidmatan disediakan sebagaimana adanya, tanpa jaminan apa pun.
            Pengekstrakan teks boleh tersalah membaca susun atur luar biasa, dan
            analisis AI boleh salah — sebab itu setiap padanan menunjukkan
            petikan yang digunakannya, supaya anda boleh menyemaknya.
          </p>
          <p>
            Setakat yang dibenarkan undang-undang, Callback dan penyumbangnya
            tidak bertanggungjawab atas sebarang kerugian yang timbul daripada
            penggunaan perkhidmatan ini, termasuk sebarang hasil permohonan
            kerja.
          </p>
        </LegalSection>

        <LegalSection heading="Ketersediaan">
          <p>
            Ini ialah projek percuma tanpa komitmen masa operasi. Ciri AI
            bergantung pada API pihak ketiga dan mungkin tidak tersedia. Apabila
            itu berlaku, semakan ATS berasaskan peraturan masih berjalan, jadi
            anda tidak ditinggalkan tanpa apa-apa.
          </p>
        </LegalSection>
      </>
    );
  },
};
