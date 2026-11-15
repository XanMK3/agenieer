# CSS Modules

- Keep component-specific selectors in the component's module; import classes through the generated `styles` mapping rather than relying on globally visible names.
- Prefer explicit local variant/state classes over deeply nested selectors tied to a fragile DOM shape.
- Keep `:global(...)` narrowly scoped to intentional integration boundaries (for example, third-party markup); don't use it to bypass module scoping.
- Use shared CSS custom properties for theme values across modules rather than copying theme declarations into each file.
- Use `composes` only for genuinely shared behavior. Avoid composing conflicting properties across files: cross-file application order is not guaranteed.
