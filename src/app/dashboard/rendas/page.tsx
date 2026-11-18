import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Wallet, Plus, CalendarDays, UserRound, CreditCard } from "lucide-react";
import { getActiveOrganization } from "@/lib/organization";
import { recordPayment } from "./actions";

type Charge = {
  id:string; period_start:string; due_date:string; amount_due:number; amount_paid:number; status:string; description:string|null;
  leases:{ monthly_rent:number; units:{name:string}|null; tenants:{full_name:string}|null }|null;
};
const statusLabels:Record<string,string>={pending:"Pendente",partially_paid:"Parcialmente paga",paid:"Paga",overdue:"Em atraso",cancelled:"Cancelada"};
const methods=[["cash","Dinheiro"],["bank_transfer","Transferência bancária"],["multicaixa_express","Multicaixa Express"],["other","Outro"]];

export default async function RentPage({searchParams}:{searchParams:Promise<{sucesso?:string;erro?:string}>}) {
 const { supabase, user, membership } = await getActiveOrganization();
 const [{data},params]=await Promise.all([
  supabase.from("rent_charges").select("id,period_start,due_date,amount_due,amount_paid,status,description,leases(monthly_rent,units(name),tenants(full_name))")
   .eq("organization_id",membership.organization_id).order("due_date",{ascending:false}),
  searchParams
 ]);
 const errors:Record<string,string>={"dados-invalidos":"Verifique os dados do pagamento.","sem-permissao":"Não tem permissão para registar pagamentos.","cobranca-invalida":"A cobrança selecionada não foi encontrada.","valor-excessivo":"O valor excede o saldo em dívida.","falha-pagamento":"Não foi possível registar o pagamento."};
 const success=params.sucesso==="cobranca"?"Cobrança criada com sucesso.":params.sucesso==="pagamento"?"Pagamento registado com sucesso.":"";
 return <main className="dashboard-shell">
  <header className="dashboard-header"><div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div><Link href="/dashboard" className="back-link"><ArrowLeft size={16}/> Painel principal</Link></header>
  <section className="dashboard-content">
   <div className="page-heading"><div><p className="eyebrow">FINANÇAS</p><h1>Rendas e pagamentos</h1><p className="auth-description">Emita cobranças mensais e registe os pagamentos recebidos.</p></div><Link href="/dashboard/rendas/novo" className="primary-link"><Plus size={17}/> Gerar cobrança</Link></div>
   {success&&<p className="form-success page-message">{success}</p>}
   {params.erro&&<p className="form-error page-message">{errors[params.erro]??"Ocorreu um erro. Tente novamente."}</p>}
   {!data?.length?<section className="empty-panel"><div className="empty-icon"><Wallet size={25}/></div><h2>Ainda não existem cobranças</h2><p>Gere a primeira cobrança para um contrato ativo.</p><Link href="/dashboard/rendas/novo" className="primary-link"><Plus size={16}/> Gerar cobrança</Link></section>:
   <div className="rent-list">{(data as unknown as Charge[]).map(charge=>{
    const lease=charge.leases; const balance=Number(charge.amount_due)-Number(charge.amount_paid);
    const actualStatus=charge.status!=="paid"&&charge.status!=="cancelled"&&charge.due_date<new Date().toISOString().slice(0,10)?"overdue":charge.status;
    return <article className="rent-card" key={charge.id}>
     <div className="rent-card-heading"><div><span className={`lease-status lease-status-${actualStatus}`}>{statusLabels[actualStatus]??actualStatus}</span><h2>{lease?.tenants?.full_name??"Inquilino"}</h2><p className="lease-detail"><CalendarDays size={14}/>{charge.description??charge.period_start}</p><p className="lease-detail"><UserRound size={14}/>{lease?.units?.name??"Unidade"} · Vencimento: {new Date(charge.due_date+"T12:00:00").toLocaleDateString("pt-AO")}</p></div>
      <div className="rent-amounts"><strong>{new Intl.NumberFormat("pt-AO").format(Number(charge.amount_due))} Kz</strong><small>Pago: {new Intl.NumberFormat("pt-AO").format(Number(charge.amount_paid))} Kz</small><b>Em falta: {new Intl.NumberFormat("pt-AO").format(balance)} Kz</b></div></div>
     {balance>0&&actualStatus!=="cancelled"&&<form action={recordPayment} className="payment-form">
      <input type="hidden" name="charge_id" value={charge.id}/>
      <label>Valor recebido (Kz)<input name="amount" type="number" required min="0.01" max={balance} step="0.01" placeholder={String(balance)}/></label>
      <label>Data do pagamento<input name="payment_date" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></label>
      <label>Meio de pagamento<select name="payment_method" defaultValue="cash">{methods.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label>Referência (opcional)<input name="reference" maxLength={120} placeholder="N.º de operação ou recibo"/></label>
      <button className="primary-button" type="submit"><CreditCard size={15}/> Registar pagamento</button>
     </form>}
    </article>;
   })}</div>}
  </section>
 </main>;
}
