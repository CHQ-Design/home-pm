import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"

export const runtime = "edge"

export function GET(req: NextRequest) {
  const size = Math.min(Math.max(Number(req.nextUrl.searchParams.get("size") ?? "512") || 512, 16), 1024)
  const radius = Math.round(size * 0.18)

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
        {/*
          Single olive leaf on warm cream tile.
          1024-unit viewBox so the same path renders at every export size.
          Slight -8° tilt for organic, mid-century-botanical feel.
          Midrib is a single soft cream line at 50% opacity.
        */}
        <svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
          <g transform="rotate(-8 512 512)">
            <path
              d="M512 192 C 680 232, 720 380, 720 540 C 720 700, 660 808, 512 848 C 364 808, 304 700, 304 540 C 304 380, 344 232, 512 192 Z"
              fill="#6B7A5A"
            />
            <path
              d="M512 232 L512 812"
              stroke="#EDE6D8"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.5"
            />
          </g>
        </svg>
      </div>
    ),
    { width: size, height: size }
  )
}
