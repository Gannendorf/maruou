import { NextResponse } from "next/server";

// Next.js API Route (Node runtime). SDKは使わず、fetchでOpenAIに直接リクエストします。
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

    // プロンプトを最小限で作成（コスト節約）
    const userPrompt = `
あなたはクイズ作成者です。
ジャンル「${genre}」に関する4択クイズを5問作ってください。
出力は必ず次のJSON配列のみで返してください（説明文なし）：
[
  {
    "question": "質問文",
    "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "answerIndex": 0
  }
]
    `.trim();

    // Chat Completions API をfetchで叩く（gpt-4o-mini）
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "あなたは厳格なJSON出力をするクイズ作成AIです。" },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: "OpenAI APIエラー", detail }, { status: 500 });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";

    let quiz;
    try {
      quiz = JSON.parse(content);
      if (!Array.isArray(quiz)) throw new Error("not array");
    } catch {
      // JSONに失敗した場合は簡易リカバリー：Markdownコードブロックを剥がすなど
      const stripped = content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "");
      try {
        quiz = JSON.parse(stripped);
      } catch {
        return NextResponse.json({ error: "AI出力のJSONパースに失敗しました", raw: content }, { status: 500 });
      }
    }

    return NextResponse.json({ genre, quiz });
  } catch (e) {
    console.error("[/api/quiz] Error", e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
