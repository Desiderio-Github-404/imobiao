# ImobiAO

SaaS de gestão imobiliária para proprietários individuais e pequenos gestores em Angola.

## Objetivo da MVP
Centralizar o controlo de imóveis, unidades, inquilinos, contratos, cobranças de renda e pagamentos, com valores em kwanzas (AOA).

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL, Auth e Storage)
- Vercel
- Lucide React

## Desenvolvimento local
```bash
npm install
cp .env.example .env.local
npm run dev
```

A aplicação inicia em http://localhost:3000.

## Configuração Supabase
Preencher `.env.local` com:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Nunca colocar a chave `service_role` em código executado no browser.

## Estado atual
Fundação visual da dashboard com dados demonstrativos. Autenticação, persistência, políticas RLS e módulos operacionais serão implementados nas próximas etapas. Os dados atualmente apresentados não são dados reais.

## Público inicial
Proprietários individuais e pequenos gestores imobiliários em Angola.
