import { NextRequest, NextResponse } from "next/server"
import { generateJson } from "@/lib/gemini"
import { searchNews } from "@/lib/naver"
import { PROMPT_MARKET } from "@/lib/prompts"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { keyword, display, sort } = await req.json()

    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
      return NextResponse.json(
        { error: "검색 키워드를 입력해주세요." },
        { status: 400 }
      )
    }

    const displayCount = Math.min(Math.max(Number(display) || 20, 5), 50)
    const sortValue = sort === "date" ? "date" : "sim"

    const articles = await searchNews(keyword.trim(), displayCount, sortValue)

    if (articles.length === 0) {
      return NextResponse.json({ articles: [], summary_data: null })
    }

    // Gemini에 던질 텍스트 구성
    const rows = articles
      .map(
        (a, i) =>
          `${i + 1}. 제목: ${a.title}\n   출처: ${a.publisher_link || ""}\n   요약: ${a.description}`
      )
      .join("\n\n")

    const userText = `[키워드]\n${keyword.trim()}\n\n[검색 결과]\n${rows}`

    const summary_data = await generateJson(PROMPT_MARKET, userText, {
      temperature: 0.3,
      maxOutputTokens: 4096,
    })

    return NextResponse.json({ articles, summary_data, keyword: keyword.trim() })
  } catch (e: any) {
    console.error("[/api/market]", e)
    return NextResponse.json(
      { error: e?.message || "시장 조사 실패" },
      { status: 500 }
    )
  }
}
