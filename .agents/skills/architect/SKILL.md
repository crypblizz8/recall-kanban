---
name: architect
description: Design types, caller-facing APIs, and module ownership before implementing a non-trivial cross-boundary change. Use when the shape of a solution is unsettled; skip for narrow changes that already fit an established pattern.
---

# Architect

Ground the design in the current system. Trace the affected flows, callers, data shapes, and ownership boundaries before proposing a new shape. Historical rationale is a constraint only when supported by evidence.

Write the caller's intended usage first. Derive types, signatures, state ownership, and module placement from that usage. For a consequential design fork, compare at least two structurally distinct options rather than variations of one idea.

Prefer the option that:

- Gives callers a small, coherent interface.
- Keeps domain logic separate from framework and transport wiring.
- Concentrates validation at external boundaries.
- Makes invalid states difficult to express.
- Keeps likely changes local without speculative extension points.
- Matches established repository patterns when they remain suitable.

Implement against the chosen shape when implementation is in scope. Treat repeated casts, optional fields that are always required, leaking internal rules, duplicated workarounds, or unexpected shared state as evidence that the design may be wrong. Revisit the shape instead of accumulating patches.

Only pause for design approval when the user requested a checkpoint or the decision requires a product choice or authority that cannot be inferred safely.
