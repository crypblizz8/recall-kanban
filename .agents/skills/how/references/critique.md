# Architecture Critique

Form findings from the code, using the explanation only as a map. Review through the lenses that fit the subsystem:

- Abstraction fit. Do boundaries separate concepts that change independently, or add indirection without value?
- Data model. Do types and storage shapes match runtime use and make invalid states difficult to represent?
- Boundary discipline. Are validation, errors, and external formats handled at clear system edges?
- Evolution. Will plausible next changes stay local, or require coordinated edits across unrelated layers?
- Complexity. Is complexity concentrated in the domain, or created by configuration, wrappers, and hidden state?
- Consistency. Does this subsystem follow established patterns, and are differences justified?

For broad or consequential architecture, independent critics may inspect the same explanation and relevant files. The primary agent classifies their findings:

- Act on: demonstrated structural problem worth addressing now.
- Consider: credible concern whose cost or remedy remains uncertain.
- Noted: valid tradeoff or low-priority debt.
- Dismissed: unsupported, contextually wrong, or merely stylistic.

Every retained finding needs concrete evidence and practical impact. An empty critique is valid.
