---
name: verify
description: Verify completed work against the real artifact and user-visible path before declaring it done. Use after implementation, migration, generation, or delegated work when compilation or an agent summary alone cannot establish correctness.
---

# Verify

Ask what observable evidence would prove the requested outcome. Check that artifact directly rather than relying on timestamps, cached output, compilation, or another agent's report.

Use the strongest proportionate checks available:

1. Inspect the final diff and generated artifacts.
2. Run focused tests and relevant static checks.
3. Exercise the actual path from input to output.
4. For integrations, test the communication boundary end to end.
5. For UI, inspect the rendered result and relevant interaction states at representative sizes.

Prefer a deterministic, repeatable command or script when the same verification would otherwise depend on a one-time judgment. Keep such an artifact only when it will remain useful to future maintainers.

When a check fails, confirm that the observation method is valid before drawing conclusions. Report exactly what passed, what failed, what could not be checked, and the resulting confidence. Do not claim complete correctness from partial evidence.
