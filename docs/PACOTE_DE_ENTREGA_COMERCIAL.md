# ImobiAO — Pacote de entrega comercial

**Finalidade:** orientar a preparação, transferência e aceitação do ImobiAO por um comprador.  
**Repositório de referência:** `Desiderio-Github-404/imobiao`  
**Estado deste documento:** guia de entrega; não constitui prova de que uma transferência, auditoria ou implantação já ocorreu.

---

## 1. O que deve ser entregue

### Código e documentação
- [ ] Repositório Git com o código-fonte e histórico de commits.
- [ ] `.env.example` sem credenciais reais.
- [ ] Documentação técnica: [DOCUMENTACAO_TECNICA_E_IMPLEMENTACAO.md](DOCUMENTACAO_TECNICA_E_IMPLEMENTACAO.md).
- [ ] Manual de utilização: [MANUAL_DO_UTILIZADOR.md](MANUAL_DO_UTILIZADOR.md).
- [ ] Migrações SQL existentes em `supabase/migrations/`, verificadas e aplicadas na ordem correta.
- [ ] Lista das funcionalidades incluídas na versão efetivamente contratada.
- [ ] Registo de limitações conhecidas, integrações não incluídas e tarefas pendentes.

### Ambiente e operação
- [ ] Projeto Supabase do comprador, com base de dados e autenticação configuradas.
- [ ] Projeto Vercel do comprador, ligado ao repositório e à branch acordada.
- [ ] Domínio e DNS sob controlo do comprador, se fizerem parte do contrato.
- [ ] Variáveis de ambiente configuradas diretamente nos serviços, nunca enviadas em texto aberto.
- [ ] Utilizador administrador inicial criado e acesso entregue por canal seguro.
- [ ] Backup inicial da base de dados e procedimento de recuperação documentados.
- [ ] Sessão de passagem de conhecimento realizada, se contratada.

**Não entregar:** palavras-passe pessoais do vendedor, tokens privados, chaves de API em ficheiros públicos, credenciais de outras aplicações ou dados reais de terceiros usados em demonstrações.

## 2. Responsabilidades e titularidade

A recomendação é que o comprador seja titular das contas de produção. Isso evita dependência técnica e comercial do vendedor.

| Elemento | Responsável recomendado |
|---|---|
| GitHub / repositório | Comprador ou organização do comprador |
| Supabase / projeto e faturação | Comprador |
| Vercel / projeto e faturação | Comprador |
| Domínio, DNS e renovação | Comprador |
| Contas de serviços externos | Comprador |
| Gestão diária de utilizadores e dados | Comprador |
| Correções e evolução após a entrega | Conforme contrato de suporte |

O vendedor pode receber acesso temporário e limitado para instalação ou suporte. No fim do período acordado, esse acesso deve ser revisto e removido se já não for necessário.

### Transferência do repositório
Há duas modalidades possíveis:

1. **Transferência de propriedade:** o repositório passa para a conta/organização do comprador. É a opção mais clara quando a venda inclui o código e a propriedade acordada.
2. **Entrega por cópia/novo repositório:** o comprador recebe uma cópia sob uma conta própria. Deve ficar explícito no contrato qual histórico, issues, configurações e ativos acompanham a cópia.

A transferência nativa do GitHub exige permissões administrativas e aceitação pelo novo proprietário. Depois, confirmar acesso, branch principal, integrações, segredos e endereço remoto dos clones locais.

## 3. Configuração de produção

### Supabase
- [ ] Criar ou selecionar uma organização Supabase pertencente ao comprador.
- [ ] Criar o projeto na região escolhida, considerando localização dos utilizadores, latência, disponibilidade e requisitos aplicáveis.
- [ ] Guardar a URL e a chave pública/anon nas variáveis exigidas pela aplicação.
- [ ] Aplicar as migrações SQL versionadas pela ordem numérica.
- [ ] Confirmar funções, políticas RLS, permissões e buckets de Storage que a versão realmente utiliza.
- [ ] Criar utilizador e organização administrativa iniciais.
- [ ] Testar isolamento entre organizações com contas separadas.
- [ ] Configurar faturação, alertas, backups e acesso de equipa.

A transferência de um projeto Supabase entre organizações depende dos requisitos e limitações atuais da plataforma. Se a transferência não for adequada, planear migração para um projeto novo, incluindo dados, autenticação, ficheiros e configurações.

### Variáveis de ambiente
O ficheiro `.env.example` existente identifica:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Antes do deploy, comparar o ficheiro com o código da versão a entregar e confirmar se existem outras variáveis necessárias. Os valores reais são fornecidos pelo projeto do comprador.

**Nunca** colocar `service_role`, passwords, tokens ou segredos em variáveis `NEXT_PUBLIC_*`, no repositório, em capturas de ecrã ou em mensagens não protegidas.

### Vercel e domínio
- [ ] Criar/selecionar uma equipa e projeto Vercel controlados pelo comprador.
- [ ] Ligar o repositório e selecionar a branch de produção.
- [ ] Configurar as variáveis de ambiente em Production, Preview e Development conforme necessário.
- [ ] Executar deploy e confirmar logs de build e runtime.
- [ ] Configurar domínio e DNS, se incluídos.
- [ ] Validar HTTPS, autenticação, navegação e operações essenciais no domínio final.
- [ ] Confirmar método de pagamento e responsável pela renovação de qualquer plano pago.

Se for transferido um projeto Vercel existente entre equipas, rever previamente quais recursos, domínios, variáveis, integrações e dados de monitorização são transferidos ou não.

## 4. Testes de aceitação antes da assinatura

Registar data, ambiente, responsável, resultado e evidência de cada teste.

- [ ] Registo/login e recuperação de acesso, conforme os fluxos habilitados.
- [ ] Criação e edição de organização.
- [ ] Convite/gestão de membros e permissões.
- [ ] Criação, edição e consulta de imóveis e unidades.
- [ ] Cadastro e atualização de inquilinos.
- [ ] Criação e consulta de contratos.
- [ ] Geração/consulta de cobranças.
- [ ] Registo de pagamento total e parcial.
- [ ] Atualização correta do saldo após pagamentos.
- [ ] Emissão e descarregamento de recibos.
- [ ] Relatórios e histórico, quando disponíveis.
- [ ] Isolamento de dados entre organizações.
- [ ] Testes com perfis e permissões diferentes.
- [ ] Testes em telemóvel e computador.
- [ ] Build de produção, lint e TypeScript executados na versão final.
- [ ] Backup criado e, idealmente, restauração testada.

Um teste marcado como concluído deve ter sido executado no ambiente e na versão que serão entregues. Não usar resultados de desenvolvimento como prova automática de funcionamento em produção.

## 5. Estado de auditoria e limitações

O histórico de desenvolvimento inclui testes funcionais reportados pelo desenvolvedor, incluindo operações financeiras e isolamento multi-organização. Esses resultados devem ser repetidos no ambiente final do comprador.

**Não declarar o produto certificado ou totalmente auditado.** A auditoria OWASP abrangente e os testes de desempenho foram deixados de fora do processo anterior a pedido do responsável pelo projeto. Também devem ser revistos, por um profissional qualificado, os aspetos de segurança que não tenham evidência de teste, incluindo funções privilegiadas/RPC, permissões, dependências, configuração de produção, proteção de dados e recuperação de incidentes.

A documentação não promete integrações de pagamento externo, WhatsApp, SMS, e-mail transacional ou outros serviços que não estejam efetivamente implementados, configurados e aceites no escopo escrito.

## 6. Custos recorrentes e serviços de terceiros

Antes da venda, preencher com os valores e planos efetivamente escolhidos pelo comprador:

| Serviço | Plano/limite contratado | Custo | Ciclo de cobrança | Titular |
|---|---|---:|---|---|
| Domínio/DNS | A definir | A confirmar | Anual ou conforme fornecedor | Comprador |
| Vercel | A definir | A confirmar | Conforme fornecedor | Comprador |
| Supabase | A definir | A confirmar | Conforme fornecedor | Comprador |
| E-mail/serviços externos | Apenas se utilizados | A confirmar | Conforme fornecedor | Comprador |

Os preços variam por plano, utilização, região, câmbio e políticas dos fornecedores. Não incluir valores estimados como se fossem preços garantidos.

## 7. Suporte, manutenção e exclusões

O contrato comercial deve indicar expressamente:
- período de garantia para defeitos reproduzíveis;
- duração e canais de suporte;
- prazo de resposta e horário de atendimento;
- número de horas de formação incluídas;
- atualizações, correções e novas funcionalidades incluídas ou excluídas;
- quem paga serviços, domínio, alojamento, mensagens e consumo de APIs;
- quem administra dados, utilizadores, backups e incidentes;
- condições para trabalho adicional e respetivo orçamento.

Salvo acordo escrito, a entrega do código não deve ser interpretada como suporte técnico ilimitado, manutenção vitalícia, operação contínua, migração futura de dados ou pagamento dos serviços de terceiros.

## 8. Dados, privacidade e preparação do ambiente

- [ ] Remover dados fictícios, dados pessoais de teste e contas temporárias.
- [ ] Não copiar dados de clientes reais para demonstrações sem base legal e autorização.
- [ ] Definir quem é responsável pelo tratamento e pela gestão dos dados pessoais no uso comercial.
- [ ] Configurar política de privacidade, termos e avisos legais adequados ao negócio, com revisão jurídica local.
- [ ] Confirmar retenção, exportação, eliminação e backup de dados.
- [ ] Rodar credenciais que tenham sido partilhadas durante o desenvolvimento.
- [ ] Ativar autenticação multifator nas contas administrativas sempre que disponível.

Este documento é operacional e não substitui aconselhamento jurídico, fiscal ou de proteção de dados.

## 9. Termo de aceitação — registo da entrega

Preencher e assinar fora deste repositório, como parte do processo comercial:

- Produto e versão/commit entregue:
- Comprador / entidade:
- Data da entrega:
- URL de produção:
- Repositório transferido ou disponibilizado:
- Projeto Supabase:
- Projeto Vercel:
- Domínio:
- Testes de aceitação anexados:
- Pendências aceites pelo comprador:
- Período de suporte acordado:
- Responsável do comprador:
- Responsável do vendedor:
- Assinaturas:

A aceitação deve identificar a versão exata entregue e as pendências conhecidas. Não inserir passwords, chaves ou tokens neste registo.

---

## 10. Referências oficiais para transferências

- [Transferir um repositório GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository).
- [Transferir um projeto Vercel entre equipas](https://vercel.com/docs/projects/transferring-projects).
- [Transferir um projeto Supabase entre organizações](https://supabase.com/docs/guides/platform/project-transfer).

Consulte sempre a documentação oficial antes de executar uma transferência, pois os requisitos e os recursos transferidos podem mudar.
