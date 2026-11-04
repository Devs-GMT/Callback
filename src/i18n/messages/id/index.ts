import type { Dictionary } from "@/i18n/messages/en";
import { app } from "@/i18n/messages/id/app";
import { common, legal, meta } from "@/i18n/messages/id/common";
import { report } from "@/i18n/messages/id/report";
import { site } from "@/i18n/messages/id/site";

/** Kamus bahasa Indonesia. Bentuknya mengikuti `en`, jadi kunci yang hilang adalah error tipe. */
export const id: Dictionary = { common, meta, legal, site, app, report };
