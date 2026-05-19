# OT 분석 자동화 (Next.js)

광고주 OT를 자동 마스킹·분석해 1차 브리프 + 시장 조사를 생성합니다.

## 스택

- Next.js 14 (App Router)
- TypeScript + Tailwind CSS
- Gemini API (`gemini-2.5-flash-lite`) — 서버 측 (API 키 보호)
- 네이버 검색 API — 시장 조사용

## 환경변수 (Vercel Secrets)

| Name | 발급 위치 |
|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com (무료) |
| `NAVER_CLIENT_ID` | https://developers.naver.com (무료, 검색 API) |
| `NAVER_CLIENT_SECRET` | 위와 동일 |

## 기능

- **광고주 OT 파일 업로드** — PDF / DOCX / TXT 자동 텍스트 추출
- **자동 마스킹** — 브랜드/회사/제품/인물/금액/일자
- **OT 종류 분류** — 브랜드 컨설팅 / IMC 캠페인
- **OT 브리프** — 13개 Fact 항목 자동 추출
- **문제 확인 및 가설 도출** — 광고주 인식 문제 / 숨은 문제 가설 / 시장 시그널 (Confidence 표시)
- **광고주 확인 사항 (RFI)**
- **시장 조사** — 네이버 뉴스 검색 + AI 요약 + 트렌드 + 출처
