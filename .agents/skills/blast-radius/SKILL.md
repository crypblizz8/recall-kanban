---
name: blast-radius
description: Determine what a proposed or completed change could break beyond its immediate diff and prove the assumptions that make it safe. Use for risky changes, explicit blast-radius requests, or reviews where callers alone do not establish safety.
---

# Blast Radius

Read the change and state what behavior differs, including consequences not obvious from the diff. Trace changed symbols through callers and downstream consumers, then look beyond symbol search at serialized data, database schemas, configuration, lifecycle timing, external APIs, feature flags, and other languages reading the same values.

Find the one or two facts on which the change's safety depends. For each fact, obtain the strongest practical evidence:

1. A reasoned claim.
2. A concrete source reference.
3. A traced demonstration that the failure path cannot occur.
4. An executable test or script against the real code.
5. Reproduction in the running product.

Aim for executable evidence when it is cheap. Mark anything weaker as unproven rather than rounding confidence upward.

Report what changed, the critical safety facts and their evidence level, confirmed risks, checked-and-cleared risks, and the cheapest pre-merge check that would catch the meaningful failure. Include likelihood and impact only when they can be justified.
