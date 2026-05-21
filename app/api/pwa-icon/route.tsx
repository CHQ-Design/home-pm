import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"

export const runtime = "edge"

export function GET(req: NextRequest) {
  const size = Math.min(Math.max(Number(req.nextUrl.searchParams.get("size") ?? "512") || 512, 16), 1024)

  // Quiet Hour O mark: a circular ring (approximate Fraunces O counter) with
  // a single ink dot at the "1 o'clock" position inside the counter.
  // Geometry scaled from the source SVG proportions (viewBox 200×200, font-size 150):
  //   O outer radius ≈ 33% of canvas; stroke ≈ 10% of canvas
  //   Dot at normalized (0.595, 0.35) from top-left; r ≈ 3.4% of canvas
  const outerR = Math.round(size * 0.33)
  const stroke = Math.round(size * 0.10)
  const ringLeft = Math.round(size * 0.5 - outerR)
  const ringTop  = Math.round(size * 0.5 - outerR)
  const ringSize = outerR * 2

  const dotCx = Math.round(size * 0.595)
  const dotCy = Math.round(size * 0.35)
  const dotR  = Math.round(size * 0.034)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#EDE6D8",
          borderRadius: Math.round(size * 0.18),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* O counter ring */}
        <div
          style={{
            position: "absolute",
            left: ringLeft,
            top: ringTop,
            width: ringSize,
            height: ringSize,
            borderRadius: "50%",
            border: `${stroke}px solid #3A3228`,
            background: "transparent",
          }}
        />
        {/* Dot at 1 o'clock */}
        <div
          style={{
            position: "absolute",
            left: dotCx - dotR,
            top: dotCy - dotR,
            width: dotR * 2,
            height: dotR * 2,
            borderRadius: "50%",
            background: "#3A3228",
          }}
        />
      </div>
    ),
    { width: size, height: size }
  )
}
