'use client'

import { useState, useCallback, useRef } from 'react'

interface CaptureOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

interface CaptureResult {
  data: string // base64 data URL
  mimeType: string
  originalName: string
  file?: File
}

export function useImageCapture(options: CaptureOptions = {}) {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options

  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Resize image if needed
  const resizeImage = useCallback(
    (file: File): Promise<CaptureResult> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
          URL.revokeObjectURL(url)

          let { width, height } = img

          // Calculate new dimensions maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('No se pudo crear el contexto del canvas'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg'
          const data = canvas.toDataURL(mimeType, quality)

          resolve({
            data,
            mimeType,
            originalName: file.name,
            file,
          })
        }

        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('No se pudo cargar la imagen'))
        }

        img.src = url
      })
    },
    [maxWidth, maxHeight, quality]
  )

  // Open file picker (gallery)
  const openGallery = useCallback((): Promise<CaptureResult | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = false

      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) {
          resolve(null)
          return
        }

        try {
          setIsCapturing(true)
          setError(null)
          const result = await resizeImage(file)
          resolve(result)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error al procesar imagen')
          resolve(null)
        } finally {
          setIsCapturing(false)
        }
      }

      input.oncancel = () => {
        resolve(null)
      }

      input.click()
    })
  }, [resizeImage])

  // Open camera directly (for mobile devices)
  const openCamera = useCallback((): Promise<CaptureResult | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.capture = 'environment' // Use back camera

      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) {
          resolve(null)
          return
        }

        try {
          setIsCapturing(true)
          setError(null)
          const result = await resizeImage(file)
          resolve(result)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error al procesar imagen')
          resolve(null)
        } finally {
          setIsCapturing(false)
        }
      }

      input.oncancel = () => {
        resolve(null)
      }

      input.click()
    })
  }, [resizeImage])

  // Start camera stream for preview (desktop)
  const startCameraStream = useCallback(async (): Promise<boolean> => {
    try {
      setIsCapturing(true)
      setError(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: maxWidth },
          height: { ideal: maxHeight },
        },
      })

      streamRef.current = stream
      return true
    } catch (err) {
      setError('No se pudo acceder a la cámara')
      setIsCapturing(false)
      return false
    }
  }, [maxWidth, maxHeight])

  // Capture from stream
  const captureFromStream = useCallback((): CaptureResult | null => {
    const video = videoRef.current
    const stream = streamRef.current

    if (!video || !stream) {
      setError('La cámara no está activa')
      return null
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('No se pudo crear el contexto del canvas')
      return null
    }

    ctx.drawImage(video, 0, 0)
    const data = canvas.toDataURL('image/jpeg', quality)

    return {
      data,
      mimeType: 'image/jpeg',
      originalName: `capture-${Date.now()}.jpg`,
    }
  }, [quality])

  // Stop camera stream
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCapturing(false)
  }, [])

  // Check if camera is supported
  const isCameraSupported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  // Check if we're on mobile (use file input with capture)
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  return {
    isCapturing,
    error,
    isCameraSupported,
    isMobile,
    openGallery,
    openCamera,
    startCameraStream,
    captureFromStream,
    stopCameraStream,
    videoRef,
    streamRef,
    clearError: () => setError(null),
  }
}
