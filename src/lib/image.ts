/** Longest side, in pixels, of a stored toy image. */
export const MAX_IMAGE_SIDE = 512

/** Scales a size down to fit within `maxSide`, keeping proportions. Never scales up. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Shrinks a photo to a small JPEG before it is stored, so a camera picture of
 * several megabytes ends up at a few tens of kilobytes.
 */
export async function resizeImage(file: Blob, maxSide: number = MAX_IMAGE_SIDE): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D context is unavailable')
    }
    // JPEG has no transparency; without this, transparent areas turn black.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
        'image/jpeg',
        0.8,
      )
    })
  } finally {
    bitmap.close()
  }
}
