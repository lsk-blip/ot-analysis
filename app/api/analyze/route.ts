import { NextRequest, NextResponse } from "next/server"
import { generateJson } from "@/lib/gemini"
import { applyMasking, buildMapping } from "@/lib/masking"
import {
  PROMPT_CLASSIFIER,
  PROMPT_INTERPRETATION,
  PROMPT_MASKING,
  PROMPT_REFERENCE,
} from "@/lib/prompts"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { otText, aeIntel } = await req.json()

    if (!otText || typeof otText !== "string" || !otText.trim()) {
      return NextResponse.json(
        { error: "광고주 OT 내용을 입력해주세요." },
        { status: 400 }
      )
    }

    const trimmedAeIntel = (aeIntel || "").trim()

    // 1. 분류
    const classification = await generateJson(PROMPT_CLASSIFIER, otText, {
      temperature: 0.2,
      maxOutputTokens: 1024,
    })

    // 2. 마스킹 후보 추출 (OT + AE 인텔 통합)
    const combinedForMasking = trimmedAeIntel
      ? `${otText}\n\n[AE 추가기입정보]\n${trimmedAeIntel}`
      : otText

    const candidates = await generateJson(PROMPT_MASKING, combinedForMasking, {
      temperature: 0.1,
      maxOutputTokens: 2048,
    })
    const masking_mapping = buildMapping(candidates)

    // 3. 양쪽에 마스킹 적용
    const masked_text = applyMasking(otText, masking_mapping)
    const masked_ae = trimmedAeIntel
      ? applyMasking(trimmedAeIntel, masking_mapping)
      : ""

    const llmInput = masked_ae
      ? `${masked_text}\n\n[AE 추가 인텔 — 광고주/사내 미팅에서 들은 정보]\n${masked_ae}`
      : masked_text

    // 4. 해석 + 참고 정보 (병렬)
    const [interpretation, reference_info] = await Promise.all([
      generateJson(PROMPT_INTERPRETATION, llmInput, {
        temperature: 0.4,
        maxOutputTokens: 4096,
      }),
      generateJson(PROMPT_REFERENCE, masked_text, {
        temperature: 0.2,
        maxOutputTokens: 4096,
      }),
    ])

    return NextResponse.json({
      classification,
      interpretation,
      reference_info,
      masking_mapping,
      original_text: otText,
    })
  } catch (e: any) {
    console.error("[/api/analyze]", e)
    return NextResponse.json(
      { error: e?.message || "분석 중 오류 발생" },
      { status: 500 }
    )
  }
}
