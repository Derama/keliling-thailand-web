// Blog content loader. Posts are markdown files in content/blog/ with
// frontmatter; the filename (minus .md) is the URL slug. Server-only —
// uses fs, so never import from a client component.

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO yyyy-mm-dd
  cover: string;
  category: string;
  /** City ids from lib/tours.ts this post relates to — used for cross-linking. */
  cities: string[];
}

export interface BlogPost extends BlogPostMeta {
  /** Post body rendered to HTML. */
  html: string;
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function readPostFile(file: string): { meta: BlogPostMeta; body: string } {
  const slug = file.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
  const { data, content } = matter(raw);
  return {
    meta: {
      slug,
      title: data.title ?? slug,
      description: data.description ?? "",
      date: data.date ?? "1970-01-01",
      cover: data.cover ?? "",
      category: data.category ?? "",
      cities: data.cities ?? [],
    },
    body: content,
  };
}

/** All post metadata, newest first. Returns [] when content/blog is absent. */
export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readPostFile(f).meta)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): BlogPost | undefined {
  const file = `${slug}.md`;
  if (!/^[\w-]+$/.test(slug) || !fs.existsSync(path.join(BLOG_DIR, file))) {
    return undefined;
  }
  const { meta, body } = readPostFile(file);
  return { ...meta, html: marked.parse(body, { async: false }) };
}

/** Posts tagged with a given city — for "Baca juga" on tour pages. */
export function getPostsByCity(cityId: string, limit = 3): BlogPostMeta[] {
  return getAllPosts()
    .filter((p) => p.cities.includes(cityId))
    .slice(0, limit);
}
