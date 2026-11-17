"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code === "organization_setup") {
      setError("A conta foi confirmada, mas não foi possível criar a organização. Contacte o suporte.");
    } else if (code === "organization_check") {
      setError("Não foi possível verificar a organização da sua conta. Tente novamente.");
    } else if (code === "auth_callback") {
      setError("Não foi possível concluir a confirmação da conta. Solicite um novo email de confirmação.");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return setError("Não foi possível iniciar sessão. Verifica o email e a palavra-passe.");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="brand">Imobi<span>AO</span></Link>
        <p className="eyebrow">BEM-VINDO DE VOLTA</p>
        <h1>Entre na sua conta</h1>
        <p className="auth-description">Aceda à gestão dos seus imóveis e rendas.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@email.com" /></label>
          <label>Palavra-passe<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="A sua palavra-passe" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={loading}>{loading ? "A entrar..." : "Entrar"}</button>
        </form>
        <div className="auth-links"><Link href="/recuperar-password">Esqueceu-se da palavra-passe?</Link><p>Ainda não tem conta? <Link href="/registar">Criar conta</Link></p></div>
      </section>
    </main>
  );
}
