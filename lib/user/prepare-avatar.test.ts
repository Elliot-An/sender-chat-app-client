import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { squareCropRect } from "./prepare-avatar.ts"

describe("squareCropRect", () => {
  it("centers a landscape source", () => {
    assert.deepEqual(squareCropRect(800, 400), { sx: 200, sy: 0, edge: 400 })
  })

  it("centers a portrait source", () => {
    assert.deepEqual(squareCropRect(300, 500), { sx: 0, sy: 100, edge: 300 })
  })

  it("keeps an already-square source", () => {
    assert.deepEqual(squareCropRect(256, 256), { sx: 0, sy: 0, edge: 256 })
  })
})
