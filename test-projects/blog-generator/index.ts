#!/usr/bin/env bun
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs"
import { join, basename } from "path"

interface PostMeta {
  title: string
  date: string
  tags: string[]
  description: string
  slug: string
}

interface Post extends PostMeta {
  content: string
  html: string
}

function parseFrontmatter(content: string): { meta: Partial<PostMeta>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    return { meta: {}, body: content }
  }

  const [, frontmatter, body] = match
  const meta: Partial<PostMeta> = {}

  for (const line of frontmatter.split("\n")) {
    const colonIndex = line.indexOf(":")
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()

    if (value.startsWith("[") && value.endsWith("]")) {
      meta[key as keyof PostMeta] = value
        .slice(1, -1)
        .split(",")
        .map(s => s.trim().replace(/['"]/g, "")) as any
    } else {
      meta[key as keyof PostMeta] = value.replace(/['"]/g, "") as any
    }
  }

  return { meta, body: body.trim() }
}

function markdownToHtml(md: string): string {
  let html = md
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.*$)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n\n/g, "</p><p>")

  return `<p>${html}</p>`.replace(/<p><h/g, "<h").replace(/<\/h(\d)><\/p>/g, "</h$1>")
}

function generatePostHtml(post: Post): string {
  const tagsHtml = post.tags.map(t => `<span class="tag">${t}</span>`).join(" ")
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    .meta { color: #666; margin-bottom: 2rem; }
    .tag { background: #eee; padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.85rem; }
    a { color: #0066cc; }
    code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; }
    .back { margin-top: 3rem; }
  </style>
</head>
<body>
  <article>
    <h1>${post.title}</h1>
    <div class="meta">
      <time>${post.date}</time> | ${tagsHtml}
    </div>
    <div class="content">${post.html}</div>
  </article>
  <div class="back"><a href="index.html">&larr; Back to posts</a></div>
</body>
</html>`
}

function generateIndexHtml(posts: Post[]): string {
  const postsHtml = posts
    .map(p => `
      <article>
        <h2><a href="${p.slug}.html">${p.title}</a></h2>
        <div class="meta"><time>${p.date}</time></div>
        <p>${p.description}</p>
      </article>`)
    .join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    article { margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #eee; }
    .meta { color: #666; font-size: 0.9rem; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h1>Blog Posts</h1>
  ${postsHtml}
</body>
</html>`
}

function build(postsDir: string, outputDir: string): void {
  if (!existsSync(postsDir)) {
    console.error(`Error: Posts directory '${postsDir}' not found`)
    process.exit(1)
  }

  const files = readdirSync(postsDir).filter(f => f.endsWith(".md"))

  if (files.length === 0) {
    console.log("No markdown files found in posts directory")
    return
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const posts: Post[] = []

  for (const file of files) {
    const content = readFileSync(join(postsDir, file), "utf-8")
    const { meta, body } = parseFrontmatter(content)
    const slug = basename(file, ".md")

    const post: Post = {
      title: meta.title || slug,
      date: meta.date || new Date().toISOString().split("T")[0],
      tags: meta.tags || [],
      description: meta.description || body.slice(0, 150) + "...",
      slug,
      content: body,
      html: markdownToHtml(body),
    }

    posts.push(post)
    writeFileSync(join(outputDir, `${slug}.html`), generatePostHtml(post))
    console.log(`✓ Generated: ${slug}.html`)
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  writeFileSync(join(outputDir, "index.html"), generateIndexHtml(posts))
  console.log(`✓ Generated: index.html`)

  console.log(`\n✅ Built ${posts.length} posts to ${outputDir}/`)
}

function showHelp(): void {
  console.log(`
📝 Blog Generator

Usage:
  blog build [--posts <dir>] [--output <dir>]

Options:
  --posts   Directory containing .md files (default: ./posts)
  --output  Output directory for HTML (default: ./dist)

Frontmatter format:
  ---
  title: My Post Title
  date: 2024-01-15
  tags: [javascript, tutorial]
  description: A short description
  ---
`)
}

function main() {
  const args = process.argv.slice(2)

  if (args[0] === "help" || args[0] === "--help" || args.length === 0) {
    showHelp()
    return
  }

  if (args[0] !== "build") {
    console.error(`Unknown command: ${args[0]}`)
    showHelp()
    process.exit(1)
  }

  let postsDir = "./posts"
  let outputDir = "./dist"

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--posts" && args[i + 1]) {
      postsDir = args[++i]
    } else if (args[i] === "--output" && args[i + 1]) {
      outputDir = args[++i]
    }
  }

  build(postsDir, outputDir)
}

main()
