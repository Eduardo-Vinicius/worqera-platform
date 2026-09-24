/** Client-side image compress for order photos — keeps images viewable, cuts MB. */

const MAX_SIDE = 1600
const JPEG_QUALITY = 0.72

/**
 * Resize + JPEG compress a File/Blob for upload.
 * Falls back to the original file if decode/canvas fails.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!file || !file.type?.startsWith("image/")) return file

  try {
    const bitmap = await createImageBitmap(file)
    const maxSide = Math.max(bitmap.width, bitmap.height)
    const scale = maxSide > MAX_SIDE ? MAX_SIDE / maxSide : 1
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      bitmap.close?.()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    )
    if (!blob) return file

    // Keep compressed only when meaningfully smaller (or we resized)
    if (blob.size >= file.size && scale >= 1) return file

    const base = (file.name || "foto").replace(/\.[^.]+$/, "")
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" })
  } catch {
    return file
  }
}

export async function compressImageFiles(files: File[]): Promise<File[]> {
  const out: File[] = []
  for (const f of files) {
    out.push(await compressImageFile(f))
  }
  return out
}
