/** Square edge length stored for avatars. Covers lg (78px) at 2–3× DPR. */
export const AVATAR_EDGE_PX = 256

const OUTPUT_QUALITY = 0.85

/** Center-crop window for packing a portrait/landscape source into a square. */
export function squareCropRect(width: number, height: number) {
  const edge = Math.min(width, height)
  return {
    sx: Math.floor((width - edge) / 2),
    sy: Math.floor((height - edge) / 2),
    edge,
  }
}

/**
 * Center-crops to a square and downscales for avatar use.
 * Prefer WebP; fall back to JPEG when the browser cannot encode WebP.
 */
export async function prepareAvatarFile(file: File): Promise<File> {
  const source = await createImageBitmap(file)
  try {
    const { sx, sy, edge } = squareCropRect(source.width, source.height)
    if (edge < 1) {
      throw new Error("Could not process avatar image")
    }

    const canvas = document.createElement("canvas")
    canvas.width = AVATAR_EDGE_PX
    canvas.height = AVATAR_EDGE_PX
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("Could not process avatar image")
    }
    ctx.drawImage(source, sx, sy, edge, edge, 0, 0, AVATAR_EDGE_PX, AVATAR_EDGE_PX)

    const blob = await encodeCanvas(canvas)
    const extension = blob.type === "image/webp" ? "webp" : "jpg"
    return new File([blob], `avatar.${extension}`, { type: blob.type })
  } finally {
    source.close()
  }
}

function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      webp => {
        if (webp && webp.size > 0) {
          resolve(webp)
          return
        }
        canvas.toBlob(
          jpeg => {
            if (jpeg && jpeg.size > 0) {
              resolve(jpeg)
              return
            }
            reject(new Error("Could not encode avatar image"))
          },
          "image/jpeg",
          OUTPUT_QUALITY,
        )
      },
      "image/webp",
      OUTPUT_QUALITY,
    )
  })
}
