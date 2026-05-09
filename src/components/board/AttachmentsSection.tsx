'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Image as ImageIcon,
  Camera,
  Folder,
  Trash2,
  X,
  Loader2,
  Download,
  ZoomIn,
} from 'lucide-react'
import type { Attachment } from '@/types'
import { attachmentsApi, ApiError } from '@/lib/api'
import { dbPut, dbDelete, dbGetByIndex, enqueueSyncOp, getMeta } from '@/lib/db'
import { useImageCapture } from '@/hooks/useImageCapture'
import { clsx } from 'clsx'

// Fetches an image URL using the auth token and renders it as a blob URL
function AuthImage({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    ;(async () => {
      try {
        const token = await getMeta<string>('accessToken')
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (cancelled || !res.ok) return
        const blob = await res.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      } catch {
        // silently ignore
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ) : (
    <div className={clsx(className, 'bg-bg-elevated animate-pulse')} />
  )
}

interface AttachmentsSectionProps {
  taskId: string
  pendingAttachment: (Attachment & { taskId: string }) | null
  deletedAttachmentId: string | null
  onPendingAttachmentConsumed: () => void
  onDeletedAttachmentConsumed: () => void
}

export function AttachmentsSection({
  taskId,
  pendingAttachment,
  deletedAttachmentId,
  onPendingAttachmentConsumed,
  onDeletedAttachmentConsumed,
}: AttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Track IDs we uploaded ourselves so the WS echo doesn't duplicate them
  const localUploadedIds = useRef<Set<string>>(new Set())

  const { openGallery, openCamera, isMobile, isCameraSupported, isCapturing } = useImageCapture({
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
  })

  // Load attachments on mount
  useEffect(() => {
    const loadAttachments = async () => {
      setIsLoading(true)
      try {
        // Try to load from server first
        const { attachments: serverAttachments } = await attachmentsApi.list(taskId)
        setAttachments(serverAttachments)

        // Save to IDB for offline access
        for (const att of serverAttachments) {
          await dbPut('attachments', att)
        }
      } catch (err) {
        // If offline, load from IDB
        if (!navigator.onLine || (err instanceof ApiError && err.status === 0)) {
          try {
            const localAttachments = await dbGetByIndex<Attachment>('attachments', 'taskId', taskId)
            setAttachments(localAttachments)
          } catch {
            setError('Error al cargar adjuntos')
          }
        } else {
          setError('Error al cargar adjuntos')
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadAttachments()
  }, [taskId])

  // Handle WebSocket attachment added (skip echoes of our own uploads)
  useEffect(() => {
    if (pendingAttachment && pendingAttachment.taskId === taskId) {
      setAttachments((prev) => {
        // If we uploaded it ourselves, the item is already in state — skip
        if (localUploadedIds.current.has(pendingAttachment.id)) {
          localUploadedIds.current.delete(pendingAttachment.id)
          return prev
        }
        if (prev.some((a) => a.id === pendingAttachment.id)) return prev
        return [pendingAttachment, ...prev]
      })
      onPendingAttachmentConsumed()
    }
  }, [pendingAttachment, taskId, onPendingAttachmentConsumed])

  // Handle WebSocket attachment deleted
  useEffect(() => {
    if (deletedAttachmentId) {
      setAttachments((prev) => prev.filter((a) => a.id !== deletedAttachmentId))
      onDeletedAttachmentConsumed()
    }
  }, [deletedAttachmentId, onDeletedAttachmentConsumed])

  const handleUpload = async (source: 'camera' | 'gallery') => {
    setError(null)
    const result = source === 'camera' ? await openCamera() : await openGallery()

    if (!result) return

    setIsUploading(true)
    try {
      // Extract base64 data without the data URL prefix
      const base64Data = result.data

      const { attachment } = await attachmentsApi.uploadBase64(
        taskId,
        base64Data,
        result.mimeType,
        result.originalName
      )

      // Mark as local upload so the WS echo won't duplicate it
      localUploadedIds.current.add(attachment.id)
      setAttachments((prev) => {
        if (prev.some((a) => a.id === attachment.id)) return prev
        return [attachment, ...prev]
      })

      // Save to IDB
      await dbPut('attachments', attachment)
    } catch (err) {
      // If offline, save locally and queue for sync
      if (!navigator.onLine || (err instanceof ApiError && err.status === 0)) {
        const localId = crypto.randomUUID()
        const localAttachment: Attachment = {
          id: localId,
          taskId,
          filename: localId,
          originalName: result.originalName,
          mimeType: result.mimeType,
          size: Math.round((result.data.length * 3) / 4), // Approximate size
          uploadedById: '',
          createdAt: new Date().toISOString(),
          localData: result.data,
          pendingSync: true,
        }

        await dbPut('attachments', localAttachment)
        await enqueueSyncOp({
          entityType: 'attachment',
          entityId: localId,
          operation: 'CREATE',
          payload: {
            taskId,
            data: result.data,
            mimeType: result.mimeType,
            originalName: result.originalName,
          },
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0,
          version: 1,
        })

        setAttachments((prev) => [localAttachment, ...prev])
      } else {
        setError('Error al subir imagen')
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (attachmentId: string) => {
    setDeletingId(attachmentId)
    try {
      await attachmentsApi.delete(taskId, attachmentId)
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
      await dbDelete('attachments', attachmentId)
    } catch (err) {
      // If offline, queue for sync
      if (!navigator.onLine || (err instanceof ApiError && err.status === 0)) {
        await enqueueSyncOp({
          entityType: 'attachment',
          entityId: attachmentId,
          operation: 'DELETE',
          payload: { taskId },
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0,
          version: 1,
        })

        // Remove locally
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
        await dbDelete('attachments', attachmentId)
      } else {
        setError('Error al eliminar imagen')
      }
    } finally {
      setDeletingId(null)
    }
  }

  const getPreviewUrl = useCallback(
    (attachment: Attachment) =>
      attachment.localData ?? attachmentsApi.getUrl(taskId, attachment.id),
    [taskId]
  )

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="pt-2 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          Imágenes {attachments.length > 0 && `(${attachments.length})`}
        </p>

        {/* Upload buttons */}
        <div className="flex gap-1.5">
          {isCameraSupported && (
            <button
              onClick={() => handleUpload('camera')}
              disabled={isUploading || isCapturing}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
                'bg-bg-elevated border border-border-subtle',
                'text-text-secondary hover:text-accent-indigo hover:border-accent-indigo/40',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Tomar foto"
            >
              <Camera className="w-3 h-3" />
              {isMobile ? '' : 'Cámara'}
            </button>
          )}
          <button
            onClick={() => handleUpload('gallery')}
            disabled={isUploading || isCapturing}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
              'bg-bg-elevated border border-border-subtle',
              'text-text-secondary hover:text-accent-indigo hover:border-accent-indigo/40',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Elegir de galería"
          >
            <Folder className="w-3 h-3" />
            {isMobile ? '' : 'Galería'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-accent-rose mb-2 flex items-center gap-1">
          <X className="w-3 h-3" />
          {error}
        </p>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-text-secondary animate-spin" />
        </div>
      )}

      {/* Uploading indicator */}
      {isUploading && (
        <div className="flex items-center gap-2 py-2 text-xs text-text-secondary">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Subiendo imagen...
        </div>
      )}

      {/* Attachments grid */}
      {!isLoading && attachments.length === 0 && (
        <p className="text-xs text-text-secondary/50 text-center py-4">Sin imágenes adjuntas</p>
      )}

      {!isLoading && attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative group aspect-square rounded-lg overflow-hidden bg-bg-elevated border border-border-subtle"
            >
              {attachment.localData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.localData}
                  alt={attachment.originalName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <AuthImage
                  url={attachmentsApi.getUrl(taskId, attachment.id)}
                  alt={attachment.originalName}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Pending sync indicator */}
              {attachment.pendingSync && (
                <div className="absolute top-1 left-1 p-1 bg-accent-amber/80 rounded-full">
                  <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                </div>
              )}

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setPreviewUrl(getPreviewUrl(attachment))}
                  className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  title="Ver imagen"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-white" />
                </button>

                {attachment.localData ? null : (
                  <a
                    href={getPreviewUrl(attachment)}
                    download={attachment.originalName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    title="Descargar"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                  </a>
                )}

                <button
                  onClick={() => handleDelete(attachment.id)}
                  disabled={deletingId === attachment.id}
                  className="p-1.5 bg-accent-rose/80 rounded-full hover:bg-accent-rose transition-colors disabled:opacity-50"
                  title="Eliminar"
                >
                  {deletingId === attachment.id ? (
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
              </div>

              {/* File info */}
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-[10px] text-white/80 truncate">{attachment.originalName}</p>
                <p className="text-[9px] text-white/60">{formatFileSize(attachment.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          {previewUrl.startsWith('data:') || previewUrl.startsWith('blob:') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <AuthImage
              url={previewUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          )}
        </div>
      )}
    </div>
  )
}
