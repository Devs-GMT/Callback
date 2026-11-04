import { LegalSection } from "@/components/site/legal-page";
import { ACTIVE_CHAIN, LIMITS } from "@/lib/config";
import type { LegalContent } from "@/content/legal/types";

export const termsEn: LegalContent = {
  title: "Terms",
  description:
    "The terms of using Callback. Short version: it is a free guidance tool, the scores are our opinion rather than an employer's, and you are responsible for what your CV says.",
  updated: "Last updated 1 November 2026",
  intro:
    "Callback is a free tool that scores your CV against a job and suggests changes. These terms set out what that does and does not promise.",
  Body: function TermsBodyEn() {
    return (
      <>
        <LegalSection heading="What Callback is">
          <p>
            Callback reads your CV and a job description, and returns an ATS score,
            a match percentage, and suggested edits. It is{" "}
            <strong>guidance, not a hiring guarantee</strong>.
          </p>
          <p>
            The scores are computed by this app, using the rules published on the
            ATS check tab and in the repository. No employer, recruiter or
            applicant tracking system has reviewed or endorsed them. A high score
            here does not mean an employer will agree, and a low one does not mean
            you are not right for the job.
          </p>
        </LegalSection>

        <LegalSection heading="Your CV is your responsibility">
          <p>
            Suggested rewrites are built only from facts already in your CV, and
            any keyword your CV does not support is shown separately for you to
            accept or reject rather than being written in for you.
          </p>
          <p>
            Even so, <strong>you are responsible for what your CV says</strong>.
            Read every change before you use it. Do not accept a suggestion that
            makes a claim you cannot stand behind in an interview.
          </p>
        </LegalSection>

        <LegalSection heading="Fair use">
          <p>
            Analyses are limited to {LIMITS.analysesPerDay} per day per IP
            address, so the shared AI quota is not exhausted by one user. Do not
            attempt to circumvent that limit, and do not use the service to
            process other people&apos;s CVs without their knowledge.
          </p>
          <p>
            The link-reading feature fetches public web pages only. Do not use it
            to probe systems you do not own.
          </p>
        </LegalSection>

        <LegalSection heading="Third-party names">
          <p>
            Callback is an <strong>independent project</strong> and is not
            affiliated with, sponsored by, or endorsed by any job board, applicant
            tracking system, or document vendor. Names such as Greenhouse, Lever,
            Workable, Ashby, LinkedIn, Notion, Google Docs and Microsoft Word are
            used to describe compatibility only, and remain the trademarks of
            their respective owners.
          </p>
        </LegalSection>

        <LegalSection heading="On-chain stamps">
          <p>
            Stamping a report is optional and writes a transaction to{" "}
            {ACTIVE_CHAIN.name}. You pay the network fee from your own wallet;
            Callback takes no payment and there is no token.
          </p>
          <p>
            Transactions are <strong>permanent and public</strong>, and cannot be
            reversed, edited or deleted by anyone once confirmed. A stamp records
            your own progress over time. It is not a credential, and it does not
            certify anything about your skills or your employment history.
          </p>
          <p>You are responsible for the security of your own wallet.</p>
        </LegalSection>

        <LegalSection heading="No warranty">
          <p>
            The service is provided as-is, without warranty of any kind. Text
            extraction can misread an unusual layout, and the AI analysis can be
            wrong — which is why every match shows the quote it relied on, so you
            can check it.
          </p>
          <p>
            To the extent the law allows, Callback and its contributors are not
            liable for any loss arising from use of the service, including any
            outcome of a job application.
          </p>
        </LegalSection>

        <LegalSection heading="Availability">
          <p>
            This is a free project with no uptime commitment. The AI features
            depend on a third-party API and may be unavailable. When that happens
            the rule-based ATS check still runs, so you are not left with nothing.
          </p>
        </LegalSection>
      </>
    );
  },
};
