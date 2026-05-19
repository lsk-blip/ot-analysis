// 네이버 검색 API 클라이언트 (서버 측 전용)

export type NaverArticle = {
  title: string
  description: string
  link: string
  publisher_link?: string
  pub_date?: string
}

export async function searchNews(
  query: string,
  display: number = 20,
  sort: "sim" | "date" = "sim"
): Promise<NaverArticle[]> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error(
      "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다."
    )
  }

  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(
    query
  )}&display=${display}&sort=${sort}`

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`네이버 검색 API 오류 (HTTP ${res.status}): ${body}`)
  }

  const data = await res.json()
  const items: any[] = data.items || []
  return items.map((item) => ({
    title: stripHtml(item.title || ""),
    description: stripHtml(item.description || ""),
    link: item.link || "",
    publisher_link: item.originallink || "",
    pub_date: item.pubDate || "",
  }))
}

function stripHtml(text: string): string {
  if (!text) return ""
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim()
}
