import { NextResponse } from "next/server"
import { ApiAuthError, RateLimitError } from "@/lib/api-auth"

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function handleApiError(error: unknown) {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: error.status,
        headers: {
          "Retry-After": String(error.retryAfter),
        },
      }
    )
  }

  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  console.error(error)
  return NextResponse.json(
    { error: "Internal Server Error" },
    { status: 500 }
  )
}
