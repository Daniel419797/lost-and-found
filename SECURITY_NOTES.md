# Security Notes

Date: 2026-04-28

## Dependency Audit Status

Command:

```powershell
npm audit --omit=dev
```

Result:

- 2 moderate vulnerabilities reported
- Root issue: transitive `postcss < 8.5.10` advisory surfaced through Next.js dependency tree
- Advisory: PostCSS XSS via unescaped `</style>` in CSS stringify output

## Current Risk Assessment

- Scope: transitive dependency inside Next.js toolchain path
- Runtime exposure in this app: low for current usage pattern
- Severity from npm: moderate

## Remediation Attempts Performed

- Upgraded Next.js from 16.2.3 to 16.2.4 (latest available patch in major 16)
- Re-ran `npm audit --omit=dev`
- Advisory remains in current upstream dependency graph

## Decision

- Do not use `npm audit fix --force` because it proposes breaking major downgrade/changes not suitable for production stability
- Keep the app on latest stable patch in major 16
- Track upstream Next.js/postcss dependency updates and remediate as soon as a non-breaking upstream fix lands

## Operational Guardrails

- Continue running `npm run lint` and `npm run build` on every change
- Re-run `npm audit --omit=dev` during each release cycle
- Upgrade Next.js patch versions promptly when available
