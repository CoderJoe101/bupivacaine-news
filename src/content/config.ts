import { defineCollection, z } from "astro:content";

const news = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.string().or(z.date()), // allow ISO string or Date
    source_name: z.string().optional(),
    source_url: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
    summary: z.string().optional(),
  }),
});

export const collections = { news };

