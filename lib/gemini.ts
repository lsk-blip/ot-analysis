// Gemini API 클라이언트 — 서버 측에서만 사용 (API 키 보호)
// 503/429 등 일시적 에러는 자동 재시도, 모델 fallback 지원

import { GoogleGenerativeAI } from "@google/generative-ai"

const PRIMARY_MODEL = "gemini-2.5-flash-lite"
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"]
const RETRY_DELAYS_MS = [1500, 3500, 7000]

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.")
  }
  return new GoogleGenerativeAI(apiKey)
}

function isRetryableError(e: any): boolean {
  const msg = String(e?.message || "").toLowerCase()
  return (
    msg.includes("503") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("unavailable") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("internal error") ||
    msg.includes("deadline")
  )
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callOnce(
  modelName: string,
  systemInstruction: string,
  userText: string,
  options: { temperature?: number; maxOutputTokens?: number }
): Promise<any> {
  const client = getClient()
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
    },
  })

  const result = await model.generateContent(userText)
  const text = result.response.text()
  return ensureDict(parseJsonResponse(text))
}

export async function generateJson(
  systemInstruction: string,
  userText: string,
  options: { temperature?: number; maxOutputTokens?: number } = {}
): Promise<any> {
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS]
  let lastError: any = null

  for (let mIdx = 0; mIdx < models.length; mIdx++) {
    const modelName = models[mIdx]
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await callOnce(modelName, systemInstruction, userText, options)
      } catch (e: any) {
        lastError = e
        const retryable = isRetryableError(e)

        if (!retryable) {
          // 재시도 불가 에러 (잘못된 키, JSON 파싱 등) — 즉시 throw
          throw e
        }

        // 같은 모델에서 재시도 가능하면 대기 후 재시도
        if (attempt < RETRY_DELAYS_MS.length) {
          console.log(
            `[Gemini retry] model=${modelName} attempt=${attempt + 1} delay=${RETRY_DELAYS_MS[attempt]}ms`
          )
          await sleep(RETRY_DELAYS_MS[attempt])
          continue
        }

        // 모든 재시도 실패 — 다음 fallback 모델로
        console.log(`[Gemini fallback] ${modelName} 실패, 다음 모델로 전환`)
        break
      }
    }
  }

  // 모든 모델/재시도 실패
  throw new Error(
    `Gemini API 요청에 실패했습니다. 잠시 후 다시 시도해주세요.\n원본 오류: ${
      lastError?.message || lastError
    }`
  )
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
