/**
 * ts-jest over `src`, because the tests import the same TypeScript the app
 * does rather than the compiled output — a test that runs against `dist` can
 * only be run after a build, and the build is the slowest thing here.
 *
 * `tsconfig.json` is reused verbatim, so a spec is typechecked by
 * `npm run typecheck` under exactly the same options that compile the app.
 * The build reads `tsconfig.build.json` instead, which is where specs are
 * excluded from `dist`.
 */
module.exports = {
  rootDir: 'src',
  testEnvironment: 'node',
  testRegex: '\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
};
