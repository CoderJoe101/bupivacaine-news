// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
//export default defineConfig({});
export default defineConfig({
  site: "https://bupivacaine-news.pages.dev",
  integrations: [sitemap()],
});
