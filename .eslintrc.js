module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/'],
  overrides: [
    {
      // Service worker: corre no ServiceWorkerGlobalScope (self, caches, ...).
      files: ['public/sw.js'],
      env: { serviceworker: true, browser: true },
    },
  ],
};
