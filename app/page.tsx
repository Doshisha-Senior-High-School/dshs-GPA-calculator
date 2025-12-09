import WeightedAverageCalculator from "@/components/weighted-average-calculator"
import Footer from "@/components/footer"
import DisclaimerDialog from "@/components/disclaimer-dialog"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F9F9F9] select-none">
      <DisclaimerDialog />
      <WeightedAverageCalculator />
    </main>
  )
}

