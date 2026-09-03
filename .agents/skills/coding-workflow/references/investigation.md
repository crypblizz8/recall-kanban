# Investigation

Use for read-only questions such as how a subsystem works, why behavior occurs, where code belongs, or whether an assumption is true.

1. Interpret the question and state any material scope assumption.
2. Find the real entry point. Trace callers, callees, data transformations, state, and external boundaries from the implementation.
3. For a broad subsystem, divide exploration by distinct concerns such as runtime flow, data model, and integrations. Use agents only when this division saves time or improves coverage.
4. Reconcile findings against the code. Mark unresolved gaps instead of filling them with inference.
5. Answer with the mental model, execution flow, relevant files, and non-obvious constraints. Add a diagram only when it clarifies a multi-component relationship.

Do not modify code unless the user expands the request.
