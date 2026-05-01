import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8002",
        changeOrigin: true,
        ws: true,
      },
      "/uploads": {
        target: "http://localhost:8002",
        changeOrigin: true,
      },
    },
  },

  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],

  build: {
    rollupOptions: {
      // Pin TanStack and Radix to their own chunks so an app-only change
      // doesn't invalidate them in the user's cache on next deploy. React
      // itself is left in the main bundle — Rollup keeps it next to the JSX
      // factory it serves anyway, so a separate "react" chunk just adds
      // network overhead. zod / react-hook-form are also not split: zod is
      // needed at bootstrap by the auth schemas, react-hook-form ships with
      // the LoginForm route chunk, neither benefits from a vendor chunk.
      output: {
        manualChunks: {
          tanstack: ["@tanstack/react-query", "@tanstack/react-router"],
          radix: ["radix-ui"],
        },
      },
    },
  },
})
