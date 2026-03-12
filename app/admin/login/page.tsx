'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = await signIn('credentials', { email, password, redirect: false, callbackUrl: '/admin' });

    if (result?.ok) {
      window.location.href = '/admin';
      return;
    }

    setError('Invalid credentials');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <form onSubmit={onSubmit} className="w-full rounded-2xl border border-white/10 bg-surface/70 p-8">
        <h1 className="font-serifDisplay text-4xl text-amber-100">Admin login</h1>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="mt-6 w-full rounded-lg bg-black/30 p-3" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-3 w-full rounded-lg bg-black/30 p-3"
        />
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <button type="submit" className="mt-6 w-full rounded-full bg-gold px-5 py-3 font-semibold text-black">
          Sign in
        </button>
      </form>
    </main>
  );
}
