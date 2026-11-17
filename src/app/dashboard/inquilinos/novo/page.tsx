import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createTenant } from "../actions";

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const errorMessages: Record<string, string> = {
    "dados-invalidos": "Verifique os dados. Para ativar notificações, indique um WhatsApp válido com indicativo internacional (ex.: +244...).",
    "sem-permissao": "A sua conta não tem permissão para registar inquilinos nesta organização.",
    "falha-registo": "Não foi possível guardar o inquilino. Tente novamente.",
  };

  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
      <Link href="/dashboard/inquilinos" className="back-link"><ArrowLeft size={16}/> Voltar aos inquilinos</Link>
    </header>
    <section className="dashboard-content form-page">
      <div className="form-page-title"><span className="form-title-icon"><Users size={22}/></span><div><p className="eyebrow">NOVO REGISTO</p><h1>Adicionar inquilino</h1><p className="auth-description">Registe os dados de contacto. A associação à unidade será feita através do contrato.</p></div></div>
      {params.erro && <p className="form-error page-message">{errorMessages[params.erro] ?? "Ocorreu um erro. Tente novamente."}</p>}
      <form action={createTenant} className="property-form">
        <div className="form-section-label">Dados pessoais e contacto</div>
        <label>Nome completo *<input name="full_name" required minLength={2} maxLength={150} placeholder="Nome completo do inquilino"/></label>
        <div className="form-two-columns">
          <label>Telefone<input name="phone" maxLength={40} placeholder="Ex.: 923 000 000"/></label>
          <label>Email<input name="email" type="email" maxLength={254} placeholder="nome@email.com"/></label>
        </div>
        <label>BI ou passaporte<input name="identity_document" maxLength={80} placeholder="Número do documento (opcional)"/></label>
        <div className="form-section-label tenant-whatsapp-heading"><MessageCircle size={17}/> Notificações por WhatsApp</div>
        <label>Número de WhatsApp<input name="whatsapp_phone" type="tel" maxLength={25} placeholder="+244 923 000 000"/><small className="field-help">Inclua o indicativo do país. Exemplo: +244 para Angola. Pode ser diferente do telefone principal.</small></label>
        <label className="consent-option"><input type="checkbox" name="whatsapp_notifications_enabled"/><span>O inquilino autorizou receber avisos e notificações de gestão de arrendamento por WhatsApp neste número.</span></label>
        <p className="notice-box">A autorização fica registada separadamente. Nesta fase, o ImobiAO guarda o contacto e a preferência; o envio automático será ligado quando configurarmos a integração oficial do WhatsApp Business.</p>
        <div className="form-section-label">Informações adicionais</div>
        <label>Notas<textarea name="notes" rows={3} maxLength={2000} placeholder="Observações relevantes..."/></label>
        <div className="form-actions"><Link href="/dashboard/inquilinos" className="secondary-button">Cancelar</Link><button type="submit" className="primary-button">Guardar inquilino</button></div>
      </form>
    </section>
  </main>;
}
