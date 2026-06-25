# Dependency Vulnerability Triage

## What the scanner found

Two findings, all from **transitive dependencies of build tooling**:

- `@cloudflare/vite-plugin` → pulls `ws` and `undici` (used by Wrangler/Miniflare during local dev + build)
- `@tanstack/react-start` → pulls `undici` and `js-yaml` (build/SSR tooling)
- `@tailwindcss/vite` + `tailwindcss` → pull `postcss` (CSS build pipeline)

## Why these are not exploitable here

All advisories describe runtime attack surfaces that **do not exist in this app**:

- **ws / undici DoS + SOCKS5 + TLS bypass** — only reachable if our deployed Worker opened outbound WebSocket/SOCKS5 connections through these specific Node libraries. Our production runtime is Cloudflare workerd (Web `fetch`/`WebSocket`), not Node `undici`/`ws`. These packages ship only inside the local dev server and build toolchain.
- **postcss `</style>` XSS** — requires feeding attacker-controlled CSS through PostCSS stringify. Our CSS is authored in-repo at build time; no user input reaches PostCSS.
- **js-yaml quadratic merge-key DoS** — only triggered when parsing untrusted YAML. We don't parse user YAML.
- **TanStack start-server-core sibling server-fn** — already patched in newer `@tanstack/react-start`; the template version is pinned by Lovable and is upgraded centrally, not by hand-editing `package.json` (manual bumps risk breaking the Lovable build).

## Recommended action

1. **Mark both findings as ignored** with explanations tying each to the reasoning above.
2. **Update `@security-memory`** so future scans don't re-flag the same transitive build-tool CVEs unless severity changes or the package moves into runtime use.
3. **No code, no dependency edits.** Lovable manages `@tanstack/react-start`, `@cloudflare/vite-plugin`, and Tailwind versions centrally — they'll roll forward in normal template updates. Hand-bumping risks breaking the build for zero real-world security gain.

## What I will NOT do

- Won't run `bun update` on pinned framework packages (breaks the Lovable template contract).
- Won't add overrides/resolutions for `ws`/`undici`/`postcss` — they're not in our runtime path.
- Won't touch any feature code.

## Cost

Near zero — two `manage_security_finding` calls + one memory update. No credits spent on AI generation.
