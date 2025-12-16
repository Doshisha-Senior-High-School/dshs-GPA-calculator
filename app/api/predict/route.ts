import { NextResponse } from "next/server"

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"

type SubjectPayload = {
    name: string
    credits: number
    term1: number
    term2: number
    trend: "up" | "same" | "down"
}

export const maxDuration = 60; // タイムアウトを60秒に延長

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 })
        }

        const body = await req.json()
        const { targetAvg, subjects, isGoodAtMemorization, isBadAtMemorization, academicType } = body

        if (!targetAvg || !Array.isArray(subjects) || subjects.length === 0) {
            return NextResponse.json({ error: "invalid payload" }, { status: 400 })
        }

        const lines = subjects.map((s: SubjectPayload, i: number) => {
            const trendJp = s.trend === "up" ? "上がりそう" : s.trend === "down" ? "下がりそう" : "現状維持"
            return `- ${s.name} (単位:${s.credits}): 1学期:${s.term1}, 2学期:${s.term2}, 3学期傾向:${trendJp}`
        })

        let aptitudeText = ""
        if (academicType === "science") aptitudeText += "- 生徒は「理系」です。数学・理科などの科目を優先的に伸ばしてください（得意な傾向）。\n"
        if (academicType === "humanities") aptitudeText += "- 生徒は「文系」です。国語・英語・社会などの科目を優先的に伸ばしてください（得意な傾向）。\n"
        if (isGoodAtMemorization) aptitudeText += "- 生徒は「暗記が得意」です。歴史・生物・英語などの暗記要素が強い科目の点数を高めに設定してください。\n"
        if (isBadAtMemorization) aptitudeText += "- 生徒は「暗記が苦手」です。歴史・公共・地理・生物・地学・家庭科・古典・英語などの暗記要素が強い科目は、点数が伸びにくい（現状維持か小幅な上昇、あるいは低下）という前提で算出してください。\n"

        const prompt = `
あなたは学校の成績アドバイザーです。
生徒の目標 加重平均(GPA的なもの) は「${targetAvg}」です (10段階評価)。
学年末評価は (1学期 + 2学期 + 3学期) / 3 の四捨五入 で決まります。
加重平均 = Σ(学年末評価 × 単位数) / Σ(単位数) です。

以下の科目データをもとに、目標の加重平均「${targetAvg}」を達成するための、各科目の「3学期」の評価(1〜10の整数)を提案してください。

生徒の特性:
${aptitudeText}

条件:
1. 3学期の評価は必ず 1〜10 の整数です。
2. 全体の加重平均が ${targetAvg} に極力近くなるようにしてください (達成可能なら達成させる)。
3. 生徒の特性（理系/文系/暗記）に合わせて、得意そうな科目は高めに、苦手そうな科目は現実的なラインで配分してください。
4. 【重要】非現実的な点数上昇は提案しないでください。
   - 例えば、1学期・2学期が「3」なのに、3学期で「9」を取ることは通常不可能です。
   - 上昇幅は現実的な範囲（+1〜+2程度まで）に留めてください。
   - もし現実的な範囲で計算して目標に届かない場合は、無理に届かせようとせず、現実的な「最大努力の結果」を出力してください（ユーザーに目標が高すぎることを気づかせるため）。

出力形式:
以下のJSONフォーマットのみを、改行やスペースを含めない「Minified JSON」で出力してください。Markdownのコードブロックは不要です。
[{"name":"科目名","term3":整数値},...]

科目データ:
${lines.join("\n")}
`

        const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json",
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
            console.error("Gemini API Error (Predict):", text)
            const status = res.status === 429 ? 429 : 502
            return NextResponse.json({ error: "gemini_error", detail: text }, { status })
        }

        const data = await res.json()
        const output = data?.candidates?.[0]?.content?.parts?.[0]?.text

        if (!output) {
            console.error("Empty output (Predict). Full data:", JSON.stringify(data, null, 2))
            return NextResponse.json({ error: "empty_response" }, { status: 502 })
        }

        let parsedResult
        try {
            parsedResult = JSON.parse(output)
        } catch (e) {
            console.error("JSON parse error:", output)
            return NextResponse.json({ error: "json_parse_error", detail: output }, { status: 502 })
        }

        return NextResponse.json({ result: parsedResult })

    } catch (e: any) {
        console.error("Server Error (Predict):", e)
        return NextResponse.json({ error: "server_error", detail: String(e?.message ?? e) }, { status: 500 })
    }
}
