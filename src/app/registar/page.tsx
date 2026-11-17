"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (password.length < 8) return setError("A palavra-passe deve ter pelo menos 8 caracteres.");
    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: { full_name: name.trim(), organization_name: organization.trim() },
      },
    });
    if (signUpError) {
      setLoading(false);
      return setError(signUpError.message.includes("already registered") ? "Este email já está registado. Tente iniciar sessão." : "Não foi possível criar a conta. Verifique os dados e tente novamente.");
    }

    if (data.session) {
      const { error: orgError } = await supabase.rpc("create_personal_organization", { org_name: organization.trim() });
      if (orgError) {
        setLoading(false);
        return setError("A conta foi criada, mas não foi possível configurar a organização. Entre em contacto com o suporte.");
      }
      window.location.href = "/dashboard";
      return;
    }

    setLoading(false);
    setSuccess("Conta criada. Verifique a sua caixa de email e confirme o endereço para ativar o acesso.");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card-wide">
        <Link href="/" className="brand">Imobi<span>AO</span></Link>
        <p className="eyebrow">COMECE A ORGANIZAR</p>
        <h1>Crie a sua conta</h1>
        <p className="auth-description">Configure o espaço onde vai gerir os seus imóveis.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Nome completo<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="O seu nome" /></label>
          <label>Nome da organização ou património<input required minLength={2} value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Ex.: Património da Família" /></label>
          <label>Email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@email.com" /></label>
          <label>Palavra-passe<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {success && <p className="form-success" role="status">{success}</p>}
          <button className="primary-button" disabled={loading}>{loading ? "A criar conta..." : "Criar conta"}</button>
        </form>
        <div className="auth-links"><p>Já tem conta? <Link href="/login">Iniciar sessão</Link></p></div>
      </section>
    </main>
  );
}
