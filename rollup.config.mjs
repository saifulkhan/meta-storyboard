import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { babel } from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import external from 'rollup-plugin-peer-deps-external';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

// read package.json as JSON
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const externals = Object.keys(packageJson.peerDependencies || {});

const makePlugins = ({ declaration }) => [
  external(),
  resolve(),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.build.json',
    sourceMap: true,
    declaration,
    ...(declaration ? { declarationDir: 'dist' } : { declarationMap: false }),
    noEmitOnError: false,
    exclude: ['**/__tests__/**', '**/*.test.ts'],
  }),
  babel({
    babelHelpers: 'runtime',
    exclude: 'node_modules/**',
    extensions: ['.js', '.ts'],
    presets: [
      [
        '@babel/preset-env',
        {
          modules: false,
          useBuiltIns: 'usage',
          corejs: 3,
        },
      ],
      '@babel/preset-typescript',
    ],
    plugins: [
      [
        '@babel/plugin-transform-runtime',
        {
          corejs: 3,
          helpers: true,
          regenerator: true,
        },
      ],
    ],
  }),
  terser(),
];

export default [
  // core library
  {
    input: 'src/index.ts',
    output: [
      { file: packageJson.main, format: 'cjs', sourcemap: true },
      { file: packageJson.module, format: 'esm', sourcemap: true },
    ],
    plugins: makePlugins({ declaration: true }),
    external: externals,
  },
  // react bindings (optional entry point: meta-storyboard/react)
  {
    input: 'src/react/index.ts',
    output: [
      { file: 'dist/react/index.js', format: 'cjs', sourcemap: true },
      { file: 'dist/react/index.esm.js', format: 'esm', sourcemap: true },
    ],
    plugins: makePlugins({ declaration: false }),
    external: externals,
  },
  // type declarations
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts({ respectExternal: true })],
  },
  {
    input: 'src/react/index.ts',
    output: [{ file: 'dist/react/index.d.ts', format: 'esm' }],
    plugins: [dts({ respectExternal: true })],
  },
];
