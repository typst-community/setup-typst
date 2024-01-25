import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: false,
    target: "node20",
    ssr: true,
    rollupOptions: {
      input: ["src/main.ts", "src/post.ts"],
    },
  },
  ssr: {
    // Anything NOT 'node:' will be bundled.
    noExternal: /^(?!node:)/,
  },
});
