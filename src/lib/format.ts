const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmt = (v: number | null | undefined) => BRL.format(Number(v) || 0);

export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDe = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hojeISO = () => isoDe(new Date());

/** Soma meses a uma data ISO, prendendo o dia ao último dia do mês (31/01 + 1 = 28/02). */
export function somarMeses(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const alvo = new Date(y, m - 1 + n, 1);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(d, ultimo));
  return isoDe(alvo);
}

export function fmtData(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const ano = y === String(new Date().getFullYear()) ? '' : ` ${y.slice(2)}`;
  return `${d} ${MESES[Number(m) - 1]}${ano}`;
}

export const chaveMes = (iso: string | null | undefined) => (iso || '').slice(0, 7);
export function rotuloMes(k: string): string {
  if (!k) return 'sem data';
  const [y, m] = k.split('-');
  return `${MESES[Number(m) - 1]}/${y.slice(2)}`;
}
export function mesPorExtenso(k: string): string {
  if (!k) return 'Sem data';
  const [y, m] = k.split('-');
  return `${MESES_LONGOS[Number(m) - 1]} de ${y}`;
}

/**
 * Lê um valor em reais do jeito que as pessoas digitam:
 * "1.250,00", "1250,5", "1250", "50.000" (milhar sem centavos), "R$ 300".
 */
export function parseBRL(entrada: string): number {
  let s = entrada.replace(/[R$\s]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

export const paraCampoDinheiro = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(Number(v)) ? '' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
