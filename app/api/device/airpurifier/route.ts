import { NextResponse } from "next/server"

let deviceState = "OFF"

export async function GET() {
  return NextResponse.json({
    device: "Air Purifier",
    status: deviceState
  })
}

export async function POST(req: Request) {

  const { status } = await req.json()

  if (status === "ON") {
    deviceState = "ON"
  }

  if (status === "OFF") {
    deviceState = "OFF"
  }

  return NextResponse.json({
    device: "Air Purifier",
    status: deviceState
  })
}