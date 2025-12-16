import { NextResponse } from "next/server"

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"

type SubjectPayload = {
  name: string
  credits: number
  term1: number
  term2: number
  term3Required: number
  term3Plan?: number
  trend: "up" | "same" | "down"
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 })
    }

    const body = await req.json()
    const subjects: SubjectPayload[] = body?.subjects ?? []
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 })
    }

    // 短文で生成し無料枠節約（まとめて1回の生成）
    const lines = subjects.map((s, i) => {
      const trendJp = s.trend === "up" ? "上がりそう" : s.trend === "down" ? "下がりそう" : "そのまま"
      return `${i + 1}. ${s.name}(単位${s.credits}): 1学期${s.term1},2学期${s.term2},必要3学期${s.term3Required}${s.term3Plan ? `,予定${s.term3Plan}` : ""},傾向${trendJp}`
    })
    const prompt =
      `以下の科目ごとに、50〜80文字程度の具体的な学習アドバイスを日本語で短文で出力してください。` +
      `危険・不適切な表現は禁止。番号に対応する各行のみ出力（余計な説明は不要）。\n` +
      lines.join("\n")

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: Math.max(2000, subjects.length * 500),
        },
        safetySettings: [
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        ],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("Gemini API Error:", text)
      return NextResponse.json({ error: "gemini_error", detail: text }, { status: 502 })
    }

    const data = await res.json()
    const output = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
    if (!output) {
      console.error("Empty output. Full data:", JSON.stringify(data, null, 2))
      return NextResponse.json({ error: "empty_response" }, { status: 502 })
    }

    // 行ごとに分割して対応
    const advices = output
      .split(/\n+/)
      .map((line: string) => line.replace(/^\d+\.\s*/, "").trim())
      .filter((x: string) => x.length > 0)

    return NextResponse.json({ advices })
  } catch (e: any) {
    return NextResponse.json({ error: "server_error", detail: String(e?.message ?? e) }, { status: 500 })
  }
}