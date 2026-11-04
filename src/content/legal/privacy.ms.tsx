import { LegalSection } from "@/components/site/legal-page";
import { ACTIVE_CHAIN, LIMITS } from "@/lib/config";
import type { LegalContent } from "@/content/legal/types";

export const privacyMs: LegalContent = {
  title: "Dasar Privasi",
  description:
    "Apa yang Callback lakukan dan tidak lakukan dengan CV anda. Versi ringkas: fail dihurai dalam pelayar anda, teks tidak pernah disimpan, dan tiada data peribadi masuk ke rantai.",
  updated: "Terakhir dikemas kini 1 November 2026",
  intro:
    "Callback dibina supaya hanya sedikit yang perlu ditulis dalam dasar privasi. CV anda dihurai dalam pelayar anda, teksnya dihantar ke satu perkhidmatan AI untuk satu permintaan dan tidak pernah disimpan, dan laporan anda tinggal dalam pelayar anda sendiri. Halaman ini menyatakan perkara itu dengan lebih terperinci.",
  Body: function PrivacyBodyMs() {
    return (
      <>
        <p className="text-[12.5px] italic leading-relaxed text-muted">
          Halaman ini ialah terjemahan untuk kemudahan. Jika terdapat perbezaan
          tafsiran, versi bahasa Inggeris yang terpakai.
        </p>

        <LegalSection heading="Apa yang berlaku pada CV anda">
          <p>
            Apabila anda memuat naik fail PDF atau Word, fail itu <strong>dibaca
            sepenuhnya dalam pelayar anda</strong>. Fail itu sendiri tidak pernah
            dimuat naik ke mana-mana.
          </p>
          <p>
            Teks yang diekstrak dihantar ke pelayan kami untuk satu tujuan:
            menjalankan analisis AI yang menghasilkan padanan jawatan dan
            cadangan anda. Kami tidak menulisnya ke pangkalan data, fail atau
            log. Setelah permintaan selesai, pelayan tidak mempunyai salinannya.
          </p>
          <p>
            Penyedia AI ialah API Gemini daripada Google. Permintaan dihantar
            dengan pengekalan dimatikan, jadi penyedia juga diarahkan supaya
            tidak menyimpan kandungan.
          </p>
          <p>
            Jika anda menggunakan pilihan <strong>Pautan</strong>, pelayan kami
            mengambil halaman awam yang anda namakan dan mengekstrak teksnya. Ia
            akan menolak apa-apa yang bukan halaman web awam.
          </p>
        </LegalSection>

        <LegalSection heading="Apa yang disimpan, dan di mana">
          <p>
            Laporan anda, CV yang diperbaiki dan status permohonan anda disimpan
            dalam <strong>localStorage</strong> pelayar anda. Ia tidak sampai ke
            pelayan kami dan tidak disegerakkan antara peranti anda.
          </p>
          <p>
            Ini juga bermakna: memadam data pelayar akan memadamkannya, dan ia
            tidak boleh dipulihkan. Terdapat butang <strong>Padam semua data
            saya</strong> pada halaman Permohonan saya yang membuang semuanya,
            termasuk salt hash yang diterangkan di bawah.
          </p>
          <p>
            Kami menyimpan <strong>kiraan permintaan setiap alamat IP</strong>
            sehingga 24 jam, untuk menguatkuasakan had penggunaan wajar{" "}
            {LIMITS.analysesPerDay} analisis sehari. Ia memegang pembilang dan
            tiada apa-apa lagi — tiada teks CV, tiada teks jawatan, dan tiada
            rekod apa yang dianalisis.
          </p>
        </LegalSection>

        <LegalSection heading="Apa yang masuk ke blockchain">
          <p>
            Tiada, melainkan anda menekan <strong>Cap pada BOT Chain</strong>.
            Itu pilihan, dan setiap ciri lain berfungsi tanpanya.
          </p>
          <p>Jika anda mengecap laporan, transaksi merekodkan:</p>
          <ul className="flex flex-col gap-1.5">
            <li>hash skor laporan, tajuk jawatan dan tarikh;</li>
            <li>
              hash SHA-256 <strong>bersalt</strong> teks CV anda;
            </li>
            <li>skor ATS dan peratus padanan anda;</li>
            <li>tajuk jawatan, sehingga 60 aksara;</li>
            <li>id laporan terdahulu yang diperbaiki oleh laporan ini, jika ada;</li>
            <li>cap masa, dan alamat dompet yang menghantarnya.</li>
          </ul>
          <p>
            Ia <strong>tidak</strong> merekodkan nama anda, alamat e-mel anda,
            nama syarikat, atau mana-mana bahagian teks CV anda.
          </p>
          <p>
            Salt ialah nilai rawak yang dijana dalam pelayar anda dan tidak
            pernah meninggalkannya. Tanpanya, seseorang yang memegang salinan CV
            anda boleh meng-hash-nya dan mengesahkan ia sepadan dengan rekod di
            rantai. Dengannya, mereka tidak boleh.
          </p>
          <p>
            Blockchain adalah kekal dan awam. Cap tidak boleh dipadam atau
            diedit selepasnya — oleh anda, kami, atau sesiapa pun. Alamat dompet
            anda kelihatan di {ACTIVE_CHAIN.name}, seperti mana-mana transaksi.
          </p>
        </LegalSection>

        <LegalSection heading="Cookie dan penjejakan">
          <p>
            Callback tidak menetapkan cookie, tidak menjalankan analitik, dan
            tidak membenamkan penjejak pihak ketiga, piksel pengiklanan atau
            widget sosial.
          </p>
          <p>
            Laman ini dihoskan di Vercel, yang menyimpan log akses pelayan
            standard — termasuk alamat IP — sebagai sebahagian daripada
            pengendalian platform.
          </p>
        </LegalSection>

        <LegalSection heading="Hak anda">
          <p>
            Kerana data anda berada dalam pelayar anda sendiri, anda menjalankan
            sebahagian besar hak data secara langsung: anda boleh melihat semua
            yang disimpan, dan memadam semuanya, dari halaman Permohonan saya.
          </p>
          <p>
            Kami tidak menyimpan akaun untuk anda, jadi tiada profil untuk
            dieksport atau dibetulkan. Jika anda berada di UK atau EU dan
            percaya ada sesuatu yang salah di sini, bangkitkan di repositori
            GitHub projek.
          </p>
        </LegalSection>

        <LegalSection heading="Kanak-kanak">
          <p>
            Callback ditujukan untuk orang yang cukup umur untuk mencari kerja.
            Ia tidak ditujukan kepada kanak-kanak bawah 13 tahun.
          </p>
        </LegalSection>

        <LegalSection heading="Perubahan">
          <p>
            Jika dasar ini berubah dengan cara yang menjejaskan apa yang berlaku
            pada CV anda, perubahan itu akan dicerminkan di sini dan dalam
            sejarah repositori, yang bersifat awam.
          </p>
        </LegalSection>
      </>
    );
  },
};
