import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "html-env-replace",
      transformIndexHtml(html) {
        return html.replace(/%(\w+)%/g, (_, key) => process.env[key] || "");
      },
    },
  ],
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
