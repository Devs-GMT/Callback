import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/site/legal-page";
import { ACTIVE_CHAIN, LIMITS } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Callback does and does not do with your CV. Short version: files are parsed in your browser, text is never stored, and nothing personal goes on-chain.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="Last updated 1 November 2026"
      intro="Callback is built so that there is very little to write a privacy policy about. Your CV is parsed in your browser, its text is sent to one AI service for one request and never stored, and your reports live in your own browser. This page says exactly that, in more detail."
    >
      <LegalSection heading="What happens to your CV">
        <p>
          When you upload a PDF or Word file, it is <strong>read entirely in
          your browser</strong>. The file itself is never uploaded anywhere.
        </p>
        <p>
          The extracted text is sent to our server for one purpose: to run the
          AI analysis that produces your job match and your suggestions. We do
          not write it to a database, a file, or a log. Once the request
          finishes, the server has no copy of it.
        </p>
        <p>
          The AI provider is Google&apos;s Gemini API. Requests are sent with
          retention turned off, so the provider is instructed not to store the
          content either.
        </p>
        <p>
          If you use the <strong>Link</strong> option instead, our server
          fetches the public page you name and extracts its text. It will refuse
          anything that is not a public web page.
        </p>
      </LegalSection>

      <LegalSection heading="What is stored, and where">
        <p>
          Your reports, your improved CVs and your application statuses are
          stored in your browser&apos;s <strong>localStorage</strong>. They do
          not reach our servers and they are not synced between your devices.
        </p>
        <p>
          That also means: clearing your browser data deletes them, and they are
          not recoverable. There is a <strong>Delete all my data</strong> button
          on the My applications page that removes everything, including the
          hash salt described below.
        </p>
        <p>
          We keep a <strong>count of requests per IP address</strong> for up to
          24 hours, to enforce the fair-use limit of {LIMITS.analysesPerDay}{" "}
          analyses per day. It holds a counter and nothing else — no CV text, no
          job text, and no record of what was analysed.
        </p>
      </LegalSection>

      <LegalSection heading="What goes on the blockchain">
        <p>
          Nothing, unless you press <strong>Stamp on BOT Chain</strong>. That is
          optional, and every other feature works without it.
        </p>
        <p>If you do stamp a report, the transaction records:</p>
        <ul className="flex flex-col gap-1.5">
          <li>a hash of the report&apos;s scores, job title and date;</li>
          <li>
            a <strong>salted</strong> SHA-256 hash of your CV text;
          </li>
          <li>your ATS score and your match percentage;</li>
          <li>the job title, up to 60 characters;</li>
          <li>the id of the earlier report this one improved on, if any;</li>
          <li>a timestamp, and the wallet address that sent it.</li>
        </ul>
        <p>
          It does <strong>not</strong> record your name, your email address, the
          company name, or any part of your CV&apos;s text.
        </p>
        <p>
          The salt is a random value generated in your browser that never leaves
          it. Without it, somebody holding a copy of your CV could hash it and
          confirm it matched an on-chain record. With it, they cannot.
        </p>
        <p>
          A blockchain is permanent and public. A stamp cannot be deleted or
          edited afterwards — by you, by us, or by anyone. Your wallet address is
          visible on {ACTIVE_CHAIN.name}, as it is for any transaction.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies and tracking">
        <p>
          Callback sets no cookies, runs no analytics, and embeds no third-party
          trackers, advertising pixels or social widgets.
        </p>
        <p>
          The site is hosted on Vercel, which keeps standard server access logs
          — including IP addresses — as part of operating the platform.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Because your data is in your own browser, you exercise most data
          rights directly: you can see everything stored, and delete all of it,
          from the My applications page.
        </p>
        <p>
          We hold no account for you, so there is no profile to export or
          correct. If you are in the UK or EU and believe something here is
          wrong, raise it on the project&apos;s GitHub repository.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          Callback is intended for people old enough to be looking for work. It
          is not directed at children under 13.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          If this policy changes in a way that affects what happens to your CV,
          the change will be reflected here and in the repository&apos;s history,
          which is public.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
