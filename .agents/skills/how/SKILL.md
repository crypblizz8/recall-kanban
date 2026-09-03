---
name: how
description: Explain how a codebase subsystem, feature flow, ownership boundary, or runtime path works. Also critique its architecture when explicitly requested; use a history or decision-record workflow when the question is why it was built that way.
---

# How

Build a working mental model from the implementation. Read code rather than inferring behavior from names or documentation.

## Choose the Path

For a narrow question contained within a module or small call chain, explore and explain directly.

For a cross-cutting subsystem, divide the question into distinct exploration angles such as runtime flow, data and state, and boundaries or integrations. Parallel agents are useful only when those angles can be investigated independently. Give each agent a focused scope and require structured evidence. Read [references/exploration.md](references/exploration.md) before delegating.

When the user asks for architectural problems or improvements, explain the current system first, then read [references/critique.md](references/critique.md). Do not critique a system you have not traced.

## Explain

Adapt the response to the question rather than filling a template mechanically. Include:

- A short overview of what the subsystem does and why it exists.
- The few concepts needed to understand it.
- The execution or data flow from trigger to effect, with concrete file and symbol references.
- A compact map of the files someone would need to change.
- Non-obvious constraints, sharp edges, and unresolved gaps.

Use a diagram only when several components, transformations, or branches are materially clearer visually. Distinguish verified behavior from inference.
