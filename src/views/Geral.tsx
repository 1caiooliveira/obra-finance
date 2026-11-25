import type { ReactNode } from 'react';
import { ordenarEtapas, porMes } from '../lib/calc';
import { chaveMes, fmt, fmtData, rotuloMes } from '../lib/format';
import { ST_ETAPA, type Etapa } from '../lib/types';
import { nomeEtapa, type Ctx } from './ctx';
import { formEtapa, formLancamento } from './forms';

export default function Geral({ ctx }: { ctx: Ctx }) {
  const { dados, r } = ctx;
  const etapas = ordenarEtapas(dados.etapas);

  const alertas: [string, ReactNode][] = [];
  if (r.nVencidos) alertas.push(['bad', <><b>{r.nVencidos} {r.nVencidos > 1 ? 'pagamentos vencidos' : 'pagamento vencido'}</b> somando {fmt(r.vencido)}. Marque como pago ou ajuste a data.</>]);
  if (r.total > 0 && r.comprometido > r.total) alertas.push(['bad', <><b>O comprometido passou do orçamento total</b> em {fmt(r.comprometido - r.total)}.</>]);
  else if (r.total > 0 && r.reserva > 0 && r.comprometido > r.total - r.reserva) alertas.push(['warn', <><b>A reserva de contingência começou a ser usada.</b> Restam {fmt(r.total - r.comprometido)}.</>]);
  for (const e of etapas) {
    const pe = r.porEtapa[e.id];
    const comp = pe.pago + pe.aPagar;
    if (e.orcado > 0 && comp > e.orcado) alertas.push(['warn', <><b>{e.nome}</b> passou {fmt(comp - e.orcado)} do previsto.</>]);
  }
  const semPrevisto = etapas.filter(e => !(e.orcado > 0) && e.status !== 'concluida');
  if (semPrevisto.length) {
    alertas.push(['info', <><b>{semPrevisto.length} {semPrevisto.length > 1 ? 'etapas ainda sem valor previsto' : 'etapa ainda sem valor previsto'}</b>: {semPrevisto.slice(0, 4).map(e => e.nome).join(', ')}{semPrevisto.length > 4 ? '…' : ''}. Cadastre as cotações para fechar a conta.</>]);
  }

  const proximos = dados.lancamentos.filter(l => !l.pago).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 7);
  const concluidas = etapas.filter(e => e.status === 'concluida').length;
  const destaque = [...etapas.filter(e => e.status === 'andamento'), ...etapas.filter(e => e.status === 'a_fazer').slice(0, 3)];
  const meses = porMes(dados.lancamentos);
  const maxMes = Math.max(1, ...meses.map(([, m]) => m.pago + m.aPagar));
  const mesAtual = chaveMes(r.hoje);

  return (
    <>
      {alertas.length > 0 && (
        <div className="alerts">{alertas.map(([k, n], i) => <div key={i} className={'alert ' + k}>{n}</div>)}</div>
      )}

      <div className="grid2">
        <div className="card">
          <div className="card-head">
            <h2>Próximos pagamentos</h2>
            <button className="btn ghost small" onClick={() => ctx.irPara('caixa')}>Ver caixa →</button>
          </div>
          {proximos.length ? (
            <div className="list">
              {proximos.map(l => (
                <div key={l.id} className="li">
                  <span className={'date-chip num' + (l.data < r.hoje ? ' over' : '')}>{fmtData(l.data)}</span>
                  <div className="main">
                    <div className="title">{l.descricao}{l.parcela && <span className="tag num">{l.parcela}</span>}</div>
                    <div className="meta">{[nomeEtapa(ctx, l.etapa_id), l.forma].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span className="val num">{fmt(l.valor)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">Nada a pagar por enquanto.<button className="btn small" onClick={() => ctx.abrir(formLancamento(ctx))}>Lançar um gasto</button></div>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h2>Etapas</h2><span className="muted num">{concluidas} de {etapas.length} concluídas</span></div>
          <div className="progress" role="img" aria-label={`${concluidas} de ${etapas.length} etapas concluídas`}>
            <span style={{ width: `${etapas.length ? (concluidas / etapas.length) * 100 : 0}%` }} />
          </div>
          {etapas.length ? (
            <>
              <div className="list">{destaque.map(e => <MiniEtapa key={e.id} e={e} ctx={ctx} />)}</div>
              <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => ctx.irPara('etapas')}>Ver todas as etapas →</button>
            </>
          ) : (
            <div className="empty">Nenhuma etapa cadastrada.<button className="btn small" onClick={() => ctx.abrir(formEtapa(ctx))}>Adicionar etapa</button></div>
          )}
        </div>
      </div>

      {meses.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h2>Saídas por mês</h2>
            <span className="muted" style={{ fontSize: 12.5 }}>
              <i className="dot" style={{ background: 'var(--paid)' }} />pago
              <i className="dot" style={{ background: 'var(--due)', marginLeft: 12 }} />a pagar
            </span>
          </div>
          <div className="mchart">
            {meses.map(([k, m]) => (
              <div key={k} className={'mrow' + (k === mesAtual ? ' now' : '')}>
                <span className="lbl">{rotuloMes(k)}</span>
                <div className="mtrack">
                  <span style={{ background: 'var(--paid)', width: `${(m.pago / maxMes) * 100}%` }} />
                  <span style={{ background: 'var(--due)', width: `${(m.aPagar / maxMes) * 100}%` }} />
                </div>
                <span className="v num">{fmt(m.pago + m.aPagar)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function MiniEtapa({ e, ctx }: { e: Etapa; ctx: Ctx }) {
  const pe = ctx.r.porEtapa[e.id];
  const comp = pe.pago + pe.aPagar;
  return (
    <div className="li">
      <span className={'pill ' + e.status}>{ST_ETAPA[e.status]}</span>
      <div className="main">
        <div className="title">{e.nome}</div>
        <div className="meta num">{e.orcado > 0 ? `${fmt(comp)} de ${fmt(e.orcado)}` : comp > 0 ? `${fmt(comp)} · sem previsto` : 'sem previsto'}</div>
      </div>
      <span className="meta num">{e.inicio ? fmtData(e.inicio) : ''}</span>
    </div>
  );
}
