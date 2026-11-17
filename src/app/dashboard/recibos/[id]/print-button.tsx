"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return <button className="primary-button" type="button" onClick={() => window.print()}>
    <Printer size={16}/> Imprimir / Guardar PDF
  </button>;
}
