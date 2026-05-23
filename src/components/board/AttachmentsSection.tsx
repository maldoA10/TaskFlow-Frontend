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

  // Camera modal state
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    )
  }, [])

  // Open gallery (file picker)
  const openGallery = useCallback((): Promise<{
    data: string
    mimeType: string
    originalName: string
  } | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return resolve(null)
        const result = await processFile(file)
        resolve(result)
      }
      input.click()
    })
  }, [])

  // Open camera on mobile (uses input capture)
  const openCameraMobile = useCallback((): Promise<{
    data: string
    mimeType: string
    originalName: string
  } | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.capture = 'environment'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return resolve(null)
        const result = await processFile(file)
        resolve(result)
      }
      input.click()
    })
  }, [])

  // Process file to base64
  const processFile = async (
    file: File
  ): Promise<{ data: string; mimeType: string; originalName: string }> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const maxW = 1920,
          maxH = 1080
        let w = img.width,
          h = img.height
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h)
          w = Math.round(w * ratio)
          h = Math.round(h * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas error'))
        ctx.drawImage(img, 0, 0, w, h)
        const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg'
        resolve({ data: canvas.toDataURL(mimeType, 0.85), mimeType, originalName: file.name })
      }
      img.onerror = () => reject(new Error('Image load error'))
      img.src = url
    })
  }

  // Upload image helper — defined early so other callbacks can reference it
  const uploadImage = useCallback(
    async (result: { data: string; mimeType: string; originalName: string }) => {
      // Reject before sending if the base64 payload exceeds ~10 MB
      const approxBytes = Math.round((result.data.length * 3) / 4)
      const MAX_BYTES = 10 * 1024 * 1024
      if (approxBytes > MAX_BYTES) {
        setError('La imagen supera el límite de 10 MB. Elige una más pequeña.')
        return
      }

      setIsUploading(true)
      setError(null)
      try {
        const { attachment } = await attachmentsApi.uploadBase64(
          taskId,
          result.data,
          result.mimeType,
          result.originalName
        )
        localUploadedIds.current.add(attachment.id)
        setAttachments((prev) =>
          prev.some((a) => a.id === attachment.id) ? prev : [attachment, ...prev]
        )
        await dbPut('attachments', attachment)
      } catch (err) {
        if (
          !navigator.onLine ||
          err instanceof TypeError ||
          (err instanceof ApiError && err.status === 0)
        ) {
          const localId = crypto.randomUUID()
          const localAttachment: Attachment = {
            id: localId,
            taskId,
            filename: localId,
            originalName: result.originalName,
            mimeType: result.mimeType,
            size: Math.round((result.data.length * 3) / 4),
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
        } else if (err instanceof ApiError && err.status === 422) {
          setError('Formato no permitido. Usa JPG, PNG, GIF o WebP.')
        } else {
          setError('Error al subir imagen. Formatos: JPG, PNG, GIF, WebP · Máx 10 MB.')
        }
      } finally {
        setIsUploading(false)
      }
    },
    [taskId]
  )

  // Open camera on desktop (getUserMedia modal)
  const openCameraDesktop = useCallback(async () => {
    setCameraError(null)
    setShowCameraModal(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      setCameraError('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }, [])

  // Capture from video stream
  const captureFromVideo = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const data = canvas.toDataURL('image/jpeg', 0.85)
    // Stop stream
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setShowCameraModal(false)
    // Upload captured image
    await uploadImage({ data, mimeType: 'image/jpeg', originalName: `foto-${Date.now()}.jpg` })
  }, [uploadImage])

  // Close camera modal
  const closeCameraModal = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setShowCameraModal(false)
    setCameraError(null)
  }, [])

  // Handle upload button clicks
  const handleUpload = useCallback(
    async (source: 'camera' | 'gallery') => {
      setError(null)
      if (source === 'gallery') {
        const result = await openGallery()
        if (result) await uploadImage(result)
      } else {
        // Camera: mobile uses input capture, desktop uses getUserMedia modal
        if (isMobile) {
          const result = await openCameraMobile()
          if (result) await uploadImage(result)
        } else {
          await openCameraDesktop()
        }
      }
    },
    [isMobile, openGallery, openCameraMobile, openCameraDesktop, uploadImage]
  )

  // Load attachments on mount
  useEffect(() => {
    const loadAttachments = async () => {
      setIsLoading(true)
      try {
        // Load from server
        const { attachments: serverAttachments } = await attachmentsApi.list(taskId)

        // Save server attachments to IDB
        for (const att of serverAttachments) {
          await dbPut('attachments', att)
        }

        // Merge any locally-pending attachments that haven't synced yet
        // so they remain visible even after closing/reopening the panel
        const localAll = await dbGetByIndex<Attachment>('attachments', 'taskId', taskId)
        const pendingLocal = localAll.filter(
          (a) => a.pendingSync && !serverAttachments.some((s) => s.id === a.id)
        )

        setAttachments([...pendingLocal, ...serverAttachments])
      } catch (err) {
        // If offline or network error, load everything from IDB
        if (
          !navigator.onLine ||
          err instanceof TypeError ||
          (err instanceof ApiError && err.status === 0)
        ) {
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

  // Handle WebSocket attachment added (skip echoes of our own direct uploads)
  useEffect(() => {
    if (pendingAttachment && pendingAttachment.taskId === taskId) {
      setAttachments((prev) => {
        // Echo of a direct upload we did ourselves — already in state, skip
        if (localUploadedIds.current.has(pendingAttachment.id)) {
          localUploadedIds.current.delete(pendingAttachment.id)
          return prev
        }
        // Same ID already in state (e.g. synced offline attachment with preserved UUID):
        // replace it so the pendingSync spinner is removed with the clean server version
        if (prev.some((a) => a.id === pendingAttachment.id)) {
          return prev.map((a) => (a.id === pendingAttachment.id ? pendingAttachment : a))
        }
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

  const handleDownload = useCallback(
    async (attachment: Attachment) => {
      if (attachment.localData) {
        const link = document.createElement('a')
        link.href = attachment.localData
        link.download = attachment.originalName
        link.click()
        return
      }
      try {
        const token = await getMeta<string>('accessToken')
        const url = attachmentsApi.getUrl(taskId, attachment.id)
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = attachment.originalName
        link.click()
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
      } catch {
        // silently ignore
      }
    },
    [taskId]
  )

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="pt-2 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          Imágenes {attachments.length > 0 && `(${attachments.length})`}
        </p>

        {/* Upload buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={() => handleUpload('camera')}
            disabled={isUploading || showCameraModal}
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
          <button
            onClick={() => handleUpload('gallery')}
            disabled={isUploading || showCameraModal}
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

      <p className="text-[10px] text-text-secondary/40 mb-3">JPG, PNG, GIF, WebP · máx 10 MB</p>

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

                <button
                  onClick={() => handleDownload(attachment)}
                  className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  title="Descargar"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                </button>

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

      {/* Camera modal for desktop */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col items-center justify-center p-4">
          <button
            onClick={closeCameraModal}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {cameraError ? (
            <div className="text-center">
              <p className="text-accent-rose mb-4">{cameraError}</p>
              <button
                onClick={closeCameraModal}
                className="px-4 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-text-primary hover:bg-bg-secondary"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-w-full max-h-[70vh] rounded-lg bg-black"
              />
              <div className="flex gap-4 mt-6">
                <button
                  onClick={closeCameraModal}
                  className="px-6 py-3 bg-bg-elevated border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary"
                >
                  Cancelar
                </button>
                <button
                  onClick={captureFromVideo}
                  className="px-6 py-3 bg-accent-indigo hover:bg-accent-indigo/90 rounded-lg text-white font-medium flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Capturar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
