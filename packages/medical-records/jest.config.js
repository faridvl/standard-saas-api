/** @type {import('jest').Config} */
module.exports = {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.spec.json', diagnostics: false }],
  },
  moduleNameMapper: {
    '^@medical-records/(.*)$': '<rootDir>/$1',
    '^@project/core$': '<rootDir>/../../core/src/index',
    '^@project/core/(.*)$': '<rootDir>/../../core/src/$1',
  },
  testEnvironment: 'node',
};
