import { DetectedTechnology, ReactTarget } from '../types.js';
import { inspectionFiles, inspectText, withoutComments } from './inspection.js';
import { inspectSfc } from './vue-sfc.js';

const VUE_PACKAGES = new Set(['vue', 'nuxt', '@vitejs/plugin-vue', '@vitejs/plugin-vue-jsx', 'vue-loader', 'vue-tsc', '@vue/babel-plugin-jsx', '@vue/runtime-dom', '@vue/runtime-core']);
const REACT_PACKAGES = new Set(['react', 'react-dom', 'next', 'gatsby', '@remix-run/react', '@remix-run/dev', '@react-router/dev', 'react-router-dom', '@vitejs/plugin-react', '@vitejs/plugin-react-swc', 'react-native', 'react-native-web', '@react-native/metro-config']);
const WEB_PACKAGES = new Set(['react-dom', 'next', 'gatsby', '@remix-run/react', '@remix-run/dev', '@react-router/dev', 'react-router-dom', '@vitejs/plugin-react', '@vitejs/plugin-react-swc', 'react-native-web']);
const NATIVE_PACKAGES = new Set(['react-native', 'react-native-web', '@react-native/metro-config']);

export function classifyReactTarget(web: boolean, native: boolean): ReactTarget {
  return web ? (native ? 'mixed' : 'web') : (native ? 'native' : 'unknown');
}

export async function detectFrameworks(root: string): Promise<{ detected: DetectedTechnology[]; hasSfcJs: boolean }> {
  const detected: DetectedTechnology[] = [];
  let hasSfcJs = false;
  function signal(id: string, evidence: string, category: DetectedTechnology['category'] = 'framework', confidence: DetectedTechnology['confidence'] = 'high') {
    detected.push({ id, evidence: [evidence], confidence, category });
  }
  function packageSignal(name: string, evidence: string) {
    if (name === 'expo/metro-config') {
      packageSignal('react-native', evidence);
      return;
    }
    const base = name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : name.split('/')[0];
    if (VUE_PACKAGES.has(base)) signal('vue', evidence);
    if (REACT_PACKAGES.has(base)) {
      detected.push({
        id: 'react', evidence: [evidence], confidence: 'high', category: 'framework',
        platformEvidence: {
          web: WEB_PACKAGES.has(base) ? [evidence] : [],
          native: NATIVE_PACKAGES.has(base) ? [evidence] : [],
        },
      });
    }
  }
  function imports(text: string, file: string) {
    const clean = withoutComments(text);
    const code = clean.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, (token) => ' '.repeat(token.length));
    const pattern = /\b(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)['"]([^'"]+)['"]/g;
    for (const match of clean.matchAll(pattern)) {
      if (code.slice(match.index, match.index + 4).trim()) packageSignal(match[1], `Import "${match[1]}" in "${file}"`);
    }
  }

  for (const file of await inspectionFiles(root, (file) => /(?:^|\/)package\.json$/.test(file))) {
    const text = await inspectText(root, file);
    if (text === undefined) continue;
    try {
      const pkg: unknown = JSON.parse(text);
      if (!pkg || typeof pkg !== 'object') continue;
      for (const field of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
        const dependencies: unknown = Reflect.get(pkg, field);
        if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)) continue;
        for (const [name, version] of Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b))) {
          if (typeof version === 'string') packageSignal(name, `${file} ${field}: "${name}" (${version})`);
        }
      }
    } catch { /* Invalid manifests are not evidence. */ }
  }

  for (const file of await inspectionFiles(root, (file) => /\.html?$/.test(file))) {
    signal('html', `HTML source file: "${file}"`, 'language');
  }
  for (const file of await inspectionFiles(root, (file) => file.endsWith('.vue'))) {
    signal('vue', `Vue SFC source file: "${file}"`);
    const text = await inspectText(root, file);
    if (text === undefined) continue;
    for (const block of await inspectSfc(root, file, text)) {
      if (block.kind === 'script') {
        if (['ts', 'tsx', 'typescript'].includes(block.language ?? '')) signal('typescript', `Vue script lang="${block.language}" in "${file}"`, 'language');
        if (['js', 'jsx', 'javascript'].includes(block.language ?? '')) {
          signal('javascript', `Vue script lang="${block.language}" in "${file}"`, 'language');
          hasSfcJs = true;
        }
        imports(block.content, file);
      } else if (['css', 'scss', 'sass'].includes(block.language ?? '')) {
        signal('css', `Vue style lang="${block.language}" in "${file}"`, 'styling');
      }
    }
  }

  const files = await inspectionFiles(root, (file) => /\.(?:[cm]?[jt]sx?)$/.test(file) || /(?:^|\/)(?:tsconfig[^/]*\.json|\.babelrc(?:\.json)?|babel\.config\.json|app\.json)$/.test(file));
  for (const file of files) {
    const text = await inspectText(root, file);
    if (text === undefined) continue;
    const clean = withoutComments(text);
    const stringStarts = new Set<number>();
    const code = clean.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, (token, index: number) => {
      stringStarts.add(index);
      return ' '.repeat(token.length);
    });
    const isStaticToken = (index: number) => stringStarts.has(index) || /[\w]/.test(code[index] ?? '');
    imports(text, file);
    const config = /(?:^|\/)(?:tsconfig[^/]*\.json|[^/]*\.config\.[^/]+|gatsby-config\.[^/]+|\.babelrc(?:\.json)?|app\.json)$/.test(file);
    if (!config) continue;
    for (const match of clean.matchAll(/(?:["']?jsxImportSource["']?\s*:\s*|["']?importSource["']?\s*:\s*)['"]([^'"]+)['"]/g)) {
      if (!isStaticToken(match.index)) continue;
      packageSignal(match[1], `JSX import source "${match[1]}" in "${file}"`);
    }
    const jsxMode = /["']?jsx["']?\s*:\s*['"](react|react-jsx|react-jsxdev)['"]/.exec(clean);
    const customSource = /["']?jsxImportSource["']?\s*:/.exec(clean);
    const customFactory = /["']?jsxFactory["']?\s*:\s*['"]([^'"]+)['"]/.exec(clean);
    if (jsxMode && isStaticToken(jsxMode.index) && !customSource && !customFactory) {
      signal('react', `React JSX compiler mode "${jsxMode[1]}" in "${file}"`);
    }
    if (customFactory && isStaticToken(customFactory.index) && customFactory[1] === 'React.createElement') {
      signal('react', `React JSX factory in "${file}"`);
    }
    // Recognized configuration entries, not arbitrary package-name substrings.
    for (const match of clean.matchAll(/['"](@babel\/preset-react|babel-preset-react|@vue\/babel-plugin-jsx|@vitejs\/plugin-vue(?:-jsx)?|vue-loader|@vitejs\/plugin-react(?:-swc)?|babel-preset-expo|@react-native\/babel-preset|metro-react-native-babel-preset)['"]/g)) {
      if (!stringStarts.has(match.index)) continue;
      if (match[1].includes('preset-react')) {
        const alternativeRuntime = /["']?importSource["']?\s*:\s*['"]([^'"]+)['"]/.exec(clean);
        if (!alternativeRuntime || alternativeRuntime[1] === 'react') signal('react', `Babel configuration in "${file}" includes React preset`, 'framework', 'medium');
      } else if (match[1] === 'babel-preset-expo' || match[1].includes('react-native')) packageSignal('react-native', `Native configuration "${match[1]}" in "${file}"`);
      else packageSignal(match[1], `Integration "${match[1]}" in "${file}"`);
    }
    if (/(?:^|\/)nuxt\.config\./.test(file)) signal('vue', `Nuxt configuration: "${file}"`);
    if (/(?:^|\/)vue\.config\./.test(file)) signal('vue', `Vue CLI configuration: "${file}"`);
    if (/(?:^|\/)(?:next|gatsby)-?config\./.test(file) || /(?:^|\/)next\.config\./.test(file)) packageSignal('next', `React web configuration: "${file}"`);
    if (/(?:^|\/)react-native\.config\./.test(file)) packageSignal('react-native', `React Native configuration: "${file}"`);
  }
  return { detected, hasSfcJs };
}
