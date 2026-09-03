---
name: coding-workflow
description: Route non-trivial coding work into an evidence-led investigation, bug fix, feature, refactoring, or review workflow. Use when a task needs coordinated implementation and verification; skip for simple questions or tiny mechanical edits.
---

# Coding Workflow

Choose the smallest playbook that fits the requested outcome. Preserve the user's scope and authorization. Do not turn a read-only request into an implementation task.

## Route the Task

- For a read-only explanation, diagnosis, or design question, read [references/investigation.md](references/investigation.md).
- For a defect the user wants fixed, read [references/bug-fix.md](references/bug-fix.md).
- For new or changed behavior, read [references/feature.md](references/feature.md).
- For a behavior-preserving structural change, read [references/refactoring.md](references/refactoring.md).
- For review of a diff, branch, or risky change, read [references/review.md](references/review.md).

If more than one playbook applies, use the one matching the primary deliverable and borrow only the necessary checks from the others.

## Shared Standard

Before changing code, state assumptions that materially affect the implementation. Read the surrounding code and identify the relevant data shape, ownership boundary, and existing conventions.

Use parallel agents only when the task divides into independent workstreams and their outputs can be reconciled from concrete artifacts. Keep narrow work in the primary agent.

Before declaring completion, verify the real artifact. A build or type check is useful but does not prove user-visible behavior. Report what was checked and any remaining uncertainty.

Write concise final responses that lead with the outcome and evidence. Do not claim correctness beyond the verification performed.
