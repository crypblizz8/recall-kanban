# Review

Review for defects, regressions, security or reliability risks, broken contracts, and missing verification. Treat style preferences as secondary.

1. Establish the intended change from the request, diff, tests, and surrounding code.
2. Trace changed symbols to callers and downstream consumers. Check persistence, wire formats, configuration, timing, and external integrations where relevant.
3. Identify the assumptions on which safety depends. Prove the important ones with executable checks when practical.
4. Report findings first, ordered by severity, with precise file and line references, impact, and triggering conditions.
5. Separate confirmed findings from open questions. If no actionable issue is found, say so and name residual test gaps.

Do not propose rewrites without demonstrating a problem in the current design. Do not treat an agent's summary as proof; inspect the artifact.
