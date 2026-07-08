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
- Report → **Stack Report**, sections **Stop / Keep / Start** (exact casing)
- Free teaser → **Preview**

## Local development
```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL to the backend
npm install
npm run dev                  # http://localhost:3000
```

## Notes
- Design tokens in `tailwind.config.ts` are ESTIMATES from BRAND_GUIDELINES §4 -
  confirm exact hex/font-family against live CSS before finalizing.
- No business logic (scoring formula, claim templates) is implemented - stubs only.
