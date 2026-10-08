import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  AuthApiError,
  getAuthErrorPresentation,
  httpAuthError,
  networkAuthError,
} from "./errors.ts"

describe("networkAuthError", () => {
  it("maps fetch failures to a clear connection message", () => {
    const error = networkAuthError(new TypeError("Failed to fetch"))
    assert.equal(error.code, "NETWORK_ERROR")
    assert.equal(error.title, "Can't reach the server")
    assert.match(error.message, /internet connection/i)
  })
})

describe("httpAuthError", () => {
  it("maps invalid credentials", () => {
    const error = httpAuthError(401, {
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    })
    assert.equal(error.code, "INVALID_CREDENTIALS")
    assert.equal(error.title, "Couldn't sign you in")
    assert.equal(error.message, "Invalid email or password")
  })

  it("maps rate limits", () => {
    const error = httpAuthError(429, {
      code: "RATE_LIMITED",
      message: "Too many requests. Try again shortly.",
    })
    assert.equal(error.code, "RATE_LIMITED")
    assert.equal(error.title, "Too many attempts")
  })

  it("prefers the first validation field error", () => {
    const error = httpAuthError(400, {
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      fieldErrors: { email: "must be a well-formed email address" },
    })
    assert.equal(error.code, "VALIDATION_ERROR")
    assert.equal(error.message, "must be a well-formed email address")
  })
})

describe("getAuthErrorPresentation", () => {
  it("retitles credential errors for register", () => {
    const presentation = getAuthErrorPresentation(
      new AuthApiError({
        code: "INVALID_CREDENTIALS",
        status: 401,
        title: "Couldn't sign you in",
        message: "Invalid email or password",
      }),
      "register",
    )
    assert.equal(presentation.title, "Couldn't create your account")
  })

  it("recovers plain Failed to fetch errors", () => {
    const presentation = getAuthErrorPresentation(new TypeError("Failed to fetch"))
    assert.equal(presentation.code, "NETWORK_ERROR")
    assert.equal(presentation.title, "Can't reach the server")
  })
})
