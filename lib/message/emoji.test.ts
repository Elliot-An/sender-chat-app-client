import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { insertAtCaret, isEmojiOnlyMessage } from "./emoji.ts"

describe("insertAtCaret", () => {
  it("inserts at the caret and advances it", () => {
    assert.deepEqual(insertAtCaret("hello", 5, 5, "😀"), {
      value: "hello😀",
      caret: 7,
    })
  })

  it("replaces a selection", () => {
    assert.deepEqual(insertAtCaret("hello", 1, 4, "👋"), {
      value: "h👋o",
      caret: 3,
    })
  })

  it("inserts at the start", () => {
    assert.deepEqual(insertAtCaret("hi", 0, 0, "🔥"), {
      value: "🔥hi",
      caret: 2,
    })
  })

  it("rejects an insert that would exceed maxLength in UTF-16 units", () => {
    assert.deepEqual(insertAtCaret("abcd", 4, 4, "😀", 5), {
      value: "abcd",
      caret: 4,
    })
  })
})

describe("isEmojiOnlyMessage", () => {
  it("is true for one to three emoji graphemes", () => {
    assert.equal(isEmojiOnlyMessage("😀"), true)
    assert.equal(isEmojiOnlyMessage("😀🔥"), true)
    assert.equal(isEmojiOnlyMessage("😀🔥👋"), true)
    assert.equal(isEmojiOnlyMessage("  😀  "), true)
  })

  it("is true for ZWJ, flag, and skin-tone graphemes", () => {
    assert.equal(isEmojiOnlyMessage("👨‍👩‍👧‍👦"), true)
    assert.equal(isEmojiOnlyMessage("🇻🇳"), true)
    assert.equal(isEmojiOnlyMessage("👋🏻"), true)
  })

  it("is false for empty, text, or more than three emoji", () => {
    assert.equal(isEmojiOnlyMessage(""), false)
    assert.equal(isEmojiOnlyMessage("   "), false)
    assert.equal(isEmojiOnlyMessage("hi"), false)
    assert.equal(isEmojiOnlyMessage("😀 hi"), false)
    assert.equal(isEmojiOnlyMessage("😀🔥👋🎉"), false)
  })
})
