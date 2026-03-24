/**
 * Image utility functions for compression and resizing.
 * Best practices for handling user-uploaded images.
 */

export interface ImageOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0-1
  format?: "image/jpeg" | "image/webp" | "image/png"
}

const DEFAULT_OPTIONS: ImageOptions = {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.8,
  format: "image/webp",
}

/**
 * Compress and resize an image file.
 * Returns a base64 string of the optimized image.
 */
export async function compressImage(
  file: File,
  options: ImageOptions = {},
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Canvas context not available"))
          return
        }

        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img
        const maxW = opts.maxWidth!
        const maxH = opts.maxHeight!

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height

        // Use better image smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to base64 with compression
        const base64 = canvas.toDataURL(opts.format, opts.quality)
        resolve(base64)
      }

      img.onerror = () => {
        reject(new Error("Failed to load image"))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Validate image file before processing.
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 5,
): { valid: boolean; error?: string } {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error:
        "Faqat JPEG, PNG, WebP yoki GIF formatidagi rasmlar qabul qilinadi",
    }
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Rasm hajmi ${maxSizeMB}MB dan oshmasligi kerak`,
    }
  }

  return { valid: true }
}

/**
 * Process image file: validate, compress and resize.
 * Returns optimized base64 string or throws error.
 */
export async function processImageFile(
  file: File,
  options?: ImageOptions & { maxSizeMB?: number },
): Promise<string> {
  const { maxSizeMB = 5, ...imageOptions } = options || {}

  // Validate
  const validation = validateImageFile(file, maxSizeMB)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Compress and resize
  const compressed = await compressImage(file, imageOptions)

  return compressed
}
