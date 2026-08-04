# stackoptimizer-frontend

Next.js (App Router) frontend for the Thrive Trilogy Stack Optimizer, deployed to Vercel.

## Rendering strategy (TECH_DOCS §7)
- **SSG/ISR** for marketing (`/`) and methodology (`/methodology`) - YMYL/E-E-A-T
  critical, must be fast/crawlable and NOT depend on the Render backend being warm.
- **CSR** for the assessment flow (`/assessment`) and report dashboard (`/report/[id]`) -
  not indexed; these call the backend and must show a designed loading state that
  absorbs Render/Neon cold starts gracefully.
- Own `robots.ts` + `sitemap.ts` for the `app.` subdomain, submitted separately in GSC.

## Naming (BRAND_GUIDELINES §3, locked)
- Composite score → **Spend Efficiency Index (SEI)**
- Report → **Stack Report**, sections **Stop / Adjust / Keep / Start** (exact casing)
- Free teaser → **Preview**

## Local development
```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL to the backend
npm install
npm run dev                  # http://localhost:3000
```

## Notes
- Design tokens in `tailwind.config.ts` are ESTIMATES from BRAND_GUIDELINES §4 -
  confirm exact hex/font-family against live CSS before finalizing (still open, STATUS §9).
- The full V1 UI is built and deployed: assessment flow with the "Confirm What We Found"
  step, Preview, Stack Report (SEI, Stop/Adjust/Keep/Start, Start section, related reading),
  methodology, homepage FAQ + FAQPage JSON-LD, and the 12 legal/utility routes. Scoring
  itself is computed by the backend - this app renders it.
- `lib/data.ts` is live-first: it calls the real backend and only falls back to
  `lib/fixtures.ts` on failure, which is the only time the "Preview build - sample data"
  banner appears.
- Legal-page copy in `lib/legal-content.ts` states facts owned by CLAIMS_COMPLIANCE §5b -
  it must never originate or contradict them. Draft copy still needs attorney review.

## Checks
`npm run typecheck` and `npm run build` run in CI (`.github/workflows/ci.yml`) on every
PR and push to `main`; branch protection on `main` means a failure blocks the merge.
There is no frontend test suite.
