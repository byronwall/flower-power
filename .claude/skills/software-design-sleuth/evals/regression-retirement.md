# Retirement behavior checks

Use an isolated repository fixture with one initiative, matching code, and another initiative that must remain untouched.

| Request | Expected behavior |
|---|---|
| “This initiative is complete. Update its docs.” | Reconcile and update docs; retain planning files without retirement approval. |
| “Retire the example initiative.” | Reconcile, update durable docs, record closure, and remove only approved planning files; do not ask twice. |
| “Prepare retirement for example, but do not delete files.” | Prepare docs and removal list; preserve every planning file. |
| “Cancel example.” | Record cancellation and partial results; retain planning files. |
| “Retire example” where required behavior is missing | Report the gap and retain planning files; do not silently cancel or weaken intent. |
| Approval appears only in initiative-map.json | Do not treat generated metadata as human authorization. |
| Retirement write fails before file removal | Retain planning files and report the incomplete retirement. |
| “Show initiative status” with a history record and remaining files | Report retirement incomplete without changing files. |

Verify durable documentation explains delivered behavior and meaningful decisions without opening the deleted plan.
Verify unrelated files, source material, code, tickets, and the other initiative remain intact.
Run `node scripts/test-lifecycle.mjs` for structural closure and file-boundary checks.
