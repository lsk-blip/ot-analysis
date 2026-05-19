// Gemini API 클라이언트 — 서버 측에서만 사용 (API 키 보호)

import { GoogleGenerativeAI } from "@google/generative-ai"

const MODEL_NAME = "gemini-2.5-flash-lite"

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.")
  }
  return new GoogleGenerativeAI(apiKey)
}

export async function generateJson(
  systemInstruction: string,
  userText: string,
  options: { temperature?: number; maxOutputTokens?: number } = {}
): Promise<any> {
  const client = getClient()
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
    },
  })

  const result = await model.generateContent(userText)
  const text = result.response.text()
  const parsed = parseJsonResponse(text)
  return ensureDict(parsed)
}

function parseJsonResponse(text: string): any {
  let cleaned = text.trim()
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch) cleaned = fenceMatch[1]
  try {
    return JSON.parse(cleaned)
  } catch (e: any) {
    throw new Error(
      `Gemini 응답 JSON 파싱 실패:\n${cleaned.slice(0, 500)}...\n\n${e.message}`
    )
  }
}

function ensureDict(parsed: any): any {
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed)) {
    if (parsed.length === 1 && parsed[0] && typeof parsed[0] === "object") {
      return parsed[0]
    }
    throw new Error(
      `여러 분석 결과가 감지됐습니다 (길이 ${parsed.length}). OT 파일에 여러 광고주 정보가 포함된 것 같습니다.`
    )
  }
  throw new Error(`Gemini가 예상한 형식이 아닌 ${typeof parsed}을(를) 반환했습니다.`)
}
