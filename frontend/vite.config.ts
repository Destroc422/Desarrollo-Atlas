import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (["node_modules/react/", "node_modules/react-dom/", "node_modules/scheduler/"].some((pkg) => id.includes(pkg))) return "framework";
          if (id.includes("node_modules/lucide-react")) return "icons";
          if (id.includes("node_modules/zod") || id.includes("node_modules/react-hook-form") || id.includes("node_modules/@hookform")) return "forms";
          if (id.includes("node_modules/@tanstack")) return "query";
        },
      },
    },
  },
});
