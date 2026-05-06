import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { defineConfig } from "vite";

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

  build: {
    // Source maps leak readable code in prod. Opt-in via DEBUG_BUILD=true
    // when triaging production-only crashes (e.g. via Sentry).
    sourcemap: process.env.DEBUG_BUILD === "true",
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
});
