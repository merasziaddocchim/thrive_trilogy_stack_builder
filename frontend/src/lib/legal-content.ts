// =============================================================================
// LEGAL / UTILITY PAGE COPY — DRAFT FOR FOUNDER REVIEW. NOT FINAL LEGAL TEXT.
//
// Adapted (NOT copied verbatim) from the equivalents on thrivetrilogy.com, per
// CLAIMS_COMPLIANCE §5a: the app collects materially different data than the blog
// (stack + health-assessment inputs — see TECH_DOCS §1 user-side tables), so each
// page is rewritten for what THIS app actually collects and does.
//
// Operational facts stated below (retention, intake processor, analytics vendor,
// email, DMCA agent, governing law, Reviews scope) are owned by CLAIMS_COMPLIANCE
// §5b — this file states them, it never originates them. Anything still unconfirmed
// (see each `note`) keeps its founder-review flag until closed there first.
//
// This is engineering draft content, not legal advice.
// =============================================================================

export interface LegalBlock {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Founder-review flag — rendered as a visible callout, not shipped as final copy. */
  note?: string;
}

export interface LegalDoc {
  intro: string;
  blocks: LegalBlock[];
}

// Shorthand reused across pages.
const APP = 'the Thrive Trilogy Stack Optimizer';
const SITE = 'app.thrivetrilogy.com';

export const LEGAL_CONTENT: Record<string, LegalDoc> = {
  // -------------------------------------------------------------------------
  about: {
    intro: `${APP} is an audit tool for the supplements you already take. It is an extension of Thrive Trilogy's credentialed, citation-first content brand at thrivetrilogy.com.`,
    blocks: [
      {
        heading: 'What this tool does',
        paragraphs: [
          'Unlike a quiz that builds you a new stack, the Stack Optimizer starts from what you already own. You enter what you currently take, and we compare it against a human-reviewed research database to show what may be redundant, underdosed, or thinly evidenced — framed as findings, in dollar terms, not as a shopping list.',
          'The output is a Stack Report with three sections — Stop, Keep, and Start — plus a Spend Efficiency Index and an Estimated Annual Waste range. Every compound-level finding carries an Evidence Tier (A–D) so you can see how strong the underlying human research is.',
        ],
      },
      {
        heading: 'Who is behind it',
        paragraphs: [
          'Thrive Trilogy was founded by Ziad Meras, M.Sc. Organic Chemistry. Ziad personally reviews the evidence records that feed the tool against their primary sources before they are used. Author and review credentials are shown on our methodology page.',
        ],
        note: 'Founder review — same accuracy gap flagged on How We Review Supplements: the live batch-1 records are still ai_extracted, pending your review. Complete that review before launch or soften this sentence (CLAIMS_COMPLIANCE §7).',
      },
      {
        heading: 'Our relationship to the research',
        paragraphs: [
          'We summarize published research at the mechanism and dosing level; we do not conduct clinical trials or make disease claims. This tool is informational and is not a substitute for professional medical advice.',
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  'affiliate-disclosure': {
    intro: `Some links in ${APP} are affiliate links. This page explains what that means and, more importantly, why it never affects your results.`,
    blocks: [
      {
        heading: 'The firewall between your score and our links',
        paragraphs: [
          'Your Spend Efficiency Index and every Evidence Tier are calculated independently of any affiliate relationship. Products we link to may earn us a commission — this never affects your score, your evidence ratings, or which compounds appear in your Stop, Keep, or Start sections. Our scoring system cannot see commission data by design.',
        ],
      },
      {
        heading: 'How affiliate links are disclosed',
        paragraphs: [
          'Every individual affiliate link inside a Stack Report carries its own disclosure immediately next to it — for example, "This is a paid link that supports this report." — in the same size and style as the surrounding text. We do this per link, not once at the top of the page.',
          'Affiliate links appear only in the Start section and on general marketing pages, never inside a Stop or Keep finding or an Evidence Tier explanation.',
        ],
      },
      {
        heading: 'Educational links are different',
        paragraphs: [
          'Links to educational or mechanism articles on thrivetrilogy.com (dosing protocols, bioavailability guides) are functionally citations, not product recommendations, and carry no commission. These may appear anywhere in a report without a paid-link disclosure.',
        ],
      },
      {
        note: 'Founder review: confirm the specific affiliate networks/programs in use (e.g. Amazon Associates, brand-direct programs) and name them here, and confirm this aligns with each program’s required disclosure language.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  contact: {
    intro: `We would like to hear from you — questions about a finding, a correction to the research, a privacy request, or anything else.`,
    blocks: [
      {
        heading: 'How to reach us',
        paragraphs: [
          'The fastest way to reach the Thrive Trilogy team is by email. For privacy or data requests (see our Privacy Policy and Do Not Sell or Share My Info page), please include enough detail for us to locate any information tied to your request.',
        ],
        bullets: ['Email: support@thrivetrilogy.com', 'Response time: we aim to reply within a few business days.'],
      },
      {
        note: 'Founder review — still open (the contact address, support@thrivetrilogy.com, is confirmed per CLAIMS_COMPLIANCE §5b and is the single address for general contact and DMCA): confirm whether a mailing address is required for any of the legal pages (DMCA and some privacy frameworks expect one).',
      },
    ],
  },

  // -------------------------------------------------------------------------
  'cookie-policy': {
    intro: `This page explains how ${SITE} uses cookies and similar browser storage.`,
    blocks: [
      {
        heading: 'Browser storage we rely on',
        paragraphs: [
          'To keep your assessment progress as you move between steps, the app stores your in-progress answers in your browser’s sessionStorage. This is not a cookie and is cleared automatically when your browser session ends — it is not sent to advertisers.',
        ],
      },
      {
        heading: 'Types of cookies',
        bullets: [
          'Essential: needed for the site to function and to remember basic preferences.',
          'Analytics: none currently active. We plan to add Google Analytics in the future; this page will list its specific cookies and retention periods before it becomes active.',
          'Affiliate/attribution: set by partners when you follow a paid link, so a referral can be credited.',
        ],
      },
      {
        heading: 'Managing cookies',
        paragraphs: [
          'You can control or delete cookies through your browser settings. Blocking some cookies may affect how parts of the site work. See also our Do Not Sell or Share My Info page for advertising-related choices.',
        ],
      },
      {
        note: 'Founder review — still open (analytics status — none active, GA planned — is confirmed per CLAIMS_COMPLIANCE §5b): (1) when GA is added, decide its advertising-features configuration and list its cookie names/retention here before it goes live; (2) which affiliate/attribution cookies are actually set, if any. Do not claim cookies we do not set.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  disclaimer: {
    intro: `Please read this disclaimer carefully before relying on any output from ${APP}.`,
    blocks: [
      {
        heading: 'Informational only — not medical advice',
        paragraphs: [
          'This report compares your stack against published research and is for informational purposes only. It is not medical advice, has not been evaluated by the FDA, and is not intended to diagnose, treat, cure, or prevent any disease. Consult a physician before making changes to your regimen, especially if you take medication or have a medical condition.',
        ],
      },
      {
        heading: 'What the score does and does not mean',
        paragraphs: [
          'The Spend Efficiency Index, Estimated Annual Waste range, and every finding are comparisons against published research parameters — not clinical recommendations. An Evidence Tier reflects the strength of the available human research for a compound, not a judgment about whether it is right for you. Weaker evidence caps the achievable score regardless of how well a compound is dosed.',
        ],
      },
      {
        heading: 'How AI is and is not involved',
        paragraphs: [
          'Our research database is built with AI assistance: study data is extracted from published sources by AI and then checked against the primary source by a credentialed reviewer (see How We Review Supplements). Your report itself is computed by deterministic scoring software against that database — it is not written by an AI language model. Your free-text stack entry is currently matched to known compounds by deterministic text-matching on our own servers, not sent to an AI provider, and you confirm those matches before anything is scored. None of this is a substitute for professional medical advice.',
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  'dmca-policy': {
    intro: `Thrive Trilogy respects intellectual property rights and responds to valid notices of claimed infringement under the Digital Millennium Copyright Act (DMCA).`,
    blocks: [
      {
        heading: 'Filing a takedown notice',
        paragraphs: [
          'If you believe content on this site infringes your copyright, send a written notice to our designated agent that includes: your signature (physical or electronic); identification of the copyrighted work; identification of the material claimed to be infringing and its location on the site; your contact information; a statement of good-faith belief that the use is not authorized; and a statement, under penalty of perjury, that the information is accurate and you are authorized to act.',
        ],
      },
      {
        heading: 'Counter-notification',
        paragraphs: [
          'If your material was removed and you believe it was a mistake or misidentification, you may submit a counter-notification with the equivalent required elements.',
        ],
      },
      {
        heading: 'Designated agent',
        bullets: ['Name: Ziad Meras', 'Email: support@thrivetrilogy.com'],
      },
      {
        note: 'Founder review — still open (agent name and email are confirmed per CLAIMS_COMPLIANCE §5b): add the agent’s mailing address (a physical address is generally required), and confirm registration with the U.S. Copyright Office’s DMCA agent directory.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  'do-not-sell': {
    intro: `This page describes your choices about the "sale" or "sharing" of your personal information under California’s CCPA/CPRA and similar state laws.`,
    blocks: [
      {
        heading: 'We do not sell or currently share your personal information',
        paragraphs: [
          'We do not sell your personal information for money. As of the last-reviewed date below, no analytics or advertising technology is active on this app, so no "sharing" of personal information for cross-context behavioral advertising is occurring. We plan to add Google Analytics in the future; analytics configured with advertising features can count as "sharing" under these laws, so before it becomes active we will update this page and ship a working opt-out control in the same release.',
        ],
      },
      {
        heading: 'How to opt out',
        paragraphs: [
          'You can register an opt-out preference at any time by emailing us (support@thrivetrilogy.com — see the Contact page) with the subject "Do Not Sell or Share"; we will honor it if and when any sharing-classified technology becomes active. We will not discriminate against you for exercising these rights.',
        ],
      },
      {
        heading: 'The health-adjacent data you give us',
        paragraphs: [
          'The stack and lifestyle information you enter is used to produce your report — not to build an advertising profile. We never receive the name of any medication or diagnosis, because the app does not ask for it.',
        ],
      },
      {
        note: 'Founder review — current state is accurate (no analytics active, per CLAIMS_COMPLIANCE §5b), but two items bind when Google Analytics is added: (1) DECISION — GA’s advertising-features configuration (Google Signals / ads personalization on or off), which determines whether this page’s posture becomes "sharing"; (2) ENGINEERING — per §5b, GA must not be tagged into the app without a functional on-page opt-out (actually stopping the GA data flow) plus a GPC-honoring decision shipping in the same change (logged in TECH_DOCS §8). Also confirm whether a dedicated opt-out request form is needed.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  faq: {
    intro: `Common questions about how ${APP} works.`,
    blocks: [
      {
        heading: 'Is this medical advice?',
        paragraphs: [
          'No. It is an informational comparison of your stack against published research. It is not a diagnosis or a treatment plan, and it does not replace a conversation with a qualified clinician.',
        ],
      },
      {
        heading: 'How is the score calculated?',
        paragraphs: [
          'The Spend Efficiency Index combines how close your doses are to studied ranges with the strength of the human evidence behind each compound. Weaker evidence caps the achievable score no matter how well something is dosed. The full method is on our methodology page.',
        ],
      },
      {
        heading: 'Do affiliate links change my results?',
        paragraphs: [
          'No. Your score and every Evidence Tier are calculated independently of any affiliate relationship. See our Affiliate Disclosure.',
        ],
      },
      {
        heading: 'What data do you collect, and do you keep my supplement list?',
        paragraphs: [
          'You enter the supplements you take, a goal, optional lifestyle context, an approximate spend range, and a yes/no answer about medication or conditions (never the specific medication or diagnosis). In-progress answers stay in your browser; once submitted, your intake is stored on our servers under a random, identity-free token — no account or email attached — and automatically deleted after 48 hours. See our Privacy Policy for detail.',
        ],
      },
      {
        heading: 'What is an Evidence Tier?',
        paragraphs: [
          'A grade from A (strongest human evidence) to D (preliminary or non-human research) shown on every compound-level finding, derived from the underlying studies.',
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  'how-we-review': {
    intro: `Every number in a Stack Report traces back to a primary source that a credentialed human reviewed. Here is how evidence gets in and how it is graded.`,
    blocks: [
      {
        heading: 'The review pipeline',
        bullets: [
          'Sourcing: each study is entered into a source registry before anything is extracted from it.',
          'AI extraction: an AI model pulls dose ranges, bioavailability, and interaction data from the source text. At this stage it is never used in scoring.',
          'Human review gate: a credentialed reviewer checks each extracted record against the primary source, corrects errors, and marks it reviewed. Only reviewed records feed the score.',
          'Scoring parameters: once enough reviewed records exist for a compound, a studied range and Evidence Tier are generated and confirmed by the reviewer.',
        ],
      },
      {
        heading: 'Evidence Tiers',
        paragraphs: [
          'Tiers are derived mechanically from the studies behind a compound, so they are auditable rather than a matter of opinion. Tier A reflects meta-analyses or multiple independent human RCTs; Tier D reflects in-vitro, animal-only, or a single small human study, for which no dose-adequacy verdict is made.',
        ],
      },
      {
        heading: 'Where to read more',
        paragraphs: [
          'Our methodology page covers the same pipeline in more depth, including how evidence bounds the Spend Efficiency Index and why the score is independent of affiliate relationships.',
        ],
      },
      {
        note: 'Founder review — accuracy gap, not a copy question: the batch-1 evidence records currently live in production are still marked ai_extracted, pending founder review (STATUS.md §9 top open item). Until that review completes and records are flipped to human_reviewed, this page’s statement that only reviewed records feed the score is ahead of reality. Close the gap by completing the batch-1 review before launch (preferred), or this copy must be softened — per CLAIMS_COMPLIANCE §7, the gap between a claimed review step and actual practice is itself the liability.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  'privacy-policy': {
    intro: `This policy explains what ${APP} collects, how we use it, and your choices. It is written for this app specifically — the app collects different information than the thrivetrilogy.com blog, so this is not a copy of the blog’s policy.`,
    blocks: [
      {
        heading: 'Information you provide',
        bullets: [
          'A free-text description of the supplements and compounds you currently take — which may include product names, brands, doses, and prices.',
          'The optimization goal you select.',
          'Optional lifestyle context: diet pattern, activity level, and sleep consistency.',
          'An approximate monthly supplement spend, given as a range.',
          'A single yes / no / prefer-not-to-say answer about whether you take a medication or have a condition that could affect supplement safety. We do NOT collect the name of any medication or any diagnosis.',
        ],
      },
      {
        heading: 'How your information is processed',
        paragraphs: [
          'Your free-text entry is matched to compounds in our reviewed database by deterministic text-matching software running on our own infrastructure. As of the last-reviewed date below, no artificial-intelligence or large-language-model provider is used for this step, and no third party receives your entry. If we later add an AI-based extraction step, we will update this policy before it takes effect. You confirm the matches before anything is scored.',
          'Your entries are compared against research parameters to generate your report; they are not used to build an advertising profile.',
        ],
      },
      {
        heading: 'Where your information is stored, and for how long',
        paragraphs: [
          'While you complete the assessment, your in-progress answers are stored in your browser’s sessionStorage and are cleared when your browser session ends. We intentionally avoid persistent local storage for health-adjacent detail.',
          'When you submit the assessment, your intake (your stack items and profile answers) is saved on our servers under a random, identity-free token so you can open your Preview and report. No account, name, or email address is attached to it. It is automatically deleted after 48 hours — this cap is enforced by the system, and your report is recomputed from the stored intake rather than stored itself.',
        ],
      },
      {
        heading: 'Email',
        paragraphs: [
          'The full Stack Report screen asks for an email address. As of the last-reviewed date below, that address is not transmitted to or stored on our servers — it currently stays in your browser. We plan to collect email in the near future for a report-delivery feature; this policy will be updated before any actual collection begins.',
        ],
      },
      {
        heading: 'Analytics and sharing',
        paragraphs: [
          'As of the last-reviewed date below, no analytics tool is active on this app — nothing is collecting data about your visit for analytics purposes. We plan to add Google Analytics in the future; before it becomes active, we will update this policy, our Cookie Policy, and our Do Not Sell or Share My Info page, and ship a working opt-out control at the same time.',
          'We do not sell your personal information. We rely on service providers (for example, hosting) to operate the app; they may process information on our behalf under appropriate terms. See also our Cookie Policy.',
        ],
      },
      {
        heading: 'Your choices and rights',
        paragraphs: [
          'Depending on where you live, you may have rights to access, correct, or delete your personal information, and to opt out of certain sharing. Contact us to exercise these rights. This service is not directed to children.',
        ],
      },
      {
        note: 'Founder review — still open on this page (retention, the intake processor, analytics status, and email facts above are confirmed per CLAIMS_COMPLIANCE §5b): (1) whether lab results and outcome feedback (supported by the data schema, TECH_DOCS §1, but not collected in V1) will be collected later; (2) the email delivery provider, once the report-delivery feature ships; (3) legal basis / disclosures required for your target regions (GDPR/UK if applicable); (4) when Google Analytics is added, decide its advertising-features configuration (Google Signals / ads personalization on or off) — that determines the "sharing" posture — and update this policy before it becomes active. Have a qualified privacy attorney review before launch.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  terms: {
    intro: `These Terms govern your use of ${APP}. By using the app you agree to them. This tool is an informational comparison/audit tool, not a content-only site and not a medical service.`,
    blocks: [
      {
        heading: 'Nature of the service',
        paragraphs: [
          'The app compares the supplements you enter against published research and produces an informational report. It does not provide medical advice, diagnosis, or treatment, and does not establish a clinician–patient relationship. Always consult a qualified professional before changing your regimen.',
        ],
      },
      {
        heading: 'No warranty; limitation of liability',
        paragraphs: [
          'The app and its output are provided "as is," without warranties of any kind. Research summaries and estimates may be incomplete or become outdated. To the fullest extent permitted by law, Thrive Trilogy is not liable for decisions you make based on the report.',
        ],
      },
      {
        heading: 'Affiliate relationships',
        paragraphs: [
          'Some links are affiliate links that may earn us a commission, disclosed per link. As described in our Affiliate Disclosure, these relationships never influence your score or evidence ratings.',
        ],
      },
      {
        heading: 'Acceptable use and intellectual property',
        paragraphs: [
          'You agree not to misuse the app or attempt to disrupt it. The site content, methodology, and branding are the property of Thrive Trilogy and may not be reproduced without permission.',
        ],
      },
      {
        heading: 'Governing law',
        paragraphs: [
          'These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict-of-laws principles.',
        ],
      },
      {
        note: 'Founder review — still open (governing law is confirmed as Delaware per CLAIMS_COMPLIANCE §5b): set the dispute-resolution terms (courts vs. arbitration, venue), any account/subscription terms if a paywall returns, and have an attorney confirm the liability and warranty language.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  reviews: {
    intro: `How Thrive Trilogy approaches product and brand reviews, and how that connects to your Stack Report.`,
    blocks: [
      {
        heading: 'What this page covers',
        paragraphs: [
          'This page hosts our reviews of specific supplements, compounds, and brands only. We do not publish customer testimonials about the app or its service.',
        ],
      },
      {
        heading: 'Reviews are evidence-first',
        paragraphs: [
          'Our reviews of specific supplements and brands are grounded in the same human-reviewed research and Evidence Tiers used throughout the Stack Optimizer. Where a review recommends a purchasable product, it is treated as an affiliate placement and carries the same per-link disclosure as any other paid link.',
        ],
      },
      {
        heading: 'Independence',
        paragraphs: [
          'A brand cannot pay to change its position or to influence your Spend Efficiency Index. Commissions never affect the score or the evidence ratings — the same firewall described in our Affiliate Disclosure applies here.',
        ],
      },
    ],
  },
};
