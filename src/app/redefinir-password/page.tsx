"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError("O link pode ter expirado. Solicite uma nova recuperação de palavra-passe.");
    setMessage("Palavra-passe atualizada. A redirecionar para a sua conta...");
    setTimeout(() => router.replace("/dashboard"), 1200);
  }

  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="brand">Imobi<span>AO</span></Link>
    <p className="eyebrow">NOVA PALAVRA-PASSE</p><h1>Defina uma nova palavra-passe</h1>
    <form onSubmit={handleSubmit} className="auth-form">
      <label>Nova palavra-passe<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}
      <button className="primary-button" disabled={loading}>{loading ? "A atualizar..." : "Atualizar palavra-passe"}</button>
    </form>
  </section></main>;
}
