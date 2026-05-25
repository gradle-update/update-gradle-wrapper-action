module.exports = {
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageReporters: ['json'],
  errorOnDeprecated: true,
  moduleFileExtensions: ['js', 'ts'],
  restoreMocks: true,
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        isolatedModules: true,
        tsconfig: {module: 'commonjs', moduleResolution: 'node'}
      }
    ]
  },
  moduleNameMapper: {
    // @actions/exec v3 is ESM-only; tests always mock at the cmd boundary,
    // so swap it for a tiny CJS stub to keep Jest running as CJS.
    '^@actions/exec$': '<rootDir>/tests/mocks/actions-exec.cjs',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  verbose: true
};
