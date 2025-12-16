"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Users, GraduationCap, Info } from "lucide-react"

export default function DisclaimerDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // アクセスされるたびに毎回表示
    setOpen(true)
  }, [])

  const handleAccept = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={() => { }}>
      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            加重平均計算機について
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            ご利用前に以下の内容をご確認ください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Users className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-gray-700">
              <strong>運営元について</strong><br />
              この加重平均計算機は、2025年度の同志社高校2年生のみで運営しています。
              同志社高校の公式アプリではありません。
            </AlertDescription>
          </Alert>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-gray-700">
              <strong>進級と進学の関連性</strong><br />
              進級･卒業できても進学できるとは限りません。詳しくは「進学のしおり」をご確認ください。
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-gray-700">
              <strong>プライバシーについて</strong><br />
              入力データは端末の中だけで処理され、外部には送信されません。（※AI目標算出時を除く）
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
          >
            同意して続行
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}