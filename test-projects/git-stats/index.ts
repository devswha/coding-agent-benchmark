#!/usr/bin/env bun
import { execSync } from "child_process"

interface Commit {
  hash: string
  author: string
  date: string
  message: string
}

function exec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
  } catch {
    return ""
  }
}

function isGitRepo(): boolean {
  return exec("git rev-parse --is-inside-work-tree") === "true"
}

function getCommits(since?: string, until?: string): Commit[] {
  let cmd = 'git log --format="%H|%an|%ad|%s" --date=short'
  if (since) cmd += ` --since="${since}"`
  if (until) cmd += ` --until="${until}"`

  const output = exec(cmd)
  if (!output) return []

  return output.split("\n").map(line => {
    const [hash, author, date, message] = line.split("|")
    return { hash, author, date, message }
  })
}

function summary(since?: string, until?: string): void {
  const commits = getCommits(since, until)
  const authors = new Set(commits.map(c => c.author))
  const dates = commits.map(c => c.date).sort()

  console.log("\n📊 Git Repository Summary")
  console.log("─".repeat(40))
  console.log(`Total Commits:  ${commits.length}`)
  console.log(`Contributors:   ${authors.size}`)
  if (dates.length > 0) {
    console.log(`First Commit:   ${dates[0]}`)
    console.log(`Latest Commit:  ${dates[dates.length - 1]}`)
  }
  console.log("─".repeat(40))
}

function authors(since?: string, until?: string): void {
  const commits = getCommits(since, until)
  const authorStats: Record<string, number> = {}

  for (const commit of commits) {
    authorStats[commit.author] = (authorStats[commit.author] || 0) + 1
  }

  const sorted = Object.entries(authorStats).sort((a, b) => b[1] - a[1])
  const maxCount = sorted[0]?.[1] || 0

  console.log("\n👥 Commits by Author")
  console.log("─".repeat(50))

  for (const [author, count] of sorted) {
    const barLength = Math.round((count / maxCount) * 20)
    const bar = "█".repeat(barLength) + "░".repeat(20 - barLength)
    console.log(`${author.padEnd(20)} ${bar} ${count}`)
  }
  console.log("─".repeat(50))
}

function activity(since?: string, until?: string, mode: "monthly" | "weekly" = "monthly"): void {
  const commits = getCommits(since, until)
  const stats: Record<string, number> = {}

  for (const commit of commits) {
    const date = new Date(commit.date)
    const key = mode === "monthly"
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, "0")}`
    stats[key] = (stats[key] || 0) + 1
  }

  const sorted = Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]))
  const maxCount = Math.max(...Object.values(stats), 1)

  console.log(`\n📈 Activity (${mode})`)
  console.log("─".repeat(50))

  for (const [period, count] of sorted) {
    const barLength = Math.round((count / maxCount) * 30)
    const bar = "█".repeat(barLength)
    console.log(`${period} │ ${bar} ${count}`)
  }
  console.log("─".repeat(50))
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - firstDayOfYear.getTime()) / 86400000)
  return Math.ceil((days + firstDayOfYear.getDay() + 1) / 7)
}

function files(top: number = 10): void {
  const output = exec(`git log --pretty=format: --name-only | sort | uniq -c | sort -rn | head -${top}`)
  if (!output) {
    console.log("No file changes found")
    return
  }

  console.log(`\n📁 Most Changed Files (Top ${top})`)
  console.log("─".repeat(50))

  const lines = output.split("\n").filter(Boolean)
  const maxCount = parseInt(lines[0]?.trim().split(/\s+/)[0] || "1")

  for (const line of lines) {
    const match = line.trim().match(/^(\d+)\s+(.+)$/)
    if (!match) continue
    const [, countStr, file] = match
    const count = parseInt(countStr)
    const barLength = Math.round((count / maxCount) * 20)
    const bar = "█".repeat(barLength)
    console.log(`${String(count).padStart(5)} │ ${bar} ${file}`)
  }
  console.log("─".repeat(50))
}

function showHelp(): void {
  console.log(`
📊 Git Stats CLI

Usage:
  gitstats <command> [options]

Commands:
  summary           Overall repository statistics
  authors           Commits by author
  activity          Activity over time (ASCII chart)
  files             Most changed files

Options:
  --since <date>    Filter from date (e.g., "2024-01-01")
  --until <date>    Filter until date
  --top <n>         Number of results for 'files' (default: 10)
  --weekly          Show weekly activity instead of monthly

Examples:
  gitstats summary
  gitstats authors --since "2024-01-01"
  gitstats activity --weekly
  gitstats files --top 20
`)
}

function main() {
  if (!isGitRepo()) {
    console.error("Error: Not a git repository")
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const command = args[0]

  let since: string | undefined
  let until: string | undefined
  let top = 10
  let mode: "monthly" | "weekly" = "monthly"

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--since" && args[i + 1]) since = args[++i]
    else if (args[i] === "--until" && args[i + 1]) until = args[++i]
    else if (args[i] === "--top" && args[i + 1]) top = parseInt(args[++i])
    else if (args[i] === "--weekly") mode = "weekly"
  }

  switch (command) {
    case "summary":
      summary(since, until)
      break
    case "authors":
      authors(since, until)
      break
    case "activity":
      activity(since, until, mode)
      break
    case "files":
      files(top)
      break
    case "help":
    case "--help":
    case "-h":
      showHelp()
      break
    default:
      if (!command) {
        showHelp()
      } else {
        console.error(`Unknown command: ${command}`)
        showHelp()
        process.exit(1)
      }
  }
}

main()
