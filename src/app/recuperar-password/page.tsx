"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-password`,
    });
    setLoading(false);
    if (error) return setError("Não foi possível enviar o email. Confirme o endereço e tente novamente.");
    setMessage("Se existir uma conta associada a este email, receberá instruções para redefinir a palavra-passe.");
  }

  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="brand">Imobi<span>AO</span></Link>
    <p className="eyebrow">RECUPERAR ACESSO</p><h1>Esqueceu-se da palavra-passe?</h1>
    <p className="auth-description">Indique o email da sua conta para receber um link de recuperação.</p>
    <form onSubmit={handleSubmit} className="auth-form">
      <label>Email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@email.com" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}
      <button className="primary-button" disabled={loading}>{loading ? "A enviar..." : "Enviar instruções"}</button>
    </form>
    <div className="auth-links"><Link href="/login">Voltar ao início de sessão</Link></div>
  </section></main>;
}
