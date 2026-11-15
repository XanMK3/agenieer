/**
 * generation/agents.ts
 *
 * Renders the fixed, stack-independent managed entrypoint block for AGENTS.md.
 *
 * CRITICAL INVARIANT: This function takes NO parameters and must NOT import,
 * read, or interpolate any standards template bodies. Output is always identical
 * regardless of the technologies detected or standards installed.
 */

export const AGENTS_START_MARKER = '<!-- agenieer:standards:start -->';
export const AGENTS_END_MARKER = '<!-- agenieer:standards:end -->';

/**
 * Returns the fixed managed AGENTS.md section content.
 * Always returns the same string — no parameters, no template imports.
 */
export function renderAgentsSection(): string {
  return `${AGENTS_START_MARKER}
## Coding Standards

Before modifying source or test files:
1. Read \`docs/standards/README.md\`.
2. Identify the standards applicable to the files and technologies involved.
3. Read only those standards; multiple standards may apply together.
4. Do not load unrelated standards.
${AGENTS_END_MARKER}`;
}
