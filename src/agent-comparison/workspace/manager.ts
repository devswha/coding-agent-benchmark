/**
 * Workspace Isolation Manager
 *
 * Manages isolated test workspaces for each agent execution,
 * preventing interference and enabling fair comparison.
 */

import { mkdir, rm, readdir, stat, copyFile, readFile } from "fs/promises"
import { join, relative } from "path"
import { tmpdir } from "os"
import { createHash } from "crypto"
import type {
  Workspace,
  WorkspaceState,
  FileInfo,
  WorkspaceManagerConfig,
  WorkspaceManager as IWorkspaceManager,
} from "./types"
import type { FileChange } from "../executors/types"

/**
 * Default configuration for workspace manager
 */
const DEFAULT_CONFIG: Required<WorkspaceManagerConfig> = {
  baseDir: join(tmpdir(), "magi-benchmark-workspaces"),
  templatesDir: join(process.cwd(), "benchmark", "test-projects"),
  prefix: "workspace",
  autoCleanup: true,
  maxAgeMs: 60 * 60 * 1000, // 1 hour
}

/**
 * Workspace Manager Implementation
 *
 * Creates and manages isolated workspaces for benchmark execution.
 */
export class WorkspaceManagerImpl implements IWorkspaceManager {
  private config: Required<WorkspaceManagerConfig>
  private activeWorkspaces: Map<string, Workspace> = new Map()

  constructor(config?: WorkspaceManagerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Create a new isolated workspace
   */
  async createWorkspace(templatePath?: string): Promise<Workspace> {
    // Ensure base directory exists
    await mkdir(this.config.baseDir, { recursive: true })

    // Generate unique workspace ID and path
    const id = `${this.config.prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const path = join(this.config.baseDir, id)

    // Create workspace directory
    await mkdir(path, { recursive: true })

    // Copy template if specified
    if (templatePath) {
      const fullTemplatePath = templatePath.startsWith("/")
        ? templatePath
        : join(this.config.templatesDir, templatePath)

      await this.copyDirectory(fullTemplatePath, path)
    }

    const workspace: Workspace = {
      id,
      path,
      templatePath,
      createdAt: Date.now(),
      active: true,
    }

    this.activeWorkspaces.set(id, workspace)

    return workspace
  }

  /**
   * Create a snapshot of the workspace state
   */
  async snapshotState(workspace: Workspace): Promise<WorkspaceState> {
    const files = new Map<string, FileInfo>()

    await this.walkDirectory(workspace.path, async (filePath, stats) => {
      const relativePath = relative(workspace.path, filePath)

      // Calculate content hash for change detection
      let hash: string | undefined
      try {
        const content = await readFile(filePath)
        hash = createHash("md5").update(content).digest("hex")
      } catch {
        // Ignore read errors
      }

      files.set(relativePath, {
        path: relativePath,
        size: stats.size,
        mtime: stats.mtimeMs,
        hash,
      })
    })

    return {
      workspaceId: workspace.id,
      timestamp: Date.now(),
      files,
    }
  }

  /**
   * Calculate the diff between current state and a previous snapshot
   */
  async diffState(workspace: Workspace, previousState: WorkspaceState): Promise<FileChange[]> {
    const currentState = await this.snapshotState(workspace)
    const changes: FileChange[] = []

    const previousFiles = previousState.files
    const currentFiles = currentState.files

    // Check for created and modified files
    for (const [path, currentInfo] of currentFiles) {
      const previousInfo = previousFiles.get(path)

      if (!previousInfo) {
        // File was created
        changes.push({
          path,
          type: "created",
          linesAdded: await this.countLines(join(workspace.path, path)),
        })
      } else if (currentInfo.hash !== previousInfo.hash) {
        // File was modified
        const linesDiff = await this.calculateLinesDiff(
          join(workspace.path, path),
          previousInfo,
          currentInfo
        )
        changes.push({
          path,
          type: "modified",
          linesAdded: linesDiff.added,
          linesRemoved: linesDiff.removed,
        })
      }
    }

    // Check for deleted files
    for (const [path] of previousFiles) {
      if (!currentFiles.has(path)) {
        changes.push({
          path,
          type: "deleted",
          linesRemoved: previousFiles.get(path)?.size || 0,
        })
      }
    }

    return changes
  }

  /**
   * Clean up a workspace
   */
  async cleanup(workspace: Workspace): Promise<void> {
    try {
      await rm(workspace.path, { recursive: true, force: true })
      workspace.active = false
      this.activeWorkspaces.delete(workspace.id)
    } catch (error) {
      console.warn(`[WorkspaceManager] Failed to cleanup workspace ${workspace.id}:`, error)
    }
  }

  /**
   * Clean up all workspaces older than maxAgeMs
   */
  async cleanupOld(): Promise<number> {
    const now = Date.now()
    let cleaned = 0

    // Cleanup from active workspaces map
    for (const workspace of this.activeWorkspaces.values()) {
      if (now - workspace.createdAt > this.config.maxAgeMs) {
        await this.cleanup(workspace)
        cleaned++
      }
    }

    // Also cleanup orphaned directories in base dir
    try {
      const entries = await readdir(this.config.baseDir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith(this.config.prefix)) {
          const dirPath = join(this.config.baseDir, entry.name)
          const stats = await stat(dirPath)

          if (now - stats.ctimeMs > this.config.maxAgeMs) {
            await rm(dirPath, { recursive: true, force: true })
            cleaned++
          }
        }
      }
    } catch {
      // Ignore errors when reading base dir
    }

    return cleaned
  }

  /**
   * Get list of active workspaces
   */
  getActiveWorkspaces(): Workspace[] {
    return Array.from(this.activeWorkspaces.values())
  }

  /**
   * Copy a directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await mkdir(dest, { recursive: true })

    const entries = await readdir(src, { withFileTypes: true })

    for (const entry of entries) {
      const srcPath = join(src, entry.name)
      const destPath = join(dest, entry.name)

      if (entry.isDirectory()) {
        // Skip node_modules and .git directories
        if (entry.name === "node_modules" || entry.name === ".git") {
          continue
        }
        await this.copyDirectory(srcPath, destPath)
      } else {
        await copyFile(srcPath, destPath)
      }
    }
  }

  /**
   * Walk a directory recursively, calling callback for each file
   */
  private async walkDirectory(
    dir: string,
    callback: (filePath: string, stats: import("fs").Stats) => Promise<void>
  ): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          // Skip node_modules and .git
          if (entry.name === "node_modules" || entry.name === ".git") {
            continue
          }
          await this.walkDirectory(fullPath, callback)
        } else {
          const stats = await stat(fullPath)
          await callback(fullPath, stats)
        }
      }
    } catch {
      // Ignore errors when walking
    }
  }

  /**
   * Count lines in a file
   */
  private async countLines(filePath: string): Promise<number> {
    try {
      const content = await readFile(filePath, "utf-8")
      return content.split("\n").length
    } catch {
      return 0
    }
  }

  /**
   * Calculate lines added/removed (simplified)
   */
  private async calculateLinesDiff(
    filePath: string,
    _previous: FileInfo,
    _current: FileInfo
  ): Promise<{ added: number; removed: number }> {
    // Simplified implementation - just count current lines
    // A proper implementation would do actual diff
    const lines = await this.countLines(filePath)
    return { added: lines, removed: 0 }
  }
}

/**
 * Create a workspace manager with the given configuration
 */
export function createWorkspaceManager(config?: WorkspaceManagerConfig): IWorkspaceManager {
  return new WorkspaceManagerImpl(config)
}

// Re-export types
export type { Workspace, WorkspaceState, FileInfo, WorkspaceManagerConfig, IWorkspaceManager as WorkspaceManager }
