import { defineConfig } from "rollup";
// 在node_模块中查找并绑定第三方依赖项
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
// rollup babel插件
import { babel } from '@rollup/plugin-babel'
// 优化代码 
import { terser } from 'rollup-plugin-terser'
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

export default defineConfig([
  {
    input: 'src/main.ts',
    output: {
      file: 'dist/bundle.js',
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [
      typescript(),
      resolve(),
      commonjs(),
      babel({
        exclude: 'node_modules/**',
      }),
      terser(),
    ],
    watch: {
      exclude: "node_modules/**",
    },
    // 排除的打包 
    // external: []
  },
  /* 单独生成声明文件 */
  {
    input: 'src/main.ts',
    plugins: [dts()],
    output: {
        format: 'es',
        file: 'dist/index.d.ts',
    },
  },
])