# Callback

**Get the callback.** Add your CV and a job, and Callback shows how ATS-friendly
your CV is, how well it matches the job, and exactly what to change — then
re-checks it. Optionally stamp your progress on BOT Chain, without putting any
personal data on-chain.

- **Live site:** _add the Vercel URL here after the first deploy_
- **Contract (BOT Chain mainnet, chain 677):** _add the address here after
  deploying — see [Deploying the contract](#deploying-the-contract)_
- **Explorer:** https://scan.botchain.ai

---

## What it actually does

1. **You add a CV** — upload a PDF or `.docx`, paste the text, or give a public
   link. Files are parsed **in your browser**; the file itself is never
   uploaded.
2. **You see what we read.** Extraction from a PDF is never perfect, so the
   text is shown back to you to correct before anything is scored.
3. **You add the job** — paste the description, or give the URL of a career
   page.
4. **You get a report** with an ATS score, a job match percentage, every
   requirement checked with a quote from your own CV as evidence, and suggested
   rewrites.
5. **You accept the changes you agree with**, re-check, and watch both scores
   move.
6. **You export** the report as a PDF and the improved CV as an ATS-friendly
   `.docx` — and optionally stamp the result on BOT Chain.

---

## How the scores are calculated

Both numbers are computed in code, not by the AI, so the same inputs always
produce the same output. The AI's job is to read and judge; the arithmetic is
ours and is published here.

### ATS score — 0 to 100

Seven weighted, rule-based checks. Each one shows ✓ / ⚠ / ✗, the points it
earned, what it saw, and a one-line fix.

| Check | Points | What it looks for |
|---|--:|---|
| Text is readable | 20 | Enough extractable text. An image-only (scanned) PDF fails this outright. |
| Standard sections found | 20 | Experience, Education and Skills (6 each), plus a Summary (2). |
| Contact details present | 10 | Email (3), phone (3), city or location (2), LinkedIn or portfolio (2). |
| Dates are consistent | 10 | Dates present, in one dominant format, with real ranges rather than bare years. |
| No formatting risks | 15 | Starts at 15, then deducts: two columns −6, tables −4, images −3, details in a header/footer −2. |
| Length is right | 10 | 1–2 pages full marks, 3 pages partial, 4+ fails. Estimated from word count when no page count is available. |
| Bullet quality | 15 | Bullets that start with a strong verb and carry a number or result. **This is the one AI-assisted check**; if the AI is unavailable, a rule-based fallback scores it from action verbs and quantified results. |

Source: [`src/lib/analysis/ats.ts`](src/lib/analysis/ats.ts).

### Job match — 0 to 100%

```
score = must-haves (60%) + nice-to-haves (20%) + keyword coverage (20%)
```

- Each requirement is **matched** (full credit), **partial** (half credit) or
  **missing** (none).
- **Empty buckets are redistributed, not scored as zero.** If a job has no
  nice-to-haves, or no keywords could be read from it, that weight is spread
  across the buckets that do have content — otherwise a perfect CV would be
  capped at 80% for a reason that has nothing to do with the CV.
- **Keyword coverage is computed in code**, case-insensitively, with a synonym
  list — so a CV saying "Postgres" covers a job asking for "PostgreSQL", and
  "JS" counts as "JavaScript". Keywords are de-duplicated by canonical form so
  a job listing both forms is not counted twice.
- A **seniority mismatch is a warning, not a deduction.** Being over- or
  under-levelled is information, not a 20-point penalty.

Source: [`src/lib/analysis/match.ts`](src/lib/analysis/match.ts),
[`src/lib/analysis/keywords.ts`](src/lib/analysis/keywords.ts).

### Why you can trust the match

The prompt tells the model that a requirement only counts if it can quote the
supporting line from the CV. **That instruction is then enforced in code**: every
quote is checked against the CV text, and a claimed match whose quote is not
actually there is demoted to partial or missing before it reaches your score.
Guessing costs the model the match it was trying to claim.

See `verifyEvidence` in [`src/lib/analysis/match.ts`](src/lib/analysis/match.ts).

### The no-invention rule

Rewrites may only rephrase facts already in your CV. A keyword your CV does not
support is **never written in for you** — it appears in an "add only if true"
card for you to accept or reject, and accepting it changes nothing in the CV
text. Suggestions of that kind are excluded from the automatic apply step by
design.

See [`src/lib/ai/prompts.ts`](src/lib/ai/prompts.ts) and
[`src/lib/analysis/apply.ts`](src/lib/analysis/apply.ts).

---

## Privacy

- **Files never leave your browser.** PDF parsing uses pdf.js and `.docx`
  parsing uses mammoth, both client-side.
- **Your CV text is sent to one place, once:** our API route, to make the AI
  call. It is not written to a database, a file, or a log — there is no logging
  of CV or job text anywhere in the request path, including the error branches.
  Requests go to Gemini with `store: false`.
- **Reports live in your browser** (`localStorage`), never on a server. Every
  read and write is wrapped in try/catch, so a browser blocking storage
  degrades to "no history" rather than crashing.
- **"Delete all my data"** on the My applications page removes every report and
  the hash salt.
- **Rate limiting stores a counter per IP and nothing else** — no CV text, no
  record of what was analysed.

### What goes on-chain

Only if you press **Stamp on BOT Chain**:

| Stored | Not stored |
|---|---|
| Hash of the report | Your name |
| Salted SHA-256 of your CV text | Your email or phone |
| ATS score, match score | Any CV text |
| Job title (≤ 60 bytes) | The company name |
| Id of the earlier report it improved on | Anything else |
| Timestamp, and the sending wallet address | |

The CV hash is salted with a random value generated in your browser that
**never leaves it**. Without the salt, anyone holding a copy of your CV could
hash it and confirm it matched an on-chain record. With it, they cannot.

> **Honest caveat:** the scores are computed by this app. A stamp proves **your
> own progress over time** — it is not a claim that an employer agreed with the
> score, and it is not a credential.

---

## The contract

[`contracts/contracts/Callback.sol`](contracts/contracts/Callback.sol),
Solidity `^0.8.20`. No tokens, no payments, no admin role, no upgrade path.
Anyone can stamp their own reports; nobody can alter or remove them.

```solidity
function stamp(
    bytes32 reportHash,
    bytes32 cvHash,
    uint8   atsScore,     // ≤ 100
    uint8   matchScore,   // ≤ 100
    uint256 improvedFrom, // 0, or an earlier report of yours
    string calldata jobTitle // ≤ 60 bytes
) external returns (uint256 id);

function getReport(uint256 id) external view returns (Report memory);
function reportsOf(address owner) external view returns (uint256[] memory);
function stats() external view returns (uint256 totalReports, uint256 totalRechecks);
```

**One design note worth reading:** report ids start at **1**, not 0. The
constructor pushes an unusable placeholder at index 0 whose owner is
`address(0)`. That is because `improvedFrom == 0` means "this is a first check",
so id 0 could not also be a real report. The placeholder's zero owner means it
can never pass the parent-ownership check either.

`improvedFrom` must be an existing report **owned by the caller**, which is what
makes a before/after chain trustworthy — you cannot claim someone else's score
as your "before".

### Tests

26 tests covering the id scheme, the score and title bounds, the re-check
ownership rules, the views, and the absence of any privileged entry point.

```bash
cd contracts
npm install
npm test
```

### Deploying the contract

Deployment is done by hand in Remix, so **no private key is needed anywhere in
this repo** and none is configured.

1. Open [Remix](https://remix.ethereum.org) and paste in `Callback.sol`.
2. Compile with Solidity 0.8.20 or later.
3. Deploy to **BOT Chain testnet** first — chain ID `968`, RPC
   `https://rpc.bohr.life`, explorer `https://scan.bohr.life`. Stamp a test
   report and a re-check against it.
4. Deploy to **BOT Chain mainnet** — chain ID `677`, RPC
   `https://rpc.botchain.ai`, explorer `https://scan.botchain.ai`.
5. Put the mainnet address in `NEXT_PUBLIC_CONTRACT_ADDRESS` and in the
   [top of this README](#callback).

Until that variable is set, the stamping UI is **disabled with an explanation**
rather than broken, and every other feature works.

---

## Running it locally

Requires Node 22 or later.

```bash
npm install
cp .env.example .env.local   # then add your Gemini key
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (copies the pdf.js worker into `public/` first) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Node test runner — the SSRF address-range tests |
| `npm run contracts:test` | The Solidity test suite |

### Environment

See [`.env.example`](.env.example). **No key is committed, and `.env*.local` is
gitignored.**

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | For the AI features | Free tier key from [AI Studio](https://aistudio.google.com/apikey) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Recommended in production | Makes the rate limit real — see below |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | For stamping | Deployed `Callback.sol` address |
| `NEXT_PUBLIC_USE_TESTNET=1` | Optional | Point at BOT Chain testnet (968) instead of mainnet |

**Without a Gemini key** the app still runs: the rule-based ATS check works in
full, and the job match tab explains itself and offers a retry.

**Without Upstash** the per-IP limit falls back to an in-process counter that
resets on every cold start — fine locally, not a real limit on Vercel.

---

## Deploying to Vercel

1. Import the repository.
2. Add the environment variables above (Production and Preview).
3. Deploy. `next build` runs the pdf.js worker copy automatically via
   `prebuild`.

The `contracts/` directory is its own package and is **not** installed by the
Vercel build, so no Solidity toolchain is pulled into the deploy.

---

## How it's built

| Area | Choice | Why |
|---|---|---|
| Framework | Next.js 16, App Router, React 19, TypeScript | Cache Components on, so the marketing pages are fully static and the app shell prerenders |
| Styling | Tailwind CSS v4 | Design tokens from the brief live in `@theme` in `globals.css` |
| AI | Gemini via `@google/genai` | The only candidate with a genuine free tier, and its `response_format` JSON Schema is enforced by the decoder rather than merely requested. Behind one adapter (`src/lib/ai/provider.ts`) so swapping providers is a one-file change |
| Extraction | pdf.js, mammoth | Client-side, which is what keeps the privacy promise literal |
| Chain | ethers v6 | MetaMask, chain add/switch, and read-only RPC for share links |
| CV export | `docx` | A real Word list and real headings, not a text dump |
| Report export | `jsPDF` text API | **Not** html2pdf.js: that screenshots the DOM, so the text would not be selectable or searchable and the file would be megabytes. This writes vector text |
| Artwork | Hand-authored SVG | The collage, the handset mark and the torn-paper edge are drawn in this repo. No stock licence, no stale bitmaps, scales to any width |

### Notable implementation details

- **Two-column PDFs are detected, not silently fixed.** `src/lib/extract/pdf.ts`
  looks for a vertical gutter that almost no text crosses, reads each column in
  order, *and* raises a warning — because an ATS would interleave the columns,
  and that is something you need to know rather than something to paper over.
- **The link reader is fenced in.** `src/lib/server/safe-fetch.ts` validates
  every redirect hop, checks every address DNS returns, and allows only http/https
  on default ports. `npm test` covers the address ranges in both directions —
  including NAT64, where blocking the whole `64:ff9b::/96` prefix would have made
  every IPv4-only host unreachable from a DNS64 network, Greenhouse included.
- **An AI failure is a first-class outcome.** A failed analysis still produces a
  saved report with the full rule-based ATS check and a retry, rather than an
  error screen.

---

## Scope

Not included, by design: auto-applying to jobs, scraping LinkedIn, CV design
templates, a cover-letter generator, recruiter accounts, server-side CV storage,
multiple languages, payments, NFTs.

---

## Disclaimer

Callback is an independent project and is not affiliated with, sponsored by or
endorsed by any job board or ATS vendor. Names of third-party products are used
to describe compatibility only and remain the trademarks of their respective
owners. **Scores are guidance, not a hiring guarantee.** Your CV is never stored
and never put on-chain.
