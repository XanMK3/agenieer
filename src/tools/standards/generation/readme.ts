import { ResolvedStandard } from '../resolver.js';

export const README_START_MARKER = '<!-- agenieer:routing:start -->';
export const README_END_MARKER = '<!-- agenieer:routing:end -->';

/**
 * Render the managed routing section for docs/standards/README.md.
 *
 * CRITICAL INVARIANT: Renders only titles, links, applicable patterns, and
 * usage context from registry metadata. Must NEVER read or include the bodies
 * of any template files.
 */
export function renderReadmeSection(standards: ResolvedStandard[], unsupportedRunners: string[]): string {
  const lines: string[] = [];

  lines.push(README_START_MARKER);
  lines.push('# Engineering Standards — Index');
  lines.push('');
  lines.push('> This index is managed by [Agenieer](https://github.com/XanMK3/agenieer).');
  lines.push('> Unrelated content below this managed section is preserved.');
  lines.push('');

  if (standards.length === 0) {
    lines.push('No standards currently active.');
    lines.push('');
  } else {
    lines.push('## Active Standards');
    lines.push('');
    lines.push('| Standard | When to Read |');
    lines.push('|----------|-------------|');

    for (const std of standards) {
      // Link is relative to docs/standards/
      // outputFile is docs/standards/foo.md → link target is foo.md
      const relLink = std.outputFile.replace(/^docs\/standards\//, '');
      const title = idToTitle(std.id);
      lines.push(`| [${title}](${relLink}) | ${std.usageContext} |`);
    }

    lines.push('');
    lines.push('## Applicable File Patterns');
    lines.push('');

    for (const std of standards) {
      const relLink = std.outputFile.replace(/^docs\/standards\//, '');
      const title = idToTitle(std.id);
      if (std.applicablePatterns.length > 0) {
        const patterns = std.applicablePatterns.map((p) => `\`${p}\``).join(', ');
        lines.push(`- **[${title}](${relLink})**: ${patterns}`);
      }
    }

    lines.push('');
    lines.push('## Composition Examples');
    lines.push('');

    // Build composition examples from detected standards
    const hasTs = standards.some((s) => s.id === 'typescript');
    const hasJs = standards.some((s) => s.id === 'javascript');
    const hasReact = standards.some((s) => s.id === 'react');
    const hasTesting = standards.some((s) => s.id === 'testing');
    const hasVitest = standards.some((s) => s.id === 'vitest');
    const hasRtl = standards.some((s) => s.id === 'react-testing-library');
    const hasPlaywright = standards.some((s) => s.id === 'playwright-test');

    if (hasTs && hasReact && hasVitest && hasRtl) {
      lines.push('- `Button.test.tsx` (Vitest + RTL): read **TypeScript** + **React** + **Testing** + **Vitest** + **React Testing Library**');
    } else if (hasTs && hasReact && hasVitest) {
      lines.push('- `Component.test.tsx` (Vitest): read **TypeScript** + **React** + **Testing** + **Vitest**');
    } else if (hasTs && hasPlaywright) {
      lines.push('- `tests/e2e/login.spec.ts` (Playwright): read **TypeScript** + **Testing** + **Playwright Test**');
    } else if (hasJs && hasTesting) {
      lines.push('- `src/app.test.js`: read **JavaScript** + **Testing**');
    } else if (hasTs && hasTesting) {
      lines.push('- `src/app.test.ts`: read **TypeScript** + **Testing**');
    } else if (hasTs || hasJs) {
      const lang = hasTs ? 'TypeScript' : 'JavaScript';
      lines.push(`- Source files: read **${lang}** standards`);
    }

    if (hasTs && hasPlaywright && (hasVitest || hasRtl)) {
      lines.push('- `tests/e2e/login.spec.ts` (Playwright): read **TypeScript** + **Testing** + **Playwright Test** (not Vitest or RTL)');
    }

    lines.push('');
    lines.push('## Conflict Resolution');
    lines.push('');
    lines.push('Project-specific documented decisions supersede generic preferences in these standards,');
    lines.push('but correctness, security, and accessibility requirements are not silently overridden.');
    lines.push('');
  }

  if (unsupportedRunners.length > 0) {
    lines.push('## Unsupported Testing Frameworks');
    lines.push('');
    lines.push(`The following testing frameworks were detected but have no v0.1 specific standards:`);
    lines.push('');
    for (const runner of unsupportedRunners) {
      lines.push(`- **${runner}** — refer to \`testing.md\` for general testing guidance`);
    }
    lines.push('');
    lines.push('> These frameworks are listed for reference. Agenieer does not substitute another');
    lines.push('> framework\'s standards and does not claim these frameworks are obsolete.');
    lines.push('');
  }

  lines.push(README_END_MARKER);

  return lines.join('\n');
}

function idToTitle(id: string): string {
  const titles: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    react: 'React',
    css: 'CSS',
    tailwind: 'Tailwind CSS',
    'css-modules': 'CSS Modules',
    'styled-components': 'styled-components',
    testing: 'Testing (Shared)',
    vitest: 'Vitest',
    'playwright-test': 'Playwright Test',
    'react-testing-library': 'React Testing Library',
  };
  return titles[id] ?? id;
}
