# saadcyber21.github.io

Portfolio for [@saadcyber21](https://github.com/saadcyber21) — AI agent scaffold security.

Static. No framework, no build step, no tracker, no analytics, no CDN, no webfont
requests. Four files; every fact is generated from the GitHub API or stated by hand.

Design: a paper-and-ink editorial dossier — numbered sections, hairline rules, one
oxblood accent, system serif/sans/mono only. Light by default with an automatic
night variant; it prints as a document.

## Layout

```
index.html     structure and copy
styles.css     design system (custom properties, no preprocessor)
data.js        every fact on the page, in one place
app.js         behaviour + the proof-lab algorithms
refresh.py     re-pull the API-derived telemetry block in data.js
```

`data.js` is the single source of truth for content. To change a claim, change it
there — the renderers in `app.js` read from `window.SITE` and nothing else.

## The proof lab

Section 05 runs three algorithms in the browser:

1. **entropy detector** — a port of `secret-sweep`'s documented detection logic:
   fifteen pattern rules (authoritative, run first) then an entropy layer using
   three length-normalised signals (`ratio`, `coverage`, `transitions`) and three
   structural guards (identifier syntax, sequential constants, assignment context).
   It also runs the naive `entropy > 4.5` test that this replaced, so its failure
   mode is visible next to the fix.
2. **tool-call gateway** — the `zero-trust-ai-gateway` decision path: RBAC lookup,
   then signature inspection, then an explicit `406` rather than a silent drop.
3. **calibration** — the measured false-positive and recall figures, with the
   command that reproduces them.

These are **reimplementations, not the shipped artefacts**. The real tools are
Python; the page says so in the honest ledger (§09) rather than letting a visitor
assume they are running `scanner.py`.

`window.__lab` exposes the detection functions so they can be exercised outside a
browser — the same standard the repositories hold.

## Tests

`lab_test.js` and `render_test.js` run the real `app.js` against a minimal DOM
stub under Node. No test runner, no dependency:

```bash
node lab_test.js       # detector behaviour: 18 cases
node render_test.js    # every section renders, gateway blocks/allows correctly
```

`lab_test.js` asserts both halves — that a credential is flagged **and** that the
known false-positive shapes (sequential constants, `SCREAMING_SNAKE`, CamelCase
Win32 bindings, `actions/checkout@v4`) are not. It also asserts that no scanned
secret appears unmasked in the output.

## Refreshing the numbers

The telemetry block in `data.js` sits between `/*__TELEMETRY_START__*/` and
`/*__TELEMETRY_END__*/`. To re-pull it:

```bash
export GH_TOKEN=...        # fine-grained token, public read-only is enough
python3 refresh.py         # writes data.js, prints a diff summary
```

Hand-written prose elsewhere in `data.js` is **not** touched. The rendered build
date in `index.html` and the header stamp are not updated by the script either —
a number that silently drifts is worse than a stale one with a date on it, so
both are changed deliberately or not at all.

## Deploying

Pushing `main` publishes it. GitHub Pages serves from the repository root:

```bash
git add -A && git commit -m "update" && git push origin main
```

`.nojekyll` is present so nothing is processed on the way out.

## What this page deliberately does not do

- No static status badges. A badge that asserts "CI passing" without reading the
  build is decoration.
- No claim without either a reproduction command or a link to the source.
- No hiding the gaps. Section 07 lists what the work does not do, including two
  entries about this page itself.
