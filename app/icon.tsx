import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#EDE6D8",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 1024 1024">
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
    { width: 32, height: 32 }
  )
}
