export const API_URL = process.env.NEXT_PUBLIC_API_URL

export const DB_NAME = 'taskflow-db'
export const DB_VERSION = 1

export const SYNC_TAG = 'taskflow-sync'
export const SYNC_INTERVAL_MS = 30_000

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#38BDF8', // sky
  MEDIUM: '#8B8FA3', // muted
  HIGH: '#F59E0B', // amber
  URGENT: '#F43F5E', // rose
}

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export const COLUMN_COLORS: Record<string, string> = {
  'Por Hacer': '#38BDF8',
  'En Progreso': '#F59E0B',
  Completado: '#10B981',
}
