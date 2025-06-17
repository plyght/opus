import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: "../../", // Look for .env files in the root directory
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
  },
});