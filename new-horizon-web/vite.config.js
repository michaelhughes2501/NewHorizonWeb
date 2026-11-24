import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    open: false,
    // `npm run dev:api` serves the Express API on port 3000.
    proxy: { "/api": { target: "http://localhost:3000", changeOrigin: false } },
  },
  preview: {
    port: 4173,
    host: true,
  },
});
