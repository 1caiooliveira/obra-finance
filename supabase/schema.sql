-- Canteiro: schema do banco no Supabase.
-- Rode uma vez no SQL Editor do projeto (Database > SQL Editor > New query).
--
-- Modelo: cada "casa" é uma obra. Quem cria a casa vira membro; outros membros
-- entram por convite de e-mail. Toda tabela de dados tem casa_id e só os membros
-- daquela casa leem e escrevem (Row Level Security).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tabelas

create table if not exists public.casas (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null default 'Obra do Apê',
  subtitulo       text,
  orcamento_total numeric(14,2) not null default 0,
  reserva_pct     numeric(5,2)  not null default 10,
  area_m2         numeric(8,2),
  created_at      timestamptz not null default now()
);

create table if not exists public.membros (
  casa_id    uuid not null references public.casas(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (casa_id, user_id)
);

create table if not exists public.convites (
  id         uuid primary key default gen_random_uuid(),
  casa_id    uuid not null references public.casas(id) on delete cascade,
  email      text not null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (casa_id, email)
);

create table if not exists public.etapas (
  id         uuid primary key default gen_random_uuid(),
  casa_id    uuid not null references public.casas(id) on delete cascade,
  nome       text not null,
  ordem      integer not null default 1,
  status     text not null default 'a_fazer' check (status in ('a_fazer','andamento','concluida')),
  orcado     numeric(14,2) not null default 0,
  fornecedor text,
  inicio     date,
  fim        date,
  notas      text,
  created_at timestamptz not null default now()
);

create table if not exists public.lancamentos (
  id         uuid primary key default gen_random_uuid(),
  casa_id    uuid not null references public.casas(id) on delete cascade,
  etapa_id   uuid references public.etapas(id) on delete set null,
  descricao  text not null,
  valor      numeric(14,2) not null,
  data       date not null,
  tipo       text,
  forma      text,
  fornecedor text,
  pago_por   text,
  pago       boolean not null default false,
  pago_em    date,
  parcela    text,          -- "3/10"
  grupo      uuid,          -- liga as parcelas de uma mesma compra
  notas      text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cotacoes (
  id         uuid primary key default gen_random_uuid(),
  casa_id    uuid not null references public.casas(id) on delete cascade,
  etapa_id   uuid references public.etapas(id) on delete set null,
  fornecedor text not null,
  tipo       text,          -- mesmos tipos dos lançamentos
  valor      numeric(14,2) not null default 0,
  status     text not null default 'cotando' check (status in ('cotando','fechado','descartado')),
  contato    text,
  notas      text,
  created_at timestamptz not null default now()
);

-- Colunas acrescentadas depois da primeira versão (para bancos já criados).
alter table public.cotacoes add column if not exists tipo text;

create index if not exists etapas_casa_idx      on public.etapas(casa_id);
create index if not exists lancamentos_casa_idx on public.lancamentos(casa_id, data);
create index if not exists cotacoes_casa_idx    on public.cotacoes(casa_id);
create index if not exists convites_email_idx   on public.convites(lower(email));

-- ---------------------------------------------------------------- acesso

create or replace function public.is_membro(p_casa uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.membros where casa_id = p_casa and user_id = auth.uid());
$$;

alter table public.casas       enable row level security;
alter table public.membros     enable row level security;
alter table public.convites    enable row level security;
alter table public.etapas      enable row level security;
alter table public.lancamentos enable row level security;
alter table public.cotacoes    enable row level security;

drop policy if exists casas_select on public.casas;
drop policy if exists casas_update on public.casas;
create policy casas_select on public.casas for select using (public.is_membro(id));
create policy casas_update on public.casas for update using (public.is_membro(id)) with check (public.is_membro(id));

drop policy if exists membros_select on public.membros;
create policy membros_select on public.membros for select using (public.is_membro(casa_id));

drop policy if exists convites_select on public.convites;
drop policy if exists convites_insert on public.convites;
drop policy if exists convites_delete on public.convites;
create policy convites_select on public.convites for select using (public.is_membro(casa_id));
create policy convites_insert on public.convites for insert with check (public.is_membro(casa_id));
create policy convites_delete on public.convites for delete using (public.is_membro(casa_id));

drop policy if exists etapas_all on public.etapas;
drop policy if exists lancamentos_all on public.lancamentos;
drop policy if exists cotacoes_all on public.cotacoes;
create policy etapas_all      on public.etapas      for all using (public.is_membro(casa_id)) with check (public.is_membro(casa_id));
create policy lancamentos_all on public.lancamentos for all using (public.is_membro(casa_id)) with check (public.is_membro(casa_id));
create policy cotacoes_all    on public.cotacoes    for all using (public.is_membro(casa_id)) with check (public.is_membro(casa_id));

-- ---------------------------------------------------------------- funções

-- Cria uma obra e coloca quem chamou como membro.
create or replace function public.criar_casa(p_nome text)
returns public.casas
language plpgsql security definer set search_path = public
as $$
declare c public.casas;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar logado';
  end if;
  insert into public.casas (nome)
    values (coalesce(nullif(trim(p_nome), ''), 'Obra do Apê'))
    returning * into c;
  insert into public.membros (casa_id, user_id) values (c.id, auth.uid());
  return c;
end;
$$;

-- Aceita os convites enviados para o e-mail (confirmado) de quem está logado.
create or replace function public.aceitar_convites()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_email text;
  n integer := 0;
begin
  select lower(email) into v_email
    from auth.users
   where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then
    return 0;
  end if;
  insert into public.membros (casa_id, user_id)
    select casa_id, auth.uid() from public.convites where lower(email) = v_email
    on conflict do nothing;
  get diagnostics n = row_count;
  delete from public.convites where lower(email) = v_email;
  return n;
end;
$$;

-- ---------------------------------------------------------------- permissões
-- Projetos novos do Supabase não liberam tabelas novas para a API sozinhos.
-- Só quem está logado (authenticated) recebe acesso; as policies acima
-- decidem o que cada um vê. Visitantes sem login (anon) não acessam nada.

grant usage on schema public to authenticated;
grant select, update                 on public.casas       to authenticated;
grant select                         on public.membros     to authenticated;
grant select, insert, delete         on public.convites    to authenticated;
grant select, insert, update, delete on public.etapas      to authenticated;
grant select, insert, update, delete on public.lancamentos to authenticated;
grant select, insert, update, delete on public.cotacoes    to authenticated;

revoke execute on function public.criar_casa(text)   from public, anon;
revoke execute on function public.aceitar_convites() from public, anon;
grant  execute on function public.criar_casa(text)   to authenticated;
grant  execute on function public.aceitar_convites() to authenticated;
