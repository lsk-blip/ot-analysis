# OT 분석 자동화 (Next.js)

광고주 OT를 자동 마스킹·분석해 1차 브리프와 광고주 확인 사항을 도출합니다.

## 스택

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Gemini API (`gemini-2.5-flash-lite`) — 서버 측 (API 키 보호)

## 환경변수

`.env.local.example`을 복사해 `.env.local`로 만들고 키 입력:

```
GEMINI_API_KEY=AIzaSy_여기에_본인_키
```

> Vercel 배포 시: Project Settings → Environment Variables에 동일 키 등록.

## 기능

- 광고주 OT 본문 입력 + AE 추가기입정보 입력
- 자동 마스킹 (브랜드/회사/제품/인물/금액/일자)
- OT 종류 분류 (브랜드 컨설팅 / IMC 캠페인)
- OT 브리프 (13개 Fact 항목)
- 문제 확인 및 가설 도출 (광고주 인식 문제 / 숨은 문제 가설 / 시장 시그널)
- 광고주 확인 사항 (RFI)
