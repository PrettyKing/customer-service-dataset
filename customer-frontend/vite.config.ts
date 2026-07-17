import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";


export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/mastra": {
        target: "http://127.0.0.1:4111",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mastra/, "/api")
      }
    }
  }
});
