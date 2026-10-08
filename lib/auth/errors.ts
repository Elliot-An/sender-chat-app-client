export type AuthErrorCode =
  | "NETWORK_ERROR"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "REQUEST_FAILED"

export type AuthErrorBody = {
  code?: string
  message?: string
  fieldErrors?: Record<string, string>
}

export type AuthErrorPresentation = {
  code: AuthErrorCode
  title: string
  message: string
  status: number | null
  fieldErrors?: Record<string, string>
}

type AuthApiErrorInit = AuthErrorPresentation & { cause?: unknown }

export class AuthApiError extends Error {
  readonly code: AuthErrorCode
  readonly title: string
  readonly status: number | null
  readonly fieldErrors?: Record<string, string>

  constructor(init: AuthApiErrorInit) {
    super(init.message, init.cause !== undefined ? { cause: init.cause } : undefined)
    this.name = "AuthApiError"
    this.code = init.code
    this.title = init.title
    this.status = init.status
    this.fieldErrors = init.fieldErrors
  }
}

function firstFieldError(fieldErrors?: Record<string, string>) {
  if (!fieldErrors) return null
  return Object.values(fieldErrors).find(Boolean) ?? null
}

function isNetworkFailure(error: unknown) {
  if (!(error instanceof Error)) return false
  return /failed to fetch|networkerror|load failed|network request failed/i.test(error.message)
}

export function networkAuthError(cause?: unknown) {
  return new AuthApiError({
    code: "NETWORK_ERROR",
    status: null,
    title: "Can't reach the server",
    message:
      "Check your internet connection, then try again. If you're online, the service may be briefly unavailable.",
    cause,
  })
}

export function httpAuthError(status: number, body: AuthErrorBody | null) {
  const code = (body?.code ?? "").toUpperCase()
  const fieldError = firstFieldError(body?.fieldErrors)

  if (code === "INVALID_CREDENTIALS" || status === 401) {
    return new AuthApiError({
      code: "INVALID_CREDENTIALS",
      status,
      title: "Couldn't sign you in",
      message: body?.message ?? "Invalid email or password.",
    })
  }

  if (code === "RATE_LIMITED" || status === 429) {
    return new AuthApiError({
      code: "RATE_LIMITED",
      status,
      title: "Too many attempts",
      message: body?.message ?? "Too many requests. Try again shortly.",
    })
  }

  if (code === "VALIDATION_ERROR" || status === 400) {
    return new AuthApiError({
      code: "VALIDATION_ERROR",
      status,
      title: "Check your details",
      message: fieldError ?? body?.message ?? "Some fields need attention before you continue.",
      fieldErrors: body?.fieldErrors,
    })
  }

  if (status >= 500) {
    return new AuthApiError({
      code: "SERVER_ERROR",
      status,
      title: "Something went wrong",
      message: "We couldn't complete your request. Please try again in a moment.",
    })
  }

  return new AuthApiError({
    code: "REQUEST_FAILED",
    status,
    title: "Request failed",
    message: body?.message ?? "Something went wrong. Please try again.",
  })
}

export function getAuthErrorPresentation(
  error: unknown,
  intent: "login" | "register" = "login",
): AuthErrorPresentation {
  if (error instanceof AuthApiError) {
    if (error.code === "INVALID_CREDENTIALS" && intent === "register") {
      return {
        code: error.code,
        status: error.status,
        title: "Couldn't create your account",
        message: error.message,
        fieldErrors: error.fieldErrors,
      }
    }
    return {
      code: error.code,
      status: error.status,
      title: error.title,
      message: error.message,
      fieldErrors: error.fieldErrors,
    }
  }

  if (isNetworkFailure(error)) {
    return networkAuthError(error)
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      code: "REQUEST_FAILED",
      status: null,
      title: "Something went wrong",
      message: error.message,
    }
  }

  return {
    code: "REQUEST_FAILED",
    status: null,
    title: "Something went wrong",
    message: "Please try again.",
  }
}
