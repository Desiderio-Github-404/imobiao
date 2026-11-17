"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";

type Point = { month:string; label:string; billed:number; received:number };
type Statuses = { paid:number; partially_paid:number; pending:number; overdue:number };
const money = (value:number) => new Intl.NumberFormat("pt-AO",{notation:"compact",maximumFractionDigits:1}).format(value) + " Kz";
const statusLabels:Record<string,string>={paid:"Pagas",partially_paid:"Parciais",pending:"Pendentes",overdue:"Em atraso"};
const pieColors=["#20a6b7","#2864e8","#e6a23c","#d95d5d"];

export default function FinanceChart({ data, statuses }: { data:Point[]; statuses:Statuses }) {
  const [range,setRange] = useState(6);
  const visible = useMemo(()=>data.slice(-range),[data,range]);
  const pieData=Object.entries(statuses).map(([name,value])=>({name:statusLabels[name],value})).filter(item=>item.value>0);
  return <div className="analytics-grid">
    <section className="finance-chart-card">
      <div className="finance-chart-heading"><div><p className="eyebrow">DESEMPENHO FINANCEIRO</p><h2>Rendas cobradas vs. recebidas</h2><p>Compare os valores mensais da sua carteira.</p></div>
        <div className="chart-range" role="group" aria-label="Período do gráfico">{[3,6,12].map(n=><button type="button" key={n} onClick={()=>setRange(n)} className={range===n?"active":""}>{n}M</button>)}</div>
      </div>
      {visible.length ? <div className="finance-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={visible} margin={{top:12,right:8,left:0,bottom:0}}>
        <defs><linearGradient id="receivedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#20a6b7" stopOpacity={0.25}/><stop offset="95%" stopColor="#20a6b7" stopOpacity={0}/></linearGradient><linearGradient id="billedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2864e8" stopOpacity={0.18}/><stop offset="95%" stopColor="#2864e8" stopOpacity={0}/></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf4"/><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{fontSize:11,fill:"#718096"}}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#718096"}} tickFormatter={(v)=>money(v).replace(" Kz","")}/><Tooltip formatter={(v:any)=>money(Number(v))} contentStyle={{borderRadius:10,border:"1px solid #e8edf4",fontSize:12}}/><Legend/><Area type="monotone" dataKey="billed" name="Cobranças" stroke="#2864e8" fill="url(#billedFill)" strokeWidth={2.5} activeDot={{r:5}}/><Area type="monotone" dataKey="received" name="Recebido" stroke="#20a6b7" fill="url(#receivedFill)" strokeWidth={2.5} activeDot={{r:5}}/>
      </AreaChart></ResponsiveContainer></div> : <div className="chart-empty">Ainda não existem dados financeiros suficientes para apresentar o gráfico.</div>}
    </section>
    <section className="finance-chart-card status-chart-card">
      <div className="finance-chart-heading"><div><p className="eyebrow">CONTROLO DE COBRANÇAS</p><h2>Estado das rendas</h2><p>Distribuição das cobranças dos últimos 12 meses.</p></div></div>
      {pieData.length ? <div className="status-chart-layout"><div className="status-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={3} stroke="none">{pieData.map((entry,index)=><Cell key={entry.name} fill={pieColors[index%pieColors.length]}/>)}</Pie><Tooltip formatter={(v:any)=>[v,"Cobranças"]} contentStyle={{borderRadius:10,border:"1px solid #e8edf4",fontSize:12}}/></PieChart></ResponsiveContainer></div><div className="status-legend">{pieData.map((item,index)=><div key={item.name}><i style={{background:pieColors[index%pieColors.length]}}/><span>{item.name}</span><strong>{item.value}</strong></div>)}</div></div> : <div className="chart-empty">Ainda não existem cobranças registadas.</div>}
    </section>
  </div>;
}
