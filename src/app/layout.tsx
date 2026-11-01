import type { Metadata, Viewport } from "next";
import { Caveat, Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { MotionProvider } from "@/components/motion/primitives";

/* PRD §9 type direction: refined serif headlines, small clean sans for body
   and UI, a handwritten script reserved for small touches (the signature in
   §10 §4 and "Follow us" in §13). */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Callback — Get the callback",
    template: "%s · Callback",
  },
  description:
    "Add your CV and a job, and Callback shows how ATS-friendly your CV is, how well it matches the job, and exactly what to change — then re-checks it.",
  applicationName: "Callback",
  keywords: [
    "ATS check",
    "CV checker",
    "resume scanner",
    "job match",
    "applicant tracking system",
  ],
  openGraph: {
    title: "Callback — Get the callback",
    description:
      "Upload your CV, paste a job, and see your ATS score, your match and exactly what to change.",
    siteName: "Callback",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Callback — Get the callback",
    description:
      "Upload your CV, paste a job, and see your ATS score, your match and exactly what to change.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FCFCFC" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1009" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${inter.variable} ${caveat.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-cream text-ink">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
