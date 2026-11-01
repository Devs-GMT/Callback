/**
 * Keyword coverage.
 *
 * PRD section 3 is explicit that coverage is computed in code, not by the
 * model: case-insensitive, with a simple synonyms list so "JS" counts as
 * "JavaScript". Keeping it deterministic means the same CV and job always
 * produce the same coverage number, which is what makes the before/after
 * comparison on a re-check meaningful.
 */

import type { KeywordCoverage } from "@/lib/types";

/**
 * Synonym groups. Every term in a group is treated as the same keyword, so a
 * CV saying "Postgres" covers a job asking for "PostgreSQL".
 */
const SYNONYM_GROUPS: string[][] = [
  ["javascript", "js", "ecmascript"],
  ["typescript", "ts"],
  ["react", "reactjs", "react.js"],
  ["next.js", "nextjs", "next js"],
  ["node.js", "nodejs", "node"],
  ["vue", "vuejs", "vue.js"],
  ["angular", "angularjs"],
  ["postgresql", "postgres", "psql"],
  ["mysql", "my sql"],
  ["mongodb", "mongo"],
  ["sql server", "mssql", "microsoft sql server"],
  ["power bi", "powerbi", "microsoft power bi"],
  ["tableau", "tableau desktop"],
  ["looker", "looker studio", "google data studio", "data studio"],
  ["excel", "microsoft excel", "ms excel", "spreadsheets"],
  ["google sheets", "sheets"],
  ["python", "py"],
  ["r", "r language"],
  ["golang", "go lang"],
  ["c#", "csharp", "c sharp", ".net", "dotnet"],
  ["aws", "amazon web services"],
  ["gcp", "google cloud", "google cloud platform"],
  ["azure", "microsoft azure"],
  ["kubernetes", "k8s"],
  ["docker", "containers", "containerisation", "containerization"],
  ["ci/cd", "cicd", "continuous integration", "continuous delivery"],
  ["github actions", "gh actions"],
  ["terraform", "iac", "infrastructure as code"],
  ["machine learning", "ml"],
  ["artificial intelligence", "ai"],
  ["natural language processing", "nlp"],
  ["large language model", "llm", "llms"],
  ["etl", "elt", "data pipeline", "data pipelines"],
  ["data warehouse", "data warehousing", "warehouse"],
  ["dbt", "data build tool"],
  ["airflow", "apache airflow"],
  ["spark", "apache spark", "pyspark"],
  ["a/b testing", "ab testing", "split testing", "experimentation"],
  ["kpi", "kpis", "key performance indicator", "key performance indicators"],
  ["okr", "okrs"],
  ["stakeholder management", "stakeholder engagement", "stakeholders"],
  ["project management", "project delivery"],
  ["product management", "product ownership"],
  ["agile", "scrum", "kanban", "sprints"],
  ["jira", "atlassian jira"],
  ["confluence", "atlassian confluence"],
  ["figma", "figma design"],
  ["adobe photoshop", "photoshop", "ps"],
  ["adobe illustrator", "illustrator", "ai file"],
  ["ux", "user experience"],
  ["ui", "user interface"],
  ["seo", "search engine optimisation", "search engine optimization"],
  ["sem", "paid search", "ppc", "google ads", "adwords"],
  ["crm", "customer relationship management"],
  ["salesforce", "sfdc"],
  ["hubspot", "hub spot"],
  ["erp", "enterprise resource planning"],
  ["sap", "sap erp"],
  ["accounts payable", "ap"],
  ["accounts receivable", "ar"],
  ["financial modelling", "financial modeling", "financial models"],
  ["forecasting", "forecast", "forecasts"],
  ["quality assurance", "qa", "testing"],
  ["test automation", "automated testing", "automation testing"],
  ["rest api", "restful api", "rest apis", "api", "apis"],
  ["graphql", "graph ql"],
  ["microservices", "micro services"],
  ["git", "version control"],
  ["linux", "unix"],
  ["communication", "communication skills"],
  ["teamwork", "collaboration", "team player"],
  ["problem solving", "problem-solving"],
  ["leadership", "people management", "team leadership"],
  ["mentoring", "coaching", "mentorship"],
  ["customer service", "customer support", "client service"],
  ["data analysis", "data analytics", "analytics"],
  ["data visualisation", "data visualization", "dataviz", "dashboards"],
  ["statistics", "statistical analysis"],
  ["html", "html5"],
  ["css", "css3"],
  ["tailwind", "tailwind css", "tailwindcss"],
  ["sass", "scss"],
  ["accessibility", "a11y", "wcag"],
  ["responsive design", "mobile first", "mobile-first"],
];

/** Lookup from any term to its group's canonical first term. */
const CANONICAL = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  const canonical = group[0];
  for (const term of group) CANONICAL.set(term, canonical);
}

/** Every alias that maps to the same canonical term as `keyword`. */
function aliasesFor(keyword: string): string[] {
  const key = normaliseKeyword(keyword);
  const canonical = CANONICAL.get(key);
  if (!canonical) return [key];
  const group = SYNONYM_GROUPS.find((g) => g[0] === canonical);
  return group ? group.map(normaliseKeyword) : [key];
}

export function normaliseKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/ /g, " ")
    .replace(/[“”"'’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Characters that need escaping before a keyword goes into a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whether `haystack` contains `term`.
 *
 * Word boundaries are applied only where they make sense: `\b` does not fire
 * next to `+`, `#` or `.`, so terms like "C#", "C++" and ".NET" are matched
 * with a looser guard that just rejects an adjacent letter or digit.
 */
function containsTerm(haystack: string, term: string): boolean {
  if (term.length === 0) return false;
  const escaped = escapeRegExp(term);
  const startsWithWordChar = /^[\p{L}\p{N}]/u.test(term);
  const endsWithWordChar = /[\p{L}\p{N}]$/u.test(term);
  const lead = startsWithWordChar ? "(?<![\\p{L}\\p{N}])" : "(?<![\\p{L}\\p{N}])";
  const trail = endsWithWordChar ? "(?![\\p{L}\\p{N}])" : "(?![\\p{L}\\p{N}])";
  try {
    return new RegExp(`${lead}${escaped}${trail}`, "iu").test(haystack);
  } catch {
    // A pathological keyword should never break the report.
    return haystack.toLowerCase().includes(term);
  }
}

/** True when the CV covers this job keyword, directly or via a synonym. */
export function cvCoversKeyword(cvText: string, keyword: string): boolean {
  const haystack = normaliseKeyword(cvText);
  return aliasesFor(keyword).some((alias) => containsTerm(haystack, alias));
}

/**
 * Split job keywords into matched and missing.
 *
 * Keywords are de-duplicated by canonical form so a job listing both "JS" and
 * "JavaScript" is not counted twice, which would otherwise distort coverage.
 */
export function computeKeywordCoverage(
  cvText: string,
  jobKeywords: string[],
): KeywordCoverage {
  const haystack = normaliseKeyword(cvText);
  const seen = new Set<string>();
  const matched: string[] = [];
  const missing: string[] = [];

  for (const raw of jobKeywords) {
    const keyword = raw.trim();
    if (keyword.length === 0) continue;

    const key = normaliseKeyword(keyword);
    const canonical = CANONICAL.get(key) ?? key;
    if (seen.has(canonical)) continue;
    seen.add(canonical);

    const covered = aliasesFor(keyword).some((alias) =>
      containsTerm(haystack, alias),
    );
    if (covered) matched.push(keyword);
    else missing.push(keyword);
  }

  const total = matched.length + missing.length;
  return { matched, missing, ratio: total === 0 ? 0 : matched.length / total };
}

/**
 * Find the sentence in the CV that mentions a keyword, for the evidence chip
 * in the keyword list. Returns an empty string when the keyword is absent.
 */
export function keywordContext(cvText: string, keyword: string): string {
  const aliases = aliasesFor(keyword);
  const lines = cvText.split(/\n|(?<=[.!?])\s+/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (aliases.some((alias) => containsTerm(trimmed, alias))) {
      return trimmed.length > 180 ? `${trimmed.slice(0, 177)}…` : trimmed;
    }
  }
  return "";
}
