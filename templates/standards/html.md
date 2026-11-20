# HTML / Semantic Markup

Apply these rules to standalone documents and browser markup produced by components. Use the framework's attribute/binding syntax (for example, React `className`/`htmlFor` or Vue directives). Document metadata applies to full documents, not reusable fragments; non-DOM renderers need their platform's semantics.

## Structure and Accessibility

- Choose native elements for their meaning: buttons for actions, links with valid destinations for navigation, lists for list content, and tables with header associations for tabular data.
- Respect element content models, including restrictions on nested interactive content. Keep IDs unique and ID references valid; do not depend on browser repair of malformed markup.
- Use appropriate landmarks, logical heading levels, and meaningful reading order. Do not choose headings for their visual size.
- Preserve native keyboard behavior, accessible names, and visible focus. Prefer native semantics before adding ARIA or recreating controls.
- Give informative images useful alternatives and purely decorative images empty `alt` text. Provide captions, transcripts, or other media alternatives appropriate to the content.

## Forms

- Label controls accessibly; placeholders do not replace labels. Associate instructions and errors with their controls, and expose status updates through suitable accessible notifications.
- Use suitable input types, submitted names, autocomplete hints, and native constraints. Group related controls with `fieldset`/`legend` where appropriate.
- Set `type="button"` on buttons that must not submit a form.
- Explain validation failures accessibly. Validate untrusted submissions at the server/trust boundary as well as in the interface.

## Safety and Loading

- Keep untrusted content out of raw HTML insertion unless it passes an appropriate sanitizer at a defined trust boundary. Validate dynamic URL destinations and allowed schemes.
- For complete documents, provide an appropriate doctype, document language, character encoding, title, and viewport metadata.
- Supply image dimensions where practical to reduce layout shifts. Lazy-load suitable offscreen media without delaying critical visible content.
