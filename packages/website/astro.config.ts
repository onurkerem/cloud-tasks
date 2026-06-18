import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://cloud-tasks.keremorenli.com",
  vite: {
    plugins: [tailwindcss()],
  },
});
