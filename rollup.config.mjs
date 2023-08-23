import dts from "rollup-plugin-dts"
import esbuild from "rollup-plugin-esbuild"

const bundle = (config) => ({
  ...config,
  external: (id) => !/^[./]/.test(id),
})

const modules = ["ui", "routes", "next-edge", "next"]
  .map((module) => [
    bundle({
      plugins: [esbuild()],
      input: `src/${module}/index.ts`,
      output: [
        {
          file: `${module}/index.js`,
          format: "cjs",
          sourcemap: true,
        },
        {
          file: `${module}/index.mjs`,
          format: "es",
          sourcemap: true,
        },
      ],
    }),
    bundle({
      plugins: [dts()],
      input: `src/${module}/index.ts`,
      output: {
        file: `${module}/index.d.ts`,
        format: "es",
      },
    }),
  ])
  .reduce((acc, e) => [...acc, ...e], [])

export default modules
