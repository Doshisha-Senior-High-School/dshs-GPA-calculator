"use client"

import { Button } from "@/components/ui/button"

interface CalculateButtonProps {
  onClick: () => void
}

export default function CalculateButton({ onClick }: CalculateButtonProps) {
  return (
    <div className="flex justify-center mt-8 mb-8">
      <Button onClick={onClick} className="bg-[#606] hover:bg-[#606]/90 text-white px-8 py-8 rounded-lg text-2xl" id="calculate-button">
        加重平均を計算
      </Button>
    </div>
  )
}

