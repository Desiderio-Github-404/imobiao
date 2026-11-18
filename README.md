# ImobiAO

SaaS de gestão imobiliária para proprietários e gestores em Angola, com suporte a organizações e gestão de operações de arrendamento.

## Tecnologias

- Next.js 15, React 19 e TypeScript
- Tailwind CSS
- Supabase (PostgreSQL e autenticação)
- Vercel
- Lucide React e Recharts

## Funcionalidades

O projeto contempla gestão de organizações e membros, imóveis, unidades, inquilinos, contratos, cobranças, pagamentos, recibos e informação financeira. A disponibilidade de cada módulo depende da versão implantada.

## Desenvolvimento local

Requisitos: Node.js compatível com Next.js e npm.

~~~bash
npm install
cp .env.example .env.local
npm run dev
~~~

Configura no .env.local as variáveis exigidas pelo projeto. O README anterior identificava NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY; confirma no código se existem outras variáveis necessárias.

Comandos úteis:

~~~bash
npm run lint
npm run typecheck
npm run build
npm run start
~~~

## Segurança de credenciais

Nunca exponhas a chave Supabase service_role ou qualquer segredo no browser, em variáveis NEXT_PUBLIC_ ou no repositório. Cada instalação deve usar os seus próprios projetos e credenciais.

## Documentação

Consulta [Documentação Técnica e Guia de Implementação](docs/DOCUMENTACAO_TECNICA_E_IMPLEMENTACAO.md) para arquitetura, configuração Supabase, publicação na Vercel, migrações, manutenção e transferência ao comprador.

> Antes de uma entrega comercial, confirma as variáveis de ambiente, migrações e integrações efetivamente usadas pela versão que será entregue.

## Entrega comercial

Consulta o [Pacote de Entrega Comercial](docs/PACOTE_DE_ENTREGA_COMERCIAL.md) para preparar a transferência ao comprador, configurar os serviços sob titularidade do cliente e executar os testes de aceitação.
