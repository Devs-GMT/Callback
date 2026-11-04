"use client";

import { SectionsPanel } from "@/components/app/report/sections-panel";
import type { CvSection } from "@/lib/analysis/cv-layout";

const HEADINGS = [
  "PROFESSIONAL SUMMARY",
  "WEB3 PROJECTS",
  "WORK EXPERIENCE",
  "EDUCATION",
  "LEADERSHIP & ACTIVITIES",
  "TECHNICAL SKILLS",
  "SOFT SKILLS & LANGUAGES",
  "LANGUAGES",
  "ACHIEVEMENTS",
];

const sections = HEADINGS.map(
  (heading) => ({ heading, changed: false, lines: [] }) as CvSection,
);

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[560px] p-4">
      <div className="rounded-[10px] border border-line bg-white p-4">
        <SectionsPanel
          sections={sections}
          hidden={[]}
          onMove={() => {}}
          onRename={() => {}}
          onToggleHidden={() => {}}
          onAdd={() => {}}
        />
      </div>
    </div>
  );
}
