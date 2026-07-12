import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const backendPort = process.env.PORT || "3000";

export default defineConfig({
  envDir: "../",
  base: "/front/",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
});
