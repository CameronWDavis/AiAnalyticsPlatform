import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Flask API sets CORS for http://localhost:5173, so keep the dev port fixed.
// Requests to /api are proxied to Flask so the browser only ever talks to one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET ?? "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
});
