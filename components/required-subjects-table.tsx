"use client"

import { useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import type { Subject } from "@/types/curriculum"

interface RequiredSubjectsTableProps {
  tabId: string
  subjects: Subject[]
  scores: Record<string, string>
  onScoreChange: (id: string, value: string) => void
}

export default function RequiredSubjectsTable({ tabId, subjects, scores, onScoreChange }: RequiredSubjectsTableProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const tableRef = useRef<HTMLTableElement | null>(null)

  // 次の入力フィールドにフォーカスを移動する関数
  const focusNextInput = (currentIndex: number) => {
    // 次の必修科目の入力フィールドを探す
    for (let i = currentIndex + 1; i < subjects.length; i++) {
      const nextInputId = `score${tabId}_req_${i}`
      if (inputRefs.current[nextInputId]) {
        inputRefs.current[nextInputId]?.focus()
        return true
      }
    }

    // 必修科目の入力が終わったら、選択科目の最初の入力フィールドを探す
    if (tabId !== "1") {
      const electiveInputs = document.querySelectorAll(`input[id^="elective${tabId}_score_"]:not([disabled])`)
      if (electiveInputs.length > 0) {
        ; (electiveInputs[0] as HTMLInputElement).focus()
        return true
      }
    }

    return false
  }

  return (
    <Table ref={tableRef}>
      <TableHeader>
        <TableRow>
          <TableHead className="">科目名</TableHead>
          <TableHead className="text-center w-30 p-0">単位</TableHead>
          <TableHead className="text-center">評価</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {subjects.map((subject, index) => (
          <TableRow key={`${tabId}_req_${index}`}>
            <TableCell>{subject.Subject}</TableCell>
            <TableCell className="text-center">{subject.Credits}</TableCell>
            <TableCell className="text-center">
              <div className="flex justify-center">
                <Input
                  type="text"
                  inputMode="numeric"
                  id={`score${tabId}_req_${index}`}
                  value={scores[`score${tabId}_req_${index}`] || ""}
                  // required-subjects-table.tsx の変更部分
                  onChange={(e) => {
                    const value = e.target.value;
                    
                    // 10段階評価（1〜10）の範囲チェック
                    const numValue = Number.parseInt(value);
                    if (value !== "" && (isNaN(numValue) || numValue < 1 || numValue > 10)) {
                      return;
                    }
                    
                    onScoreChange(`score${tabId}_req_${index}`, value);

                    // 2-9の数字が入力されたらか10の場合に次のフィールドにフォーカス
                    // 1の場合はフォーカスを移動しない
                    if ((/^[2-9]$/.test(value) || value.trim() === "10") && value !== "1") {
                      focusNextInput(index);
                    } else {
                      // 11以上の場合は右1桁を評価の値とし、次のフィールドにフォーカス
                      const lastChar = value.slice(-1);
                      if (/^[0-9]$/.test(lastChar) && lastChar !== "1") {
                        onScoreChange(`score${tabId}_req_${index}`, lastChar);
                        focusNextInput(index);
                      }
                    }
                  }}
                  ref={(el) => {
                    inputRefs.current[`score${tabId}_req_${index}`] = el
                  }}
                  className="w-10 text-center"
                  autoComplete="off"
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

