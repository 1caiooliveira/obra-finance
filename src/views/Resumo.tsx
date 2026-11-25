import { fmt } from '../lib/format';
import type { Ctx } from './ctx';

export default function Resumo({ ctx, onConfig }: { ctx: Ctx; onConfig: () => void }) {
  const { r, dados } = ctx;
  const temTotal = r.total > 0;
  const base = temTotal ? Math.max(r.total, r.comprometido) : Math.max(r.previsto, r.comprometido, 1);
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / base) * 100))}%`;
  const estourou = temTotal && r.comprometido > r.total;
  const area = dados.casa.area_m2 ?? 0;

  return (
    <section className="summary" aria-label="Resumo do caixa">
      <div className="sum-head">
        <div>
          <div className="eyebrow">{temTotal ? (estourou ? 'Acima do orçamento' : 'Livre no orçamento') : 'Comprometido até agora'}</div>
          <div className="big num" style={estourou ? { color: 'var(--bad)' } : undefined}>
            {fmt(temTotal ? Math.abs(r.livre) : r.comprometido)} {temTotal && <small>de {fmt(r.total)}</small>}
          </div>
        </div>
        <button className="btn small" onClick={onConfig}>{temTotal ? 'Editar orçamento' : 'Definir orçamento total'}</button>
      </div>

      <div className="bar-wrap">
        <div className="stackbar" role="img" aria-label={`Pago ${fmt(r.pago)}, a pagar ${fmt(r.aPagar)}`}>
          <span style={{ width: pct(r.pago), background: 'var(--paid)' }} />
          <span style={{ width: pct(r.aPagar), background: 'var(--due)' }} />
        </div>
        {temTotal && r.reserva > 0 && (
          <div className="reserve-mark" style={{ left: `calc(${pct(r.total - r.reserva)} - 1px)` }} title="Início da reserva de contingência" />
        )}
      </div>

      <div className="legend">
        <div><span className="eyebrow"><i className="dot" style={{ background: 'var(--paid)' }} />Pago</span><b className="num">{fmt(r.pago)}</b></div>
        <div><span className="eyebrow"><i className="dot" style={{ background: 'var(--due)' }} />A pagar</span><b className="num">{fmt(r.aPagar)}</b></div>
        <div>
          <span className="eyebrow">Previsto nas etapas</span><b className="num">{fmt(r.previsto)}</b>
          {temTotal && <span className="sub num">{r.previsto > r.total ? `passa ${fmt(r.previsto - r.total)} do total` : `sobra ${fmt(r.total - r.previsto)} do total`}</span>}
        </div>
        {temTotal && (
          <div>
            <span className="eyebrow">Reserva {r.reservaPct}%</span><b className="num">{fmt(r.reserva)}</b>
            <span className="sub">{r.comprometido > r.total - r.reserva ? 'já em uso' : 'intacta'}</span>
          </div>
        )}
        {area > 0 && (
          <div><span className="eyebrow">Custo por m²</span><b className="num">{fmt(r.comprometido / area)}</b><span className="sub">{area} m²</span></div>
        )}
      </div>
    </section>
  );
}
