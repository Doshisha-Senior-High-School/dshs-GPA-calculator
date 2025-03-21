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
    // 選択された行の数を確認
    const selectedRows = Object.keys(selectedElectives).map((key) => Number.parseInt(key))

    // 選択がない場合は少なくとも1行表示
    if (selectedRows.length === 0) {
      setRows([0])
      return
    }

    // 最後の選択された行の次の行を追加（必要な単位数に達していない場合）
    const maxSelectedRow = Math.max(...selectedRows)

    if (selectedCredits < requiredCredits) {
      // 既存の行に加えて、最後の選択された行の次の行を表示
      const newRows = Array.from(new Set([...selectedRows, maxSelectedRow + 1])).sort((a, b) => a - b)
      setRows(newRows)
    } else {
      // 必要単位数に達した場合は、選択された行のみ表示
      setRows(selectedRows.sort((a, b) => a - b))
    }
  }, [selectedElectives, requiredCredits, selectedCredits])

  // 次の入力フィールドにフォーカスを移動する関数
  const focusNextInput = (currentRowIndex: number) => {
    const currentRows = rows.slice().sort((a, b) => a - b)
    const currentIndex = currentRows.indexOf(currentRowIndex)

    // 次の行があるか確認
    if (currentIndex < currentRows.length - 1) {
      const nextRowIndex = currentRows[currentIndex + 1]
      const nextInputId = `elective${tabId}_score_${nextRowIndex}`

      // 次の行の入力フィールドが有効な場合、フォーカスを移動
      if (selectedElectives[nextRowIndex] && inputRefs.current[nextInputId]) {
        inputRefs.current[nextInputId]?.focus()
      }
    } else {
      //ボタンにフォーカス
      document.querySelector("#calculate-button")?.focus()
    }
  }

  // 選択肢のずれを修正するために、選択された値を行インデックスではなく科目インデックスに変更
  const getSelectedValue = (rowIndex: number): string => {
    if (!selectedElectives[rowIndex]) return ""

    const selectedSubject = selectedElectives[rowIndex]
    const subjectIndex = subjects.findIndex((s) => s.Subject === selectedSubject.Subject)

    return subjectIndex >= 0 ? subjectIndex.toString() : ""
  }

  // 科目を削除する関数
  const handleRemoveSubject = (rowIndex: number) => {
    onElectiveSelection(tabId, rowIndex.toString(), "")
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
            const isSelected = !!selectedElectives[rowIndex]

            return (
              <TableRow key={`elective${tabId}_row_${rowIndex}`}>
                <TableCell>
                  {isSelected ? (
                    // 選択済みの場合は科目名を表示
                    <div className="min-h-10 flex items-center border-input rounded-md bg-background break-words">
                      {selectedElectives[rowIndex].Subject}
                    </div>
                  ) : (
                    // 未選択の場合はセレクトボックスを表示
                    <Select
                      value={getSelectedValue(rowIndex)}
                      onValueChange={(value) => {
                        if (value === "" || value === "-1") {
                          onElectiveSelection(tabId, rowIndex.toString(), "")
                        } else {
                          const index = Number.parseInt(value)
                          // インデックスが有効かどうか確認
                          if (!isNaN(index) && index >= 0 && index < subjects.length) {
                            onElectiveSelection(tabId, rowIndex.toString(), index.toString())
                          } else {
                            // 無効なインデックスの場合は選択をクリア
                            onElectiveSelection(tabId, rowIndex.toString(), "")
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
                            selectedElectives[rowIndex]?.Subject === subject.Subject ||
                            (isSubjectSelectable(tabId, subject) &&
                              (subject.Credits <= remainingCredits || selectedElectives[rowIndex]))

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
                <TableCell className="text-center">{selectedElectives[rowIndex]?.Credits || ""}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Input
                      type="text"
                      inputMode="numeric"
                      id={`elective${tabId}_score_${rowIndex}`}
                      value={scores[`elective${tabId}_score_${rowIndex}`] || ""}
                      // elective-subjects-table.tsx の変更部分
                      onChange={(e) => {
                        const value = e.target.value;
                        onScoreChange(`elective${tabId}_score_${rowIndex}`, value);

                        // 2-9の数字または10が入力されたら次のフィールドにフォーカス
                        // 1の場合はフォーカスを移動しない
                        if ((/^[2-9]$/.test(value) || value.trim() === "10") && value !== "1") {
                          focusNextInput(rowIndex);
                        } else {
                          // 11以上の場合は右1桁を評価の値とし、次のフィールドにフォーカス
                          const lastChar = value.slice(-1);
                          if (/^[0-9]$/.test(lastChar) && lastChar !== "1") {
                            onScoreChange(`elective${tabId}_score_${rowIndex}`, lastChar);
                            focusNextInput(rowIndex);
                          }
                        }
                      }}
                      ref={(el) => {
                        inputRefs.current[`elective${tabId}_score_${rowIndex}`] = el
                      }}
                      disabled={!selectedElectives[rowIndex]}
                      className="w-10 text-center"
                      autoComplete="off"
                    />
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