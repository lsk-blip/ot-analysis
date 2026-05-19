import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "OT 분석 자동화",
  description: "광고주 OT 1차 분석 + 사내 브리프 생성 도구",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
