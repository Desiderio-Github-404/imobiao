# ImobiAO — Documentação técnica e guia de implementação

**Produto:** ImobiAO  
**Tipo:** aplicação web SaaS de gestão imobiliária multi-organização  
**Mercado inicial:** Angola  
**Moeda:** Kwanza (AOA)

> Documento baseado na estrutura conhecida do repositório e no histórico de desenvolvimento. Antes da entrega comercial, confirme no código a lista completa de variáveis de ambiente, migrações, integrações e funcionalidades ativas. Não inserir credenciais neste documento.

## 1. Visão geral

O ImobiAO centraliza operações de gestão imobiliária: imóveis, unidades, inquilinos, contratos de arrendamento, cobranças, pagamentos, recibos e acompanhamento financeiro. Foi concebido para suportar organizações distintas, com utilizadores e permissões associados a cada organização.

Cada comprador deve controlar os seus próprios serviços, credenciais, domínio e ambiente de produção. A conta pessoal do desenvolvedor não deve permanecer como dependência operacional do cliente.

## 2. Tecnologias identificadas no repositório

- Next.js 15 — framework web e App Router.
- React 19 — interface.
- TypeScript — tipagem estática.
- Tailwind CSS 4 — estilos.
- Supabase — PostgreSQL e autenticação; Storage quando configurado.
- Vercel — build e alojamento.
- Lucide React — ícones.
- Recharts — gráficos.

As versões instaladas devem ser confirmadas pelo package-lock.json.

## 3. Arquitetura lógica

1. O utilizador acede à aplicação pelo navegador.
2. Next.js apresenta a interface e executa a lógica do servidor/cliente conforme cada módulo.
3. A autenticação e os dados persistentes são geridos pelo Supabase.
4. PostgreSQL armazena os dados operacionais.
5. As políticas Row Level Security (RLS) restringem o acesso de acordo com organização e permissões.
6. Vercel publica a aplicação.

No modelo multi-organização, os dados operacionais devem estar associados à organização correspondente. A seleção de uma organização ativa não substitui a validação de permissões no banco de dados.

## 4. Módulos funcionais

O escopo funcional trabalhado inclui:

- Organizações e membros.
- Imóveis e unidades.
- Cadastro de inquilinos.
- Contratos de arrendamento.
- Cobranças de renda.
- Registo de pagamentos, incluindo pagamentos parciais quando aplicável.
- Consulta de saldos e estados de pagamento.
- Emissão e descarregamento de recibos.
- Informação e relatórios financeiros.
- Gestão de equipa e permissões.

Só anuncie integrações de mensagens, pagamentos externos, notificações automáticas ou outros serviços como ativos depois de as testar e documentar no ambiente do comprador.

## 5. Requisitos de desenvolvimento local

- Node.js numa versão LTS compatível com o Next.js utilizado.
- npm.
- Git e acesso ao repositório.
- Projeto Supabase próprio ou ambiente de desenvolvimento autorizado.

Na pasta do projeto:

~~~bash
npm install
cp .env.example .env.local
npm run dev
~~~

A aplicação fica normalmente disponível em http://localhost:3000.

Comandos disponíveis no package.json:

~~~bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
~~~

Executar lint, typecheck e build antes de cada publicação.

## 6. Configuração do Supabase

1. Criar um projeto Supabase pertencente ao cliente.
2. Obter a URL do projeto e a chave pública/anon.
3. Configurar as variáveis exigidas pelo código da aplicação.
4. Aplicar as migrações SQL do repositório pela ordem numérica.
5. Confirmar tabelas, funções, políticas RLS, permissões e buckets Storage utilizados.
6. Criar utilizadores e organizações de teste.
7. Confirmar que utilizadores de uma organização não conseguem consultar ou alterar dados de outra sem autorização.

### Variáveis de ambiente

O README anterior identificava:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

A aplicação pode ter recebido novas variáveis. Pesquise no código por process.env e NEXT_PUBLIC_ e atualize esta lista antes da implantação.

**Nunca colocar a chave service_role ou qualquer segredo em variáveis NEXT_PUBLIC_**, no navegador, no Git ou na documentação. Segredos devem ficar apenas em variáveis protegidas do ambiente servidor, quando forem necessários.

## 7. Publicação na Vercel

1. O cliente cria uma conta Vercel sob controlo próprio.
2. Importa o repositório GitHub ou recebe a transferência do repositório.
3. Seleciona a branch de produção.
4. Configura as variáveis de ambiente exigidas, separando Development, Preview e Production.
5. Confirma as definições de build detetadas pelo Next.js.
6. Executa o deploy.
7. Testa autenticação, operações principais e comunicação com Supabase.
8. Liga o domínio do cliente e configura os registos DNS indicados pela Vercel.
9. Confirma HTTPS, redirecionamentos e funcionamento do domínio.

Não copiar variáveis de produção para ambientes Preview sem avaliar o risco de os testes alterarem dados reais.

## 8. Migrações e alterações à base de dados

- Manter migrações SQL versionadas no repositório.
- Aplicar migrações pela ordem definida nos nomes dos ficheiros.
- Fazer backup antes de alterações estruturais em produção.
- Testar migrações num ambiente separado.
- Registar data, responsável e resultado.
- Não executar novamente migrações não idempotentes sem avaliar o conteúdo.

O histórico de migrações é a referência para reconstruir o esquema. Confirmar se alterações manuais no painel Supabase também foram convertidas em migrações versionadas.

## 9. Operação e manutenção

O responsável técnico do cliente deve:

- Monitorizar deployments e logs da Vercel.
- Monitorizar utilização, logs e estado do Supabase.
- Rever utilizadores, membros e permissões.
- Manter dependências atualizadas e executar testes de regressão.
- Fazer e testar backups conforme o plano contratado.
- Documentar alterações de esquema e configuração.
- Manter um procedimento de recuperação e reversão de deployments.

Backups só são confiáveis depois de a restauração ter sido testada.

## 10. Transferência para o comprador

Conforme o contrato, a entrega deve incluir:

- Código-fonte e histórico Git.
- Esta documentação e o manual de utilização.
- Migrações SQL e instruções de aplicação.
- Lista de variáveis de ambiente, sem valores secretos.
- Identificação dos serviços externos e custos recorrentes.
- Instruções de deploy e configuração do domínio.
- Sessão de passagem de conhecimento.
- Período e âmbito de suporte acordados.

### Titularidade das contas

Sempre que possível, o comprador deve ser proprietário de:

- Conta/organização GitHub ou repositório transferido.
- Projeto Supabase.
- Projeto Vercel.
- Domínio e DNS.
- Contas de fornecedores externos usados pela solução.

Depois da transferência, remover acessos do vendedor que já não sejam necessários e rodar credenciais que tenham sido partilhadas durante a implementação.

## 11. Checklist de entrega

- [ ] Código-fonte atualizado e acessível ao comprador.
- [ ] Build de produção concluído sem erros.
- [ ] Lint e verificação TypeScript executados.
- [ ] Migrações SQL conferidas e versionadas.
- [ ] Variáveis de ambiente documentadas sem revelar segredos.
- [ ] Supabase do cliente configurado.
- [ ] Vercel do cliente configurada.
- [ ] Domínio e HTTPS testados, se incluídos.
- [ ] Fluxos principais testados no ambiente do cliente.
- [ ] Isolamento entre organizações testado.
- [ ] Backups e recuperação explicados.
- [ ] Manual do utilizador entregue.
- [ ] Titularidade e acessos transferidos.
- [ ] Suporte, manutenção e limites de responsabilidade definidos por escrito.

## 12. Limites e avisos

Este documento não constitui certificação de segurança, auditoria independente, garantia de disponibilidade nem parecer jurídico. A auditoria OWASP e os testes de desempenho foram deixados fora do âmbito solicitado nesta fase; não devem ser apresentados comercialmente como concluídos.

O comprador deve designar um responsável técnico para gerir o ambiente, atualizações, backups, credenciais e incidentes. O código entregue não elimina custos de alojamento, base de dados, domínio ou serviços externos.

---

**Documentação de implementação do ImobiAO — atualizar a cada versão entregue.**
