import { NextResponse } from "next/server";
import OpenAI from "openai";

// OpenAIクライアントを初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POSTメソッドでクイズ生成
export async function POST(req: Request) {
  try {
    const { genre } = await req.json();

    if (!genre || typeof genre !== "string") {
      return NextResponse.json(
        { error: "ジャンルが指定されていません" },
        { status: 400 }
      );
    }

    // AIに送るプロンプト
    const prompt = `
あなたはクイズ作成者です。
ジャンル「${genre}」に関する4択クイズを5問作ってください。
出力は必ず次のJSON形式で返してください：
[
  {
    "question": "質問文",
    "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "answerIndex": 正解の選択肢番号（0〜3の整数）
  }
]
    `;

    // OpenAI APIを呼び出し
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // コストを抑える
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    // モデルの出力（JSON文字列）
    const rawText = completion.choices[0].message?.content || "";

    // JSONパース（エラー対策付き）
    let quizData;
    try {
      quizData = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "クイズ生成に失敗しました。AI出力が不正です。" },
        { status: 500 }
      );
    }

    return NextResponse.json({ genre, quiz: quizData });
  } catch (error) {
    console.error("クイズ生成エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
