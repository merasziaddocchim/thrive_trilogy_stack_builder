// Homepage FAQ — founder-approved, compliance-reviewed copy. VERBATIM: do not edit, paraphrase,
// or add questions. This is the SINGLE SOURCE for both the visible accordion and the FAQPage
// JSON-LD, so the structured data always matches the on-page text exactly (a Google rich-results
// validity requirement). A curated subset — the full FAQ lives on the /faq legal page.
//
// Compliance note (CLAIMS_COMPLIANCE §0/§3/§5/§6/§7): this copy is treated with the same care as
// the legal pages. It is medical-disclaimer-safe (comparison/informational framing, FDA
// disclaimer language, no disease claims), states the deterministic-scoring / AI role accurately
// (§7, no AI overclaim), the 48h-anonymous data practice (§5b), and the score/affiliate firewall
// (§6). Rendered as-is; if any of it ever drifts from reality it must be re-reviewed, not silently
// edited.
export interface FaqItem {
  q: string;
  a: string;
}

export const HOMEPAGE_FAQ: readonly FaqItem[] = [
  {
    q: 'Is this medical advice?',
    a: "No. This tool compares your supplement stack against published research for informational purposes only. It hasn't been evaluated by the FDA and isn't intended to diagnose, treat, cure, or prevent any disease. Always consult a physician before changing your regimen, especially if you take medication or have a medical condition.",
  },
  {
    q: 'How is my Spend Efficiency Index calculated?',
    a: "By deterministic scoring software, not an AI model. Your dosing is compared against evidence-tier ceilings, ranging A through D. Weaker evidence caps your score regardless of how well you're dosed, so you can't score well on a compound that isn't well-supported.",
  },
  {
    q: 'Do you sell or share my data?',
    a: "No. We don't create accounts and don't require sign-up. Your assessment data is anonymous and automatically deleted within 48 hours.",
  },
  {
    q: 'Do affiliate links affect my score or recommendations?',
    a: "No. Our scoring engine and affiliate links are built as two separate systems that can't influence each other. A product can't rank better because it pays us more, the same principle regulators apply to any ranking site that takes commissions.",
  },
  {
    q: 'How do you evidence-tier compounds?',
    a: 'Every compound in our database is checked by a credentialed reviewer against the original published research, not just AI-summarized. Evidence tiers, A through D, reflect the real strength of that research.',
  },
] as const;
