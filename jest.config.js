// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock isomorphic-dompurify which ships ESM-only nested deps that Jest
    // can't transform in the Next.js pipeline. The mock implements the
    // subset of DOMPurify we use.
    '^isomorphic-dompurify$': '<rootDir>/tests/__mocks__/isomorphic-dompurify.ts',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/tests/e2e/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/generated/**',
    '!src/types/**',
  ],
};

module.exports = createJestConfig(customJestConfig);
