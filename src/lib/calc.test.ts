import { describe, expect, it } from 'vitest';
import { gerarParcelas, resumir } from './calc';
import { parseBRL, somarMeses } from './format';
import type { DadosObra } from './types';

describe('parseBRL', () => {
  it('lê os formatos que as pessoas digitam', () => {
    expect(parseBRL('1.250,00')).toBe(1250);
    expect(parseBRL('1250,5')).toBe(1250.5);
    expect(parseBRL('1250')).toBe(1250);
    expect(parseBRL('50.000')).toBe(50000);
    expect(parseBRL('1.234.567')).toBe(1234567);
    expect(parseBRL('R$ 300')).toBe(300);
    expect(parseBRL('12.5')).toBe(12.5);
    expect(parseBRL('')).toBeNaN();
    expect(parseBRL('abc')).toBeNaN();
  });
});

describe('somarMeses', () => {
  it('prende o dia no fim do mês', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(somarMeses('2026-11-15', 2)).toBe('2027-01-15');
  });
});

describe('gerarParcelas', () => {
  const base = { casa_id: 'c', descricao: 'Sofá', etapa_id: null, tipo: 'Móvel', forma: 'Cartão de crédito', fornecedor: null, pago_por: null, notas: null };
  it('divide em centavos e a soma bate com o total', () => {
    const ps = gerarParcelas(base, 1000, 3, '2026-12-10', true, 'g1', '2026-11-25');
    expect(ps.map(p => p.valor)).toEqual([333.33, 333.33, 333.34]);
    expect(ps.reduce((a, p) => a + p.valor, 0)).toBeCloseTo(1000, 2);
    expect(ps.map(p => p.data)).toEqual(['2026-12-10', '2027-01-10', '2027-02-10']);
    expect(ps.map(p => p.parcela)).toEqual(['1/3', '2/3', '3/3']);
    expect(ps.map(p => p.pago)).toEqual([true, false, false]);
    expect(ps[0].pago_em).toBe('2026-11-25');
  });
  it('à vista não tem grupo nem rótulo de parcela', () => {
    const [p] = gerarParcelas(base, 500, 1, '2026-12-01', false, 'g2');
    expect(p.parcela).toBeNull();
    expect(p.grupo).toBeNull();
  });
});

describe('resumir', () => {
  it('soma pago, a pagar, vencido e livre', () => {
    const d: DadosObra = {
      casa: { id: 'c', nome: 'x', subtitulo: null, orcamento_total: 10000, reserva_pct: 10, area_m2: 50 },
      etapas: [{ id: 'e1', casa_id: 'c', nome: 'Piso', ordem: 1, status: 'a_fazer', orcado: 3000, fornecedor: null, inicio: null, fim: null, notas: null }],
      lancamentos: [
        { id: 'l1', casa_id: 'c', etapa_id: 'e1', descricao: 'Sinal', valor: 1000, data: '2026-11-01', tipo: null, forma: null, fornecedor: null, pago_por: null, pago: true, pago_em: null, parcela: null, grupo: null, notas: null },
        { id: 'l2', casa_id: 'c', etapa_id: 'e1', descricao: 'Resto', valor: 2500, data: '2026-11-20', tipo: null, forma: null, fornecedor: null, pago_por: null, pago: false, pago_em: null, parcela: null, grupo: null, notas: null },
      ],
      cotacoes: [],
    };
    const r = resumir(d, '2026-11-25');
    expect(r.pago).toBe(1000);
    expect(r.aPagar).toBe(2500);
    expect(r.nVencidos).toBe(1);
    expect(r.livre).toBe(6500);
    expect(r.reserva).toBe(1000);
    expect(r.porEtapa.e1).toEqual({ pago: 1000, aPagar: 2500, cotacoes: 0 });
  });
});
