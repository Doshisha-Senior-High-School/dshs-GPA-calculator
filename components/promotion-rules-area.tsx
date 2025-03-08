import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

interface PromotionRulesAreaProps {
  rules: string[]
}

export default function PromotionRulesArea({ rules }: PromotionRulesAreaProps) {
  if (rules.length === 0) return null

  return (
    <Alert variant="destructive">
      <AlertTitle>進級条件を満たしていません</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-5 mt-2">
          {rules.map((rule, index) => (
            <li key={index}>{rule}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

