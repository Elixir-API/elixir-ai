import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { userRequest, completedSteps } = await req.json()

    const stepList = completedSteps
      ?.filter((s: { type: string }) => s.type !== "test")
      .map((s: { type: string; location: string; description: string }) =>
        `- ${s.type}: ${s.location ?? s.description}`
      )
      .join("\n") ?? ""

    const prompt = `The user asked: "${userRequest}"
These steps were completed:
${stepList}

Write a short 2-3 line summary of what was built. Use bullet points with 🟢 for created, 🟡 for modified. Keep it brief.`

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Elixir AI",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        stream: false,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content ?? ""
    return NextResponse.json({ summary })
  } catch (e) {
    console.error("[Elixir] Summary error:", e)
    return NextResponse.json({ summary: "" })
  }
}