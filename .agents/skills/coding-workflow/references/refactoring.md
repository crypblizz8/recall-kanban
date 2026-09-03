# Refactoring

1. State the behavior that must remain unchanged and how it will be observed.
2. Map callers, public contracts, serialized shapes, and boundaries that symbol search may miss.
3. Remove dead or redundant structure when that simplifies the target change.
4. Make small coherent edits. Migrate callers and remove the superseded internal API in the same change when feasible.
5. Run the before-and-after behavioral checks plus relevant static checks.
6. Confirm the diff changes structure rather than product behavior. Report any intentional behavior change separately.

Do not add abstraction without a concrete reduction in duplication, coupling, hidden state, or reader effort.
