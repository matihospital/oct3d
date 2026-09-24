"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OpsLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    router.push("/ops");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <header className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ads-text-subtlest)]">
          Oct 3D
        </p>
        <h1 className="text-2xl font-semibold text-[var(--ads-text)]">Iniciar sesión</h1>
        <p className="text-sm text-[var(--ads-text-subtle)]">Acceso al panel de operaciones</p>
      </header>

      <form onSubmit={onSubmit} className="ops-card space-y-4 p-6">
        <label className="block">
          <span className="ops-label">Email</span>
          <input
            className="ops-field"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="ops-label">Contraseña</span>
          <input
            className="ops-field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? (
          <p className="rounded-[var(--ads-radius)] bg-[var(--ads-danger-bg)] px-3 py-2 text-sm text-[var(--ads-danger)]">
            {error}
          </p>
        ) : null}
        <button type="submit" className="ops-btn ops-btn-primary w-full" disabled={loading}>
          {loading ? "Ingresando…" : "Continuar"}
        </button>
      </form>
    </main>
  );
}
