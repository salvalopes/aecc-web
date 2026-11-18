module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    // Fase 3 / B14: os estilos vêm de `createStyles(theme)` + `useStyles()`
    // (src/theme/createStyles.ts), nunca de um `StyleSheet.create` fora do tema.
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.object.name='StyleSheet'][callee.property.name='create']",
        message:
          'Usar createStyles(theme) + useStyles() de @/theme/createStyles (docs/DESIGN.md §1).',
      },
    ],
  },
  // expo-env.d.ts: gerado pelo expo-cli (e no .gitignore); não segue o prettier.
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'expo-env.d.ts'],
  overrides: [
    {
      // O tema é o único sítio onde o StyleSheet.create corre.
      files: ['src/theme/**'],
      rules: { 'no-restricted-syntax': 'off' },
    },
    {
      // Service worker: corre no ServiceWorkerGlobalScope (self, caches, ...).
      files: ['public/sw.js'],
      env: { serviceworker: true, browser: true },
    },
  ],
};
