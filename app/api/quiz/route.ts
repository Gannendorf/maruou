import { NextResponse } from "next/server";

// Use Node runtime (not edge) for wider compatibility
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { genre } = await req.json();

    if (!genre || typeof genre !== "string") {
      return NextResponse.json({ error: "ジャンルが指定されていません" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "サーバーの環境変数 OPENAI_API_KEY が未設定です" }, { status: 500 });
    }

    // Prompt kept minimal to save cost
    const prompt = `あなたはクイズ作成者です。ジャンル「${genre}」に関する4択クイズを5問作ってください。
出力は必ず次のJSON配列のみで返してください（説明文や前後の文字は一切不要）：
[
  {
    "question": "質問文",
    "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "answerIndex": 0
  }
]`;

    // Call the Responses API (works with Restricted key that has "responses api: write")
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: prompt,
        temperature: 0.7,
        max_output_tokens: 800,
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      // Try to parse error JSON to surface code/message
      try {
        const err = JSON.parse(raw);
        return NextResponse.json(
          { error: "OpenAI APIエラー", detail: err },
          { status: 500 }
        );
      } catch {
        return NextResponse.json(
          { error: "OpenAI APIエラー", detail: raw },
          { status: 500 }
        );
      }
    }

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "OpenAI応答のJSONパースに失敗しました", raw }, { status: 500 });
    }

    // Responses API returns `output_text` (flat) and also a structured `output`
    let content: string = "";
    if (typeof data.output_text === "string" && data.output_text.length > 0) {
      content = data.output_text;
    } else if (Array.isArray(data.output) && data.output[0]?.content?.[0]?.text) {
      content = data.output[0].content[0].text;
    } else {
      // Fallback: try to find text in candidates
      const candText = data?.response?.output_text || data?.choices?.[0]?.message?.content;
      content = typeof candText === "string" ? candText : "";
    }

    if (!content) {
      return NextResponse.json({ error: "OpenAI応答にテキストが含まれていません", raw: data }, { status: 500 });
    }

    // Strip code fences if present and parse JSON
    const stripped = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "");

    let quiz;
    try {
      quiz = JSON.parse(stripped);
    } catch {
      return NextResponse.json({ error: "AI出力のJSONパースに失敗しました", raw: content }, { status: 500 });
    }

    return NextResponse.json({ genre, quiz });
  } catch (e: any) {
    console.error("[/api/quiz] Error", e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
