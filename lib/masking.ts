// 마스킹 로직 — LLM이 추출한 후보를 토큰으로 치환 / 화면에서 원본 복원

type MaskingCandidates = {
  brand_names?: string[]
  company_names?: string[]
  product_names?: string[]
  person_names?: string[]
  specific_amounts?: string[]
  specific_dates?: string[]
}

const PREFIX_BY_CATEGORY: Record<string, string> = {
  brand_names: "BRAND",
  company_names: "COMPANY",
  product_names: "PRODUCT",
  person_names: "PERSON",
  specific_amounts: "AMOUNT",
  specific_dates: "DATE",
}

export function buildMapping(candidates: MaskingCandidates): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const [category, items] of Object.entries(candidates)) {
    const prefix = PREFIX_BY_CATEGORY[category]
    if (!prefix || !Array.isArray(items)) continue

    const seen = new Set<string>()
    let counter = 1
    for (const item of items) {
      if (!item || typeof item !== "string") continue
      const word = item.trim()
      if (!word || seen.has(word) || word in mapping) continue
      seen.add(word)
      mapping[word] = `[${prefix}_${counter}]`
      counter++
    }
  }
  return mapping
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function applyMasking(text: string, mapping: Record<string, string>): string {
  if (!text || !mapping || Object.keys(mapping).length === 0) return text
  const sortedKeys = Object.keys(mapping).sort((a, b) => b.length - a.length)
  let result = text
  for (const original of sortedKeys) {
    if (!original.trim()) continue
    result = result.replace(new RegExp(escapeRegex(original), "g"), mapping[original])
  }
  return result
}

export function unmaskText(text: string, mapping: Record<string, string>): string {
  if (!text || !mapping) return text
  const reverse: Record<string, string> = {}
  for (const [original, token] of Object.entries(mapping)) {
    reverse[token] = original
  }
  const sortedTokens = Object.keys(reverse).sort((a, b) => b.length - a.length)
  let result = text
  for (const token of sortedTokens) {
    result = result.replace(new RegExp(escapeRegex(token), "g"), reverse[token])
  }
  return result
}

export function unmaskData(data: any, mapping: Record<string, string>): any {
  if (!mapping || Object.keys(mapping).length === 0) return data
  if (typeof data === "string") return unmaskText(data, mapping)
  if (Array.isArray(data)) return data.map((v) => unmaskData(v, mapping))
  if (data && typeof data === "object") {
    const result: Record<string, any> = {}
    for (const [k, v] of Object.entries(data)) {
      result[k] = unmaskData(v, mapping)
    }
    return result
  }
  return data
}
