import { useEffect, useRef, useState, type FormEvent } from 'react';
import { parseBRL, paraCampoDinheiro } from '../lib/format';

export type TipoCampo = 'text' | 'email' | 'money' | 'date' | 'number' | 'select' | 'textarea' | 'checkbox';

export interface Campo {
  k: string;
  label: string;
  tipo?: TipoCampo;
  opcoes?: [string, string][];
  obrig?: boolean;
  meio?: boolean;
  dica?: string;
  placeholder?: string;
  sugestoes?: string[];
  min?: number;
  max?: number;
  step?: number;
  padrao?: string | number | boolean;
}

export interface Perigo { rotulo: string; confirmar: string; executar: () => Promise<boolean> }

export type Valores = Record<string, any>;

export interface FormSpec {
  titulo: string;
  nota?: string;
  campos: Campo[];
  valores: Valores;
  salvar: (v: Valores) => Promise<boolean>;
  perigos?: Perigo[];
}

function valorInicial(c: Campo, v: unknown): string | boolean {
  const atual = v ?? c.padrao;
  if (c.tipo === 'checkbox') return Boolean(atual);
  // Zero aparece vazio: senão o que a pessoa digita é colado depois do "0,00".
  if (c.tipo === 'money') return typeof atual === 'number' && atual !== 0 ? paraCampoDinheiro(atual) : '';
  if (c.tipo === 'select') return String(atual ?? c.opcoes?.[0]?.[0] ?? '');
  return atual === null || atual === undefined ? '' : String(atual);
}

export default function FormModal({ spec, onClose }: { spec: FormSpec; onClose: () => void }) {
  const [vals, setVals] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(spec.campos.map(c => [c.k, valorInicial(c, spec.valores[c.k])])),
  );
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [armado, setArmado] = useState<number | null>(null);
  const primeiro = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    primeiro.current?.querySelector<HTMLElement>('input,select,textarea')?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  const set = (k: string, v: string | boolean) => setVals(s => ({ ...s, [k]: v }));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const out: Valores = {};
    for (const c of spec.campos) {
      const raw = vals[c.k];
      let v: unknown;
      if (c.tipo === 'checkbox') v = raw;
      else {
        const s = String(raw ?? '').trim();
        if (c.tipo === 'money') v = s === '' ? null : parseBRL(s);
        else if (c.tipo === 'number') v = s === '' ? null : Number(s.replace(',', '.'));
        else v = s;
        if (c.obrig && (v === null || v === '')) { setErro(`Preencha "${c.label}".`); return; }
        if ((c.tipo === 'money' || c.tipo === 'number') && v !== null && Number.isNaN(v)) {
          setErro(`Valor inválido em "${c.label}".${c.tipo === 'money' ? ' Use, por exemplo, 1.250,00.' : ''}`);
          return;
        }
      }
      out[c.k] = v;
    }
    setErro('');
    setSalvando(true);
    const ok = await spec.salvar(out);
    setSalvando(false);
    if (ok) onClose();
  }

  async function perigo(i: number) {
    if (armado !== i) { setArmado(i); return; }
    setSalvando(true);
    const ok = await spec.perigos![i].executar();
    setSalvando(false);
    if (ok) onClose();
  }

  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={enviar} noValidate role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <div className="form-head">
          <h2 id="modal-titulo">{spec.titulo}</h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>✕</button>
        </div>
        {spec.nota && <p className="muted form-note">{spec.nota}</p>}
        <div className="form-grid" ref={primeiro}>
          {spec.campos.map(c => {
            const id = 'f_' + c.k;
            const cls = 'field' + (c.meio ? ' half' : '');
            if (c.tipo === 'checkbox') {
              return (
                <label key={c.k} className={cls + ' check'} htmlFor={id}>
                  <input id={id} type="checkbox" checked={Boolean(vals[c.k])} onChange={e => set(c.k, e.target.checked)} />
                  <span>{c.label}</span>
                </label>
              );
            }
            const comum = { id, value: String(vals[c.k] ?? ''), placeholder: c.placeholder };
            let input;
            if (c.tipo === 'select') {
              input = (
                <select {...comum} onChange={e => set(c.k, e.target.value)}>
                  {c.opcoes!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              );
            } else if (c.tipo === 'textarea') {
              input = <textarea {...comum} rows={3} onChange={e => set(c.k, e.target.value)} />;
            } else {
              const tipoHtml = c.tipo === 'money' ? 'text' : c.tipo ?? 'text';
              input = (
                <input
                  {...comum}
                  type={tipoHtml}
                  inputMode={c.tipo === 'money' ? 'decimal' : c.tipo === 'number' ? 'decimal' : undefined}
                  autoComplete="off"
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  list={c.sugestoes?.length ? 'dl_' + c.k : undefined}
                  onFocus={c.tipo === 'money' || c.tipo === 'number' ? e => e.target.select() : undefined}
                  onChange={e => set(c.k, e.target.value)}
                />
              );
            }
            return (
              <div key={c.k} className={cls}>
                <label htmlFor={id}>{c.label}{c.obrig ? ' *' : ''}</label>
                {input}
                {c.sugestoes?.length ? <datalist id={'dl_' + c.k}>{c.sugestoes.map(s => <option key={s} value={s} />)}</datalist> : null}
                {c.dica && <small>{c.dica}</small>}
              </div>
            );
          })}
        </div>
        {erro && <p className="form-err" role="alert">{erro}</p>}
        <div className="form-actions">
          <div className="left">
            {spec.perigos?.map((p, i) => (
              <button key={p.rotulo} type="button" className={'btn danger small' + (armado === i ? ' armed' : '')} disabled={salvando} onClick={() => perigo(i)}>
                {armado === i ? p.confirmar : p.rotulo}
              </button>
            ))}
          </div>
          <div className="right">
            <button type="button" className="btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
