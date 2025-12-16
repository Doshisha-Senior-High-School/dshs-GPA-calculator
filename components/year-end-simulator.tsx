"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Calculator, RefreshCw, Minus, Plus, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import PromotionRulesArea from "./promotion-rules-area"
import type { Subject } from "@/types/curriculum"

type SubjectScore = {
  subject: Subject
  term1: string
  term2: string
  term3Trend: "up" | "same" | "down"
  term3Plan?: number // AI or Manual Plan
  term3Required?: number // Calculated Requirement (Legacy)
  yearEndPredicted?: number
}

type SimulationResult = {
  achievable: boolean
  targetWeightedAvg: number
  predictedWeightedAvg: number
  term1WeightedAvg: number
  term2WeightedAvg: number
  subjectResults: SubjectScore[]
  warnings: string[]
  recommendations: string[]
  violatedRules: string[]
  hasGrade1: boolean
  hasExcessiveLowGrades: boolean
}

type YearEndSimulatorProps = {
  subjects: Subject[]
  tabId: string
  insufficientCredits?: boolean
}

// 丸囲み数字への変換ヘルパー
const toCircled = (num: number): string => {
  if (num >= 1 && num <= 20) {
    return String.fromCharCode(0x2460 + num - 1)
  }
  return num.toString()
}

export default function YearEndSimulator({ subjects, tabId, insufficientCredits = false }: YearEndSimulatorProps) {
  const [targetAvg, setTargetAvg] = useState<string>("")
  const [subjectScores, setSubjectScores] = useState<Record<string, SubjectScore>>({})
  const [result, setResult] = useState<SimulationResult | null>(null)

  // モード管理: true = 計算後(調整モード), false = 入力モード
  const [isCalculated, setIsCalculated] = useState(false)
  const [isResultVisible, setIsResultVisible] = useState(true)

  const [isLoading, setIsLoading] = useState(false)

  // Aptitude Settings
  const [isGoodAtMemorization, setIsGoodAtMemorization] = useState(false)
  const [isBadAtMemorization, setIsBadAtMemorization] = useState(false)
  const [academicType, setAcademicType] = useState<"science" | "humanities" | "general" | undefined>(undefined)

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const resultRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for Sticky Footer
  useEffect(() => {
    if (!resultRef.current || !isCalculated) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsResultVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    observer.observe(resultRef.current)

    return () => {
      observer.disconnect()
    }
  }, [isCalculated, result])

  // 初期化 & データ読み込み
  useEffect(() => {
    // Subjectsから初期スコアオブジェクトを生成
    const initialScores: Record<string, SubjectScore> = {}
    subjects.forEach((subject) => {
      const key = `${subject.Subject}_${subject.Credits}`
      initialScores[key] = {
        subject,
        term1: "",
        term2: "",
        term3Trend: "same",
      }
    })

    // Load from localStorage (tabIdごとにキーを分ける)
    const storageKey = `dshs_simulator_scores_${tabId}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Merge saved data
        Object.keys(parsed).forEach((k) => {
          if (initialScores[k]) {
            // subjectオブジェクト自体は最新のpropsから維持し、入力値だけマージ
            initialScores[k] = { ...initialScores[k], ...parsed[k], subject: initialScores[k].subject }
          }
        })
      } catch (e) {
        console.error("Failed to load saved scores", e)
      }
    }
    setSubjectScores(initialScores)

    // Reset result when tab/subjects change
    setResult(null)
    setIsCalculated(false)
  }, [subjects, tabId])

  // Save to localStorage on change
  useEffect(() => {
    if (Object.keys(subjectScores).length > 0) {
      const storageKey = `dshs_simulator_scores_${tabId}`
      localStorage.setItem(storageKey, JSON.stringify(subjectScores))
    }
  }, [subjectScores, tabId])

  const handleScoreChange = (key: string, field: "term1" | "term2", value: string) => {
    // 10段階評価(1〜10)の範囲チェック
    const numValue = Number.parseInt(value)
    if (value !== "" && (isNaN(numValue) || numValue < 1 || numValue > 10)) {
      return
    }
    setSubjectScores((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }))
  }

  const focusNextInput = (currentKey: string, currentField: "term1" | "term2") => {
    const keys = Object.keys(subjectScores)
    const currentIndex = keys.indexOf(currentKey)

    if (currentField === "term1") {
      // 1学期入力中: 次の科目の1学期へ
      if (currentIndex < keys.length - 1) {
        const nextKey = keys[currentIndex + 1]
        const nextInputId = `${nextKey}_term1`
        if (inputRefs.current[nextInputId]) {
          inputRefs.current[nextInputId]?.focus()
          return
        }
      } else {
        // 1学期がすべて入力されたら2学期の最初にフォーカス
        const firstKey = keys[0]
        const firstTerm2Id = `${firstKey}_term2`
        if (inputRefs.current[firstTerm2Id]) {
          inputRefs.current[firstTerm2Id]?.focus()
        }
      }
    } else {
      // 2学期入力中: 次の科目の2学期へ
      if (currentIndex < keys.length - 1) {
        const nextKey = keys[currentIndex + 1]
        const nextInputId = `${nextKey}_term2`
        if (inputRefs.current[nextInputId]) {
          inputRefs.current[nextInputId]?.focus()
          return
        }
      }
    }
  }

  const handleTrendChange = (key: string, trend: "up" | "same" | "down") => {
    setSubjectScores((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        term3Trend: trend,
      },
    }))
  }

  // 3学期の調整 (Stepper)
  const handleAdjustment = (key: string, delta: number) => {
    setSubjectScores((prev) => {
      const current = prev[key]
      // FIXED: Added parentheses for precedence
      const currentTerm3 = current.term3Plan ?? (Number.parseInt(current.term2) || 0)

      let newTerm3 = currentTerm3 + delta
      newTerm3 = Math.max(1, Math.min(10, newTerm3)) // Clamp 1-10

      const newScores = {
        ...prev,
        [key]: {
          ...current,
          term3Plan: newTerm3
        }
      }

      // 状態更新後、即座に再計算を実行
      runSimulation(newScores)

      return newScores
    })
  }


  // 学年末評価の計算（1, 2, 3学期の平均を四捨五入）
  const calculateYearEndScore = (term1: number, term2: number, term3: number): number => {
    return Math.round((term1 + term2 + term3) / 3)
  }

  // シミュレーション実行 (計算ロジック)
  const runSimulation = (scoresOverride?: Record<string, SubjectScore>) => {
    const scoresToUse = scoresOverride || subjectScores
    const target = Number.parseFloat(targetAvg)

    // 入力チェックなどは呼び出し元でやるか、あるいはここでもやるが
    // 調整フェーズでは既にチェック済み前提

    const warnings: string[] = []
    const recommendations: string[] = []
    const updatedScores: Record<string, SubjectScore> = {}

    let totalCredits = 0
    subjects.forEach((subject) => {
      totalCredits += subject.Credits
    })

    let predictedWeightedSum = 0
    let term1WeightedSum = 0
    let term2WeightedSum = 0

    Object.entries(scoresToUse).forEach(([key, score]) => {
      const term1 = Number.parseInt(score.term1) || 0
      const term2 = Number.parseInt(score.term2) || 0
      const term3 = score.term3Plan || 0 // Use the Plan (AI or Manual Adjusted)

      const yearEndPredicted = calculateYearEndScore(term1, term2, term3)

      updatedScores[key] = {
        ...score,
        yearEndPredicted,
      }

      const credits = score.subject.Credits
      predictedWeightedSum += yearEndPredicted * credits
      term1WeightedSum += term1 * credits
      term2WeightedSum += term2 * credits
    })


    // Promotion Check Logic (adapted from weighted-average-calculator)
    const checkPromotionRules = (scores: Record<string, SubjectScore>): { violatedRules: string[], hasGrade1: boolean, hasExcessiveLowGrades: boolean } => {
      const violatedRules: string[] = []
      let score1count = 0
      let lowScoresCount = 0 // 2 or 3
      let lowScoresCredits = 0

      const scoreValues = Object.values(scores)
      const totalSubjects = scoreValues.length

      if (totalSubjects === 0) return { violatedRules, hasGrade1: false, hasExcessiveLowGrades: false }

      scoreValues.forEach(s => {
        const score = s.yearEndPredicted || 0
        const credit = s.subject.Credits

        if (score === 1) {
          score1count++
        }
        if (score === 2 || score === 3) {
          lowScoresCount++
          lowScoresCredits += credit
        }
      })

      let hasGrade1 = false
      let hasExcessiveLowGrades = false

      // Rule [イ]: Any subject with score 1
      if (score1count >= 1) {
        violatedRules.push(`進級判定内規[イ]：評価1の科目が1科目以上(${score1count}科目) あります`)
        hasGrade1 = true
      }

      // Rule [ロ]: More than half of subjects with score 2 or 3
      if (lowScoresCount > totalSubjects / 2) {
        violatedRules.push(
          `進級判定内規[ロ]：評価2･3の科目が過半数（${lowScoresCount}/${totalSubjects}科目）あります`,
        )
        hasExcessiveLowGrades = true
      }

      // Rule [ハ]: 15 or more credits with score 2 or 3
      if (lowScoresCredits >= 15) {
        violatedRules.push(`進級判定内規[ハ]：評価2･3の科目が15単位以上（${lowScoresCredits}単位）あります`)
        hasExcessiveLowGrades = true
      }

      return { violatedRules, hasGrade1, hasExcessiveLowGrades }
    }

    const predictedWeightedAvg = totalCredits > 0 ? predictedWeightedSum / totalCredits : 0
    const term1WeightedAvg = totalCredits > 0 ? term1WeightedSum / totalCredits : 0
    const term2WeightedAvg = totalCredits > 0 ? term2WeightedSum / totalCredits : 0

    // Check Promotion Rules based on updated scores
    const { violatedRules: promotionViolations, hasGrade1, hasExcessiveLowGrades } = checkPromotionRules(updatedScores)

    // 目標以上であれば達成とみなす（誤差0.05を許容）
    const achievable = target ? predictedWeightedAvg >= target - 0.05 : true

    if (target && !achievable) {
      // warnings.push(`目標加重平均${target}の達成は困難です。予測値: ${predictedWeightedAvg.toFixed(2)}`)
    }

    setResult({
      achievable,
      targetWeightedAvg: target || 0,
      predictedWeightedAvg,
      term1WeightedAvg,
      term2WeightedAvg,
      subjectResults: Object.values(updatedScores),
      warnings,
      recommendations,
      violatedRules: promotionViolations,
      hasGrade1,
      hasExcessiveLowGrades
    })
    setIsCalculated(true) // 計算完了モードへ
  }

  const resetSimulation = () => {
    setResult(null)
    setIsCalculated(false)
    // 入力値は残すが、計算結果モードは解除
  }

  // AI予測ハンドラ
  const handleAIPredict = async () => {
    const target = Number.parseFloat(targetAvg)
    if (isNaN(target) || target < 1 || target > 10) {
      alert("目標加重平均は1〜10の範囲で入力してください")
      return
    }

    const missing: string[] = []
    Object.entries(subjectScores).forEach(([key, score]) => {
      if (!score.term1 || !score.term2) missing.push(score.subject.Subject)
    })
    if (missing.length > 0) {
      alert(`以下の科目の1学期・2学期評価を入力してください:\n${missing.join(", ")}`)
      return
    }

    setIsLoading(true)

    const payload = {
      targetAvg: target,
      subjects: Object.values(subjectScores).map((s) => ({
        name: s.subject.Subject,
        credits: s.subject.Credits,
        term1: Number.parseInt(s.term1),
        term2: Number.parseInt(s.term2),
        trend: s.term3Trend,
      })),
      isGoodAtMemorization,
      isBadAtMemorization,
      academicType,
    }

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        // AI失敗時 (フォールバックロジック)
        throw new Error(`API Error: ${res.status}`)
      }

      const data = await res.json()
      const results = data.result

      const newScores = { ...subjectScores }

      // AI結果反映
      results.forEach((r: any) => {
        const matchedKey = Object.keys(newScores).find(k => newScores[k].subject.Subject === r.name)
        if (matchedKey) {
          newScores[matchedKey] = {
            ...newScores[matchedKey],
            term3Plan: r.term3
          }
        }
      })

      setSubjectScores(newScores)
      runSimulation(newScores)

    } catch (e: any) {
      console.error("AI Error, using fallback:", e)

      // フォールバックロジック
      const newScores = { ...subjectScores }
      Object.keys(newScores).forEach(key => {
        const s = newScores[key]
        const t2 = Number.parseInt(s.term2) || 0
        let fallbackTerm3 = t2

        // 傾向に基づいて補正
        if (s.term3Trend === "up") fallbackTerm3 = Math.min(10, t2 + 1)
        else if (s.term3Trend === "down") fallbackTerm3 = Math.max(1, t2 - 1)

        newScores[key] = {
          ...s,
          term3Plan: fallbackTerm3
        }
      })

      setSubjectScores(newScores)
      runSimulation(newScores)

      // エラーメッセージ（ユーザーには通知しつつ続行）
      const isRateLimit = e.message?.includes("429") || e.message?.includes("503")
      if (isRateLimit) {
        alert("⚠️ AIアクセス集中により、簡易ロジック（傾向ベース）で計算しました。\n「調整」ボタンで微修正してください。")
      } else {
        // 静かに簡易ロジックへ移行
      }

    } finally {
      setIsLoading(false)
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>学年末評価シミュレーター<br />(試験運用中)</CardTitle>
        <CardDescription>
          12/15〜3/20のみ使用可能。学年末の加重平均目標に向けた3学期の必要値を算出します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <style jsx global>{`
          @keyframes fast-blink {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
          }
          .animate-fast-blink {
            animation: fast-blink 0.5s linear infinite;
          }
        `}</style>
        <div className="grid gap-6 relative">
          {insufficientCredits && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg border-2 border-indigo-100">
              <div className="text-center p-6 bg-white rounded-xl shadow-xl border border-indigo-200 max-w-sm mx-4">
                <AlertCircle className="h-12 w-12 text-indigo-500 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">選択科目が足りません</h3>
                <p className="text-gray-600 mb-4 text-sm">
                  上の「選択科目」表で、必要な単位数分の科目を選択してからシミュレーターを利用してください。
                </p>
                <Button
                  onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })}
                  variant="outline"
                  className="w-full"
                >
                  上の表を確認する
                </Button>
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="targetAvg">目標加重平均 (1〜10)</Label>
            <Input
              id="targetAvg"
              type="number"
              min={1}
              max={10}
              step={0.1}
              value={targetAvg}
              onChange={(e) => setTargetAvg(e.target.value)}
              placeholder="例: 7.5"
              className="mt-2 max-w-[200px]"
              disabled={isCalculated} // 計算後は変更不可にするならtrue
            />
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3">
              {isCalculated ? "シミュレーション結果" : "成績入力 & 傾向設定"}
            </h3>



            <div className="border rounded-lg overflow-x-auto w-full max-w-[85vw] md:max-w-full mx-auto">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 bg-white w-24 min-w-[6rem]">科目</TableHead>
                    <TableHead className="text-center w-12 min-w-[3rem]">単位</TableHead>
                    <TableHead className="text-center w-14 min-w-[3.5rem]">1学期</TableHead>
                    <TableHead className="text-center w-14 min-w-[3.5rem]">2学期</TableHead>
                    {isCalculated ? (
                      <>
                        <TableHead className="text-center w-28 min-w-[7rem]">3学期(調整)</TableHead>
                        <TableHead className="text-center w-16 min-w-[4rem]">学年末</TableHead>
                      </>
                    ) : (
                      <TableHead className="text-center w-32 min-w-[8rem]">3学期予想</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(subjectScores).map(([key, score]) => {
                    const term1 = Number.parseInt(score.term1) || 0
                    const term2 = Number.parseInt(score.term2) || 0
                    const term3 = score.term3Plan || 0
                    // Calculate on fly for display consistency
                    const yearEnd = calculateYearEndScore(term1, term2, term3)

                    // Blinking Logic
                    let isBlinking = false
                    if (isCalculated && result) {
                      if (yearEnd === 1 && result.hasGrade1) isBlinking = true
                      if ((yearEnd === 2 || yearEnd === 3) && result.hasExcessiveLowGrades) isBlinking = true
                    }

                    return (
                      <TableRow key={key}>
                        <TableCell className="sticky left-0 z-20 bg-white font-medium text-xs break-words leading-tight shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          {score.subject.Subject}
                        </TableCell>
                        <TableCell className="text-center text-base text-gray-400">{toCircled(score.subject.Credits)}</TableCell>
                        <TableCell className="text-center p-1">
                          {isCalculated ? (
                            <span className="text-lg font-medium text-gray-700">{score.term1}</span>
                          ) : (
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={score.term1}
                              onChange={(e) => {
                                handleScoreChange(key, "term1", e.target.value)
                                if (e.target.value.length >= 1 && e.target.value !== "1") focusNextInput(key, "term1")
                              }}
                              ref={(el) => { inputRefs.current[`${key}_term1`] = el }}
                              className="w-12 h-9 text-center mx-auto px-1"
                              disabled={isCalculated}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center p-1">
                          {isCalculated ? (
                            <span className="text-lg font-medium text-gray-700">{score.term2}</span>
                          ) : (
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={score.term2}
                              onChange={(e) => {
                                handleScoreChange(key, "term2", e.target.value)
                                if (e.target.value.length >= 1 && e.target.value !== "1") focusNextInput(key, "term2")
                              }}
                              ref={(el) => { inputRefs.current[`${key}_term2`] = el }}
                              className="w-12 h-9 text-center mx-auto px-1"
                              disabled={isCalculated}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isCalculated ? (
                            <div className="flex items-center justify-center gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleAdjustment(key, -1)}>
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className={`font-bold text-lg w-8 text-center ${term3 <= 3 ? "text-red-500" : ""}`}>{term3}</span>
                              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleAdjustment(key, 1)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-center">
                              <Button
                                type="button"
                                variant={score.term3Trend === "down" ? "default" : "outline"}
                                size="sm"
                                className={`w-8 h-8 p-0 ${score.term3Trend === "down"
                                  ? "bg-red-500 hover:bg-red-600 text-white"
                                  : "hover:bg-red-50"
                                  }`}
                                onClick={() => handleTrendChange(key, "down")}
                              >
                                ↘︎
                              </Button>
                              <Button
                                type="button"
                                variant={score.term3Trend === "same" ? "default" : "outline"}
                                size="sm"
                                className={`w-8 h-8 p-0 ${score.term3Trend === "same"
                                  ? "bg-gray-500 hover:bg-gray-600 text-white"
                                  : "hover:bg-gray-100"
                                  }`}
                                onClick={() => handleTrendChange(key, "same")}
                              >
                                →
                              </Button>
                              <Button
                                type="button"
                                variant={score.term3Trend === "up" ? "default" : "outline"}
                                size="sm"
                                className={`w-8 h-8 p-0 ${score.term3Trend === "up"
                                  ? "bg-green-500 hover:bg-green-600 text-white"
                                  : "hover:bg-green-50"
                                  }`}
                                onClick={() => handleTrendChange(key, "up")}
                              >
                                ↗︎
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {isCalculated && (
                          <TableCell className={`text-center font-bold ${yearEnd <= 3 ? "text-red-600" : ""} ${isBlinking ? "animate-fast-blink" : ""}`}>
                            {yearEnd}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-gray-500 mt-2">
              {isCalculated
                ? "「＋」「ー」ボタンで3学期の点数を調整すると、学年末評価が再計算されます。"
                : ""}
            </p>
          </div>

          {!isCalculated && (
            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
              <div>
                <Label className="text-base mb-3 block">暗記は？</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => {
                      const newVal = !isGoodAtMemorization
                      setIsGoodAtMemorization(newVal)
                      if (newVal) setIsBadAtMemorization(false)
                    }}
                    className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${isGoodAtMemorization
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200 font-bold"
                      : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    得意
                  </div>
                  <div
                    onClick={() => {
                      const newVal = !isBadAtMemorization
                      setIsBadAtMemorization(newVal)
                      if (newVal) setIsGoodAtMemorization(false)
                    }}
                    className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${isBadAtMemorization
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200 font-bold"
                      : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    苦手
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-base mb-3 block">文理選択</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "science", label: "理系" },
                    { value: "humanities", label: "文系" },
                    { value: "general", label: "不定" },
                  ].map((type) => (
                    <div
                      key={type.value}
                      onClick={() => setAcademicType(type.value as any)}
                      className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${academicType === type.value
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200 font-bold"
                        : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                      {type.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 w-full max-w-[85vw] md:max-w-full mx-auto">
            {isCalculated ? (
              <Button onClick={resetSimulation} className="w-full" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                目標･傾向を再入力
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={handleAIPredict}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg font-semibold shadow-md transition-all hover:scale-[1.02]"
                  disabled={isLoading}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {isLoading ? "AI計算中..." : "AIで目標算出"}
                </Button>
                <div className="text-[10px] text-gray-400 eading-tight">
                  <p>※ AIによる計算には約30秒かかります。<br />　 Geminiの利用規約とプライバシーポリシーが適用されます。</p>
                </div>
              </div>
            )}
          </div>

          {isCalculated && result && (
            <div ref={resultRef} className="space-y-4 mt-6 p-6 border rounded-xl bg-blue-50/50 shadow-sm">
              <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                現在の加重平均
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-gray-500 text-xs mb-1">1学期</p>
                  <p className="font-bold text-xl">{result.term1WeightedAvg.toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-gray-500 text-xs mb-1">2学期</p>
                  <p className="font-bold text-xl">{result.term2WeightedAvg.toFixed(2)}</p>
                </div>
                <div className={`p-3 rounded-lg shadow-sm border-2 ${result.achievable ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <p className="text-gray-500 text-xs mb-1">学年末予測</p>
                  <p className={`font-bold text-xl ${result.achievable ? "text-green-600" : "text-red-600"}`}>
                    {result.predictedWeightedAvg.toFixed(2)}
                  </p>
                </div>
              </div>

              {result.targetWeightedAvg > 0 && (
                <div className="flex justify-center items-center gap-3 mt-2 bg-white/60 p-2 rounded-full">
                  <span className="text-sm font-medium">目標: {result.targetWeightedAvg.toFixed(2)}</span>
                  {result.achievable ? (
                    <Badge className="bg-green-500 hover:bg-green-600">達成可能</Badge>
                  ) : (
                    <Badge variant="destructive">要調整</Badge>
                  )}
                </div>
              )}

              {/* Promotion Check Display */}
              {result.violatedRules && result.violatedRules.length > 0 && (
                <PromotionRulesArea rules={result.violatedRules} />
              )}

              {result.warnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {result.warnings.map((w, i) => <div key={i}>{w}</div>)}
                  </AlertDescription>
                </Alert>
              )}

              {!result.warnings.length && !result.achievable && (
                <p className="text-sm text-center text-red-600 font-medium">
                  目標達成にはもう少し点数が必要です。「＋」ボタンで調整してみましょう。
                </p>
              )}

              <p className="text-xs text-gray-500">
                ※学年末評価は、1,2,3学期成績の平均を四捨五入として算出しています。
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Sticky Footer for Result */}
      {isCalculated && result && !isResultVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-white/95 backdrop-blur-md shadow-2xl border border-gray-200 rounded-full px-5 py-3 flex items-center justify-between z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-gray-500 leading-none">目標</div>
            <div className="font-bold text-base">{result.targetWeightedAvg.toFixed(2)}</div>
          </div>

          <div className="h-5 w-px bg-gray-200 mx-1"></div>

          <div className="flex items-center gap-2">
            <div className="text-[10px] text-gray-500 leading-none">学年末</div>
            <div className={`text-base font-bold ${result.achievable ? "text-green-600" : "text-red-600"}`}>
              {result.predictedWeightedAvg.toFixed(2)}
            </div>
          </div>

          <div className="h-5 w-px bg-gray-200 mx-1"></div>

          <div className="flex items-center gap-2">
            <div className="text-[10px] text-gray-500 leading-none">進級</div>
            {(!result.violatedRules || result.violatedRules.length === 0) ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
