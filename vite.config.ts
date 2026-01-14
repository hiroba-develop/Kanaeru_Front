import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base:  "/",
  publicDir: "public",
  server: {
    port: 5180,
    allowedHosts: ["localhost:5180", "staging.kanaeru.jp", "kanaeru.jp"],
    proxy: {
      '/api': {
        target: 'http://localhost:8087',
        changeOrigin: true,
        secure: false,
      }
    }
  },
});
