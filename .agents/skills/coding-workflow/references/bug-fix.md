# Bug Fix

1. Define intended behavior, observed behavior, and the narrowest reproducible case.
2. Reproduce the failure before editing when practical. Record the failing signal.
3. Trace the symptom to its cause. Avoid guards that merely hide the failure.
4. When there is a cheap, meaningful test boundary, add the focused regression test before the fix and confirm it fails for the expected reason.
5. Make the smallest production change that fixes the cause while preserving nearby contracts.
6. Re-run the reproduction or regression test, then run proportionate adjacent checks.
7. Inspect the diff for accidental changes and report failing-before and passing-after evidence.

If reproduction or a regression test is impractical, explain why and use the closest executable check. Do not weaken tests to accommodate incorrect behavior.
