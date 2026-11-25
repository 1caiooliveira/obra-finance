import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ETAPAS_PADRAO } from '../lib/defaults';
import type { Casa, Cotacao, DadosObra, Etapa, Lancamento, LinhaDe, NovaLinha, Tabela } from '../lib/types';

export interface Sessao { userId: string; email: string }

export interface Api {
  modo: 'supabase' | 'demo';
  sessao(): Promise<Sessao | null>;
  aoMudarSessao(cb: (s: Sessao | null) => void): () => void;
  entrar(email: string, senha: string): Promise<void>;
  criarConta(email: string, senha: string): Promise<{ precisaConfirmar: boolean }>;
  sair(): Promise<void>;
  /** Aceita convites pendentes e devolve a obra de quem está logado, se houver. */
  minhaCasa(): Promise<Casa | null>;
  criarCasa(nome: string): Promise<Casa>;
  carregar(casaId: string): Promise<DadosObra>;
  salvarCasa(id: string, patch: Partial<Omit<Casa, 'id'>>): Promise<void>;
  inserir<T extends Tabela>(tabela: T, linhas: NovaLinha<T>[]): Promise<void>;
  atualizar<T extends Tabela>(tabela: T, id: string, patch: Partial<LinhaDe<T>>): Promise<void>;
  excluir(tabela: Tabela, ids: string[]): Promise<void>;
  convidar(casaId: string, email: string): Promise<void>;
  convites(casaId: string): Promise<string[]>;
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const numOuNull = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function normCasa(r: Record<string, unknown>): Casa {
  return { ...(r as unknown as Casa), orcamento_total: num(r.orcamento_total), reserva_pct: num(r.reserva_pct ?? 10), area_m2: numOuNull(r.area_m2) };
}
const normEtapa = (r: Record<string, unknown>): Etapa => ({ ...(r as unknown as Etapa), orcado: num(r.orcado) });
const normLanc = (r: Record<string, unknown>): Lancamento => ({ ...(r as unknown as Lancamento), valor: num(r.valor) });
const normCot = (r: Record<string, unknown>): Cotacao => ({ ...(r as unknown as Cotacao), valor: num(r.valor) });

/** Mensagens de erro do Supabase traduzidas para algo que dá para agir. */
export function mensagemErro(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirme o e-mail pelo link que enviamos antes de entrar.';
  if (/User already registered/i.test(msg)) return 'Esse e-mail já tem conta. Use "Entrar".';
  if (/Password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/rate limit/i.test(msg)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem conexão com o servidor. Confira a internet.';
  if (/row-level security/i.test(msg)) return 'Sem permissão para alterar esta obra.';
  return msg;
}

/* ------------------------------------------------------------------ Supabase */

function apiSupabase(sb: SupabaseClient): Api {
  const ok = <T,>(r: { data: T | null; error: unknown }): T => { if (r.error) throw r.error; return r.data as T; };
  const paraSessao = (u: { id: string; email?: string } | null | undefined): Sessao | null => (u ? { userId: u.id, email: u.email ?? '' } : null);

  return {
    modo: 'supabase',
    async sessao() { const { data } = await sb.auth.getSession(); return paraSessao(data.session?.user); },
    aoMudarSessao(cb) {
      const { data } = sb.auth.onAuthStateChange((_ev, s) => cb(paraSessao(s?.user)));
      return () => data.subscription.unsubscribe();
    },
    async entrar(email, senha) {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
    },
    async criarConta(email, senha) {
      const { data, error } = await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      return { precisaConfirmar: !data.session };
    },
    async sair() { await sb.auth.signOut(); },
    async minhaCasa() {
      ok(await sb.rpc('aceitar_convites'));
      const rows = ok(await sb.from('casas').select('*').order('created_at').limit(1));
      return rows && rows.length ? normCasa(rows[0]) : null;
    },
    async criarCasa(nome) {
      const c = normCasa(ok(await sb.rpc('criar_casa', { p_nome: nome })) as Record<string, unknown>);
      ok(await sb.from('etapas').insert(ETAPAS_PADRAO.map((e, i) => ({ ...e, casa_id: c.id, ordem: i + 1 }))));
      return c;
    },
    async carregar(casaId) {
      const [c, e, l, k] = await Promise.all([
        sb.from('casas').select('*').eq('id', casaId).single(),
        sb.from('etapas').select('*').eq('casa_id', casaId),
        sb.from('lancamentos').select('*').eq('casa_id', casaId),
        sb.from('cotacoes').select('*').eq('casa_id', casaId),
      ]);
      return {
        casa: normCasa(ok(c)),
        etapas: ok(e).map(normEtapa),
        lancamentos: ok(l).map(normLanc),
        cotacoes: ok(k).map(normCot),
      };
    },
    async salvarCasa(id, patch) { ok(await sb.from('casas').update(patch).eq('id', id)); },
    async inserir(tabela, linhas) { if (linhas.length) ok(await sb.from(tabela).insert(linhas as never)); },
    async atualizar(tabela, id, patch) { ok(await sb.from(tabela).update(patch as never).eq('id', id)); },
    async excluir(tabela, ids) { if (ids.length) ok(await sb.from(tabela).delete().in('id', ids)); },
    async convidar(casaId, email) {
      const r = await sb.from('convites').insert({ casa_id: casaId, email: email.trim().toLowerCase() });
      if (r.error && !/duplicate key/i.test(r.error.message)) throw r.error;
    },
    async convites(casaId) {
      const rows = ok(await sb.from('convites').select('email').eq('casa_id', casaId));
      return (rows ?? []).map((r: { email: string }) => r.email);
    },
  };
}

/* ------------------------------------------------------- Demonstração (local) */

interface BancoDemo { casa: Casa | null; etapas: Etapa[]; lancamentos: Lancamento[]; cotacoes: Cotacao[] }
const CHAVE_DEMO = 'canteiro-demo';

function apiDemo(): Api {
  const ler = (): BancoDemo => {
    try { const s = localStorage.getItem(CHAVE_DEMO); if (s) return JSON.parse(s); } catch { /* sem storage */ }
    return { casa: null, etapas: [], lancamentos: [], cotacoes: [] };
  };
  let mem = ler();
  const gravar = () => { try { localStorage.setItem(CHAVE_DEMO, JSON.stringify(mem)); } catch { /* sem storage */ } };
  const id = () => crypto.randomUUID();
  const sessao: Sessao = { userId: 'demo', email: 'demonstração' };
  const espera = () => new Promise(r => setTimeout(r, 80));

  return {
    modo: 'demo',
    async sessao() { return sessao; },
    aoMudarSessao() { return () => {}; },
    async entrar() {},
    async criarConta() { return { precisaConfirmar: false }; },
    async sair() {},
    async minhaCasa() { return mem.casa; },
    async criarCasa(nome) {
      const casa: Casa = { id: id(), nome: nome || 'Obra do Apê', subtitulo: null, orcamento_total: 0, reserva_pct: 10, area_m2: null };
      mem = { casa, etapas: ETAPAS_PADRAO.map((e, i) => ({ ...e, id: id(), casa_id: casa.id, ordem: i + 1, orcado: 0, fornecedor: null, inicio: null, fim: null })), lancamentos: [], cotacoes: [] };
      gravar();
      return casa;
    },
    async carregar() {
      await espera();
      if (!mem.casa) throw new Error('Obra não encontrada');
      return structuredClone({ casa: mem.casa, etapas: mem.etapas, lancamentos: mem.lancamentos, cotacoes: mem.cotacoes });
    },
    async salvarCasa(_id, patch) { if (mem.casa) mem.casa = { ...mem.casa, ...patch }; gravar(); },
    async inserir(tabela, linhas) {
      const lista = mem[tabela] as unknown as Record<string, unknown>[];
      for (const l of linhas) lista.push({ ...(l as object), id: id() });
      gravar();
    },
    async atualizar(tabela, rid, patch) {
      const lista = mem[tabela] as unknown as Record<string, unknown>[];
      const i = lista.findIndex(x => x.id === rid);
      if (i >= 0) lista[i] = { ...lista[i], ...(patch as object) };
      gravar();
    },
    async excluir(tabela, ids) {
      const set = new Set(ids);
      const lista = mem[tabela] as unknown as { id: string }[];
      (mem as unknown as Record<string, unknown>)[tabela] = lista.filter(x => !set.has(x.id));
      if (tabela === 'etapas') {
        for (const l of mem.lancamentos) if (l.etapa_id && set.has(l.etapa_id)) l.etapa_id = null;
        for (const c of mem.cotacoes) if (c.etapa_id && set.has(c.etapa_id)) c.etapa_id = null;
      }
      gravar();
    },
    async convidar() { throw new Error('Convites funcionam só com o Supabase configurado.'); },
    async convites() { return []; },
  };
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const api: Api = url && chave ? apiSupabase(createClient(url, chave)) : apiDemo();
