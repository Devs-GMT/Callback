/** The marketing site: navbar, the ten sections, the footer. */
export const site = {
  nav: {
    label: "Main",
    links: {
      features: "Features",
      who: "Who it's for",
      how: "How it works",
      faq: "FAQ",
    },
    connectWallet: "Connect wallet",
    checkCv: "Check my CV",
    openMenu: "Open the menu",
    closeMenu: "Close the menu",
    home: "Callback — home",
  },

  hero: {
    photoAlt: "A job seeker smiling as she takes a phone call at her desk",
    callFrom: "Hiring team · Acme",
    incoming: "Incoming call…",
    jobMatch: "Job match",
    rechecked: "Re-checked",
    rewritesNote: "3 rewrites accepted · nothing invented",
    sampleTag: "Sample report",
    sampleLine: "See how Alex went from 58% to 81%",
    sampleTagShort: "Sample",
    title: "Get the callback.",
    titleAccent: "callback",
    lede: "Upload your CV, paste a job, and see your ATS score, your match and exactly what to change — then re-check it.",
    ledeShort:
      "Upload your CV, paste a job, and see your ATS score, your match and exactly what to change.",
    cta: "Check my CV",
    sample: "See a sample report",
    readsFrom: "Reads CVs and jobs from",
    careerPages: "Company career pages",
  },

  whatItDoes: {
    eyebrow: "What it does",
    title: "Callback works your application end-to-end, from CV to apply.",
    titleAccent: "end-to-end,",
    learnMore: "Learn more",
    blocks: [
      {
        label: "ATS check",
        title: "See what the robot sees",
        lines:
          "Seven weighted checks on whether an applicant tracking system can actually read your CV. Every point is accounted for, with a one-line fix.",
      },
      {
        label: "Job match",
        title: "Every requirement, with evidence",
        lines:
          "We pull the job apart into must-haves and nice-to-haves, then check each one against your CV — and quote the line that proves it.",
      },
      {
        label: "What to pivot",
        title: "Your words, re-angled",
        lines:
          "Bullet rewrites in the job's own language, built only from what your CV already says. Keywords you can't back up go in a list you approve.",
      },
      {
        label: "Re-check & export",
        title: "Proof that it worked",
        lines:
          "Accept the changes you agree with, re-check, and watch both scores move. Then export the CV as an ATS-friendly .docx.",
      },
    ],
    ats: {
      eyebrow: "ATS check",
      sections: "Experience, Education and Skills found",
      contact: "Email, phone and LinkedIn present",
      twoColumn: "2-column layout",
      twoColumnNote: "columns get read out of order",
    },
    requirement: {
      eyebrow: "Job match · requirement 4 of 16",
      text: "Build and maintain SQL dashboards for non-technical stakeholders",
      mustHave: "Must-have",
      missing: "Missing",
      note: "Your CV says “managed data” — no quote supports SQL dashboards, so this isn't counted.",
    },
    rewrite: {
      eyebrow: "What to pivot · rewrite",
      before: "Before",
      beforeText: "Responsible for managing data and reporting",
      after: "After",
      afterStart: "Built weekly",
      afterEnd: "reports for 4 teams, cutting manual reporting by 6 hours a week",
      note: "Same facts, the job's language.",
      accept: "Accept",
    },
    recheck: {
      eyebrow: "Re-check",
      rechecked: "Re-checked",
      ats: "ATS score",
      match: "Job match",
    },
  },

  stats: {
    eyebrow: "Why it matters",
    title: "The rules of applying, rewritten.",
    titleAccent: "rewritten.",
    checks: {
      label: "weighted ATS checks",
      note: "Readability, sections, contact, dates, formatting, length, bullets.",
    },
    ways: {
      label: "ways to add a CV",
      note: "Upload a PDF or Word file, paste the text, or give a public link.",
    },
    stamped: {
      label: "reports stamped on BOT Chain",
      note: "Every one verifiable on the explorer, with no personal data on-chain.",
    },
    rechecks: {
      label: "re-checks recorded",
      note: "A re-check links to the report it improved on, so progress is provable.",
    },
    show: "Show: {label}",
    previous: "Previous card",
    next: "Next card",
    cards: [
      { title: "Get past the ATS", line: "Seven weighted checks on what the parser can actually read." },
      { title: "Send better applications", line: "One CV, re-angled per job, instead of the same file forty times." },
      { title: "Unlock the right keywords", line: "The terms this job scans for, and which ones you already have." },
      { title: "Get the callback", line: "Track every application until one of them rings." },
      { title: "Save hours per application", line: "Forty seconds of checking beats an evening of guessing." },
      { title: "Keep your own voice", line: "Rewrites use your facts and your words — never a template." },
    ],
  },

  collage: {
    magnifier: "A magnifying glass over a CV page",
    plane: "A paper plane over torn lilac paper",
    key: "A key inside a torn paper circle",
    phone: "A ringing retro telephone over torn lilac paper",
    clock: "A clock face on torn paper",
    bust: "A classical bust inside a torn paper circle",
    desk: "An illustration of someone reviewing their CV at a desk",
  },

  sample: {
    eyebrow: "A sample report",
    quote:
      "My CV said ‘managed data’. The job asked for ‘SQL dashboards for stakeholders’. Callback showed me the gap — and how to say what I'd actually done.",
    quoteAccent: "gap",
    persona: "Sample persona",
    cite: "Junior Data Analyst · not a real customer",
    before: "Before",
    after: "After three rewrites",
    story:
      "Alex accepted three bullet rewrites and a new summary, then re-checked. No new experience was added — the same facts, said in the job's language.",
    open: "Open the sample report",
    photoAlt: "Stock photo illustrating Alex, the sample persona, working at a laptop",
    evidence: "Evidence from the CV",
    evidenceQuote: "Built weekly SQL reports for 4 teams",
    match: "Match 81% ✦",
  },

  trusted: {
    eyebrow: "Built to be trusted",
    title: "Guidance you can check, not a black box.",
    titleAccent: "check,",
    photoAlt: "A smiling man, in black and white, illustrating a job seeker",
    pillars: [
      {
        heading: "Reads any format",
        body: "PDF and Word files are parsed in your browser, including two-column layouts — which we flag, because an ATS reads those out of order. Or paste the text, or give us a public link.",
        cardLabel: "Format",
        cardText: "2-column layout detected",
      },
      {
        heading: "Explains every score",
        body: "Seven ATS checks, each with its own points, its own reason and a one-line fix. The match percentage shows its arithmetic: must-haves 60%, nice-to-haves 20%, keywords 20%.",
        cardLabel: "Score",
        cardText: "Bullets: 9 of 15 points",
      },
      {
        heading: "Never invents experience",
        body: "A requirement only counts if we can quote the line in your CV that proves it. Rewrites rephrase facts you already have. Keywords you can't back up go in a list you approve, not into your CV.",
        cardLabel: "Evidence",
        cardText: "“Built weekly SQL reports for 4 teams” ✓",
      },
      {
        heading: "Private by design",
        body: "Your CV is sent for the AI check and nothing else — never stored, never logged. Reports stay in your browser. Stamping puts two salted hashes on-chain and no personal data at all.",
        cardLabel: "On-chain",
        cardText: "0x7f3a…c21e · no personal data",
      },
    ],
  },

  how: {
    eyebrow: "How it works",
    title: "What if every application got a callback?",
    titleAccent: "callback?",
    steps: [
      { title: "Add your CV", body: "Upload a PDF or Word file, paste the text, or point us at a public link." },
      { title: "Add the job", body: "Paste the description, or give us the URL of the career page." },
      { title: "Get your match", body: "An ATS score, a match percentage, and every requirement checked with evidence." },
      { title: "Pivot & re-check", body: "Accept the rewrites you agree with, re-check, and watch both scores move." },
    ],
    synced: {
      job: "Job: Product Analyst",
      report: "Match report",
      improved: "Improved CV",
      read: "read",
      ready: "ready",
      rechecked: "re-checked",
      justNow: "{status} · just now",
      waiting: "waiting",
    },
  },

  tracker: {
    eyebrow: "Your application tracker",
    title: "Keep every application in one place.",
    titleAccent: "one",
    statuses: ["Not applied", "Applied", "Interview", "Offer", "📞 Callback!"],
    ats: "ATS",
    match: "Match",
    builtStart: "Built weekly",
    builtEnd: "reports for 4 teams",
    seal: "Stamped on {chain} · no personal data ·",
    cards: {
      history: {
        title: "Match history",
        body: "Every job you checked, with its ATS score, its match percentage and the date. Saved in your browser, not on a server.",
      },
      beforeAfter: {
        title: "Before / after",
        body: "See every change you accepted, the bullet it replaced, and what the re-check did to both scores.",
      },
      proof: {
        title: "Proof on BOT Chain",
        body: "Optionally stamp a report on {chain}. Two salted hashes, two scores, the job title and a date — no name, no email, no CV text.",
        detail: "Needs a wallet. Nothing else here does.",
      },
    },
    open: "Open my applications",
    deleteNote: "— or delete everything in one click, any time.",
  },

  integrations: {
    eyebrow: "Works with what you have",
    title: "No new tools. No new accounts.",
    titleAccent: "No",
    lede: "Bring the CV you already have, in whatever format it is in, and the job wherever you found it.",
    tiles: {
      pdf: { name: "PDF", how: "Read in your browser" },
      word: { name: "Word", how: ".docx, tables and all" },
      docs: { name: "Google Docs", how: "Published to the web" },
      notion: { name: "Notion", how: "Any public page" },
      linkedin: { name: "LinkedIn", how: "Paste the text — they block reading" },
      careers: { name: "Career pages", how: "Greenhouse, Lever, Workable, Ashby" },
    },
    disclaimer:
      "Third-party names are used to describe compatibility only. Callback is not affiliated with, or endorsed by, any of them.",
  },

  faq: {
    eyebrow: "FAQ",
    title: "The questions worth asking.",
    titleAccent: "worth",
    items: [
      {
        question: "Is it free?",
        answer:
          "Yes. There is a fair-use cap of {limit} analyses per day so one person can't exhaust the AI quota for everyone. Nothing is behind a payment, and there is no account to create.",
      },
      {
        question: "Is my CV stored?",
        answer:
          "No. Files are parsed in your browser, so the file itself never leaves your device. The text is sent to our server for the AI check and is not stored or logged — it exists for the length of that one request. Your reports are saved in your browser only, and there is a button that deletes all of them.",
      },
      {
        question: "Why can't it read my LinkedIn job link?",
        answer:
          "LinkedIn and some job boards block automated reading of their pages, so there is nothing to fetch. Open the posting, copy the description, and paste it in — the analysis is identical. Company career pages, including Greenhouse, Lever, Workable and Ashby, read fine from a URL.",
      },
      {
        question: "Will it make things up?",
        answer:
          "No, and this is enforced rather than promised. A requirement only counts as matched if the model quotes the line in your CV that supports it, and we check that quote actually appears in your CV before counting it. Rewrites rephrase facts you already have. A keyword your CV does not support is never written in for you — it goes in an “add only if true” list for you to decide on.",
      },
      {
        question: "What is an ATS?",
        answer:
          "An applicant tracking system: the software most employers use to receive and filter applications. It turns your CV into text and searches it. That is why layout matters — a two-column CV gets read across the columns, so “Skills: SQL” and “Acme Corp” can end up on the same line as nonsense.",
      },
      {
        question: "What goes on BOT Chain?",
        answer:
          "Only if you choose to stamp a report: a hash of the report, a salted hash of your CV text, your two scores, the job title, the id of the earlier report it improved on, and a timestamp. No name, no email, no CV content. The CV hash is salted with a random value kept only in your browser, so nobody can confirm a guessed CV against it. The contract runs on {chain}, chain {chainId}, and has no admin, no token and no payments.",
      },
      {
        question: "Do I need a wallet?",
        answer:
          "Only to stamp. The CV check, the job match, the suggestions, the re-check, the exports and your application history all work with no wallet installed.",
      },
      {
        question: "Which languages does it work in?",
        answer:
          "English, Indonesian and Malay. The site and the report follow the language you pick at the top of the page, and the ATS checks recognise section headings, action verbs and dates in all three. Rewrites stay in the language your CV is written in, so an English CV is never turned into an Indonesian one by accident. Other languages still produce a report, but treat the bullet-quality and keyword parts as rough.",
      },
    ],
  },

  closing: {
    eyebrow: "Ready when you are",
    title: "Your next callback starts here.",
    titleAccent: "callback",
    lede: "One CV, one job, forty seconds. You'll know your ATS score, your match, and the three changes worth making.",
    cta: "Check my CV",
    sample: "See a sample report",
    small: "Free · No account · Your CV is never stored",
  },

  footer: {
    label: "Footer",
    tagline:
      "Add your CV and a job. See how ATS-friendly your CV is, how well it matches, and exactly what to change.",
    columns: {
      product: {
        heading: "Product",
        check: "Check my CV",
        sample: "Sample report",
        applications: "My applications",
      },
      who: {
        heading: "Who it's for",
        students: "Students",
        graduates: "Graduates",
        changers: "Career changers",
        tech: "Tech roles",
      },
      resources: {
        heading: "Resources",
        ats: "What is an ATS?",
        tips: "CV tips",
        faq: "FAQ",
      },
      company: {
        heading: "Company",
        about: "About",
        github: "GitHub",
      },
    },
    builtOn: "Built on BOT Chain",
    botChainLogo: "BOT Chain logo",
    verified: "Verified on-chain",
    chainLine: "Chain {chainId} · {chain}",
    copied: "Address copied",
    copy: "Copy the contract address",
    explorer: "View on explorer",
    notDeployed: "Contract address published once deployed to {chain}",
    stamped: "Reports stamped: {count}",
    disclaimer:
      "Callback is an independent project and is not affiliated with any job board or ATS vendor. Names of third-party products are used for compatibility purposes only and remain the trademarks of their respective owners. Scores are guidance, not a hiring guarantee. Your CV is never stored and never put on-chain.",
    rights: "© 2026 Callback. All rights reserved.",
    privacy: "Privacy Policy",
    terms: "Terms",
    follow: "Follow us",
    onX: "Callback on X",
    onGithub: "Callback on GitHub",
  },
};
