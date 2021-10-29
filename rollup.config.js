import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'

const bundle = (config) => ({
  ...config,
  external: (id) => !/^[./]/.test(id)
})

export default [
  bundle({
    plugins: [esbuild()],
    input: 'src/ui/index.ts',
    output: [
      {
        file: `ui/index.js`,
        format: 'cjs',
        sourcemap: true
      },
      {
        file: `ui/index.mjs`,
        format: 'es',
        sourcemap: true
      }
    ]
  }),
  bundle({
    plugins: [dts()],
    input: 'src/ui/index.ts',
    output: {
      file: `ui/index.d.ts`,
      format: 'es'
    }
  }),
  bundle({
    plugins: [esbuild()],
    input: 'src/nextjs/index.ts',
    output: [
      {
        file: `nextjs/index.js`,
        format: 'cjs',
        sourcemap: true
      },
      {
        file: `nextjs/index.mjs`,
        format: 'es',
        sourcemap: true
      }
    ]
  }),
  bundle({
    plugins: [dts()],
    input: 'src/nextjs/index.ts',
    output: {
      file: `nextjs/index.d.ts`,
      format: 'es'
    }
  }),
  bundle({
    plugins: [esbuild()],
    input: 'src/routes/index.ts',
    output: [
      {
        file: `routes/index.js`,
        format: 'cjs',
        sourcemap: true
      },
      {
        file: `routes/index.mjs`,
        format: 'es',
        sourcemap: true
      }
    ]
  }),
  bundle({
    plugins: [dts()],
    input: 'src/routes/index.ts',
    output: {
      file: `routes/index.d.ts`,
      format: 'es'
    }
  })
]
