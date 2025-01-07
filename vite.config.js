import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "iripo",
      fileName: "iripo",
      formats: ["es", "umd"],
    },
    rollupOptions: {
      // external: [], // specify external dependencies here if any
      output: {
        // Provide globals for UMD build if you have external dependencies
        globals: {
          // 'some-dependency': 'SomeDependency'
        },
      },
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
    solidPlugin(),
  ],
  server: {
    open: "/demo/index.html", // Automatically open demo page
  },
});
