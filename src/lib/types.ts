/**
 * Domain types shared by the scoring engine, the API routes and the UI.
 *
 * These mirror PRD section 3 (core logic) and section 5 (what gets stamped).
 * Keeping them in one module means the AI response schema, the rule engine and
 * the report UI cannot drift apart.
 */

/* -------------------------------------------------------------------------- */
/* Inputs                                                                     */
/* -------------------------------------------------------------------------- */

/** How the CV text got here. PRD step 1 offers three routes. */
export type CvSource = "upload" | "paste" | "link";

/** How the job text got here. PRD step 2 offers two routes. */
export type JobSource = "paste" | "url";

export type ExtractionWarning =
  /** Two-column layout detected from pdf.js x-positions. */
  | "two-columns"
  /** A text layer exists but is tiny, so likely a scan with partial OCR. */
  | "sparse-text"
  /** DOCX tables found by mammoth. */
  | "tables"
  /** DOCX images found by mammoth. */
  | "images"
  /** Header/footer region appears to hold contact details. */
  | "header-footer";

export type CvInput = {
  text: string;
  source: CvSource;
  fileName?: string;
  /** Page count when known (PDF). Drives the length check. */
  pageCount?: number;
  warnings: ExtractionWarning[];
};

export type Seniority =
  | "unknown"
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "lead";

export type JobInput = {
  text: string;
  source: JobSource;
  title?: string;
  company?: string;
  seniority?: Seniority;
  sourceUrl?: string;
};

/* -------------------------------------------------------------------------- */
/* ATS check: rule-based and explainable                                      */
/* -------------------------------------------------------------------------- */

/** The seven weighted checks. Weights sum to 100. */
export type AtsCheckId =
  | "readable"
  | "sections"
  | "contact"
  | "dates"
  | "formatting"
  | "length"
  | "bullets";

export type CheckState = "pass" | "warn" | "fail";

export type AtsCheckItem = {
  id: AtsCheckId;
  label: string;
  state: CheckState;
  /** Points earned out of `weight`. */
  earned: number;
  weight: number;
  /** What the check saw, in one line. */
  detail: string;
  /** The one-line fix shown next to every item. */
  fix: string;
};

export type AtsReport = {
  /** 0 to 100, the sum of earned points. */
  score: number;
  items: AtsCheckItem[];
};

/* -------------------------------------------------------------------------- */
/* Job match                                                                  */
/* -------------------------------------------------------------------------- */

export type RequirementType = "must" | "nice";

export type RequirementCategory =
  | "skill"
  | "experience"
  | "education"
  | "language"
  | "certificate"
  | "soft";

export type Requirement = {
  id: string;
  text: string;
  type: RequirementType;
  category: RequirementCategory;
};

/** Matched, partial or missing. */
export type MatchStatus = "matched" | "partial" | "missing";

export type RequirementMatch = {
  requirementId: string;
  status: MatchStatus;
  /**
   * Exact quote from the CV that supports the match. The prompt rule is that
   * no quote means not matched, so this is empty only for `missing`.
   */
  evidence: string;
  /** One line explaining the call, shown under the evidence. */
  note: string;
};

export type KeywordCoverage = {
  matched: string[];
  missing: string[];
  /** 0 to 1. Computed in code, not by the model. */
  ratio: number;
};

export type RedFlag = {
  kind: "certificate" | "location" | "language" | "clearance" | "other";
  text: string;
};

export type SeniorityFit = {
  jobLevel: Seniority;
  cvLevel: Seniority;
  /** True when the gap is large enough to warn about. */
  mismatch: boolean;
  note: string;
};

export type MatchReport = {
  /** 0 to 100: must-haves 60% + nice-to-haves 20% + keyword coverage 20%. */
  score: number;
  requirements: Requirement[];
  matches: RequirementMatch[];
  keywords: KeywordCoverage;
  seniority: SeniorityFit;
  redFlags: RedFlag[];
  /** One-paragraph verdict shown on the Overview tab. */
  verdict: string;
};

/* -------------------------------------------------------------------------- */
/* Pivot suggestions                                                          */
/* -------------------------------------------------------------------------- */

export type SuggestionKind =
  | "rewrite" /* Rewrite this bullet, before to after */
  | "keywords" /* Add these keywords, only if true */
  | "summary" /* New summary for this job */
  | "moveup" /* Move up: put the most relevant role first */
  | "cut" /* Cut or shorten unrelated details */
  | "gap"; /* Gaps to address */

export type Suggestion = {
  id: string;
  kind: SuggestionKind;
  title: string;
  /**
   * The original CV text this suggestion refers to. Every rewrite links to its
   * source bullet, so this is required for `rewrite` and `cut`.
   */
  before?: string;
  /** The proposed replacement. */
  after?: string;
  /** Job keywords this suggestion introduces, for highlighting. */
  keywords?: string[];
  /** Why this helps, in one line. */
  rationale: string;
  /**
   * True when the suggestion adds a keyword the CV does not support. The
   * no-invention rule means these are shown under "Add only if true" and are
   * never applied automatically.
   */
  needsUserConfirmation?: boolean;
};

export type SuggestionDecision = "pending" | "accepted" | "dismissed";

/* -------------------------------------------------------------------------- */
/* Report                                                                     */
/* -------------------------------------------------------------------------- */

export type ApplicationStatus =
  | "not-applied"
  | "applied"
  | "interview"
  | "offer"
  | "callback";

export type StampInfo = {
  /** On-chain report id returned by `stamp()`. */
  onChainId: number;
  txHash: string;
  owner: string;
  stampedAt: number;
};

export type Report = {
  /** Local id. The on-chain id lives in `stamp`. */
  id: string;
  createdAt: number;
  jobTitle: string;
  company: string;
  ats: AtsReport;
  match: MatchReport;
  suggestions: Suggestion[];
  decisions: Record<string, SuggestionDecision>;
  /** CV text this report was computed from. */
  cvText: string;
  /** CV text with accepted suggestions applied. */
  improvedCvText: string;
  jobText: string;
  /** Set on a re-check: the id of the report this one improved on. */
  improvedFromId?: string;
  /** Scores of the report this one improved on, for the before/after bar. */
  previousScores?: { ats: number; match: number };
  status: ApplicationStatus;
  stamp?: StampInfo;
  /** Warnings carried over from extraction, shown on the ATS tab. */
  warnings: ExtractionWarning[];
  /** The cover letter, once one has been written for this job. */
  coverLetter?: CoverLetter;
};

/* -------------------------------------------------------------------------- */
/* Cover letter                                                               */
/* -------------------------------------------------------------------------- */

export type CoverLetterTone = "professional" | "warm" | "confident";
export type CoverLetterLength = "short" | "standard";

/** A body paragraph and the CV quotes that back every claim in it. */
export type CoverLetterParagraph = {
  text: string;
  /** Verified against the CV: each one appears in it. */
  evidence: string[];
};

export type CoverLetterDraft = {
  /** "Dear Ms Rivera," or "Dear Hiring Manager," */
  greeting: string;
  /** Names the role and why this candidate; no CV claims needed. */
  opening: string;
  body: CoverLetterParagraph[];
  closing: string;
  /** "Kind regards," — the candidate's name is added from the CV. */
  signOff: string;
};

export type CoverLetterOptions = {
  tone: CoverLetterTone;
  length: CoverLetterLength;
  hiringManager?: string;
  /** In the user's own words: why this company. The only company facts used. */
  motivation?: string;
};

export type CoverLetter = CoverLetterDraft & {
  options: CoverLetterOptions;
  createdAt: number;
  /** Hand edits, as plain text. Once set, it is what is shown and exported. */
  editedText?: string;
};

/**
 * A row in "My applications". Derived from reports but kept flat so the list
 * renders without loading every full report.
 */
export type ApplicationRow = {
  reportId: string;
  jobTitle: string;
  company: string;
  atsScore: number;
  matchScore: number;
  createdAt: number;
  status: ApplicationStatus;
  stamped: boolean;
};

/* -------------------------------------------------------------------------- */
/* API contracts                                                              */
/* -------------------------------------------------------------------------- */

export type AnalyzeRequest = {
  cvText: string;
  jobText: string;
  jobTitle?: string;
  seniority?: Seniority;
};

/** What the model returns for /api/fit/analyze. Scores are computed in code. */
export type AnalyzeResponse = {
  requirements: Requirement[];
  matches: RequirementMatch[];
  keywords: string[];
  redFlags: RedFlag[];
  seniority: { jobLevel: Seniority; cvLevel: Seniority; note: string };
  /** The model's read on bullet quality, feeding the bullets check. */
  bulletQuality: {
    /** 0 to 15, the weight of the bullets check. */
    score: number;
    detail: string;
    weakBullets: string[];
  };
  /** Friendly warning when the input does not look like a CV or a job. */
  looksLikeCv: boolean;
  looksLikeJob: boolean;
  verdict: string;
};

export type PivotRequest = {
  cvText: string;
  jobText: string;
  jobTitle?: string;
  /** Unmatched or partial requirements, so the model targets real gaps. */
  gaps: string[];
  missingKeywords: string[];
};

export type PivotResponse = {
  suggestions: Suggestion[];
};

export type CoverLetterRequest = CoverLetterOptions & {
  cvText: string;
  jobText: string;
  jobTitle?: string;
  company?: string;
  /** Matched requirements with their CV quote, the letter's raw material. */
  strengths: Array<{ requirement: string; evidence: string }>;
  /** Unmet requirements, so the letter can address one honestly. */
  gaps: string[];
};

export type CoverLetterResponse = CoverLetterDraft;

export type ApiErrorCode =
  | "bad_request"
  | "rate_limited"
  | "upstream_error"
  | "not_configured"
  | "blocked_url"
  | "fetch_failed"
  | "too_large"
  | "timeout";

export type ApiError = {
  error: string;
  /** Machine-readable reason so the UI can pick the right message. */
  code: ApiErrorCode;
  /** Seconds until the limit resets, when code is `rate_limited`. */
  retryAfter?: number;
};
