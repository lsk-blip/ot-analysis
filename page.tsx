"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { unmaskData } from "@/lib/masking"

type Classification = { ot_type: string; confidence: string; reasoning: string }

type AnalysisResult = {
  classification: Classification
  interpretation: any
  reference_info: any
  masking_mapping: Record<string, string>
  original_text: string
}

type MarketArticle = {
  title: string
  description: string
  link: string
  publisher_link?: string
}

type MarketResult = {
  articles: MarketArticle[]
  summary_data: any
  keyword: string
}

export default function Page() {
  const [otText, setOtText] = useState("")
  const [aeIntel, setAeIntel] = useState("")
  const [filename, setFilename] = useState("")
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [activeTab, setActiveTab] = useState<"ot" | "brief" | "factbook">("brief")

  // 편집 모드 + 편집 데이터
  const [editMode, setEditMode] = useState(false)
  const [editedRef, setEditedRef] = useState<Record<string, any>>({})
  const [editedInsights, setEditedInsights] = useState<Record<number, any>>({})
  const [editedRfi, setEditedRfi] = useState<string[] | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/extract", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "파일 추출 실패")
      setOtText(data.text || "")
      setFilename(data.filename || file.name)
    } catch (e: any) {
      setError(e?.message || "파일 처리 중 오류")
    } finally {
      setUploading(false)
    }
  }

  async function runAnalysis() {
    if (!otText.trim()) {
      setError("광고주 OT 내용을 입력해주세요.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otText, aeIntel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "분석 실패")
      setResult(data)
      setEditedRef({})
      setEditedInsights({})
      setEditedRfi(null)
      setEditMode(false)
      setActiveTab("brief")
    } catch (e: any) {
      setError(e?.message || "분석 중 오류")
    } finally {
      setLoading(false)
    }
  }

  // 머지된 데이터 (다운로드용 + 화면 표시용)
  const mapping = result?.masking_mapping || {}
  const unmaskedRef = useMemo(
    () => (result ? unmaskData(result.reference_info, mapping) : null),
    [result, mapping]
  )
  const unmaskedInterp = useMemo(
    () => (result ? unmaskData(result.interpretation, mapping) : null),
    [result, mapping]
  )

  const mergedRef = useMemo(() => {
    if (!unmaskedRef) return null
    const merged: any = { ...unmaskedRef }
    for (const [k, v] of Object.entries(editedRef)) {
      if (v !== null && v !== undefined && v !== "") merged[k] = v
    }
    return merged
  }, [unmaskedRef, editedRef])

  const mergedInterp = useMemo(() => {
    if (!unmaskedInterp) return null
    const merged: any = { ...unmaskedInterp }
    const baseInsights = unmaskedInterp.insights || []
    if (Object.keys(editedInsights).length > 0) {
      merged.insights = baseInsights.map((item: any, i: number) =>
        editedInsights[i] ? { ...item, ...editedInsights[i] } : item
      )
    }
    if (editedRfi !== null) merged.rfi = editedRfi
    return merged
  }, [unmaskedInterp, editedInsights, editedRfi])

  function downloadJson() {
    if (!result) return
    const payload = {
      classification: result.classification,
      interpretation: mergedInterp,
      reference_info: mergedRef,
      masking_mapping: result.masking_mapping,
    }
    const baseName = filename ? filename.replace(/\.[^.]+$/, "") : "ot-analysis"
    downloadFile(
      `${baseName}_analysis.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    )
  }

  function downloadMaskedOt() {
    if (!result) return
    const baseName = filename ? filename.replace(/\.[^.]+$/, "") : "ot-analysis"
    // 마스킹된 원본 텍스트는 mapping 적용한 결과
    let masked = result.original_text
    for (const [original, token] of Object.entries(result.masking_mapping || {}).sort(
      (a, b) => b[0].length - a[0].length
    )) {
      masked = masked.split(original).join(token)
    }
    downloadFile(`${baseName}_masked.txt`, masked, "text/plain")
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        otText={otText}
        setOtText={setOtText}
        aeIntel={aeIntel}
        setAeIntel={setAeIntel}
        filename={filename}
        uploading={uploading}
        loading={loading}
        hasResult={!!result}
        onRun={runAnalysis}
        onPickFile={() => fileInputRef.current?.click()}
        onDownloadJson={downloadJson}
        onDownloadMasked={downloadMaskedOt}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ""
        }}
      />

      <main className="flex-1 px-12 py-12 max-w-5xl">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-8 text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        {!result ? (
          <Landing />
        ) : (
          <Dashboard
            result={result}
            mergedRef={mergedRef}
            mergedInterp={mergedInterp}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            editMode={editMode}
            setEditMode={setEditMode}
            editedRef={editedRef}
            setEditedRef={setEditedRef}
            editedInsights={editedInsights}
            setEditedInsights={setEditedInsights}
            editedRfi={editedRfi}
            setEditedRfi={setEditedRfi}
          />
        )}
      </main>
    </div>
  )
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Sidebar ─────────────────────────────────────────────

function Sidebar({
  otText,
  setOtText,
  aeIntel,
  setAeIntel,
  filename,
  uploading,
  loading,
  hasResult,
  onRun,
  onPickFile,
  onDownloadJson,
  onDownloadMasked,
}: any) {
  return (
    <aside className="w-[340px] bg-gray-50 border-r border-gray-100 p-6 flex flex-col gap-6 sticky top-0 h-screen overflow-y-auto scrollbar-thin">
      <div>
        <div className="text-[11px] font-bold text-gray-900 uppercase tracking-[0.08em] mb-3">
          광고주 OT 파일
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          PDF · DOCX · TXT 업로드 또는 직접 붙여넣기
        </p>
        <button
          type="button"
          onClick={onPickFile}
          disabled={uploading}
          className="w-full mb-3 border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-600 hover:border-gray-500 hover:bg-white transition-colors disabled:opacity-50"
        >
          {uploading ? "파일 처리 중..." : filename ? `📄 ${filename}` : "파일 선택"}
        </button>
        <textarea
          value={otText}
          onChange={(e) => setOtText(e.target.value)}
          placeholder="또는 OT 본문을 직접 붙여넣기"
          rows={8}
          className="w-full text-sm border border-gray-200 rounded-xl p-3 text-gray-900 bg-white focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none resize-y"
        />
      </div>

      <div>
        <div className="text-[11px] font-bold text-gray-900 uppercase tracking-[0.08em] mb-2">
          AE 추가기입정보
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mb-2">
          추가적인 맥락(회의록 등)을 입력하시면 더 정확한 분석을 받을 수 있습니다.
        </p>
        <textarea
          value={aeIntel}
          onChange={(e) => setAeIntel(e.target.value)}
          placeholder="예) 광고주 미팅 회의록"
          rows={5}
          className="w-full text-sm border border-gray-200 rounded-xl p-3 text-gray-900 bg-white focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none resize-y"
        />
      </div>

      <button
        onClick={onRun}
        disabled={loading || !otText.trim()}
        className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-[15px]"
      >
        {loading ? "분석 중..." : "분석 시작"}
      </button>

      {hasResult && (
        <>
          <div className="border-t border-gray-200 pt-6">
            <div className="text-[11px] font-bold text-gray-900 uppercase tracking-[0.08em] mb-3">
              내보내기
            </div>
            <button
              onClick={onDownloadJson}
              className="w-full mb-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl text-sm"
            >
              분석 결과 (JSON)
            </button>
            <button
              onClick={onDownloadMasked}
              className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl text-sm"
            >
              마스킹 OT (TXT)
            </button>
          </div>
        </>
      )}
    </aside>
  )
}

// ─── Landing ─────────────────────────────────────────────

function Landing() {
  return (
    <div className="text-center pt-32 pb-16">
      <div className="text-5xl mb-7 opacity-90">📄</div>
      <h1 className="text-[28px] font-bold text-gray-900 tracking-tight mb-3">
        광고주 OT를 분석합니다
      </h1>
      <p className="text-gray-500 text-base leading-relaxed max-w-md mx-auto">
        좌측에서 OT 파일을 업로드하거나 본문을 입력하고 분석 시작을 누르세요.
      </p>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────

function Dashboard({
  result,
  mergedRef,
  mergedInterp,
  activeTab,
  setActiveTab,
  editMode,
  setEditMode,
  editedRef,
  setEditedRef,
  editedInsights,
  setEditedInsights,
  editedRfi,
  setEditedRfi,
}: any) {
  const ot_type =
    result.classification?.ot_type === "consulting" ? "브랜드 컨설팅" : "IMC 캠페인"
  const campaign = mergedRef?.campaign_name || "광고주 OT"

  return (
    <div>
      <div className="flex items-start justify-between mb-12">
        <div>
          <div className="text-sm text-gray-500 font-medium mb-2">{ot_type}</div>
          <h1 className="text-[30px] font-bold text-gray-900 tracking-tight leading-tight">
            {campaign}
          </h1>
        </div>
        <EditToggle checked={editMode} onChange={setEditMode} />
      </div>

      <div className="flex border-b border-gray-200 mb-10">
        {[
          { key: "ot" as const, label: "광고주 OT 문서" },
          { key: "brief" as const, label: "브리프" },
          { key: "factbook" as const, label: "팩트북" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-1 mr-10 py-3.5 text-[15px] font-semibold border-b-2 transition-colors ${
              activeTab === t.key
                ? "text-gray-900 border-gray-900"
                : "text-gray-400 border-transparent hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "ot" && <OtDocTab result={result} />}
      {activeTab === "brief" && (
        <BriefTab
          refData={mergedRef}
          interp={mergedInterp}
          editMode={editMode}
          editedRef={editedRef}
          setEditedRef={setEditedRef}
          editedInsights={editedInsights}
          setEditedInsights={setEditedInsights}
          editedRfi={editedRfi}
          setEditedRfi={setEditedRfi}
        />
      )}
      {activeTab === "factbook" && <FactbookTab refData={mergedRef} />}
    </div>
  )
}

function EditToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
        checked
          ? "bg-accent text-white"
          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
          checked ? "bg-white/30" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      편집 모드
    </button>
  )
}

// ─── Tab: OT 문서 ────────────────────────────────────────

function OtDocTab({ result }: { result: AnalysisResult }) {
  const mapping = result.masking_mapping || {}
  const mappingCount = Object.keys(mapping).length

  return (
    <div>
      {mappingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-500 mb-6">
          <span className="w-1.5 h-1.5 bg-accent rounded-full" />
          <span>
            보안 보호를 위해 {mappingCount}개 항목이 자동 마스킹되어 분석에
            사용되었습니다. 화면에는 원본이 그대로 표시됩니다.
          </span>
        </div>
      )}

      <div className="text-gray-900 text-[15px] leading-[1.95] whitespace-pre-wrap">
        {result.original_text}
      </div>

      {mappingCount > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            마스킹 매핑 보기 · {mappingCount}개
          </summary>
          <div className="mt-3 border-t border-gray-100 pt-3">
            {Object.entries(mapping)
              .sort((a, b) => a[1].localeCompare(b[1]))
              .map(([original, token]) => (
                <div
                  key={token}
                  className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-none text-sm"
                >
                  <code className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded text-xs font-mono">
                    {token}
                  </code>
                  <span className="text-gray-300">→</span>
                  <span className="text-gray-900">{original}</span>
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ─── Tab: 브리프 ─────────────────────────────────────────

const REFERENCE_FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  { key: "campaign_name", label: "캠페인명" },
  { key: "task_and_scope", label: "캠페인 과제", multiline: true },
  { key: "objective", label: "캠페인 목적", multiline: true },
  { key: "budget", label: "예산" },
  { key: "duration", label: "캠페인 기간" },
  { key: "target", label: "타겟", multiline: true },
  { key: "competitors", label: "경쟁사" },
  { key: "usp", label: "USP", multiline: true },
  { key: "what_to_say", label: "What to Say", multiline: true },
  { key: "creative_media_requirement", label: "Creative · Media", multiline: true },
  { key: "tone_and_manner", label: "광고 T&M", multiline: true },
  { key: "brand_status", label: "브랜드 Status", multiline: true },
  { key: "timeline", label: "캠페인 타임라인", multiline: true },
]

function BriefTab({
  refData,
  interp,
  editMode,
  editedRef,
  setEditedRef,
  editedInsights,
  setEditedInsights,
  editedRfi,
  setEditedRfi,
}: any) {
  const insights = (interp?.insights as any[]) || []
  const rfi = (editedRfi !== null ? editedRfi : interp?.rfi) || []

  const grouped: Record<string, { item: any; index: number }[]> = {
    "광고주 인식 문제": [],
    "숨은 문제 가설": [],
    "시장 시그널": [],
  }
  insights.forEach((item, i) => {
    const cat = normalizeCategory(item?.category || "시장 시그널")
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push({ item, index: i })
  })

  function updateRef(key: string, value: any) {
    setEditedRef({ ...editedRef, [key]: value })
  }

  function updateInsight(index: number, patch: any) {
    setEditedInsights({
      ...editedInsights,
      [index]: { ...(editedInsights[index] || insights[index]), ...patch },
    })
  }

  function updateRfi(newRfi: string[]) {
    setEditedRfi(newRfi)
  }

  return (
    <div>
      <SectionHeader
        eyebrow="BRIEF"
        title="OT 브리프"
        desc="광고주 OT에 명시된 사실을 정리했습니다. 잘못된 부분은 우측 상단 편집 모드에서 수정하세요."
      />
      <div>
        {REFERENCE_FIELDS.map(({ key, label, multiline }) => (
          <Field
            key={key}
            label={label}
            value={refData?.[key]}
            editMode={editMode}
            multiline={multiline}
            onChange={(v) => updateRef(key, v)}
          />
        ))}
      </div>

      {insights.length > 0 && (
        <>
          <SectionHeader
            eyebrow="ANALYSIS"
            title="문제 확인 및 가설 도출"
            desc="OT 문서 및 추가 맥락을 읽고 도출한 문제와 가설입니다. 광고주와의 방향성 탭핑을 통해 검증하거나 내부적으로 논의해주세요."
          />
          {Object.entries(grouped).map(
            ([label, items]) =>
              items.length > 0 && (
                <InsightGroup
                  key={label}
                  label={label}
                  items={items}
                  editMode={editMode}
                  onUpdate={updateInsight}
                />
              )
          )}
        </>
      )}

      {(rfi.length > 0 || editMode) && (
        <>
          <SectionHeader
            eyebrow="RFI"
            title="광고주 확인 사항"
            desc="외부 데이터로 알 수 없는 항목들. 광고주 미팅에서 직접 물어볼 질문 리스트입니다."
          />
          <RfiList
            items={rfi}
            editMode={editMode}
            onUpdate={updateRfi}
          />
        </>
      )}
    </div>
  )
}

function normalizeCategory(cat: string): string {
  const c = cat.replace(/\s/g, "")
  if (c.includes("광고주인식") || c.includes("명시") || c.includes("드러난") || c.includes("표면"))
    return "광고주 인식 문제"
  if (c.includes("숨은") || c.includes("이면") || c.includes("드러나지") || c.includes("행간"))
    return "숨은 문제 가설"
  return "시장 시그널"
}

// ─── Tab: 팩트북 (시장 카드) ─────────────────────────────

function FactbookTab({ refData }: { refData: any }) {
  const suggestedKeyword = useMemo(() => {
    if (refData?.competitors?.length) {
      return `${refData.competitors[0]} 시장`
    }
    if (typeof refData?.brand_status === "string") {
      return refData.brand_status.split("\n")[0].split(".")[0].slice(0, 30)
    }
    return ""
  }, [refData])

  const [keyword, setKeyword] = useState(suggestedKeyword)
  const [display, setDisplay] = useState(20)
  const [sort, setSort] = useState<"sim" | "date">("sim")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [marketResult, setMarketResult] = useState<MarketResult | null>(null)

  useEffect(() => {
    if (suggestedKeyword && !keyword) setKeyword(suggestedKeyword)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedKeyword])

  async function runMarket() {
    if (!keyword.trim()) {
      setError("검색 키워드를 입력해주세요.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, display, sort }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = String(data?.error || "시장 조사 실패")
        if (msg.includes("NAVER_CLIENT")) {
          throw new Error(
            "네이버 검색 API 키가 설정되지 않았습니다. Vercel Settings → Environment Variables 에 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 추가해주세요. (https://developers.naver.com 에서 무료 발급)"
          )
        }
        throw new Error(msg)
      }
      setMarketResult(data)
    } catch (e: any) {
      setError(e?.message || "시장 조사 중 오류")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="MARKET"
        title="시장"
        desc="네이버 뉴스 검색 결과를 AI가 요약합니다. 광고주의 카테고리·트렌드 키워드를 입력하세요."
      />

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="예) 어묵 시장 트렌드, F&B 외식 리뉴얼"
          className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none"
        />
        <select
          value={display}
          onChange={(e) => setDisplay(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-xl px-3 py-3 text-gray-900 bg-white focus:border-accent focus:outline-none"
        >
          <option value={10}>10건</option>
          <option value={20}>20건</option>
          <option value={30}>30건</option>
          <option value={50}>50건</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "sim" | "date")}
          className="text-sm border border-gray-200 rounded-xl px-3 py-3 text-gray-900 bg-white focus:border-accent focus:outline-none"
        >
          <option value="sim">정확도순</option>
          <option value="date">최신순</option>
        </select>
      </div>

      <button
        onClick={runMarket}
        disabled={loading || !keyword.trim()}
        className="bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors"
      >
        {loading ? "조사 중..." : "시장 조사 실행"}
      </button>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mt-6 text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}

      {marketResult?.summary_data && (
        <div className="mt-10">
          <div className="pb-8 border-b border-gray-100 mb-6">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-3">
              AI 요약
            </div>
            <p className="text-[17px] text-gray-900 leading-[1.75]">
              {marketResult.summary_data.summary}
            </p>
            {marketResult.summary_data.key_keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-5">
                {marketResult.summary_data.key_keywords.map((k: string, i: number) => (
                  <span
                    key={i}
                    className="inline-block px-3 py-1 bg-gray-50 text-gray-700 rounded-md text-[13px] font-medium"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>

          {marketResult.summary_data.trends?.length > 0 && (
            <>
              <h5 className="text-base font-bold text-gray-900 mb-3">트렌드</h5>
              <div>
                {marketResult.summary_data.trends.map((t: any, i: number) => (
                  <div
                    key={i}
                    className="py-5 border-b border-gray-100 last:border-none"
                  >
                    <p className="text-[16px] font-semibold text-gray-900 leading-[1.55] mb-2">
                      {t.trend}
                    </p>
                    <p className="text-[14.5px] text-gray-600 leading-[1.65] mb-3">
                      {t.implication}
                    </p>
                    {t.source_indices?.length > 0 && (
                      <span className="text-[11px] font-semibold text-gray-400">
                        출처 ·{" "}
                        {t.source_indices
                          .map((idx: number) => `#${String(idx).padStart(2, "0")}`)
                          .join(" · ")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {marketResult?.articles?.length > 0 && (
        <div className="mt-10">
          <h5 className="text-base font-bold text-gray-900 mb-3">
            검색 결과 · {marketResult.articles.length}건
          </h5>
          {marketResult.articles.map((a, i) => (
            <a
              key={i}
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-5 border-b border-gray-100 last:border-none hover:bg-gray-50 -mx-2 px-2 rounded-md transition-colors"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[11px] font-semibold text-gray-400 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-xs text-gray-500 truncate">
                  {a.publisher_link}
                </span>
              </div>
              <div className="text-[15px] font-semibold text-gray-900 leading-[1.5] mb-1">
                {a.title}
              </div>
              <div className="text-[13px] text-gray-500 leading-[1.65]">
                {a.description}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 공통 컴포넌트 ───────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string
  title: string
  desc?: string
}) {
  return (
    <div className="mt-14 mb-6">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-2">
        {eyebrow}
      </div>
      <div className="text-[22px] font-bold text-gray-900 tracking-tight mb-2 leading-tight">
        {title}
      </div>
      {desc && (
        <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">{desc}</p>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  editMode,
  multiline,
  onChange,
}: {
  label: string
  value: any
  editMode: boolean
  multiline?: boolean
  onChange: (v: any) => void
}) {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    value === "-" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" &&
      !Array.isArray(value) &&
      Object.values(value as Record<string, any>).every((v: any) => !v))

  if (editMode) {
    return (
      <div className="grid grid-cols-[180px_1fr] gap-10 py-5 border-b border-gray-100 last:border-none">
        <div className="text-sm font-medium text-gray-500 pt-2">{label}</div>
        <EditableValue
          value={value}
          multiline={multiline}
          onChange={onChange}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[180px_1fr] gap-10 py-5 border-b border-gray-100 last:border-none">
      <div className="text-sm font-medium text-gray-500 pt-0.5">{label}</div>
      <div className="text-base text-gray-900 leading-relaxed">
        {isEmpty ? (
          <span className="text-gray-400 text-[15px]">광고주 확인 필요</span>
        ) : Array.isArray(value) ? (
          <div className="flex flex-wrap gap-1.5">
            {value.map((v: any, i: number) => (
              <span
                key={i}
                className="inline-block px-3 py-1 bg-gray-50 text-gray-700 rounded-md text-sm"
              >
                {String(v)}
              </span>
            ))}
          </div>
        ) : typeof value === "object" ? (
          <div className="space-y-2">
            {Object.entries(value as Record<string, any>).map(([k, v]) => {
              if (!v) return null
              return (
                <div key={k}>
                  <strong className="text-gray-900 font-semibold">{k}</strong>{" "}
                  <span>{String(v)}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{String(value)}</div>
        )}
      </div>
    </div>
  )
}

function EditableValue({
  value,
  multiline,
  onChange,
}: {
  value: any
  multiline?: boolean
  onChange: (v: any) => void
}) {
  // 배열 — 콤마 구분 입력
  if (Array.isArray(value)) {
    return (
      <input
        type="text"
        value={value.join(", ")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s)
          )
        }
        className="w-full text-base border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none"
      />
    )
  }

  // 객체 (예: budget) — 키별 input
  if (typeof value === "object" && value !== null) {
    return (
      <div className="space-y-2">
        {Object.entries(value as Record<string, any>).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-sm text-gray-500 w-20 flex-shrink-0">{k}</span>
            <input
              type="text"
              value={(v as any) || ""}
              onChange={(e) =>
                onChange({ ...(value as object), [k]: e.target.value })
              }
              className="flex-1 text-base border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none"
            />
          </div>
        ))}
      </div>
    )
  }

  // 문자열
  const strValue = value === null || value === undefined ? "" : String(value)
  if (multiline) {
    return (
      <textarea
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full text-base border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none resize-y leading-relaxed"
      />
    )
  }
  return (
    <input
      type="text"
      value={strValue}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-base border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none"
    />
  )
}

function InsightGroup({
  label,
  items,
  editMode,
  onUpdate,
}: {
  label: string
  items: { item: any; index: number }[]
  editMode: boolean
  onUpdate: (index: number, patch: any) => void
}) {
  return (
    <div className="mb-10">
      <div className="flex items-baseline gap-3 pb-3 mb-1 border-b border-gray-200">
        <span className="text-[11px] font-bold text-gray-900 uppercase tracking-[0.12em]">
          {label}
        </span>
        <span className="text-xs text-gray-400 tabular-nums">
          {String(items.length).padStart(2, "0")}
        </span>
      </div>
      {items.map(({ item, index }, i) => (
        <div key={index} className="py-6 border-b border-gray-100 last:border-none">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs font-semibold text-gray-400 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            {editMode ? (
              <select
                value={item.confidence || ""}
                onChange={(e) => onUpdate(index, { confidence: e.target.value })}
                className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
              >
                <option value="🟢 High">High</option>
                <option value="🟡 Medium">Medium</option>
                <option value="🔴 Low">Low</option>
              </select>
            ) : (
              <ConfBadge level={item.confidence} />
            )}
          </div>

          {editMode ? (
            <>
              <textarea
                value={item.summary || ""}
                onChange={(e) => onUpdate(index, { summary: e.target.value })}
                rows={2}
                className="w-full text-[17px] font-medium border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none mb-3 leading-relaxed"
                placeholder="가설 내용"
              />
              <input
                type="text"
                value={item.evidence || ""}
                onChange={(e) => onUpdate(index, { evidence: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none"
                placeholder="근거"
              />
            </>
          ) : (
            <>
              <p className="text-[17px] font-medium text-gray-900 leading-relaxed mb-3">
                {item.summary}
              </p>
              <div className="pl-3 border-l-2 border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed">
                  근거 · {item.evidence}
                </p>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function RfiList({
  items,
  editMode,
  onUpdate,
}: {
  items: string[]
  editMode: boolean
  onUpdate: (items: string[]) => void
}) {
  if (!editMode) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-gray-400">
          광고주에게 추가로 확인할 사항이 도출되지 않았습니다.
        </p>
      )
    }
    return (
      <div>
        {items.map((q, i) => (
          <div
            key={i}
            className="grid grid-cols-[36px_1fr] gap-4 py-4 border-b border-gray-100 last:border-none"
          >
            <div className="text-sm font-semibold text-gray-400 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="text-base text-gray-900 leading-relaxed">{q}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {items.map((q, i) => (
        <div
          key={i}
          className="grid grid-cols-[36px_1fr_auto] gap-3 items-center py-3 border-b border-gray-100 last:border-none"
        >
          <div className="text-sm font-semibold text-gray-400 tabular-nums">
            {String(i + 1).padStart(2, "0")}
          </div>
          <input
            type="text"
            value={q}
            onChange={(e) => {
              const next = [...items]
              next[i] = e.target.value
              onUpdate(next)
            }}
            className="w-full text-base border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none"
          />
          <button
            onClick={() => onUpdate(items.filter((_, j) => j !== i))}
            className="text-gray-400 hover:text-red-500 px-2 py-1 text-sm"
            title="삭제"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={() => onUpdate([...items, ""])}
        className="mt-4 text-sm text-accent hover:text-accent-hover font-semibold"
      >
        + 질문 추가
      </button>
    </div>
  )
}

function ConfBadge({ level }: { level?: string }) {
  if (!level) return null
  const norm = String(level).toLowerCase()
  let cls = "bg-gray-100 text-gray-600"
  let text = level
  if (norm.includes("high") || level.includes("🟢")) {
    cls = "bg-conf-high/10 text-conf-high"
    text = "High"
  } else if (norm.includes("medium") || level.includes("🟡")) {
    cls = "bg-conf-mid/10 text-conf-mid"
    text = "Medium"
  } else if (norm.includes("low") || level.includes("🔴")) {
    cls = "bg-conf-low/10 text-conf-low"
    text = "Low"
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${cls}`}
    >
      {text}
    </span>
  )
}
