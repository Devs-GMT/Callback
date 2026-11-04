Callback — PRD (MVP)


One-liner: Get the callback. Add your CV and a job, and Callback shows how ATS-friendly your CV is, how well it matches the job, and exactly what to change — then re-checks it. Stamp your progress on BOT Chain without putting any personal data on-chain.



Category: AI · Productivity · Feasibility: 🟡 Medium · Target build time: ~5.5 hours · Build Week: 4



1. Must-haves (definition of done)


[ ] MetaMask wallet connect — Connect button, short address shown, auto-switch/add BOT Chain mainnet (chain ID 677)
[ ] 1 core feature works — Add CV + job → report (ATS score, match score, pivot suggestions) → apply suggestions → re-check shows before → after → [Stamp on BOT Chain] tx succeeds → report proof loads by link
[ ] 3 ways to add a CV (upload PDF/DOCX · paste text · link) and 2 ways to add a job (paste text · job URL)
[ ] Website first, then app: marketing site at / with [Check my CV] in navbar + hero; the app at /app
[ ] Desktop-first, fully responsive (section 8)
[ ] Home page with 5+ sections — 10 sections, see section 10
[ ] Mainnet deployment — Contract on BOT Chain mainnet, address in README + footer, visible on scan.botchain.ai
[ ] Live website — Public URL (GitHub Pages + custom domain) + live Worker
[ ] BOT Chain footer — Clickable BOT Chain logo → botchain.ai + View on explorer → mainnet contract (section 13)


2. User flow (the app)


Step 1 · Your CV — three tabs:
Upload — drag & drop PDF or DOCX (≤ 5 MB, ≤ 4 pages); text extracted in the browser
Paste text — big text box (≤ 15,000 characters)
Link — a public URL to a CV page or online portfolio (Google Docs "published to web", Notion public page, personal site); fetched by the Worker. If it fails: "We couldn't read this link — upload or paste instead."
Preview of the extracted text with a [Looks right ✓] button (users can fix extraction mistakes)
Step 2 · The job — two tabs: Paste the description or Job URL (works on most company career pages — Greenhouse, Lever, Workable, Ashby; LinkedIn and some job boards block reading → "Paste the text instead"). Optional: job title + company (auto-filled from the page when possible), seniority.
Step 3 · Analysing — progress steps: Reading your CV → Reading the job → Checking ATS → Matching skills → Writing suggestions (~20–40s)
Step 4 · Your report (tabs):
Overview — two gauges: ATS score and Job match, a one-paragraph verdict ("Strong on data skills, missing stakeholder management and SQL depth"), top 3 fixes
ATS check — checklist with ✓ / ⚠ / ✗ and a fix for each (section 3)
Job match — requirements table: each requirement from the job (Must-have / Nice-to-have) → ✓ Matched / ◐ Partial / ✗ Missing + evidence quote from your CV; keyword coverage (matched vs missing chips); experience & seniority fit; red flags (e.g. required certificate, location, language)
What to pivot — suggestion cards: Rewrite this bullet (before → after, with the job keyword highlighted) · Add these keywords (only if true) · New summary for this job · Move up (put your most relevant role/project first) · Cut or shorten (unrelated details) · Gaps to address (ideas: a project, course, or cover-letter line). Each card: [Accept] [Copy] [Dismiss]
Improved CV — editable text with accepted changes applied (changes highlighted), [Copy] · [Download .docx] (simple ATS-friendly layout) · [Re-check]
Step 5 · Re-check — runs the analysis again on the improved CV → "ATS 64 → 88 · Match 58% → 81%" with a small before/after bar
Step 6 · Export & stamp — [Download report PDF] · [Stamp on BOT Chain] → proof card "Report #31 · Product Analyst · Oct 31, 2026 · Match 81%" + share link ?report=31 (shows only scores, job title and date — never CV content)
My applications — list of jobs you've checked (saved in this browser): job title, company, scores, date, status chip (Not applied · Applied · Interview · Offer · 📞 Callback!) you can change


3. Core logic


Text extraction (browser): PDF via pdf.js (keep reading order; detect 2-column layouts by x-positions and flag them), DOCX via mammoth.js (also detects tables and images). Links and job URLs via the Worker /extract-url (readability-style main text; reuse Inkprint/InstantBlog's endpoint; block private addresses, 5s timeout, 2 MB).



ATS score (0–100, mostly rule-based, explainable):

Text is readable / not an image-only PDF (20)
Standard sections found: Experience, Education, Skills (+ Summary) (20)
Contact info present: email, phone, location/city, LinkedIn or portfolio (10)
Dates consistent and in a standard format (10)
Formatting risks: tables, text boxes, 2 columns, images, headers/footers holding key info (15)
Length: 1–2 pages for most roles (10)
Bullet quality: starts with action verbs, includes numbers/results (15) — AI helps judge this
Each item shows ✓/⚠/✗ + a one-line fix


Job match (0–100%):

AI extracts the job's requirements as JSON: [{ text, type: must | nice, category: skill | experience | education | language | certificate | soft }] + 15–30 keywords
AI checks each requirement against the CV and returns status + an exact quote from the CV as evidence (no quote → not matched)
Keyword coverage is computed in code (case-insensitive, simple synonyms list e.g. "JS" = "JavaScript")
Score = must-haves 60% + nice-to-haves 20% + keyword coverage 20%; seniority mismatch shown as a warning


Pivot suggestions (AI): rewrite bullets using the job's language without inventing anything — prompt rule: "Only rephrase facts that are in the CV. If a keyword isn't supported by the CV, list it under 'Add only if true'." Every rewrite links to the original bullet.



Privacy: CV and job text go to the Worker only for the AI call and are not stored or logged. Reports and applications are saved only in this browser (localStorage, try/catch). A [Delete all my data] button clears everything.



4. Worker (shared Week 1 Worker)


POST /extract-url (reuse) · POST /fit/analyze (requirements + match + bullet quality as JSON) · POST /fit/pivot (suggestions, summary, rewrites)
Key secret, CORS locked, rate limit (e.g. 8 analyses / IP / day), input caps (CV ≤ 15k chars, job ≤ 10k chars), no logging of CV or job text


5. Smart contract (Solidity ^0.8.20)


struct Report { address owner; bytes32 reportHash; bytes32 cvHash; uint8 atsScore; uint8 matchScore; uint256 improvedFrom; string jobTitle; uint64 at; }
Report[] public reports; mapping(address => uint256[]) byOwner;
function stamp(bytes32 reportHash, bytes32 cvHash, uint8 atsScore, uint8 matchScore, uint256 improvedFrom, string calldata jobTitle) external returns (uint256 id) — scores ≤ 100, job title ≤ 60 chars, improvedFrom = 0 or an earlier report of the same owner (to show before → after)
Views: getReport(id), reportsOf(owner), stats() (total reports, total re-checks)
event Stamped(uint256 indexed id, address indexed owner, uint8 atsScore, uint8 matchScore)
Privacy: cvHash = SHA-256 of (CV text + a random salt kept only in the browser), so nobody can guess it; no names, emails or CV text ever go on-chain. No tokens, payments or admin.
README note: scores are computed by the app, so a stamp proves your progress over time, not that an employer agreed.


6. Tech stack


Single-page site: index.html with / (website), /app, /app/report/:id, /app/applications (+ 404.html redirect on GitHub Pages)
ethers.js v6 · pdf.js · mammoth.js · docx (export improved CV) · html2pdf.js (report PDF) · a small gauge/chart in SVG
Worker: shared Cloudflare Worker (/extract-url, /fit/analyze, /fit/pivot)
Contract: Remix → testnet first (chain ID 968, RPC https://rpc.bohr.life, scan.bohr.life) → mainnet (chain ID 677, RPC https://rpc.botchain.ai, scan.botchain.ai)


7. App layout


Desktop (≥ 1280px): left rail (New check · My applications · wallet) · main area: the two input cards side by side (CV | Job) on the start screen; the report as a two-column view — left: tabs content; right (sticky): score gauges, top fixes, [Re-check], [Export], [Stamp]
Report tabs across the top: Overview · ATS check · Job match · What to pivot · Improved CV
Suggestion cards in a single column with before/after diff (red strike / green new text)
The app uses the light side of the brand (#FCFCFC page, white cards), with espresso #1C1009 for the left rail and primary buttons, so it feels like the website's product cards


8. Responsive


Tablet (768–1279px): input cards stacked; report sticky panel becomes a score bar at the top; website sticky-scroll sections become simple stacked blocks
Mobile (< 768px): step-by-step screens (CV → Job → Report); report tabs become a horizontal scroll chip row; sticky bottom bar with scores + [Re-check]; tables become cards; upload also supports the phone's Files app; hero photo card goes full-width with text below it
Touch targets ≥ 44px; no hover-only actions


9. UI direction (from the Amperos screen recording)


Mood: warm, editorial and premium — deep espresso-brown sections alternating with clean near-white sections, elegant serif headlines, real photography mixed with collage art (cut-out objects, torn paper), and small realistic product UI cards floating over the dark background
Colours (sampled from the recording):
Espresso dark sections #1C1009 (cards inside them slightly lighter #231710 / #261912) · primary button espresso #210900 with white text (on light sections) · on dark sections the primary button is white with espresso text
Light page #FCFCFC · soft cards #F7F5F4 · warm stone panel #E8E0DA
Muted text #746B68 · headline text white on dark / near-black on light
Accent lilac #C0A1F7 (collage shapes, torn-paper strip, small highlights) · small status tags: soft yellow ("30 days"), coral red ("Complex denial"), pink-peach panels — reuse them as ✓ / ◐ / ✗ match colours: green-mint for matched, soft yellow for partial, coral for missing
Type: headlines in a refined serif, regular weight, tight leading (free match: "Newsreader" or "Source Serif 4" 400, ~40–56px), body and UI in a small clean sans ("Inter" 400/500, 13–15px), tiny grey labels above section text ("End-to-end insurance recovery" → our "ATS CHECK"); a handwritten script only for small touches (signature, "Follow us")
Buttons: small rectangles with ~4px radius: espresso-filled + outline on light; white-filled + thin outline on dark; text links "Learn More" as small outlined buttons
Layout patterns:
Hero = big photo card with rounded corners inside the dark page, headline + buttons overlaid bottom-left, faint UI sketch lines over the photo
Sticky scroll storytelling: left column text blocks that change as you scroll, right side a product card that animates (claim card → our CV card with score)
Collage carousel cards on light background (cut-out classical bust in a torn circle, paper plane with lilac paper) with title + one line under each and a dot pager
Fading list of headings that brighten as they reach the centre ("Complete visibility / Consistent execution / Ownership through resolution")
Dark rounded panel with numbered steps on the left and stacked white "synced" cards on the right, with a pile of paper documents at the bottom
Dark integration panel with square icon tiles
Footer ends in a torn-paper collage edge (espresso + lilac layers)
Brand touch: a small vintage phone-handset mark in the logo ("Callback") and a ringing-phone collage piece (cut-out retro phone with lilac paper) reused in the hero strip and the success moment "📞 Ready for the callback"
Your own photos, collage art and logo — not Amperos's brand, people or images (use free stock photos or illustrations of job seekers)


10. Website (10 sections, following the Amperos recording)


Navbar (transparent on dark, white on light): serif wordmark Callback with a small handset mark · Features · Who it's for · How it works · FAQ · right: "Connect wallet" text + white (on dark) / espresso (on light) [Check my CV]
Section 1 · Hero (espresso #1C1009) — a large rounded photo card of a confident job seeker at a desk (free stock photo), with faint hand-drawn UI lines (checkboxes, score) over the image; bottom-left: small pill "Sample report → See how Alex went from 58% to 81%", serif H1 "Get the callback.", one line "Upload your CV, paste a job, and see your ATS score, your match and exactly what to change.", white [Check my CV] + outline [See a sample report]; under the card a strip: "Reads CVs and jobs from" + simple text marks: PDF · Word · Google Docs · Greenhouse · Lever · Workable · company career pages (no partnership claims)
Section 2 · Sticky-scroll "What it does" (espresso) — left: serif H2 "Callback works your application end-to-end, from CV to apply", then 4 text blocks that take turns as you scroll, each with a tiny grey label + title + 2 lines + outline [Learn more]: ATS check · Job match · What to pivot · Re-check & export. Right: one floating white product card that changes per block — a CV card with "ATS 64" and a ⚠ "2-column layout" tag → a requirement row "SQL · Must-have · ✗ Missing" with a coral tag → a before/after bullet card → "Match 58% → 81%" card with a small "Re-checked" chip
Section 3 · Stats + collage cards (light #FCFCFC) — left: serif H2 "The rules of applying, rewritten" and one big rotating real stat (reports created · average match improvement after re-check · requirements checked) with a dot pager; right: a carousel of collage cards (#F7F5F4) with your own cut-out art: a magnifier over a CV page ("Get past the ATS"), a paper plane with lilac paper ("Send better applications"), a key in a torn circle ("Unlock the right keywords"), a retro phone ("Get the callback"), a clock ("Save hours per application") — each with a title and one line
Section 4 · Sample report story (light, instead of a customer testimonial) — left: a quote-style card in serif: "My CV said 'managed data'. The job asked for 'SQL dashboards for stakeholders'. Callback showed me the gap — and how to say what I'd actually done." — signed in script "Alex", "Sample persona · Junior Data Analyst" (clearly a sample, not a real customer) + outline [Open the sample report]; right: a large photo/illustration of the persona
Section 5 · Built to be trusted (light, like "Collections that keep moving") — left: a fading list of serif headings that light up as you scroll: Reads any format → Explains every score → Never invents experience → Private by design; centre: a collage of a person with a torn peach/pink paper shape behind, with a small UI card overlaid ("Evidence: 'Built weekly SQL reports for 4 teams' ✓"); right: the short description for the active heading
Section 6 · How it works (dark rounded panel) — left: serif H2 "What if every application got a callback?" + numbered steps (only the active one bright): 01 Add your CV · 02 Add the job · 03 Get your match · 04 Pivot & re-check; right: stacked white cards like synced items — "CV.pdf · read ✓", "Job: Product Analyst · read ✓", "Match report · ready", "Improved CV · re-checked" — each with a small green dot "just now", and a pile of paper CV pages illustrated at the bottom edge
Section 7 · Your application tracker (light) — three soft cards: Match history ("Every job you checked, with scores and status") · Before / after ("See every change you accepted") · Proof on BOT Chain ("Stamp your progress — no personal data")
Section 8 · Works with what you have (dark integration panel) — serif title + square icon tiles: PDF · Word · Google Docs · Notion · LinkedIn (paste) · Career pages
Section 9 · FAQ (light) — "Is it free?" · "Is my CV stored?" (no) · "Why can't it read my LinkedIn job link?" · "Will it make things up?" (no — only rephrases) · "What is an ATS?" · "What goes on BOT Chain?" · "Do I need a wallet?" (only to stamp)
Section 10 · Closing CTA (light) — serif H2 "Your next callback starts here" + espresso [Check my CV] + outline [See a sample report]
Then the footer (section 13).


11. States to handle


No MetaMask → "Install MetaMask" (everything works except stamping); wrong network → "Switch to BOT Chain"
File too big / > 4 pages / wrong type → clear message; image-only (scanned) PDF → "We can't read text in this PDF — export it as text-based PDF or paste the text" (also counts as an ATS ✗)
Link can't be read (login wall, LinkedIn, timeout, private address) → "Paste the text instead"
Job text too short (< 300 chars) → "This doesn't look like a full job description"
Not a CV / not a job (AI check) → friendly warning, user can continue
AI error / rate limit → show the rule-based ATS check anyway + [Retry] for the match
Language: English (default), Indonesian and Malay; other languages still get a report, but treat bullet-quality and keyword parts as rough
Tx pending / rejected / failed → message + retry; unknown ?report= → "Report not found"


12. Out of scope (MVP)


Auto-applying to jobs, scraping LinkedIn, CV design templates, cover-letter generator (maybe later), recruiter accounts, saving CVs on a server, payments, NFTs.



13. Footer (required — creative version)


Concept: the Amperos light footer — link columns, a round badge row, a disclaimer and "Follow us" in script — ending in the torn-paper collage edge (espresso + lilac).



Light #FCFCFC background; link columns in small grey text: Product (Check my CV · Sample report · My applications) · Who it's for (Students · Graduates · Career changers · Tech roles) · Resources (What is an ATS? · CV tips · FAQ) · Company (About · GitHub)
Badge row (where Amperos shows its SOC 2 / HIPAA badges), two small round badges:
"Built on BOT Chain" — round badge with the BOT Chain logo, clickable → https://botchain.ai (new tab)
"Verified on-chain" — round badge with a ✓ and 677; next to it mono 0x12ab…9f3c (copy) and a small espresso button [View on explorer ↗] → https://scan.botchain.ai/address/<MAINNET_CONTRACT_ADDRESS> (new tab); tiny live line "Reports stamped: 31"
Disclaimer paragraph (like Amperos's trademark note): "Callback is an independent project and is not affiliated with any job board or ATS vendor. Names of third-party products are for compatibility only. Scores are guidance, not a hiring guarantee. Your CV is never stored or put on-chain."
Bottom row: "© 2026 Callback. All rights reserved." · Privacy Policy · Terms · script "Follow us" + X and GitHub icons
Torn-paper edge along the very bottom: layered espresso and lilac (#C0A1F7) torn paper strips (your own SVG/PNG)
Contract address in one config constant; on mobile the columns stack, badges sit side by side, and the torn edge scales down


14. Build plan (~5.5h)


0:00–0:30 — Contract (stamp with improvedFrom, views) in Remix; test on testnet
0:30–1:30 — Worker /fit/analyze + /fit/pivot prompts (JSON, evidence quotes, no-invention rule) + reuse /extract-url; rate limits
1:30–2:15 — Extraction: pdf.js (+ column detection), mammoth.js (+ tables), paste, link; preview step; rule-based ATS checks
2:15–3:45 — Report UI: gauges, ATS checklist, requirements table with evidence, keyword chips, pivot cards with Accept, improved CV editor, re-check before/after, exports (PDF report, .docx), My applications, stamp + ?report=
3:45–4:45 — Website: photo hero, sticky-scroll section, collage carousel, sample story, fading list, dark steps panel, integrations, FAQ, CTA, torn-paper footer
4:45–5:10 — Responsive pass (tablet, mobile steps, sticky score bar, simplified scroll effects)
5:10–5:30 — Mainnet deploy, address constant, GitHub Pages + domain; README (privacy, scoring), demo clip (upload CV → paste job URL → report → accept 3 fixes → re-check → stamp), X post tagging @BOTChain_ai


15. Submission checklist


[ ] Mainnet contract address
[ ] Live website link (website + app, AI working on the live domain)
[ ] GitHub repo with Callback.sol + plain-English README (scoring explained, privacy, no API key committed!)
[ ] X post with demo clip (use the sample CV, never a real person's), tagging @BOTChain_ai