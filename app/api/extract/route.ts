import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    const ext = name.slice(name.lastIndexOf("."))
    const buffer = Buffer.from(await file.arrayBuffer())

    let text = ""

    if (ext === ".pdf") {
      const pdfParse = (await import("pdf-parse")).default
      const result = await pdfParse(buffer)
      text = result.text || ""
    } else if (ext === ".docx") {
      const mammoth = await import("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      text = result.value || ""
    } else if (ext === ".txt" || ext === ".md") {
      text = buffer.toString("utf-8")
    } else {
      return NextResponse.json(
        { error: `지원하지 않는 파일 형식: ${ext} (PDF, DOCX, TXT만 지원)` },
        { status: 400 }
      )
    }

    text = text.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim()

    return NextResponse.json({ text, filename: file.name })
  } catch (e: any) {
    console.error("[/api/extract]", e)
    return NextResponse.json(
      { error: e?.message || "텍스트 추출 실패" },
      { status: 500 }
    )
  }
}
