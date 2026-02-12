import fs from "node:fs";
import path from "node:path";
import Parser from "rss-parser";
import slugify from "slugify";

//const RSS_URL =
//  "https://news.google.com/rss/search?q=bupivacaine&hl=en-GB&gl=GB&ceid=GB:en";

const RSS_URL =
  'https://news.google.com/rss/search?q=bupivacaine+when:30d&hl=en-GB&gl=GB&ceid=GB:en';

const createdAt = new Date().toISOString();
const SEEN_PATH = path.resolve("data/seen.json");
const OUT_DIR = path.resolve("src/content/news");

const parser = new Parser({
  headers: {
    // Avoid occasional 403s
    "User-Agent": "Mozilla/5.0 (compatible; bupivacaine-news-bot/1.0)",
  },
});

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function loadSeen() {
  try {
    return JSON.parse(fs.readFileSync(SEEN_PATH, "utf8"));
  } catch {
    return { urls: [] };
  }
}

function saveSeen(seen) {
  ensureDir(path.dirname(SEEN_PATH));
  fs.writeFileSync(SEEN_PATH, JSON.stringify(seen, null, 2) + "\n", "utf8");
}

function withinDays(date, days) {
  const now = Date.now();
  return now - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

function isoDateOnly(d) {
  return d.toISOString().slice(0, 10);
}

function safeSlug(title) {
  return slugify(title, { lower: true, strict: true }).slice(0, 80);
}

// Google News “link” can be a Google redirector; keep as-is for now.
function normalizeUrl(url) {
  return (url || "").trim();
}

function escapeYamlString(s) {
  // safest for titles: use JSON string, valid YAML
  return JSON.stringify(s ?? "");
}

async function main() {
  ensureDir(OUT_DIR);
  const seen = loadSeen();
  const feed = await parser.parseURL(RSS_URL);


// troubleshooting start
console.log("Feed title:", feed.title);
console.log("Total RSS items:", feed.items?.length ?? 0);

for (const it of (feed.items || []).slice(0, 5)) {
  console.log("SAMPLE:", {
    title: it.title,
    link: it.link,
    isoDate: it.isoDate,
    pubDate: it.pubDate,
    contentSnippet: it.contentSnippet?.slice(0, 80),
  });
}
// troubleshooting end




  let added = 0;

  for (const item of feed.items || []) {
    const title = (item.title || "").trim();
    const sourceUrl = normalizeUrl(item.link);
    const pubDate = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null;

    if (!title || !sourceUrl || !pubDate || Number.isNaN(pubDate.getTime())) continue;

    // Basic relevance + recency (tweak)
    if (!title.toLowerCase().includes("bupivacaine")) continue;
    if (!withinDays(pubDate, 30)) continue;

    // Dedupe by URL
    if (seen.urls.includes(sourceUrl)) continue;

    const dateISO = isoDateOnly(pubDate);
    const slug = `${dateISO}-${safeSlug(title)}`;
    const filePath = path.join(OUT_DIR, `${slug}.md`);

    // Avoid overwriting if title collision
    if (fs.existsSync(filePath)) continue;

    const sourceName = item.creator || item.author || "Google News";
    const summaryText = (item.contentSnippet || item.content || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240);

    const md = `---
title: ${escapeYamlString(title)}
date: ${escapeYamlString(pubDate.toISOString())}
source_name: ${escapeYamlString(sourceName)}
source_url: ${escapeYamlString(sourceUrl)}
tags: ["bupivacaine"]
summary: ${escapeYamlString(summaryText)}
created_at: "..."
---

## Source

- ${sourceUrl}

## Extract

${summaryText || "(No snippet provided by RSS feed.)"}
`;

    fs.writeFileSync(filePath, md, "utf8");
    seen.urls.push(sourceUrl);
    added += 1;
  }

  saveSeen(seen);
  console.log(`Added ${added} new page(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

