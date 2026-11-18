"use client";

import { Download, Printer } from "lucide-react";

type Row = { periodo: string; vencimento: string; imovel: string; unidade: string; inquilino: string; cobrado: number; recebido: number; em_divida: number; estado: string };

export default function ReportsActions({ rows }: { rows: Row[] }) {
  function exportCsv() {
    const headers = ["Período", "Vencimento", "Imóvel", "Unidade", "Inquilino", "Cobrado (Kz)", "Recebido (Kz)", "Em dívida (Kz)", "Estado"];
    const keys: (keyof Row)[] = ["periodo", "vencimento", "imovel", "unidade", "inquilino", "cobrado", "recebido", "em_divida", "estado"];
    const escape = (value: string | number) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
    const csv = "\uFEFF" + [headers.map(escape).join(";"), ...rows.map((row) => keys.map((key) => escape(row[key])).join(";"))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "imobiao-relatorio-financeiro.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return <div className="report-actions"><button type="button" className="secondary-button" onClick={() => window.print()}><Printer size={15}/> PDF / Imprimir</button><button type="button" className="secondary-button" onClick={exportCsv}><Download size={15}/> Exportar Excel/CSV</button></div>;
}
