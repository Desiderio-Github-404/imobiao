"use client";

import { useState } from "react";
import {
  Building2, LayoutDashboard, Users, FileText, Wallet, BarChart3, Settings,
  Bell, Search, Plus, ChevronDown, ArrowUpRight, ArrowDownRight, MoreHorizontal,
  Menu, X, House, Clock3, CircleAlert, CheckCircle2, CalendarDays, Download,
} from "lucide-react";

const nav = [
  { label: "Visão geral", icon: LayoutDashboard },
  { label: "Imóveis", icon: Building2 },
  { label: "Inquilinos", icon: Users },
  { label: "Contratos", icon: FileText },
  { label: "Pagamentos", icon: Wallet },
  { label: "Relatórios", icon: BarChart3 },
];

const stats = [
  { label: "Receita recebida", value: "2.450.000 Kz", change: "+12,8%", up: true, icon: Wallet, tone: "blue", note: "vs. mês anterior" },
  { label: "Por receber", value: "685.000 Kz", change: "8 rendas", up: false, icon: Clock3, tone: "amber", note: "pendentes este mês" },
  { label: "Imóveis ocupados", value: "18 / 22", change: "81,8%", up: true, icon: Building2, tone: "green", note: "taxa de ocupação" },
  { label: "Inquilinos ativos", value: "18", change: "+2", up: true, icon: Users, tone: "violet", note: "novos este mês" },
];

const payments = [
  { name: "Maria dos Santos", property: "Edifício Horizonte · Apt. 2B", date: "Hoje, 09:42", amount: "150.000 Kz", status: "Confirmado", initials: "MS", color: "blue" },
  { name: "João Manuel", property: "Residencial Palmeiras · Apt. 4A", date: "Hoje, 08:15", amount: "220.000 Kz", status: "Confirmado", initials: "JM", color: "orange" },
  { name: "Ana Paula Miguel", property: "Edifício Horizonte · Apt. 1C", date: "Ontem, 16:30", amount: "125.000 Kz", status: "Pendente", initials: "AM", color: "pink" },
  { name: "Carlos Alberto", property: "Moradia Talatona", date: "15 Nov, 11:20", amount: "300.000 Kz", status: "Confirmado", initials: "CA", color: "green" },
];

const due = [
  { name: "Pedro Francisco", unit: "Apt. 3C · Ed. Horizonte", date: "18 Nov 2026", amount: "180.000 Kz", late: false },
  { name: "Rosa Domingos", unit: "Loja 02 · Centro Comercial", date: "19 Nov 2026", amount: "250.000 Kz", late: false },
  { name: "António Miguel", unit: "Apt. 1A · Resid. Palmeiras", date: "Atrasada há 4 dias", amount: "145.000 Kz", late: true },
];

const bars = [42, 58, 48, 72, 63, 86, 68, 92, 74, 100, 82, 90];

export default function DashboardPage() {
  const [active, setActive] = useState("Visão geral");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {menuOpen && <button aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col bg-[#142741] px-4 py-5 transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2 pb-9">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-950/30"><House size={21} strokeWidth={2.4} /></div>
            <div><p className="text-[19px] font-bold tracking-tight text-white">Imobi<span className="text-cyan-300">AO</span></p><p className="text-[10px] tracking-[.18em] text-slate-400">GESTÃO IMOBILIÁRIA</p></div>
          </div>
          <button onClick={() => setMenuOpen(false)} className="text-slate-400 lg:hidden"><X size={20} /></button>
        </div>
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">Menu principal</p>
        <nav className="space-y-1">
          {nav.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActive(label); setMenuOpen(false); }} className={`sidebar-link w-full text-left ${active === label ? "active" : ""}`}><Icon size={18} />{label}{label === "Pagamentos" && <span className="ml-auto rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] text-amber-300">8</span>}</button>)}
        </nav>
        <div className="mt-9 border-t border-white/10 pt-6">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">Preferências</p>
          <button onClick={() => setActive("Definições")} className={`sidebar-link w-full text-left ${active === "Definições" ? "active" : ""}`}><Settings size={18} />Definições</button>
        </div>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-400" /><span className="text-[11px] font-medium text-emerald-300">Plano gratuito</span></div>
          <p className="text-xs leading-5 text-slate-300">Está a organizar o seu património. Continue a simplificar a sua gestão.</p>
          <button className="mt-3 text-xs font-semibold text-cyan-300 hover:text-cyan-200">Conhecer os planos <ArrowUpRight size={13} className="ml-1 inline" /></button>
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-white/10 px-2 pt-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-200">DB</div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">Desidério Bernardo</p><p className="text-[10px] text-slate-400">Proprietário</p></div>
          <MoreHorizontal size={18} className="text-slate-400" />
        </div>
      </aside>

      <main className="min-h-screen lg:ml-[252px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="text-slate-600 lg:hidden"><Menu size={22} /></button>
            <div><p className="text-xs text-slate-400">Terça-feira, 17 de Novembro de 2026</p><h1 className="text-[17px] font-bold text-[#172b49]">{active}</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 md:flex"><Search size={15} className="text-slate-400" /><input placeholder="Pesquisar..." className="w-36 bg-transparent text-xs outline-none placeholder:text-slate-400" /></div>
            <button aria-label="Notificações" className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></button>
            <button className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 sm:flex">AOA <ChevronDown size={14} /></button>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] space-y-6 p-5 md:p-8">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-sm text-slate-500">Bem-vindo de volta, Desidério 👋</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-[#172b49] md:text-[28px]">O seu património, sob controlo.</h2><p className="mt-1 text-sm text-slate-500">Aqui está o resumo da sua atividade imobiliária.</p></div>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2864e8] px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700"><Plus size={16} /> Adicionar imóvel</button>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, change, up, icon: Icon, tone, note }) => <div key={label} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === "blue" ? "bg-blue-50 text-blue-600" : tone === "amber" ? "bg-amber-50 text-amber-600" : tone === "green" ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-600"}`}><Icon size={19} /></div><button aria-label="Mais opções" className="text-slate-300 hover:text-slate-500"><MoreHorizontal size={19} /></button></div>
              <p className="mt-4 text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-[23px] font-bold tracking-tight text-[#172b49]">{value}</p>
              <div className="mt-2 flex items-center gap-1.5 text-[10px]"><span className={`inline-flex items-center gap-0.5 font-semibold ${up ? "text-emerald-600" : "text-amber-600"}`}>{up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{change}</span><span className="text-slate-400">{note}</span></div>
            </div>)}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <div className="card p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-[#172b49]">Visão financeira</h3><p className="mt-1 text-xs text-slate-400">Receitas recebidas ao longo do ano</p></div><button className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600">2026 <ChevronDown size={13} /></button></div>
              <div className="mt-6 flex items-end gap-3"><p className="text-2xl font-bold text-[#172b49]">18.650.000 Kz</p><span className="mb-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600">+8,4%</span></div>
              <div className="mt-6 flex h-44 items-end gap-2 border-b border-slate-100 pb-2 sm:gap-3">{bars.map((height, i) => <div key={i} className="group flex h-full flex-1 flex-col justify-end"><div style={{ height: `${height}%` }} className={`w-full rounded-t-md transition hover:opacity-75 ${i === 9 ? "bg-[#2864e8]" : "bg-[#dce7fb]"}`} /><span className="mt-2 text-center text-[9px] text-slate-400">{["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][i]}</span></div>)}</div>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400"><span className="h-2 w-2 rounded-sm bg-[#2864e8]" /> Receita mensal <span className="ml-auto">Dados demonstrativos</span></div>
            </div>
            <div className="card p-5 md:p-6">
              <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-[#172b49]">Estado das rendas</h3><p className="mt-1 text-xs text-slate-400">Resumo de Novembro</p></div><MoreHorizontal size={19} className="text-slate-400" /></div>
              <div className="my-7 flex items-center justify-center"><div className="relative flex h-40 w-40 items-center justify-center rounded-full" style={{ background: "conic-gradient(#2864e8 0 72%, #f5b544 72% 91%, #e9eef5 91% 100%)" }}><div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white"><span className="text-3xl font-bold text-[#172b49]">72%</span><span className="text-[10px] text-slate-400">Recebidas</span></div></div></div>
              <div className="space-y-3"><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-500"><i className="h-2.5 w-2.5 rounded-full bg-blue-600" />Recebidas</span><strong className="text-[#172b49]">72%</strong></div><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-500"><i className="h-2.5 w-2.5 rounded-full bg-amber-400" />Pendentes</span><strong className="text-[#172b49]">19%</strong></div><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-500"><i className="h-2.5 w-2.5 rounded-full bg-slate-200" />Em atraso</span><strong className="text-[#172b49]">9%</strong></div></div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-5 md:px-6"><div><h3 className="text-sm font-bold text-[#172b49]">Pagamentos recentes</h3><p className="mt-1 text-xs text-slate-400">Últimas movimentações registadas</p></div><button className="text-xs font-semibold text-blue-600 hover:text-blue-800">Ver todos</button></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="border-y border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-6 py-3 font-semibold">Inquilino</th><th className="px-4 py-3 font-semibold">Data</th><th className="px-4 py-3 font-semibold">Valor</th><th className="px-4 py-3 font-semibold">Estado</th></tr></thead><tbody>{payments.map((p) => <tr key={p.name} className="border-b border-slate-50 last:border-0"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold ${p.color === "blue" ? "bg-blue-50 text-blue-600" : p.color === "orange" ? "bg-orange-50 text-orange-600" : p.color === "pink" ? "bg-pink-50 text-pink-600" : "bg-emerald-50 text-emerald-600"}`}>{p.initials}</div><div><p className="text-xs font-semibold text-slate-700">{p.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{p.property}</p></div></div></td><td className="px-4 py-4 text-[11px] text-slate-500">{p.date}</td><td className="px-4 py-4 text-xs font-semibold text-slate-700">{p.amount}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${p.status === "Confirmado" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{p.status}</span></td></tr>)}</tbody></table></div>
            </div>
            <div className="card p-5 md:p-6">
              <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-[#172b49]">Próximos vencimentos</h3><p className="mt-1 text-xs text-slate-400">Acompanhe as rendas a receber</p></div><CalendarDays size={18} className="text-slate-400" /></div>
              <div className="mt-5 space-y-4">{due.map((item) => <div key={item.name} className="flex items-start gap-3"><div className={`mt-0.5 rounded-lg p-2 ${item.late ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>{item.late ? <CircleAlert size={16} /> : <Clock3 size={16} />}</div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-700">{item.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{item.unit}</p><p className={`mt-1 text-[10px] ${item.late ? "font-semibold text-rose-600" : "text-slate-400"}`}>{item.date}</p></div><p className="whitespace-nowrap text-[11px] font-semibold text-slate-700">{item.amount}</p></div>)}</div>
              <button className="mt-5 w-full rounded-lg border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Ver calendário completo</button>
            </div>
          </section>
          <p className="pb-4 text-center text-[10px] text-slate-400">ImobiAO · Gestão imobiliária simplificada para Angola · Versão inicial de demonstração</p>
        </div>
      </main>
    </div>
  );
}