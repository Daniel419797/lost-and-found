# Security Notes

Date: 2026-05-13

## Dependency Audit Status

Command:

```powershell
npm audit --omit=dev
```

Result:

- 0 production dependency vulnerabilities reported

## Current Dependency Controls

- Next.js is pinned through the lockfile at `16.2.6`.
- `postcss` is forced to the fixed `8.5.x` series through `package.json` `overrides`.
- Transitive packages previously reported by audit (`fast-uri`, `hono`, `ip-address`, and `express-rate-limit`) are resolved to patched versions in `package-lock.json`.

## Release Policy

- Run `npm run verify` before release.
- Run `npm run typecheck` before release.
- Run `npm audit --omit=dev` before release.
- Treat any new production dependency vulnerability as a release blocker unless there is a documented upstream exception.
