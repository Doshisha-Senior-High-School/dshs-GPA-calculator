"use client"

import { useState, useEffect, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { Subject } from "@/types/curriculum"

interface ElectiveSubjectsTableProps {
  tabId: string
  subjects: Subject[]
  selectedElectives: Record<string, Subject>
  scores: Record<string, string>
  onScoreChange: (id: string, value: string) => void
  onElectiveSelection: (tabId: string, rowIndex: string, subjectIndex: string) => void
  isSubjectSelectable: (tabId: string, subject: Subject) => boolean
  requiredCredits: number
}

export default function ElectiveSubjectsTable({
  tabId,
  subjects,
  selectedElectives,
  scores,
  onScoreChange,
  onElectiveSelection,
  isSubjectSelectable,
  requiredCredits,
}: ElectiveSubjectsTableProps) {
  const [rows, setRows] = useState<number[]>([0])
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Calculate total selected credits
  const selectedCredits = Object.values(selectedElectives).reduce((total, subject) => total + subject.Credits, 0)

  // Calculate remaining credits needed
  const remainingCredits = requiredCredits - selectedCredits

  // Update rows when selections change
  useEffect(() => {
    // 選択された科目をJSONの順番でソートする
    const selectedSubjects = Object.values(selectedElectives)
    
    // 選択がない場合は少なくとも1行表示
    if (selectedSubjects.length === 0) {
      setRows([0])
      return
    }

    // JSONの順番に基づいて選択された科目をソート
    const sortedSelectedSubjects = selectedSubjects.sort((a, b) => {
      const indexA = subjects.findIndex(s => s.Subject === a.Subject)
      const indexB = subjects.findIndex(s => s.Subject === b.Subject)
      return indexA - indexB
    })

    // ソートされた科目に基づいて行番号を再設定
    const sortedRows = sortedSelectedSubjects.map((_, index) => index)

    if (selectedCredits < requiredCredits) {
      // 必要単位数に達していない場合は、次の行を追加
      const nextRowIndex = sortedRows.length
      setRows([...sortedRows, nextRowIndex])
    } else {
      // 必要単位数に達した場合は、選択された行のみ表示
      setRows(sortedRows)
    }
  }, [selectedElectives, requiredCredits, selectedCredits, subjects])

  // 次の入力フィールドにフォーカスを移動する関数
  const focusNextInput = (currentRowIndex: number) => {
    const currentRows = rows.slice().sort((a, b) => a - b)
    const currentIndex = currentRows.indexOf(currentRowIndex)

    // 次の行があるか確認
    if (currentIndex < currentRows.length - 1) {
      const nextRowIndex = currentRows[currentIndex + 1]
      const nextSelectedSubject = getSelectedSubjectForRow(nextRowIndex)

      // 次の行の入力フィールドが有効な場合、フォーカスを移動
      if (nextSelectedSubject) {
        const nextInputId = `elective${tabId}_score_${nextSelectedSubject.Subject.replace(/\s+/g, '_')}`
        if (inputRefs.current[nextInputId]) {
          inputRefs.current[nextInputId]?.focus()
        }
      }
    } else {
      //ボタンにフォーカス
      const calculateButton = document.querySelector("#calculate-button") as HTMLElement
      if (calculateButton) {
        calculateButton.focus()
      }
    }
  }

  // 科目を削除する関数
  const handleRemoveSubject = (rowIndex: number) => {
    // JSON順序で並んだ科目から実際の科目を取得
    const selectedSubjects = Object.values(selectedElectives)
    const sortedSelectedSubjects = selectedSubjects.sort((a, b) => {
      const indexA = subjects.findIndex(s => s.Subject === a.Subject)
      const indexB = subjects.findIndex(s => s.Subject === b.Subject)
      return indexA - indexB
    })
    
    const subjectToRemove = sortedSelectedSubjects[rowIndex]
    if (subjectToRemove) {
      // 元の selectedElectives から該当する科目を探して削除
      const originalRowIndex = Object.keys(selectedElectives).find(key => 
        selectedElectives[key].Subject === subjectToRemove.Subject
      )
      if (originalRowIndex) {
        onElectiveSelection(tabId, originalRowIndex, "")
      }
    }
  }

  // 現在表示されている行に対応する選択された科目を取得
  const getSelectedSubjectForRow = (rowIndex: number) => {
    const selectedSubjects = Object.values(selectedElectives)
    const sortedSelectedSubjects = selectedSubjects.sort((a, b) => {
      const indexA = subjects.findIndex(s => s.Subject === a.Subject)
      const indexB = subjects.findIndex(s => s.Subject === b.Subject)
      return indexA - indexB
    })
    return sortedSelectedSubjects[rowIndex] || null
  }

  return (
    <div>
      <div className="mb-4 font-medium">
        選択済み: {selectedCredits}/{requiredCredits} 単位
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="">科目名</TableHead>
            <TableHead className="px-0 w-10"></TableHead>
            <TableHead className="text-center w-30 p-0">単位</TableHead>
            <TableHead className="text-center">評価</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((rowIndex) => {
            const selectedSubject = getSelectedSubjectForRow(rowIndex)
            const isSelected = !!selectedSubject

            return (
              <TableRow key={`elective${tabId}_row_${rowIndex}`}>
                <TableCell>
                  {isSelected ? (
                    // 選択済みの場合は科目名を表示
                    <div className="min-h-10 flex items-center border-input rounded-md bg-background break-words">
                      {selectedSubject.Subject}
                    </div>
                  ) : (
                    // 未選択の場合はセレクトボックスを表示
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value === "" || value === "-1") {
                          // 何もしない（未選択の場合）
                        } else {
                          const index = Number.parseInt(value)
                          // インデックスが有効かどうか確認
                          if (!isNaN(index) && index >= 0 && index < subjects.length) {
                            // 新しい行番号を生成（既存の最大行番号+1）
                            const existingRowIndices = Object.keys(selectedElectives).map(k => Number.parseInt(k))
                            const newRowIndex = existingRowIndices.length > 0 ? Math.max(...existingRowIndices) + 1 : 0
                            onElectiveSelection(tabId, newRowIndex.toString(), index.toString())
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">選択してください</SelectItem>
                        {subjects.map((subject, index) => {
                          // 残りの必要単位数を超える科目は選択できないようにする
                          const isSelectable =
                            isSubjectSelectable(tabId, subject) &&
                            subject.Credits <= remainingCredits

                          return (
                            isSelectable && (
                              <SelectItem key={index} value={index.toString()}>
                                {subject.Subject}
                              </SelectItem>
                            )
                          )
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="px-0">
                  {isSelected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSubject(rowIndex)}
                      className="h-8 w-8"
                      aria-label="科目を削除"
                    >
                      <X className="h-4 w-4 text-[#606]" />
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-center">{selectedSubject?.Credits || ""}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    {selectedSubject && (
                      <Input
                        type="text"
                        inputMode="numeric"
                        id={`elective${tabId}_score_${selectedSubject.Subject.replace(/\s+/g, '_')}`}
                        value={scores[`elective${tabId}_score_${selectedSubject.Subject.replace(/\s+/g, '_')}`] || ""}
                        // elective-subjects-table.tsx の変更部分
                        onChange={(e) => {
                          const value = e.target.value;
                          
                          // 10段階評価（1〜10）の範囲チェック
                          const numValue = Number.parseInt(value);
                          if (value !== "" && (isNaN(numValue) || numValue < 1 || numValue > 10)) {
                            return;
                          }
                          
                          onScoreChange(`elective${tabId}_score_${selectedSubject.Subject.replace(/\s+/g, '_')}`, value);

                          // 2-9の数字または10が入力されたら次のフィールドにフォーカス
                          // 1の場合はフォーカスを移動しない
                          if ((/^[2-9]$/.test(value) || value.trim() === "10") && value !== "1") {
                            focusNextInput(rowIndex);
                          } else {
                            // 11以上の場合は右1桁を評価の値とし、次のフィールドにフォーカス
                            const lastChar = value.slice(-1);
                            if (/^[0-9]$/.test(lastChar) && lastChar !== "1") {
                              onScoreChange(`elective${tabId}_score_${selectedSubject.Subject.replace(/\s+/g, '_')}`, lastChar);
                              focusNextInput(rowIndex);
                            }
                          }
                        }}
                        ref={(el) => {
                          inputRefs.current[`elective${tabId}_score_${selectedSubject.Subject.replace(/\s+/g, '_')}`] = el
                        }}
                        className="w-10 text-center"
                        autoComplete="off"
                      />
                    )}
                  </div>
                </TableCell>

              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}