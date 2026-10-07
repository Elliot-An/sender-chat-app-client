/** Default matches backend `@Size(max = 4000)` on message body (UTF-16 units). */
export const MESSAGE_BODY_MAX_LENGTH = 4000

export function insertAtCaret(
  value: string,
  start: number,
  end: number,
  insert: string,
  maxLength: number = MESSAGE_BODY_MAX_LENGTH,
): { value: string; caret: number } {
  const from = Math.max(0, Math.min(start, value.length))
  const to = Math.max(from, Math.min(end, value.length))
  const next = value.slice(0, from) + insert + value.slice(to)
  if (next.length > maxLength) {
    return { value, caret: to }
  }
  return { value: next, caret: from + insert.length }
}

const EMOJI_GRAPHEME =
  /^(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F|\uFE0E)?)*|[0-9#*]\uFE0F?\u20E3)$/u

/**
 * Messenger-style: trimmed body is only 1–3 emoji graphemes (no other text).
 */
export function isEmojiOnlyMessage(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  const graphemes = Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed),
    (part) => part.segment,
  )
  if (graphemes.length < 1 || graphemes.length > 3) return false
  return graphemes.every((g) => EMOJI_GRAPHEME.test(g))
}
