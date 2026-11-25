import { chaveMes, hojeISO, somarMeses } from './format';
import type { DadosObra, Etapa, Lancamento, NovaLinha } from './types';

export interface PorEtapa { pago: number; aPagar: number; cotacoes: number }

export interface Resumo {
  hoje: string;
  porEtapa: Record<string, PorEtapa>;
  pago: number;
  aPagar: number;
  comprometido: number;
  vencido: number;
  nVencidos: number;
  previsto: number;
  total: number;
  reservaPct: number;
  reserva: number;
  livre: number;
}

export function resumir(d: DadosObra, hoje = hojeISO()): Resumo {
  const porEtapa: Record<string, PorEtapa> = {};
  for (const e of d.etapas) porEtapa[e.id] = { pago: 0, aPagar: 0, cotacoes: 0 };
  let pago = 0, aPagar = 0, vencido = 0, nVencidos = 0;
  for (const l of d.lancamentos) {
    const v = Number(l.valor) || 0;
    if (l.pago) pago += v;
    else {
      aPagar += v;
      if (l.data < hoje) { vencido += v; nVencidos++; }
    }
    const pe = l.etapa_id ? porEtapa[l.etapa_id] : undefined;
    if (pe) { if (l.pago) pe.pago += v; else pe.aPagar += v; }
  }
  for (const c of d.cotacoes) { const pe = c.etapa_id ? porEtapa[c.etapa_id] : undefined; if (pe) pe.cotacoes++; }
  const previsto = d.etapas.reduce((a, e) => a + (Number(e.orcado) || 0), 0);
  const total = Number(d.casa.orcamento_total) || 0;
  const reservaPct = Number(d.casa.reserva_pct ?? 10);
  const reserva = (total * reservaPct) / 100;
  const comprometido = pago + aPagar;
  return { hoje, porEtapa, pago, aPagar, comprometido, vencido, nVencidos, previsto, total, reservaPct, reserva, livre: total - comprometido };
}

export const ordenarEtapas = (etapas: Etapa[]) =>
  [...etapas].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));

export const ordenarLancamentos = (ls: Lancamento[]) =>
  [...ls].sort((a, b) => a.data.localeCompare(b.data) || a.descricao.localeCompare(b.descricao));

export function porMes(ls: Lancamento[]) {
  const m = new Map<string, { pago: number; aPagar: number }>();
  for (const l of ls) {
    const k = chaveMes(l.data);
    const cur = m.get(k) ?? { pago: 0, aPagar: 0 };
    if (l.pago) cur.pago += Number(l.valor) || 0; else cur.aPagar += Number(l.valor) || 0;
    m.set(k, cur);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Divide uma compra em parcelas mensais. Trabalha em centavos para a soma das
 * parcelas bater exatamente com o total; a diferença do arredondamento vai na última.
 */
export function gerarParcelas(
  base: Omit<NovaLinha<'lancamentos'>, 'valor' | 'data' | 'pago' | 'pago_em' | 'parcela' | 'grupo'>,
  valorTotal: number,
  n: number,
  primeiraData: string,
  primeiraJaPaga: boolean,
  grupo: string,
  hoje = hojeISO(),
): NovaLinha<'lancamentos'>[] {
  const qtd = Math.max(1, Math.min(60, Math.round(n)));
  const centavos = Math.round(valorTotal * 100);
  const cada = Math.floor(centavos / qtd);
  return Array.from({ length: qtd }, (_, i) => {
    const valor = (i === qtd - 1 ? centavos - cada * (qtd - 1) : cada) / 100;
    const pago = primeiraJaPaga && i === 0;
    return {
      ...base,
      valor,
      data: somarMeses(primeiraData, i),
      pago,
      pago_em: pago ? hoje : null,
      parcela: qtd > 1 ? `${i + 1}/${qtd}` : null,
      grupo: qtd > 1 ? grupo : null,
    };
  });
}
