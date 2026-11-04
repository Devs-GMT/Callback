import { app } from "@/i18n/messages/en/app";
import { common, legal, meta } from "@/i18n/messages/en/common";
import { report } from "@/i18n/messages/en/report";
import { site } from "@/i18n/messages/en/site";

/**
 * The English dictionary, and the shape every other language must match:
 * `Dictionary` is inferred from it, and `id` and `ms` are typed against it,
 * so a missing or misspelt key in a translation is a type error.
 */
export const en = { common, meta, legal, site, app, report };

export type Dictionary = typeof en;
