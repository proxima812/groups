import react from "@astrojs/react"
import solidJs from "@astrojs/solid-js"
import tailwind from "@astrojs/tailwind"
import vercel from "@astrojs/vercel/serverless"
import { defineConfig } from "astro/config"
import { SITE_URL } from "./src/data/config.ts"

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  // server
  output: "hybrid",
  adapter: vercel(),
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    solidJs({
      include: ["**/solid/*"],
    }),
    react({
      include: ["**/react/*"],
    }),
  ],
});
