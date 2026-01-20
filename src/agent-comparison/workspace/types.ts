/**
 * Workspace Types
 *
 * Type definitions for workspace isolation manager.
 * The actual implementation is in manager.ts.
 */

import type { FileChange } from "../executors/types"

/**
 * Represents an isolated workspace for agent execution
 */
export interface Workspace {
  /** Unique workspace ID */
  id: string

  /** Absolute path to the workspace directory */
  path: string

  /** Path to the template used (if any) */
  templatePath?: string

  /** When the workspace was created */
  createdAt: number

  /** Whether the workspace is still active */
  active: boolean
}

/**
 * State snapshot of a workspace for diff calculation
 */
export interface WorkspaceState {
  /** Workspace ID */
  workspaceId: string

  /** Timestamp of the snapshot */
  timestamp: number

  /** Map of file path -> file hash */
  files: Map<string, FileInfo>
}

/**
 * File information for state tracking
 */
export interface FileInfo {
  /** File path relative to workspace */
  path: string

  /** File size in bytes */
  size: number

  /** File modification time */
  mtime: number

  /** Content hash (for change detection) */
  hash?: string
}

/**
 * Configuration for workspace manager
 */
export interface WorkspaceManagerConfig {
  /** Base directory for workspaces (defaults to os.tmpdir()) */
  baseDir?: string

  /** Path to test project templates */
  templatesDir?: string

  /** Prefix for workspace directories */
  prefix?: string

  /** Whether to clean up workspaces automatically */
  autoCleanup?: boolean

  /** Maximum age of workspace before auto-cleanup (ms) */
  maxAgeMs?: number
}

/**
 * Interface for workspace manager operations
 */
export interface WorkspaceManager {
  /**
   * Create a new isolated workspace
   * @param templatePath - Optional path to a template to copy into the workspace
   */
  createWorkspace(templatePath?: string): Promise<Workspace>

  /**
   * Create a snapshot of the workspace state
   */
  snapshotState(workspace: Workspace): Promise<WorkspaceState>

  /**
   * Calculate the diff between current state and a previous snapshot
   */
  diffState(workspace: Workspace, previousState: WorkspaceState): Promise<FileChange[]>

  /**
   * Clean up a workspace (remove files)
   */
  cleanup(workspace: Workspace): Promise<void>

  /**
   * Clean up all workspaces older than maxAgeMs
   */
  cleanupOld(): Promise<number>

  /**
   * Get list of active workspaces
   */
  getActiveWorkspaces(): Workspace[]
}
