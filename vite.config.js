const path = require("path");
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5678,
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.js"),
      name: "Iripo",
      fileName: (format) => `iripo.${format}.js`,
    },
    sourcemap: true,
  },
});
