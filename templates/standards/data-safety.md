# Data Safety

- **External data boundaries:** Validate the shape and meaning of external or untrusted data before use. Distinguish absent values from valid falsy values such as `0`, `false`, and empty strings. Interpret sentinel values according to the external contract rather than assuming they mean missing or invalid data. TypeScript types do not provide runtime validation.
- **Partial-failure safety:** Define acceptable partial-failure behavior before replacing persisted or generated data. Validate proposed outputs before publishing them. Preserve valid existing data when partial results are unacceptable, and use atomic replacement where supported so interrupted writes do not expose incomplete output.
- **Resource limits:** Enforce limits during consumption of potentially large inputs, not only after buffering or processing them. Check actual consumption instead of trusting declared sizes, and stop when the applicable limit is reached.
