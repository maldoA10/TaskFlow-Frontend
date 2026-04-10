// ─── Enums ───────────────────────────────────────────────────────────────────

export type Role = 'OWNER' | 'MEMBER'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'
export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE'
export type SyncEntityType = 'task' | 'column' | 'board' | 'comment'
export type SyncStatus = 'pending' | 'in-progress' | 'failed' | 'completed'

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Board {
  id: string
  name: string
  description?: string
  color: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface BoardMember {
  id: string
  boardId: string
  userId: string
  role: Role
  joinedAt: string
  user?: User
}

export interface Column {
  id: string
  boardId: string
  name: string
  position: number
  createdAt: string
}

export interface Task {
  id: string
  columnId: string
  boardId: string
  title: string
  description?: string
  priority: Priority
  dueDate?: string
  position: number
  assigneeId?: string
  createdById: string
  tags: string[]
  version: number
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  taskId: string
  authorId: string
  content: string
  createdAt: string
  author?: User
}

export interface Invitation {
  id: string
  boardId: string
  email: string
  inviterId: string
  status: InvitationStatus
  token: string
  createdAt: string
  expiresAt: string
  board?: Board
  inviter?: User
}

// ─── Sync Queue ───────────────────────────────────────────────────────────────

export interface SyncOperation {
  id?: number // autoIncrement
  entityType: SyncEntityType
  entityId: string
  operation: SyncOperationType
  payload: Record<string, unknown>
  timestamp: number
  status: SyncStatus
  retryCount: number
  version: number
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface SyncResult {
  entityId: string
  status: 'applied' | 'conflict'
  serverVersion?: number
  serverData?: unknown
}

// ─── Board with relations ─────────────────────────────────────────────────────

export interface BoardWithRelations extends Board {
  columns: (Column & { tasks: Task[] })[]
  members: (BoardMember & { user: User })[]
}

// ─── App Meta (IndexedDB appMeta store) ───────────────────────────────────────

export interface AppMeta {
  key: string
  value: unknown
}
