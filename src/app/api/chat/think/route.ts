import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

const THINK_SYSTEM = `You are the private inner monologue of an expert Roblox developer — thinking before writing code.

Think out loud in 8-14 short lines. Genuine, developer-authentic stream of consciousness.

Rules:
- Short punchy lines. No bullets. No markdown. No code.
- Reason through it: which service, script type, Roblox APIs, architecture decisions.
- Question yourself mid-thought: "Wait...", "Actually...", "No —", "Hmm...", "Let me think..."
- Catch edge cases: debouncing, nil checks, DataStore failure, RemoteEvent security, server vs client.
- Self-correct if you spot a mistake mid-reasoning.
- Stop naturally when the approach is clear. No concluding fluff.

Tone: a focused engineer muttering to themselves at 2am.

Example for a kill brick:
User wants a kill brick. Touched event, humanoid damage.
Should I use TakeDamage or just set health to 0? TakeDamage respects ForceField — more correct.
Need a debounce or Touched fires 60 times a second.
Debounce table keyed to character — use a cooldown of about 0.5s.
Actually I should check if a Humanoid exists first or non-player parts will error.
Where does the script live? Inside the Part itself keeps it self-contained.
Script type is regular Script — this runs server-side, has to.
That's clean enough. Simple and solid.`

export async function POST(req: NextRequest) {
  try {
    const { message, conversationContext, modelId } = await req.json()

    const userMsg = conversationContext
      ? `Context:\n${conversationContext}\n\nRequest: ${message}`
      : `Request: ${message}`

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer":  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title":       "Elixir AI",
      },
      body: JSON.stringify({
        model:       modelId ?? "google/gemini-2.0-flash-001",
        stream:      true,
        max_tokens:  250,
        temperature: 0.8,
        messages: [
          { role: "system", content: THINK_SYSTEM },
          { role: "user",   content: userMsg },
        ],
      }),
    })

    if (!res.ok || !res.body) {
      return new Response("data: [DONE]\n\n", {
        headers: { "Content-Type": "text/event-stream" },
      })
    }

    const encoder = new TextEncoder()
    const stream  = new ReadableStream({
      async start(controller) {
        const reader  = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer    = ""

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue
              const data = line.slice(6).trim()
              if (data === "[DONE]") { controller.close(); return }

              try {
                const json  = JSON.parse(data)
                const token = json.choices?.[0]?.delta?.content ?? ""
                if (token) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
                  )
                }
              } catch {}
            }
          }
        } catch {}

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        Connection:      "keep-alive",
      },
    })
  } catch (e) {
    console.error("[Elixir] Think error:", e)
    return new Response("data: [DONE]\n\n", {
      headers: { "Content-Type": "text/event-stream" },
    })
  }
}