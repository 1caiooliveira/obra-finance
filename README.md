# Canteiro

App para acompanhar obra e reforma: etapas da obra, caixa (com compras parceladas) e cotações de fornecedores. Feito para duas pessoas usarem juntas, pelo celular ou pelo computador.

SPA em **Vite + React + TypeScript**. Banco de dados e login no **Supabase**.

## Rodar no computador

```powershell
npm install
npm run dev
```

Abre em http://localhost:5173. Sem o arquivo `.env`, o app roda em **modo demonstração**: tudo funciona, mas os dados ficam só naquele navegador.

## Ligar o Supabase (uma vez, uns 15 minutos)

1. Crie uma conta e um projeto em https://supabase.com (o plano grátis basta).
2. No projeto, abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
4. Na pasta do projeto, copie `.env.example` para `.env` e cole os dois valores.
5. Em **Authentication → URL Configuration**, coloque em **Site URL** o endereço onde o app vai rodar (`http://localhost:5173` enquanto testa; depois, o endereço publicado).
6. Rode `npm run dev` de novo, crie sua conta, confirme o e-mail e crie a obra.

Mantenha a opção **Confirm email** ligada (Authentication → Providers → Email). É ela que garante que só a dona do e-mail convidado entra na obra.

## Convidar a outra pessoa

1. No app, clique no ⚙ e preencha **Convidar alguém para esta obra** com o e-mail dela.
2. Ela abre o app, clica em **Criar conta** com esse mesmo e-mail e confirma pelo link.
3. Ao entrar, ela cai direto na mesma obra, com acesso para ver e editar tudo.

## Publicar (para usar no celular)

O build é um site estático (`npm run build` gera a pasta `dist`). Qualquer hospedagem estática serve. Na Vercel:

1. Suba o projeto para um repositório no GitHub.
2. Em https://vercel.com, **Add New → Project**, escolha o repositório (framework: Vite).
3. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Depois do deploy, coloque o endereço da Vercel no **Site URL** do Supabase (passo 5 acima).

No celular, abra o endereço e use **Adicionar à tela de início** (Safari no iPhone, menu ⋮ no Chrome do Android).

## Como os dados estão organizados

| Tabela | O que guarda |
|---|---|
| `casas` | A obra: nome, orçamento total, % de reserva, área em m² |
| `membros` | Quem tem acesso a cada obra |
| `convites` | E-mails convidados que ainda não entraram |
| `etapas` | Etapas da obra, com status, valor previsto e datas |
| `lancamentos` | Cada gasto ou parcela; parcelas da mesma compra dividem o mesmo `grupo` |
| `cotacoes` | Orçamentos de fornecedores por etapa |

Todas as tabelas têm Row Level Security: só membros da obra leem ou alteram os dados dela.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes das contas (parcelas, valores digitados, resumo) |
| `npm run build` | Checa os tipos e gera a versão de produção em `dist/` |
