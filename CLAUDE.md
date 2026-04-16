# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

No test suite is configured.

## Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS v4** — imported via `@import "tailwindcss"` in [app/globals.css](app/globals.css); uses `@theme inline` block for CSS variable mapping. No `tailwind.config.js` — configuration is in CSS.
- External images require allowlisting in [next.config.ts](next.config.ts) under `images.remotePatterns`.

## Architecture

### Routing
All pages live in `app/` using the App Router file-system convention. Pages that use browser APIs or React hooks must include `"use client"` at the top.

Routes: `/` `/about` `/services` `/city-tours` `/airport-transfer` `/location` `/testimony` `/contact`

### i18n (multi-language)
All user-facing strings are centralized in [lib/translations.ts](lib/translations.ts). Three languages are supported: Indonesian (`id`), English (`en`), Thai (`th`).

- [components/LanguageContext.tsx](components/LanguageContext.tsx) provides `LanguageProvider` and `useLanguage()` hook. The selected language is persisted in `localStorage` under the key `"lang"`.
- Every page that renders text must call `const { t } = useLanguage()` and read strings from `t`. Never hardcode user-visible strings outside of `translations.ts`.
- `LanguageProvider` wraps the entire app in [app/layout.tsx](app/layout.tsx).

### Shared components
- [components/Navbar.tsx](components/Navbar.tsx) — fixed top nav with scroll-aware styling, services dropdown, and language switcher. Client component.
- [components/Footer.tsx](components/Footer.tsx) — site footer.

### Styling conventions
- Brand colors: `#F5C518` (yellow), `#1B2A4A` (dark navy), `#25D366` (WhatsApp green).
- The `.whatsapp-btn` utility class is defined globally in [app/globals.css](app/globals.css) and used across pages for WhatsApp CTA buttons.
- Tailwind classes are used inline; no CSS modules.
