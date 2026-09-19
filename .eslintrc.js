module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./packages/core/tsconfig.json', './packages/identity/tsconfig.json', './packages/medical-records/tsconfig.json'],
    tsconfigRootDir: __dirname
  },
  plugins: ['@typescript-eslint', 'jest'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'prettier'
  ],
  env: {
    node: true,
    jest: true,
    'jest/globals': true
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/no-explicit-any': 2, // ERROR si se usa 'any'
    '@typescript-eslint/explicit-module-boundary-types': 2,
    '@typescript-eslint/ban-ts-comment': [
      2,
      { 'ts-ignore': 'allow-with-description' }
    ],
    '@typescript-eslint/no-floating-promises': 2,
    '@typescript-eslint/no-misused-promises': 2
  }
}