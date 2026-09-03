---
name: tdd
description: Fix a bug by first making it fail in a focused executable check. Use when the user requests TDD or a regression test, or when a bug has an obvious cheap test boundary; skip when a meaningful failing test would require disproportionate infrastructure or brittle mocks.
---

# TDD Bug Fix

Identify intended behavior, current behavior, and the smallest observable reproduction. Choose the nearest existing unit, component, integration, or regression test boundary.

Write the smallest test that expresses intended behavior, then run it before changing production code. Confirm that it fails because of the reported defect. Correct a test that passes unexpectedly or fails for an unrelated reason.

Make the smallest production change that fixes the cause. Re-run the focused test, then run proportionate adjacent tests and static checks.

Do not weaken assertions to match incorrect behavior or create a test that mostly verifies mocks, timing, or implementation details. When a useful failing test is impractical, explain why before editing and use the closest executable reproduction, such as a targeted script, browser interaction, snapshot comparison, or integration check.

Report the failing-before signal, passing-after signal, and nearby validation. If failing-before evidence was unavailable, state that plainly.
