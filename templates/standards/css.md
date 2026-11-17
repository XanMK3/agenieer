# CSS

- Use shared, semantically named custom properties for recurring design decisions (colors, spacing, typography); avoid divergent one-off values for the same role.
- Keep selector specificity low. Prefer existing cascade layers or narrowly scoped classes over override chains and `!important`.
- Use logical properties (`margin-inline`, `inset-inline`, etc.) where layouts should respect writing direction.
- Preserve visible keyboard focus (`:focus-visible`) and provide a reduced-motion path for nonessential animation.
- Favor content-driven sizing; avoid fixed heights that break with longer text, zoom, or translation.
- For reusable components, consider container queries when layout depends on the component's space; use viewport queries for page-level layout.
- Keep component-internal styling within the owning component; prefer explicit variants, documented styling hooks, or CSS custom properties. Scope and document necessary cross-component overrides; avoid selectors coupled to deep DOM structure outside the ownership boundary.
