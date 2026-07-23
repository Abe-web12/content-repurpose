export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { uploadBuffer } from "@/lib/cloudinary"

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"])
const ALLOWED_MAGIC_BYTES: [number[], number][] = [
  [[0xFF, 0xD8, 0xFF], 0],
  [[0x89, 0x50, 0x4E, 0x47], 0],
]
const MAX_FILE_SIZE = 5 * 1024 * 1024

function validateMagicBytes(buffer: Buffer): boolean {
  return ALLOWED_MAGIC_BYTES.some(([magic, offset]) =>
    magic.every((byte, i) => buffer[offset + i] === byte)
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File must be under 5MB" },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "File must be a PNG or JPEG image" },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (!validateMagicBytes(buffer)) {
      return NextResponse.json(
        { error: "Invalid file content" },
        { status: 400 }
      )
    }

    const url = await uploadBuffer(buffer, {
      folder: `repurposeai/${user.id}`,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
