"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import RequiredSubjectsTable from "./required-subjects-table"
import ElectiveSubjectsTable from "./elective-subjects-table"
import CalculateButton from "./calculate-button"
import ResultArea from "./result-area"
import PromotionRulesArea from "./promotion-rules-area"
import type { CurriculumData, Subject, SelectedElectives } from "@/types/curriculum"

// ローカルストレージのキー
const STORAGE_KEYS = {
  ACTIVE_TAB: "weighted-avg-calc-active-tab",
  SELECTED_ELECTIVES: "weighted-avg-calc-selected-electives",
  SCORES: "weighted-avg-calc-scores",
}

export default function WeightedAverageCalculator() {
  const [curriculumData, setCurriculumData] = useState<CurriculumData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState("1")
  const [selectedElectives, setSelectedElectives] = useState<SelectedElectives>({
    "2": {},
    "3": {},
  })
  const [scores, setScores] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ average: number; visible: boolean; promotable: boolean }>({ 
    average: 0, 
    visible: false, 
    promotable: true 
  })
  const [violatedRules, setViolatedRules] = useState<string[]>([])

  const requiredCredits = {
    "2": 6,
    "3": 8,
  }

  const tabs = [
    { id: "1", name: "1年生", key: "1st_Year" },
    { id: "2", name: "2年生", key: "2nd_Year" },
    { id: "3", name: "3年生", key: "3rd_Year" },
  ]

  // データの読み込みとローカルストレージからの復元
  useEffect(() => {
    fetchCurriculumData()

    // ローカルストレージから状態を復元
    const storedTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB)
    if (storedTab && ["1", "2", "3"].includes(storedTab)) {
      setActiveTab(storedTab)
    }

    const storedElectives = localStorage.getItem(STORAGE_KEYS.SELECTED_ELECTIVES)
    if (storedElectives) {
      try {
        setSelectedElectives(JSON.parse(storedElectives))
      } catch (e) {
        console.error("選択科目の復元に失敗しました:", e)
      }
    }

    const storedScores = localStorage.getItem(STORAGE_KEYS.SCORES)
    if (storedScores) {
      try {
        setScores(JSON.parse(storedScores))
      } catch (e) {
        console.error("評価の復元に失敗しました:", e)
      }
    }
  }, [])

  // アクティブタブの変更をローカルストレージに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, activeTab)
  }, [activeTab])

  // 選択科目の変更をローカルストレージに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_ELECTIVES, JSON.stringify(selectedElectives))
  }, [selectedElectives])

  // 評価の変更をローカルストレージに保存
  useEffect(() => {
    // localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores))
  }, [scores])

  const fetchCurriculumData = async () => {
    try {
      const response = await fetch("/curriculum.json")
      if (!response.ok) {
        throw new Error("Network response was not ok")
      }
      const data = await response.json()
      setCurriculumData(data)
      setLoading(false)
    } catch (error) {
      console.error("データの読み込みに失敗しました:", error)
      setLoading(false)
      setError(true)
    }
  }

  const handleScoreChange = (id: string, value: string) => {
    if (!/^[1-9]$|^10$/.test(value) && value !== "") {
      return
    }

    setScores((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleElectiveSelection = (tabId: string, rowIndex: string, subjectIndex: string) => {
    const newSelectedElectives = { ...selectedElectives }

    // Clear previous selection
    if (newSelectedElectives[tabId][rowIndex]) {
      delete newSelectedElectives[tabId][rowIndex]
    }

    if (subjectIndex !== "") {
      const yearKey = tabs.find((tab) => tab.id === tabId)?.key || ""
      const subjects = curriculumData?.Grades[yearKey].Subjects.filter((subject) => !subject.Required) || []
      const subject = subjects[Number.parseInt(subjectIndex)]

      if (subject) {
        newSelectedElectives[tabId][rowIndex] = subject
      }
    }

    setSelectedElectives(newSelectedElectives)
  }

  const calculateGPA = () => {
    if (!curriculumData) return

    let totalWeightedScores = 0
    let totalCredits = 0
    let validScoresCount = 0
    let missingInputs = false

    const tabId = activeTab
    const yearKey = tabs.find((tab) => tab.id === tabId)?.key || ""

    // Required subjects
    const requiredSubjects = curriculumData.Grades[yearKey].Subjects.filter(
      (subject) => tabId === "1" || subject.Required,
    )

    for (let i = 0; i < requiredSubjects.length; i++) {
      const scoreInputId = `score${tabId}_req_${i}`
      const scoreValue = scores[scoreInputId]

      if (!scoreValue) {
        missingInputs = true
        continue
      }

      validScoresCount++
      const credit = requiredSubjects[i].Credits
      const score = Number.parseInt(scoreValue)
      totalWeightedScores += credit * score
      totalCredits += credit
    }

    // Elective subjects (for 2nd and 3rd year)
    if (tabId !== "1") {
      const selectedSubjectsForTab = selectedElectives[tabId]
      const requiredCreditsTotal = requiredCredits[tabId]

      // Check if enough credits are selected
      const selectedCredits = Object.values(selectedSubjectsForTab).reduce(
        (total, subject) => total + subject.Credits,
        0,
      )

      if (selectedCredits < requiredCreditsTotal) {
        alert(`選択科目の単位数が足りません。${requiredCreditsTotal}単位選択してください。`)
        return
      }

      // Get scores for elective subjects
      for (const rowIndex in selectedSubjectsForTab) {
        const scoreInputId = `elective${tabId}_score_${rowIndex}`
        const scoreValue = scores[scoreInputId]

        if (!scoreValue) {
          missingInputs = true
          continue
        }

        validScoresCount++
        const credit = selectedSubjectsForTab[rowIndex].Credits
        const score = Number.parseInt(scoreValue)
        totalWeightedScores += credit * score
        totalCredits += credit
      }
    }

    // Check if all subjects have scores
    if (missingInputs) {
      alert("全ての科目に評価を入力してください。")
      return
    }

    const weightedAverage = totalWeightedScores / totalCredits

    // Check promotion rules
    const rules = checkPromotionRules(tabId)
    setViolatedRules(rules)

    // 進級可能かどうかの判定
    const isPromotable = rules.length === 0

    // Show result
    setResult({
      average: weightedAverage,
      visible: true,
      promotable: isPromotable
    })
  }

  const checkPromotionRules = (tabId: string): string[] => {
    if (!curriculumData) return []

    let score1count = 0 // Rule [イ]
    let lowScoresCount = 0 // Rule [ロ]
    let lowScoresCredits = 0 // Rule [ハ]
    let totalEnteredSubjects = 0
    const violatedRules: string[] = []

    const yearKey = tabs.find((tab) => tab.id === tabId)?.key || ""

    // Check required subjects
    const requiredSubjects = curriculumData.Grades[yearKey].Subjects.filter(
      (subject) => tabId === "1" || subject.Required,
    )

    for (let i = 0; i < requiredSubjects.length; i++) {
      const scoreInputId = `score${tabId}_req_${i}`
      const scoreValue = scores[scoreInputId]

      if (!scoreValue) continue

      totalEnteredSubjects++
      const score = Number.parseInt(scoreValue)
      const credit = requiredSubjects[i].Credits

      if (score === 1) {
        score1count++
      }

      if (score === 2 || score === 3) {
        lowScoresCount++
        lowScoresCredits += credit
      }
    }

    // Check elective subjects (for 2nd and 3rd year)
    if (tabId !== "1") {
      const selectedSubjectsForTab = selectedElectives[tabId]

      for (const rowIndex in selectedSubjectsForTab) {
        const scoreInputId = `elective${tabId}_score_${rowIndex}`
        const scoreValue = scores[scoreInputId]

        if (!scoreValue) continue

        totalEnteredSubjects++
        const score = Number.parseInt(scoreValue)
        const credit = selectedSubjectsForTab[rowIndex].Credits

        if (score === 1) {
          score1count++
        }

        if (score === 2 || score === 3) {
          lowScoresCount++
          lowScoresCredits += credit
        }
      }
    }

    // Skip check if no subjects have scores
    if (totalEnteredSubjects === 0) {
      return violatedRules
    }

    // Rule [イ]: Any subject with score 1
    if (score1count >= 1) {
      violatedRules.push(`進級判定内規[イ]：評価1の科目が1科目以上(${score1count}科目) あります`)
    }

    // Rule [ロ]: More than half of subjects with score 2 or 3
    if (lowScoresCount > totalEnteredSubjects / 2) {
      violatedRules.push(
        `進級判定内規[ロ]：評価2･3の科目が過半数（${lowScoresCount}/${totalEnteredSubjects}科目）あります`,
      )
    }

    // Rule [ハ]: 15 or more credits with score 2 or 3
    if (lowScoresCredits >= 15) {
      violatedRules.push(`進級判定内規[ハ]：評価2･3の科目が15単位以上（${lowScoresCredits}単位）あります`)
    }

    return violatedRules
  }

  const isSubjectSelectable = (tabId: string, subject: Subject): boolean => {
    const selectedSubjectsForTab = selectedElectives[tabId]

    // Skip if already selected
    if (Object.values(selectedSubjectsForTab).some((s) => s.Subject === subject.Subject)) {
      return false
    }

    // Check conflicts
    if (subject.CannotTakeWith) {
      for (const conflictSubject of subject.CannotTakeWith) {
        if (Object.values(selectedSubjectsForTab).some((s) => s.Subject === conflictSubject)) {
          return false
        }
      }
    }

    // 社会の科目数制限チェック
    if (subject.Category === "社会") {
      const socialSubjectsCount = Object.values(selectedSubjectsForTab).filter((s) => s.Category === "社会").length
      if (socialSubjectsCount >= 2) {
        return false
      }
    }

    return true
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#606] mb-4" />
        <p>データを読み込んでいます...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-md mx-auto mt-8">
        <AlertTitle>エラー</AlertTitle>
        <AlertDescription>データの読み込みに失敗しました。ページを再読み込みしてください。</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container px-4 py-6 mx-auto max-w-3xl">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-normal text-[#606] flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 161.7498 140.07944" className="h-8 w-8">
            <g>
              <polygon style={{ fill: "#606" }} points="80.8749 70.03972 121.31235 0 40.43745 0 80.8749 70.03972" />
              <polygon
                style={{ fill: "#606" }}
                points="40.43745 140.07944 80.8749 70.03972 0 70.03972 40.43745 140.07944"
              />
              <polygon
                style={{ fill: "#606" }}
                points="121.31235 140.07944 161.7498 70.03972 80.8749 70.03972 121.31235 140.07944"
              />
            </g>
          </svg>
          加重平均計算機
        </h1>
      </header>

      {curriculumData && (
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-8 border-b bg-[#eee]">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              <div className="space-y-8">
                <div className="shadow-2xl p-4 rounded-xl bg-white">
                  <h3 className="text-xl font-semibold text-[#606] mb-4">必修科目</h3>
                  <RequiredSubjectsTable
                    tabId={tab.id}
                    subjects={curriculumData.Grades[tab.key].Subjects.filter(
                      (subject) => tab.id === "1" || subject.Required,
                    )}
                    scores={scores}
                    onScoreChange={handleScoreChange}
                  />
                </div>

                {tab.id !== "1" && (
                  <div className="shadow-2xl p-4 rounded-xl bg-white">
                    <h3 className="text-xl font-semibold text-[#606] mb-4">
                      選択科目（{requiredCredits[tab.id]}単位選択）
                    </h3>
                    <ElectiveSubjectsTable
                      tabId={tab.id}
                      subjects={curriculumData.Grades[tab.key].Subjects.filter((subject) => !subject.Required)}
                      selectedElectives={selectedElectives[tab.id]}
                      scores={scores}
                      onScoreChange={handleScoreChange}
                      onElectiveSelection={handleElectiveSelection}
                      isSubjectSelectable={isSubjectSelectable}
                      requiredCredits={requiredCredits[tab.id]}
                    />
                  </div>
                )}

                <CalculateButton onClick={calculateGPA} />

                {result.visible && (
                  <>
                    <ResultArea average={result.average} hasViolations={violatedRules.length > 0} promotable={result.promotable} />

                    {violatedRules.length > 0 && <PromotionRulesArea rules={violatedRules} />}
                  </>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
      <footer className="text-center my-4 pt-2 border-t" style={{}}>
        <p className='font-medium' style={{ fontSize: '0.8em' }}>Doshisha Senior High School GPA calculator</p>
        <p className='font-extralight' style={{ fontSize: '0.4em' }}>&copy; 2024-{new Date().getFullYear()} Kanata Tsuda. All rights reserved.</p>
      </footer>
    </div>
  )
}