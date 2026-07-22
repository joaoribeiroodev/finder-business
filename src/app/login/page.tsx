"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(json.error ?? "Senha incorreta.");
      }
    } catch {
      setError("Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 p-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-8"
      >
        <h1 className="text-xl font-bold text-white mb-1">Finder Business</h1>
        <p className="text-sm text-zinc-500 mb-6">Digite a senha para acessar</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white mb-4 focus:outline-none focus:border-blue-500"
          autoFocus
        />

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
