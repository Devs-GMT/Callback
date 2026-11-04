/**
 * Messages produced outside React: extraction errors, the ATS and match
 * engines, the API routes, the wallet and the report PDF.
 *
 * All three languages of this catalogue are bundled together (see
 * `src/i18n/lib.ts`), because these run in places with no dictionary to hand
 * — a route handler, an ethers callback, a PDF builder.
 *
 * `{name}` placeholders are filled with `fmt`.
 */
export const lib = {
  extract: {
    legacyDoc:
      "We can read .docx but not the older .doc format. Open it in Word and save as .docx, or paste the text.",
    wrongType:
      "We can read PDF and Word (.docx) files. Paste the text instead if your CV is in another format.",
    tooBig: "That file is {size}. The limit is {limit} — try exporting it again, or paste the text.",
    empty: "That file is empty.",
    tooManyPages: "That PDF has {pages} pages. We read up to {limit} — most CVs should be 1 to 2 anyway.",
    readFailed: "Something went wrong reading that file. Paste the text instead.",
    pdfNoText:
      "We can't read any text in this PDF — it looks like a scan or an image. Export it as a text-based PDF, or paste the text.",
    docxNoText: "We couldn't find any text in that Word file. Paste the text instead.",
    pdfUnreadable: "We couldn't read this PDF.",
    pdfLocked: "We couldn't open this PDF. It may be password-protected or damaged.",
    docxUnreadable: "We couldn't read this Word file. It may be a .doc rather than a .docx, or damaged.",
    cvTooShort:
      "That's too short to read as a CV. Paste the whole thing, including your experience and skills.",
    cvTooLong: "That's {length} characters. We read up to {limit} — trim it to the roles that matter for this job.",
    offline: "We couldn't reach the server. Check your connection and try again.",
    linkFailed: "We couldn't read this link.",
    linkSparse: "We read that page but found very little text. Paste your CV instead.",
    jobSparse: "That page didn't have a full job description on it. Paste the text instead.",
    jobTooShort:
      "This doesn't look like a full job description. Paste the whole posting, including the requirements.",
    jobTooLong: "That's {length} characters. We read up to {limit} — paste just the role and requirements.",
  },

  api: {
    network: "We couldn't reach the server. Check your connection and try again.",
    generic: "Something went wrong. Please try again.",
    foreignOrigin: "This endpoint only serves the Callback app.",
    tooLarge: "That request is too large.",
    unreadableRequest: "We couldn't read that request.",
    invalidJson: "That request wasn't valid JSON.",
    noLink: "No link was provided.",
    linkTooLong: "That link is too long.",
    linkRateLimited: "You've read a lot of links today. Try again tomorrow.",
    badUrl: "That doesn't look like a public web link. Paste the text instead.",
    blockedUrl: "We can only read public web pages. Paste the text instead.",
    dnsFailed: "We couldn't find that site. Check the link, or paste the text instead.",
    pageTimeout: "That page took too long to respond. Paste the text instead.",
    pageTooLarge: "That page is too big to read. Paste the text instead.",
    unsupportedType: "That link isn't a web page we can read. Paste the text instead.",
    needsLogin: "That page needs a login, so we can't read it. Paste the text instead.",
    httpError: "We couldn't open that link. Paste the text instead.",
    linkUnreadable: "We couldn't read this link. Paste the text instead.",
    noReadableText:
      "That page didn't give us any readable text — it may need JavaScript or a login. Paste the text instead.",
    analyzeNotConfigured: "The analysis service isn't configured yet. The ATS check below still works.",
    cvTooShort: "That CV is too short to analyse.",
    tooMuchToAnalyse: "That's more text than we can analyse at once.",
    tooMuchToWrite: "That's more text than we can work with at once.",
    jobTooShort: "This doesn't look like a full job description.",
    analysesUsed: "You've used all {limit} analyses for today. Your reports are saved in this browser.",
    analysesUsedPivot: "You've used all {limit} analyses for today. Your report is still saved in this browser.",
    noRequirements: "We couldn't read any requirements from that job description.",
    analyzeBusy: "The analysis service is busy right now. Try again in a minute.",
    analyzeKey: "The analysis service rejected our key. The ATS check below still works.",
    analyzeFailed: "The analysis failed. Please try again.",
    pivotNotConfigured: "The suggestions service isn't configured yet.",
    pivotNeedsBoth: "We need both the CV and the job to write suggestions.",
    pivotUnusable: "We couldn't write usable suggestions for this one. Try again.",
    pivotBusy: "The suggestions service is busy right now. Try again in a minute.",
    pivotKey: "The suggestions service rejected our key.",
    pivotFailed: "Writing suggestions failed. Please try again.",
    letterNotConfigured: "The cover letter service isn't configured yet.",
    letterNeedsBoth: "We need both the CV and the job to write a cover letter.",
    lettersUsed:
      "You've written all {limit} cover letters for today. Any letter you have is saved in this browser.",
    letterUnbacked: "We couldn't write a letter we could back up with your CV. Try again.",
    letterBusy: "The cover letter service is busy right now. Try again in a minute.",
    letterKey: "The cover letter service rejected our key.",
    letterFailed: "Writing the letter failed. Please try again.",
  },

  analysis: {
    steps: {
      cv: "Reading your CV",
      job: "Reading the job",
      ats: "Checking ATS",
      match: "Matching skills",
      pivot: "Writing suggestions",
    },
    matchFailed: "We couldn't run the job match. Your ATS check is below.",
    pivotFailed: "We couldn't write the suggestions this time.",
    matchFailedAgain: "The job match failed again.",
  },

  wallet: {
    cancelled: "You cancelled the transaction in your wallet.",
    noWalletLong:
      "MetaMask isn't installed. Everything else works — you only need a wallet to stamp a report.",
    noWallet: "MetaMask isn't installed.",
    noAccount: "No account was shared.",
    connectFailed: "We couldn't connect to your wallet.",
    switchFailed: "We couldn't switch to {chain}.",
    addFailed: "We couldn't add {chain} to your wallet.",
    notDeployed: "The Callback contract isn't deployed yet, so stamping is turned off.",
    wrongNetwork: "Switch to {chain} to stamp this report.",
    notConfirmed: "The transaction didn't confirm. Try again.",
    noReportId: "The transaction went through but we couldn't read the report id.",
    txFailed: "The transaction failed. Please try again.",
    contract: {
      ScoreOutOfRange: "Those scores are out of range. Re-run the check and try again.",
      JobTitleTooLong: "That job title is too long to stamp. Shorten it to 60 characters.",
      EmptyHash: "This report couldn't be hashed. Re-run the check and try again.",
      UnknownParent: "The earlier report this links to isn't on chain.",
      NotParentOwner:
        "The earlier report this links to was stamped by a different wallet. Connect that wallet, or stamp this as a new report.",
    } as Record<string, string>,
  },

  ats: {
    nothingToFix: "Nothing to fix.",
    readable: {
      label: "Text is readable",
      scanDetail: "We could barely read any text — this looks like a scanned or image-only file.",
      scanFix:
        "Export your CV as a text-based PDF (File → Export as PDF, not a scan) or paste the text instead.",
      sparseDetail: "Only {words} words of text came through{pages} — some of your CV may be inside images.",
      sparsePagesOne: " across 1 page",
      sparsePagesMany: " across {pages} pages",
      sparseFix:
        "Check the preview above. If text is missing, re-export as a text-based PDF or paste the text.",
      passDetail: "{words} words extracted cleanly — an ATS will be able to parse this.",
    },
    sections: {
      label: "Standard sections found",
      names: { experience: "Experience", education: "Education", skills: "Skills" },
      and: " and ",
      foundAll: "Found Experience, Education and Skills{summary}.",
      foundSummary: " and a Summary",
      missing: "Missing a clear heading for {missing}.",
      fixMissing: "Add a plain heading for {missing} — ATS parsers look for these exact words.",
      fixSummary: "Add a short \"Summary\" heading at the top to frame your profile for the role.",
    },
    contact: {
      label: "Contact details present",
      email: "email",
      phone: "phone",
      location: "city or location",
      web: "LinkedIn or portfolio link",
      allThere: "Email, phone, location and a profile link are all there.",
      missing: "Couldn't find your {missing}.",
      fix: "Add your {missing} as plain text near the top — not inside a header, footer or image.",
    },
    dates: {
      label: "Dates are consistent",
      noneDetail: "No dates found next to your roles.",
      noneFix: "Add a start and end date to every role, for example \"Mar 2023 – Present\".",
      oneDetail: "Only one date found — most roles seem to be missing dates.",
      oneFix: "Give every role a start and end date in one format, for example \"Jan 2022 – Mar 2024\".",
      passDetail: "{count} dates, all in one standard format.",
      yearOnlyDetail: "Dates are years only, so an ATS can't tell how long each role lasted.",
      noRangesDetail: "Dates are consistent but no date ranges were found.",
      rangesFix: "Use month and year ranges, for example \"Mar 2023 – Jun 2025\".",
      mixedDetail: "Mixed date formats found ({formats}).",
      mixedFix: "Pick one format and use it everywhere — \"Mar 2023 – Jun 2025\" is the safest.",
      formats: {
        "month-year": "month year",
        "numeric-slash": "numeric slash",
        iso: "iso",
        "year-only": "year only",
        "season-year": "season year",
      } as Record<string, string>,
    },
    formatting: {
      label: "No formatting risks",
      twoColumns: "a two-column layout",
      twoColumnsFix: "switch to a single column — columns get read out of order",
      tables: "tables",
      tablesFix: "replace tables with plain headings and bullet lists",
      images: "images",
      imagesFix: "remove images, icons and photos — their text is invisible to an ATS",
      headerFooter: "key details inside a header or footer",
      headerFooterFix: "move contact details into the body of the page",
      clean: "Simple single-column layout with no tables or images — ATS-safe.",
      found: "Found {problems}.",
    },
    length: {
      label: "Length is right",
      estimated: " (estimated from the text length)",
      tooShortDetail: "Only {words} words — this is too short to show what you've done.",
      tooShortFix: "Aim for one full page: 3 to 5 bullets per recent role, each with a result.",
      passOne: "About 1 page{suffix} — right for most roles.",
      passMany: "About {pages} pages{suffix} — right for most roles.",
      threeDetail: "About 3 pages{suffix} — longer than most recruiters read.",
      threeFix: "Cut to 2 pages: drop roles older than 10 years and trim bullets that don't match this job.",
      longDetail: "About {pages} pages{suffix} — well over the 1 to 2 pages expected.",
      longFix: "Cut to 2 pages. Keep the last 10 years in detail and compress the rest to one line each.",
    },
    bullets: {
      label: "Bullet quality",
      noneDetail: "No bullet points found — your experience reads as paragraphs.",
      noneFix: "Turn each role into 3 to 5 bullets that start with a verb and end with a result.",
      ruleDetail: "{verbs} of {total} bullets start with an action verb; {numbers} include a number or result.",
      fixOne: "Rewrite the weak bullet to start with a verb and end with a number — see the \"What to pivot\" tab.",
      fixMany:
        "Rewrite the {count} weaker bullets to start with a verb and end with a number — see the \"What to pivot\" tab.",
    },
  },

  match: {
    noEvidence: "No supporting evidence found in your CV.",
    notFound: "We couldn't find this in your CV, so we're not counting it.",
    notAddressed: "Not addressed in your CV.",
    seniorityUnclear: "We couldn't read a clear seniority level from both sides.",
    seniorityFits: "Your level looks right for this role.",
    seniorityUnder: "This role reads as {job} but your CV reads as {cv} — lead with your most senior work.",
    seniorityOver:
      "This role reads as {job} but your CV reads as {cv} — you may be over-qualified, so emphasise fit over scope.",
    levels: {
      unknown: "unknown",
      intern: "intern",
      junior: "junior",
      mid: "mid-level",
      senior: "senior",
      lead: "lead",
    } as Record<string, string>,
  },

  pdf: {
    title: "Callback report — {job}",
    subject: "CV and job match report",
    eyebrow: "Callback report",
    untitled: "Untitled role",
    scores: "Scores",
    atsScore: "ATS score, out of 100",
    jobMatch: "Job match",
    after: "After your changes",
    verdict: "The verdict",
    atsHeading: "ATS check — {score} of 100",
    fix: "Fix:",
    matchHeading: "Job match — {score}%",
    yourCv: 'Your CV: "{quote}"',
    notAddressed: "Not addressed in your CV.",
    mustHave: "Must-have",
    niceToHave: "Nice-to-have",
    keywordsMissing: "Keywords missing from your CV",
    watchOut: "Watch out for",
    accepted: "Changes you accepted — {count}",
    before: "Before:",
    afterLabel: "After:",
    footer: "Scores are computed by Callback and are guidance, not a hiring guarantee. Your CV is never stored.",
    fileSlug: "report",
  },

  letter: {
    recipient: "Hiring Manager",
    subject: "Application for the {role} role",
  },

  exports: {
    cvSubject: "Improved CV exported from Callback",
    letterSubject: "Cover letter exported from Callback",
    letterTitle: "Cover letter",
  },
};
