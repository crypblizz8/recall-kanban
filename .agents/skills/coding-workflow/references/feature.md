# Feature

1. Establish the user-visible outcome, constraints, and acceptance evidence.
2. Read the existing flow and name the data shape and ownership boundary before implementation.
3. For a meaningful architectural fork, sketch at least two viable shapes and choose using concrete tradeoffs. Keep established local patterns when they fit.
4. Implement the smallest coherent vertical slice. Avoid speculative extension points and compatibility layers with no current caller.
5. Exercise the real feature path from input to output. Add focused tests for stable logic and failure boundaries.
6. Inspect the final diff for scope creep, incomplete states, and inconsistent neighboring behavior.

For UI work, verify the rendered experience at relevant viewport sizes and interaction states rather than relying on compilation alone.
