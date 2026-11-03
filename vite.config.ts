import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  appType: "spa",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/") ||
            id.includes("/node_modules/react-router/") ||
            id.includes("/node_modules/react-router-dom/") ||
            id.includes("/node_modules/@remix-run/router/")
          ) {
            return "vendor-framework";
          }

          if (id.includes("/node_modules/@supabase/")) {
            return "vendor-supabase";
          }

          if (id.includes("/node_modules/@carbon/react/")) {
            return "vendor-carbon-react";
          }

          if (id.includes("/node_modules/@carbon/icons-react/")) {
            return "vendor-carbon-icons";
          }
        },
      },
    },
  },
});
