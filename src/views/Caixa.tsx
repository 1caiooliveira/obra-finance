import { useState } from 'react';
import { api } from '../data/api';
import { ordenarEtapas, ordenarLancamentos } from '../lib/calc';
import { chaveMes, fmt, fmtData, hojeISO, mesPorExtenso } from '../lib/format';
import { TIPOS, type Lancamento } from '../lib/types';
import { nomeEtapa, type Ctx } from './ctx';
import { formLancamento } from './forms';

const soma = (ls: Lancamento[]) => ls.reduce((a, l) => a + l.valor, 0);

export default function Caixa({ ctx }: { ctx: Ctx }) {
  const { dados, r } = ctx;
  const [fEtapa, setFEtapa] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fTipo, setFTipo] = useState('');
  const idsEtapas = new Set(dados.etapas.map(e => e.id));

  const novo = () => ctx.abrir(formLancamento(ctx, undefined, fEtapa && fEtapa !== '_sem' ? fEtapa : ''));
  const toolbar = (
    <div className="toolbar">
      <div className="filters">
        <select aria-label="Filtrar por etapa" value={fEtapa} onChange={e => setFEtapa(e.target.value)}>
          <option value="">Todas as etapas</option>
          {ordenarEtapas(dados.etapas).map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          <option value="_sem">Sem etapa</option>
        </select>
        <select aria-label="Filtrar por situação" value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="">Pagos e a pagar</option>
          <option value="aberto">Só a pagar</option>
          <option value="pago">Só pagos</option>
        </select>
        <select aria-label="Filtrar por tipo" value={fTipo} onChange={e => setFTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <button className="btn" onClick={novo}>+ Lançamento</button>
    </div>
  );

  if (!dados.lancamentos.length) {
    return (
      <>
        {toolbar}
        <div className="empty">
          <b>Nenhum lançamento ainda.</b>
          Comece pelo sinal do pedreiro, do vidraceiro ou da persiana. Compras parceladas viram uma linha por parcela.
          <button className="btn primary small" onClick={novo}>+ Primeiro lançamento</button>
        </div>
      </>
    );
  }

  const lista = ordenarLancamentos(dados.lancamentos.filter(l =>
    (!fEtapa || (fEtapa === '_sem' ? !l.etapa_id || !idsEtapas.has(l.etapa_id) : l.etapa_id === fEtapa)) &&
    (!fStatus || (fStatus === 'pago' ? l.pago : !l.pago)) &&
    (!fTipo || l.tipo === fTipo),
  ));
  const grupos = new Map<string, Lancamento[]>();
  for (const l of lista) {
    const k = chaveMes(l.data);
    grupos.set(k, [...(grupos.get(k) ?? []), l]);
  }

  const marcar = (l: Lancamento, pago: boolean) =>
    ctx.agir(() => api.atualizar('lancamentos', l.id, { pago, pago_em: pago ? hojeISO() : null }), pago ? 'Marcado como pago' : 'Voltou para a pagar');

  return (
    <>
      {toolbar}
      <div className="totals num">
        <span>{lista.length} {lista.length === 1 ? 'lançamento' : 'lançamentos'}</span>
        <span>Total <b>{fmt(soma(lista))}</b></span>
        <span>Pago <b>{fmt(soma(lista.filter(l => l.pago)))}</b></span>
        <span>A pagar <b>{fmt(soma(lista.filter(l => !l.pago)))}</b></span>
      </div>
      {!lista.length && <div className="empty">Nenhum lançamento com esses filtros.</div>}
      {[...grupos].map(([k, ls]) => (
        <section key={k} className="month-list">
          <div className="month-head">
            <h3>{mesPorExtenso(k)}</h3>
            <span className="sub num">pago {fmt(soma(ls.filter(l => l.pago)))} · a pagar {fmt(soma(ls.filter(l => !l.pago)))}</span>
          </div>
          {ls.map(l => {
            const vencido = !l.pago && l.data < r.hoje;
            return (
              <div key={l.id} className={'lanc' + (l.pago ? ' paid' : '')}>
                <input type="checkbox" checked={l.pago} aria-label={`${l.pago ? 'Desmarcar pago' : 'Marcar como pago'}: ${l.descricao}`} onChange={e => marcar(l, e.target.checked)} />
                <span className={'date-chip num' + (vencido ? ' over' : '')}>{fmtData(l.data)}</span>
                <div className="main">
                  <div className="title">
                    {l.descricao}
                    {l.parcela && <span className="tag num">{l.parcela}</span>}
                    {vencido && <span className="tag over">vencido</span>}
                  </div>
                  <div className="meta">{[nomeEtapa(ctx, l.etapa_id), l.tipo, l.forma, l.fornecedor, l.pago_por ? `pago por ${l.pago_por}` : null].filter(Boolean).join(' · ')}</div>
                </div>
                <span className="val num">{fmt(l.valor)}</span>
                <button className="icon-btn edit" aria-label={`Editar ${l.descricao}`} onClick={() => ctx.abrir(formLancamento(ctx, l))}>✎</button>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
