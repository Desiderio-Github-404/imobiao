import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ImobiAO — Gestão imobiliária simples",
  description: "Organize imóveis, inquilinos, contratos e rendas num só lugar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-AO">
      <body>{children}</body>
    </html>
  );
}