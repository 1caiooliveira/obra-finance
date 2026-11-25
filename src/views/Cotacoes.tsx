import { ordenarEtapas } from '../lib/calc';
import { fmt } from '../lib/format';
import { ST_COTACAO, type Cotacao, type Etapa } from '../lib/types';
import type { Ctx } from './ctx';
import { fecharCotacao, formCotacao } from './forms';

const ORDEM_STATUS = ['fechado', 'cotando', 'descartado'];

export default function Cotacoes({ ctx }: { ctx: Ctx }) {
  const { dados } = ctx;
  const toolbar = (
    <div className="toolbar">
      <p className="muted">Junte os orçamentos de cada serviço. Ao fechar um, o valor vira o previsto da etapa.</p>
      <button className="btn" onClick={() => ctx.abrir(formCotacao(ctx))}>+ Cotação</button>
    </div>
  );
  if (!dados.cotacoes.length) {
    return (
      <>
        {toolbar}
        <div className="empty">
          <b>Nenhuma cotação ainda.</b>
          Cadastre os orçamentos que vocês já têm (pedreiro, vidro, persiana) para comparar e fechar.
          <button className="btn primary small" onClick={() => ctx.abrir(formCotacao(ctx))}>+ Primeira cotação</button>
        </div>
      </>
    );
  }

  const idsEtapas = new Set(dados.etapas.map(e => e.id));
  const grupos: [string, Etapa | null, Cotacao[]][] = [
    ...ordenarEtapas(dados.etapas).map(e => [e.id, e, dados.cotacoes.filter(c => c.etapa_id === e.id)] as [string, Etapa, Cotacao[]]),
    ['_sem', null, dados.cotacoes.filter(c => !c.etapa_id || !idsEtapas.has(c.etapa_id))],
  ];

  return (
    <>
      {toolbar}
      {grupos.filter(([, , cs]) => cs.length).map(([k, e, cs]) => {
        const abertas = cs.filter(c => c.status === 'cotando' && c.valor > 0);
        const menor = abertas.length > 1 ? Math.min(...abertas.map(c => c.valor)) : null;
        const ordenadas = [...cs].sort((a, b) => ORDEM_STATUS.indexOf(a.status) - ORDEM_STATUS.indexOf(b.status) || a.valor - b.valor);
        return (
          <section key={k} className="cgroup">
            <div className="card-head">
              <h2>{e?.nome ?? 'Sem etapa'}</h2>
              <span className="muted num">{e && e.orcado > 0 ? `Previsto ${fmt(e.orcado)}` : 'sem previsto'}</span>
            </div>
            {ordenadas.map(c => (
              <div key={c.id} className={'cot ' + c.status}>
                <div className="main">
                  <div className="title">
                    {c.fornecedor}
                    {menor !== null && c.status === 'cotando' && c.valor === menor && <span className="tag best">menor preço</span>}
                  </div>
                  {(c.tipo || c.contato || c.notas) && <div className="meta">{[c.tipo, c.contato, c.notas].filter(Boolean).join(' · ')}</div>}
                </div>
                <div className="acts">
                  <span className="val num">{c.valor > 0 ? fmt(c.valor) : 'sem valor'}</span>
                  <span className={'pill ' + c.status}>{ST_COTACAO[c.status]}</span>
                  {c.status === 'cotando' && <button className="btn small" onClick={() => fecharCotacao(ctx, c)}>Fechar</button>}
                  <button className="icon-btn" aria-label={`Editar cotação ${c.fornecedor}`} onClick={() => ctx.abrir(formCotacao(ctx, c))}>✎</button>
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}
