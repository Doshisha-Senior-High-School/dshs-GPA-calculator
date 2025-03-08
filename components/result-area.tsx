interface ResultAreaProps {
  average: number
  hasViolations: boolean
  promotable: boolean
}

export default function ResultArea({ average, hasViolations, promotable }: ResultAreaProps) {
  let className = "p-4 rounded-md text-center"

  if (hasViolations) {
    className += " bg-red-50 border border-red-200"
  } else if (average >= 4.0) {
    className += " bg-green-50 border border-green-200"
  } else {
    className += " bg-yellow-50 border border-yellow-200"
  }

  return (
    <div>
      <div className={className}>
        <div className="text-lg font-medium">あなたの加重平均は{average.toFixed(2)}です。</div>
        <div className="text-sm text-gray-600 mt-1">※学内推薦の基準は4.00以上です。 {promotable}</div>
      </div>

      {promotable && (
        <div className="p-4 rounded-md text-center bg-blue-50 border border-blue-200 mt-2">
          <div className="text-lg font-medium">進級条件を満たしています。</div>
          <ul className="list-disc pl-5 mt-2 text-left list-none">
              <li>✔︎評価1の科目はありません。</li>
              <li>✔︎評価2･3の科目は半数以下です。</li>
              <li>✔︎評価2･3の科目は14単位以下です。</li>
          </ul>
        </div>
      )}
    </div>
  )
}

