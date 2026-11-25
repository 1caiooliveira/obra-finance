import type { FormSpec } from '../components/FormModal';
import type { Resumo } from '../lib/calc';
import type { DadosObra } from '../lib/types';

export type Aba = 'geral' | 'etapas' | 'caixa' | 'cotacoes';

/** O que toda tela da obra recebe. */
export interface Ctx {
  dados: DadosObra;
  r: Resumo;
  /** Executa uma alteração, recarrega os dados e mostra o aviso. Devolve se deu certo. */
  agir: (fn: () => Promise<unknown>, aviso?: string) => Promise<boolean>;
  abrir: (f: FormSpec) => void;
  irPara: (a: Aba) => void;
}

export const nomeEtapa = (ctx: Ctx, id: string | null) =>
  ctx.dados.etapas.find(e => e.id === id)?.nome ?? 'Sem etapa';

export const unicos = (xs: (string | null | undefined)[]) =>
  [...new Set(xs.filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b));
