import { api } from '../data/api';
import { ordenarEtapas } from '../lib/calc';
import { fmt, fmtData, hojeISO } from '../lib/format';
import { ST_ETAPA, ST_PROXIMO, type Etapa } from '../lib/types';
import type { Ctx } from './ctx';
import { formEtapa } from './forms';

function avancar(ctx: Ctx, e: Etapa) {
  const status = ST_PROXIMO[e.status];
  const patch: Partial<Etapa> = { status };
  if (status === 'andamento' && !e.inicio) patch.inicio = hojeISO();
  if (status === 'concluida' && !e.fim) patch.fim = hojeISO();
  return ctx.agir(() => api.atualizar('etapas', e.id, patch), `${e.nome}: ${ST_ETAPA[status].toLowerCase()}`);
}

export default function Etapas({ ctx }: { ctx: Ctx }) {
  const etapas = ordenarEtapas(ctx.dados.etapas);
  return (
    <>
      <div className="toolbar">
        <p className="muted">Toque no status para avançar a etapa.</p>
        <button className="btn" onClick={() => ctx.abrir(formEtapa(ctx))}>+ Etapa</button>
      </div>
      {!etapas.length && <div className="empty">Nenhuma etapa ainda. Comece pelo planejamento e pela aprovação no condomínio.</div>}
      {etapas.map((e, i) => {
        const pe = ctx.r.porEtapa[e.id];
        const comp = pe.pago + pe.aPagar;
        const base = Math.max(e.orcado, comp, 1);
        const datas = e.inicio || e.fim ? `${fmtData(e.inicio)} → ${fmtData(e.fim)}` : null;
        const meta = [e.fornecedor, datas, pe.cotacoes ? `${pe.cotacoes} ${pe.cotacoes > 1 ? 'cotações' : 'cotação'}` : null].filter(Boolean).join(' · ');
        return (
          <article key={e.id} className={'etapa' + (e.status === 'concluida' ? ' done' : '')}>
            <div className="n num">{String(i + 1).padStart(2, '0')}</div>
            <div className="body">
              <div className="row1">
                <div className="main">
                  <h3>{e.nome}</h3>
                  {meta && <div className="meta">{meta}</div>}
                </div>
                <div className="acts">
                  <button className={'pill ' + e.status} title="Avançar status" onClick={() => avancar(ctx, e)}>{ST_ETAPA[e.status]}</button>
                  <button className="icon-btn" aria-label={`Editar etapa ${e.nome}`} onClick={() => ctx.abrir(formEtapa(ctx, e))}>✎</button>
                </div>
              </div>
              {e.notas && <p className="notes">{e.notas}</p>}
              <div className="money-row">
                <div className={'track' + (e.orcado > 0 && comp > e.orcado ? ' over' : '')} role="img"
                  aria-label={`Pago ${fmt(pe.pago)}, a pagar ${fmt(pe.aPagar)}${e.orcado ? `, previsto ${fmt(e.orcado)}` : ''}`}>
                  <span style={{ width: `${(pe.pago / base) * 100}%`, background: 'var(--paid)' }} />
                  <span style={{ width: `${(pe.aPagar / base) * 100}%`, background: 'var(--due)' }} />
                </div>
                <span className="num"><b>{fmt(comp)}</b><span className="muted">{e.orcado > 0 ? ` de ${fmt(e.orcado)}` : ' · sem previsto'}</span></span>
              </div>
            </div>
          </article>
        );
      })}
    </>
  );
}
