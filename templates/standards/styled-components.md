# styled-components

- Declare styled component definitions at module scope, not during React renders; otherwise component identity and DOM state can reset.
- Keep styling-only props out of the DOM using transient `$props` or the project's `shouldForwardProp` policy.
- Use the existing theme/tokens for shared values instead of defining parallel color and spacing systems.
- For a finite set of variants, prefer static CSS selected by attributes/classes when practical; avoid generating a new CSS rule for every variant value.
- Use CSS custom properties for high-frequency or continuously changing values (drag positions, animation progress) rather than interpolating new class rules every frame.
- Never interpolate untrusted strings directly into CSS rules or URLs; validate/whitelist values at the boundary.
