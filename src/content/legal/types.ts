import type { ComponentType } from "react";

/** One legal page in one language: its metadata and its body. */
export type LegalContent = {
  title: string;
  description: string;
  updated: string;
  intro: string;
  Body: ComponentType;
};
