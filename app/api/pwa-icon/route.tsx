import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"

export const runtime = "edge"

export function GET(req: NextRequest) {
  const size = Number(req.nextUrl.searchParams.get("size") ?? "512")
  const radius = Math.round(size * 0.18)
  const starSize = Math.round(size * 0.6)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#EDE6D8",
          borderRadius: radius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={starSize} height={starSize} viewBox="0 0 32 32">
          <path d="M16 7 L18 14 L25 16 L18 18 L16 25 L14 18 L7 16 L14 14 Z" fill="#6B7A5A" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  )
}
