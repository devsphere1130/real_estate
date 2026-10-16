// Phone photos are often 4-8 MB, but a single request to a Vercel function may not be larger than 4.5 MB.
// So big photos are shrunk in the browser before they are uploaded (and uploaded one per request).
// 2400px on the long side is still sharp on a large screen; the website shows at most ~1600px anyway.
const MAX_SIDE = 2400
const LEAVE_ALONE_BELOW = 1.5 * 1024 * 1024
const MAX_BYTES = 3.5 * 1024 * 1024 // stays well under the 4.5 MB limit, with room for the request wrapper

const toBlob = (canvas, quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))

/**
 * Returns the same file when it is already small, otherwise a resized JPEG.
 * If the browser cannot decode the image, the original is returned and the server decides.
 */
export async function prepareImage(file) {
  if (typeof createImageBitmap !== 'function') return file

  let bitmap
  try {
    bitmap = await createImageBitmap(file) // also applies the phone's rotation (EXIF)
  } catch {
    return file
  }

  const longest = Math.max(bitmap.width, bitmap.height)
  if (file.size <= LEAVE_ALONE_BELOW && longest <= MAX_SIDE) {
    bitmap.close?.()
    return file
  }

  let scale = Math.min(1, MAX_SIDE / longest)
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff' // JPEG has no transparency (matters for PNGs)
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      for (const quality of [0.86, 0.74, 0.62]) {
        const blob = await toBlob(canvas, quality)
        if (blob && blob.size <= MAX_BYTES) {
          if (blob.size >= file.size && longest <= MAX_SIDE) return file // nothing gained
          return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
        }
      }
      scale *= 0.8 // still too big: try smaller dimensions
    }
  } finally {
    bitmap.close?.()
  }
  return file
}
