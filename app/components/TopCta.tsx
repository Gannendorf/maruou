'use client';

import Link from 'next/link';

export default function TopCta() {
  return (
    <section style={{ textAlign: 'center', margin: '2rem 0' }}>
      <h2>AIクイズで王を目指そう！</h2>
      <p>どんなジャンルでも遊べます。あなたのジャンルで王になろう！</p>
      <Link href="/quiz">
        <button style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1.25rem',
          backgroundColor: '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}>
          クイズをはじめる
        </button>
      </Link>
    </section>
  );
}
