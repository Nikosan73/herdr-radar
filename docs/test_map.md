# Test map

| Path | Command | Basis |
|---|---|---|
| `lib/frame.js` workspace metadata | `node tools/tests/workspace-cleanup.js` | imports; deleted-workspace cleanup and surviving-workspace publication |
| `bin/`, `lib/`, `tools/tests/workspace-cleanup.js` | `npm run check` | existing syntax/declaration gate plus workspace cleanup regression |
