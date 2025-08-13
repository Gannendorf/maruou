'use client';

import React, { useState } from 'react';

type QuizItem = {
  question: string;
  choices: string[];
  answerIndex: number;
};

type QuizResponse = {
  genre: string;
  quiz: QuizItem[];
};

export default function QuizPage() {
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const fetchQuiz = async () => {
    setError(null);
    setSubmitted(false);
    setScore(null);
    setData(null);
    if (!genre.trim()) {
      setError('ジャンルを入力してください');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: genre.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = typeof json?.detail === 'string' ? json.detail :
                       JSON.stringify(json?.detail || {});
        throw new Error((json?.error || 'クイズ取得に失敗しました') + (detail ? `: ${detail}` : ''));
      }
      setData(json as QuizResponse);
      // 回答リセット
      const init: Record<number, number | null> = {};
      (json.quiz as QuizItem[]).forEach((_, i: number) => { init[i] = null; });
      setAnswers(init);
    } catch (e:any) {
      setError(e.message || '通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const onSelect = (qIdx: number, choiceIdx: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: choiceIdx }));
  };

  const onSubmit = () => {
    if (!data) return;
    const total = data.quiz.length;
    let correct = 0;
    data.quiz.forEach((q, i) => {
      if (answers[i] === q.answerIndex) correct += 1;
    });
    setScore(correct);
    setSubmitted(true);
  };

  const onRetry = () => {
    setSubmitted(false);
    setScore(null);
    // 回答だけリセット
    if (data) {
      const init: Record<number, number | null> = {};
      data.quiz.forEach((_, i) => { init[i] = null; });
      setAnswers(init);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const shareText = () => {
    if (!data || score === null) return '';
    return `【〇王】「${data.genre}」で${score}/${data.quiz.length}点を獲得！ #maruou #〇王`;
  };

  const shareUrl = () => {
    const text = encodeURIComponent(shareText());
    const url = encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://www.maruou.net/');
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  };

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">〇王 - クイズに挑戦</h1>

      {/* 入力フォーム */}
      <div className="flex gap-2">
        <input
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="例）寿司、スターウォーズ、将棋の戦法 など"
          className="flex-1 border rounded-lg px-3 py-2"
          disabled={loading}
        />
        <button
          onClick={fetchQuiz}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
        >
          {loading ? '生成中…' : 'クイズ生成'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 p-3">
          {error}
        </div>
      )}

      {/* クイズ表示 */}
      {data && (
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">ジャンル：「{data.genre}」</h2>
          {data.quiz.map((q, qIdx) => {
            const selected = answers[qIdx];
            const isCorrect = submitted && selected === q.answerIndex;
            return (
              <div key={qIdx} className="border rounded-xl p-4 space-y-3">
                <div className="font-medium">
                  Q{qIdx + 1}. {q.question}
                </div>
                <div className="grid gap-2">
                  {q.choices.map((c, cIdx) => {
                    const checked = selected === cIdx;
                    const correctChoice = submitted && q.answerIndex === cIdx;
                    const wrongChoice = submitted && checked && !correctChoice;
                    return (
                      <label key={cIdx} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer
                        ${checked ? 'border-black' : 'border-gray-200'}
                        ${correctChoice ? 'bg-green-50 border-green-400' : ''}
                        ${wrongChoice ? 'bg-red-50 border-red-400' : ''}
                      `}>
                        <input
                          type="radio"
                          name={`q-${qIdx}`}
                          checked={checked || false}
                          onChange={() => onSelect(qIdx, cIdx)}
                          disabled={submitted}
                        />
                        <span>{c}</span>
                      </label>
                    );
                  })}
                </div>
                {submitted && (
                  <div className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {isCorrect ? '正解！' : `正解は「${q.choices[q.answerIndex]}」`}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center gap-3">
            {!submitted ? (
              <button
                onClick={onSubmit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
              >
                採点する
              </button>
            ) : (
              <>
                <div className="font-semibold">
                  スコア：{score} / {data.quiz.length}
                </div>
                <a
                  className="px-3 py-2 rounded-lg border"
                  href={shareUrl()}
                  target="_blank"
                  rel="noreferrer"
                >
                  Xで共有
                </a>
                <button
                  onClick={onRetry}
                  className="px-3 py-2 rounded-lg border"
                >
                  もう一度解く
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {/* ヒント */}
      <p className="text-sm text-gray-500">
        ※ 生成に失敗する場合は少し待ってから再度お試しください。コスト節約のため、プロンプトは最小限です。
      </p>
    </main>
  );
}
