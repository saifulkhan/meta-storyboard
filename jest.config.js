/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    // d3 v7+ ships ESM only; use the UMD bundle under jest's CJS runtime
    '^d3$': '<rootDir>/node_modules/d3/dist/d3.min.js',
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
