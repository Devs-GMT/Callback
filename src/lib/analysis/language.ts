/**
 * Which of Callback's three languages a piece of text is written in.
 *
 * Used where the answer must follow the document rather than the reader: a
 * cover letter written in Indonesian gets an Indonesian date line and
 * "Lamaran untuk posisi …" whatever language the site is shown in.
 *
 * A word-frequency vote over short function words is plenty for this. It only
 * has to tell English from the Malay family, and then Indonesian from Malay
 * where the two genuinely differ ("karena" / "kerana", "bisa" / "boleh",
 * "perusahaan" / "syarikat"). Ties go to Indonesian, the larger audience.
 */

import type { Locale } from "@/i18n/config";

const ENGLISH = new Set([
  "the", "and", "of", "to", "in", "for", "with", "on", "at", "by", "from",
  "is", "are", "was", "were", "this", "that", "my", "your", "our", "i", "you",
  "we", "have", "has", "as", "an", "a", "be", "will", "experience", "team",
]);

/** Function words Indonesian and Malay share. */
const MALAY_FAMILY = new Set([
  "dan", "yang", "untuk", "dengan", "di", "ke", "dari", "pada", "dalam",
  "saya", "kami", "anda", "ini", "itu", "tidak", "akan", "telah", "sebagai",
  "atau", "juga", "serta", "oleh", "kepada", "bagi", "adalah", "ialah",
  "pengalaman", "bekerja", "tahun", "tim", "pasukan",
]);

const INDONESIAN = new Set([
  "karena", "bisa", "perusahaan", "keterampilan", "proyek", "universitas",
  "informasi", "bisnis", "keuangan", "manajemen", "pengelolaan", "saat",
  "sekarang", "memiliki", "tentang", "bapak", "ibu", "yth", "lamaran",
  "posisi", "hormat", "kerja", "tim", "berhasil", "mengurangi", "sebelumnya",
]);

const MALAY = new Set([
  "kerana", "boleh", "syarikat", "kemahiran", "projek", "universiti",
  "maklumat", "perniagaan", "kewangan", "pengurusan", "sahaja", "mempunyai",
  "jawatan", "tuan", "puan", "permohonan", "berjaya", "mengurangkan",
  "pasukan", "kerjaya", "sebelum", "kini",
]);

export function detectLanguage(text: string): Locale {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  let english = 0;
  let malayFamily = 0;
  let indonesian = 0;
  let malay = 0;

  for (const word of words) {
    if (ENGLISH.has(word)) english += 1;
    if (MALAY_FAMILY.has(word)) malayFamily += 1;
    if (INDONESIAN.has(word)) indonesian += 1;
    if (MALAY.has(word)) malay += 1;
  }

  if (malayFamily + indonesian + malay <= english) return "en";
  return malay > indonesian ? "ms" : "id";
}
