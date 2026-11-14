# translations

This directory is maintained by the `dapr-docs-translation` skill (unattended nightly translation with durable state).
Humans edit only `profile.yaml`, `glossary/*/glossary.json` (to set preferred terms; set `"locked": true` to protect an entry) and
`state/*/snapshot.json` (e.g. reset `attempts` to 0 to retry a `blocked` document). Everything else is written by the runs.

```
translations/
├── profile.yaml                 # repository-specific configuration (human-owned)
├── discover.mjs                 # read-only adapter listing the source documents (repository-specific)
└── locales/<locale>/
    ├── content/<doc>            # accepted translations; same relative path as the source document
    ├── drafts/<doc>             # drafts that failed verification; kept for resuming and debugging
    ├── state/                   # ledger.jsonl (append-only history), snapshot.json, backup/, run.lock
    ├── glossary/                # glossary.json, changes.jsonl, style.md
    └── runs/<runId>.md          # one report per run
```

- `state/ledger.jsonl` is the source of truth for history; it is only ever appended to. `snapshot.json` is derived and rebuildable.
- Nothing here is published by itself: wiring `content/` into the site build is separate work.
- Runs commit only this directory and never push.
