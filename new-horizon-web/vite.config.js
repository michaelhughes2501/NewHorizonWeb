import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
<<<<<<< HEAD
  plugins: [react(), tailwindcss()],
=======
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    open: false,
  },
  preview: {
    port: 4173,
    host: true,
  },
>>>>>>> origin/main
});
