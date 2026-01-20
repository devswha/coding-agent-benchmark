#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { homedir } from "os"
import { dirname, join } from "path"

interface Todo {
  id: number
  task: string
  done: boolean
  createdAt: string
  completedAt?: string
}

interface TodoStore {
  nextId: number
  todos: Todo[]
}

const TODO_FILE = join(homedir(), ".todo.json")

function loadStore(): TodoStore {
  if (!existsSync(TODO_FILE)) {
    return { nextId: 1, todos: [] }
  }
  try {
    const data = readFileSync(TODO_FILE, "utf-8")
    return JSON.parse(data)
  } catch {
    return { nextId: 1, todos: [] }
  }
}

function saveStore(store: TodoStore): void {
  const dir = dirname(TODO_FILE)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(TODO_FILE, JSON.stringify(store, null, 2))
}

function add(task: string): void {
  if (!task.trim()) {
    console.error("Error: Task cannot be empty")
    process.exit(1)
  }
  
  const store = loadStore()
  const todo: Todo = {
    id: store.nextId++,
    task: task.trim(),
    done: false,
    createdAt: new Date().toISOString(),
  }
  store.todos.push(todo)
  saveStore(store)
  console.log(`✅ Added: [${todo.id}] ${todo.task}`)
}

function list(filter?: "done" | "pending"): void {
  const store = loadStore()
  let todos = store.todos
  
  if (filter === "done") {
    todos = todos.filter(t => t.done)
  } else if (filter === "pending") {
    todos = todos.filter(t => !t.done)
  }
  
  if (todos.length === 0) {
    console.log("No todos found.")
    return
  }
  
  console.log("\n📋 Todo List")
  console.log("─".repeat(50))
  
  for (const todo of todos) {
    const status = todo.done ? "✓" : "○"
    const style = todo.done ? "\x1b[9m\x1b[90m" : ""
    const reset = todo.done ? "\x1b[0m" : ""
    console.log(`  ${status} [${todo.id}] ${style}${todo.task}${reset}`)
  }
  
  console.log("─".repeat(50))
  const doneCount = store.todos.filter(t => t.done).length
  console.log(`Total: ${store.todos.length} | Done: ${doneCount} | Pending: ${store.todos.length - doneCount}\n`)
}

function done(id: number): void {
  const store = loadStore()
  const todo = store.todos.find(t => t.id === id)
  
  if (!todo) {
    console.error(`Error: Todo with id ${id} not found`)
    process.exit(1)
  }
  
  if (todo.done) {
    console.log(`Todo [${id}] is already completed`)
    return
  }
  
  todo.done = true
  todo.completedAt = new Date().toISOString()
  saveStore(store)
  console.log(`✅ Completed: [${id}] ${todo.task}`)
}

function deleteTodo(id: number): void {
  const store = loadStore()
  const index = store.todos.findIndex(t => t.id === id)
  
  if (index === -1) {
    console.error(`Error: Todo with id ${id} not found`)
    process.exit(1)
  }
  
  const [removed] = store.todos.splice(index, 1)
  saveStore(store)
  console.log(`🗑️  Deleted: [${id}] ${removed.task}`)
}

function showHelp(): void {
  console.log(`
📝 Todo CLI

Usage:
  todo add <task>        Add a new todo
  todo list              List all todos
  todo list --done       List completed todos
  todo list --pending    List pending todos
  todo done <id>         Mark todo as done
  todo delete <id>       Delete a todo
  todo help              Show this help

Examples:
  todo add "Buy groceries"
  todo done 1
  todo list --pending
`)
}

function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  switch (command) {
    case "add":
      const task = args.slice(1).join(" ")
      add(task)
      break
      
    case "list":
      const filter = args[1] === "--done" ? "done" : args[1] === "--pending" ? "pending" : undefined
      list(filter)
      break
      
    case "done":
      const doneId = parseInt(args[1])
      if (isNaN(doneId)) {
        console.error("Error: Invalid id. Usage: todo done <id>")
        process.exit(1)
      }
      done(doneId)
      break
      
    case "delete":
      const deleteId = parseInt(args[1])
      if (isNaN(deleteId)) {
        console.error("Error: Invalid id. Usage: todo delete <id>")
        process.exit(1)
      }
      deleteTodo(deleteId)
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
