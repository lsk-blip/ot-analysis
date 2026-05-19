"use client"

import { useMemo, useState } from "react"
import { unmaskData } from "@/lib/masking"

type Classification = { ot_type: string; confidence: string; reasoning: string }

type AnalysisResult = {
  classification: Classification
  interpretation: any
  reference_info: any
  masking_mapping: Record<string, string>
  original_text: string
}

export default function Page() {
  const [otText, setOtText] = useState("")
  const [aeIntel, setAeIntel] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [activeTab, setActiveTab] = useState<"ot" | "brief" | "factbook">("brief")

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
      setActiveTab("brief")
    } catch (e: any) {
      setError(e?.message || "분석 중 오류 발생")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        otText={otText}
        setOtText={setOtText}
        aeIntel={aeIntel}
        setAeIntel={setAeIntel}
        loading={loading}
        onRun={runAnalysis}
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
          <Dashboard result={result} activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
      </main>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────

function Sidebar({
  otText,
  setOtText,
  aeIntel,
  setAeIntel,
  loading,
  onRun,
}: {
  otText: string
  setOtText: (v: string) => void
  aeIntel: string
  setAeIntel: (v: string) => void
  loading: boolean
  onRun: () => void
}) {
  return (
    <aside className="w-[340px] bg-gray-50 border-r border-gray-100 p-6 flex flex-col gap-6 sticky top-0 h-screen overflow-y-auto scrollbar-thin">
      <div>
        <div className="text-[11px] font-bold text-gray-900 uppercase tracking-[0.08em] mb-3">
          광고주 OT 본문
        </div>
        <textarea
          value={otText}
          onChange={(e) => setOtText(e.target.value)}
          placeholder="광고주 OT의 본문을 그대로 붙여넣으세요"
          rows={12}
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
          placeholder="예) 광고주 미팅 회의록&#10;- 사장님 디지털 강조&#10;- 6월 1차 시안 PT 일정"
          rows={6}
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
        좌측에서 광고주 OT 본문을 입력하고 분석 시작을 누르세요.
      </p>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────

function Dashboard({
  result,
  activeTab,
  setActiveTab,
}: {
  result: AnalysisResult
  activeTab: "ot" | "brief" | "factbook"
  setActiveTab: (t: "ot" | "brief" | "factbook") => void
}) {
  const mapping = result.masking_mapping || {}
  const interp = useMemo(
    () => unmaskData(result.interpretation, mapping),
    [result.interpretation, mapping]
  )
  const ref = useMemo(
    () => unmaskData(result.reference_info, mapping),
    [result.reference_info, mapping]
  )

  const ot_type =
    result.classification?.ot_type === "consulting" ? "브랜드 컨설팅" : "IMC 캠페인"
  const campaign = ref?.campaign_name || "광고주 OT"

  return (
    <div>
      <div className="text-sm text-gray-500 font-medium mb-2">{ot_type}</div>
      <h1 className="text-[30px] font-bold text-gray-900 tracking-tight leading-tight mb-12">
        {campaign}
      </h1>

      {/* Tabs */}
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
      {activeTab === "brief" && <BriefTab ref={ref} interp={interp} />}
      {activeTab === "factbook" && <FactbookTab />}
    </div>
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

const REFERENCE_FIELDS: { key: string; label: string }[] = [
  { key: "campaign_name", label: "캠페인명" },
  { key: "task_and_scope", label: "캠페인 과제" },
  { key: "objective", label: "캠페인 목적" },
  { key: "budget", label: "예산" },
  { key: "duration", label: "캠페인 기간" },
  { key: "target", label: "타겟" },
  { key: "competitors", label: "경쟁사" },
  { key: "usp", label: "USP" },
  { key: "what_to_say", label: "What to Say" },
  { key: "creative_media_requirement", label: "Creative · Media" },
  { key: "tone_and_manner", label: "광고 T&M" },
  { key: "brand_status", label: "브랜드 Status" },
  { key: "timeline", label: "캠페인 타임라인" },
]

function BriefTab({ ref, interp }: { ref: any; interp: any }) {
  const insights = (interp?.insights as any[]) || []
  const rfi = (interp?.rfi as string[]) || []

  const grouped: Record<string, any[]> = {
    "광고주 인식 문제": [],
    "숨은 문제 가설": [],
    "시장 시그널": [],
  }
  for (const item of insights) {
    const cat = normalizeCategory(item?.category || "시장 시그널")
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  return (
    <div>
      {/* 1. OT 브리프 */}
      <SectionHeader
        eyebrow="BRIEF"
        title="OT 브리프"
        desc="광고주 OT에 명시된 사실을 정리했습니다."
      />
      <div>
        {REFERENCE_FIELDS.map(({ key, label }) => (
          <Field key={key} label={label} value={ref?.[key]} />
        ))}
        {ref?.competition_pt && typeof ref.competition_pt === "object" && (
          <>
            <Field label="PT 일정" value={ref.competition_pt.pt_schedule} />
            <Field label="PT 제출물" value={ref.competition_pt.deliverables} />
            <Field label="PT 평가" value={ref.competition_pt.evaluation} />
          </>
        )}
      </div>

      {/* 2. 해석 */}
      {insights.length > 0 && (
        <>
          <SectionHeader
            eyebrow="ANALYSIS"
            title="문제 확인 및 가설 도출"
            desc="OT 문서 및 추가 맥락을 읽고 도출한 문제와 가설입니다. 광고주와의 방향성 탭핑을 통해 검증하거나 내부적으로 논의해주세요."
          />
          {Object.entries(grouped).map(
            ([label, items]) =>
              items.length > 0 && <InsightGroup key={label} label={label} items={items} />
          )}
        </>
      )}

      {/* 3. RFI */}
      {rfi.length > 0 && (
        <>
          <SectionHeader
            eyebrow="RFI"
            title="광고주 확인 사항"
            desc="외부 데이터로 알 수 없는 항목들. 광고주 미팅에서 직접 물어볼 질문 리스트입니다."
          />
          <div>
            {rfi.map((q, i) => (
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

function Field({ label, value }: { label: string; value: any }) {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    value === "-" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" &&
      !Array.isArray(value) &&
      Object.values(value).every((v) => !v))

  return (
    <div className="grid grid-cols-[180px_1fr] gap-10 py-5 border-b border-gray-100 last:border-none">
      <div className="text-sm font-medium text-gray-500 pt-0.5">{label}</div>
      <div className="text-base text-gray-900 leading-relaxed">
        {isEmpty ? (
          <span className="text-gray-400 text-[15px]">광고주 확인 필요</span>
        ) : Array.isArray(value) ? (
          <div className="flex flex-wrap gap-1.5">
            {value.map((v, i) => (
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
            {Object.entries(value).map(
              ([k, v]) =>
                v && (
                  <div key={k}>
                    <strong className="text-gray-900 font-semibold">{k}</strong>{" "}
                    <span>{String(v)}</span>
                  </div>
                )
            )}
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{String(value)}</div>
        )}
      </div>
    </div>
  )
}

function InsightGroup({ label, items }: { label: string; items: any[] }) {
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
      {items.map((item, i) => (
        <div key={i} className="py-6 border-b border-gray-100 last:border-none">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs font-semibold text-gray-400 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <ConfBadge level={item.confidence} />
          </div>
          <p className="text-[17px] font-medium text-gray-900 leading-relaxed mb-3">
            {item.summary}
          </p>
          <div className="pl-3 border-l-2 border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed">
              근거 · {item.evidence}
            </p>
          </div>
        </div>
      ))}
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

// ─── Tab: 팩트북 (Phase 2 placeholder) ───────────────────

function FactbookTab() {
  return (
    <div className="text-center py-24">
      <div className="text-3xl mb-4 opacity-40">📊</div>
      <div className="text-lg font-bold text-gray-900 mb-2">
        팩트북은 다음 단계에서 추가됩니다
      </div>
      <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
        자사 · 경쟁사 · 시장 · 고객 4C 데이터를 자동 수집하고 시각화합니다.
      </p>
    </div>
  )
}
