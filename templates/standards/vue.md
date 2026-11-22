# Vue.js

## Components and Reactivity

- Respect the project's Vue version and API style. Prefer `<script setup>` for new Vue 3 SFCs where appropriate; do not migrate established Options API code without reason.
- Keep components focused; extract reusable stateful logic into composables. Define explicit prop, event, and slot contracts, with types when TypeScript is available. Avoid reaching into component internals.
- Treat props as read-only, including avoiding implicit mutation of parent-owned nested data. Communicate through events or intentional, documented `v-model` contracts.
- Use multi-word component names to avoid native element collisions, except framework-convention names such as root `App` or framework-reserved route components.
- Use `ref`/`reactive` for mutable reactive state and pure `computed` values for derivations. Do not synchronize redundant derived state or perform side effects/async work in computed getters.
- Preserve reactivity when extracting reactive properties; use `toRef`/`toRefs` where appropriate. Reactive `defineProps` destructuring is compiler-supported in Vue 3.5+, not universally across Vue 3. `defineModel` requires Vue 3.4+.

## Effects and Rendering

- Use watchers for reactive side effects, with invalidation/disposal cleanup through APIs supported by the project's Vue version. Follow Asynchronous Concurrency for asynchronous work.
- Use template refs and lifecycle-safe access for direct DOM work. In SSR contexts, guard browser-only APIs and avoid server/client rendering mismatches.
- Keep template expressions simple; put complex derivations in computed values and event logic in functions/methods.
- Use stable, unique `v-for` keys; avoid index keys when identity can change. Do not put `v-if` and `v-for` on the same element; use a computed filter or an appropriate surrounding template.
- Choose `v-if` for conditional creation/destruction and `v-show` for visibility toggling. Preserve the intended component state/lifecycle behavior.
- Make rendered element and attribute forwarding behavior clear at component boundaries. Apply the HTML standard when changing browser markup.

## Security and Performance

- Never compile untrusted content as Vue templates or executable bindings. Prefer escaped interpolation; treat `v-html` as an explicit raw-HTML trust boundary governed by the HTML standard. Validate untrusted destinations before URL bindings.
- Keep props stable where practical and avoid unnecessary deep reactive work for large immutable external structures.
- Lazy-load components/routes when beneficial. Measure before using `v-memo`, `v-once`, or other rendering optimizations, and preserve required updates.
