import { useCallback, useEffect, useState } from 'react';
import FormModal, { type FormSpec } from '../components/FormModal';
import { useToast } from '../components/Toast';
import { api, mensagemErro, type Sessao } from '../data/api';
import { useObra } from '../data/useObra';
import { resumir } from '../lib/calc';
import Caixa from './Caixa';
import Cotacoes from './Cotacoes';
import type { Aba, Ctx } from './ctx';
import Etapas from './Etapas';
import { formConfig, formLancamento } from './forms';
import Geral from './Geral';
import Resumo from './Resumo';

const ABAS: [Aba, string][] = [['geral', 'Visão geral'], ['etapas', 'Etapas'], ['caixa', 'Caixa'], ['cotacoes', 'Cotações']];
const lerAba = (): Aba => {
  const h = window.location.hash.slice(1);
  return ABAS.some(([a]) => a === h) ? (h as Aba) : 'geral';
};

export default function Obra({ casaId, sessao }: { casaId: string; sessao: Sessao }) {
  const { dados, erro, recarregar } = useObra(casaId);
  const toast = useToast();
  const [aba, setAba] = useState<Aba>(lerAba);
  const [form, setForm] = useState<FormSpec | null>(null);

  useEffect(() => {
    const f = () => setAba(lerAba());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  const agir = useCallback<Ctx['agir']>(async (fn, aviso) => {
    try {
      await fn();
      await recarregar();
      if (aviso) toast(aviso);
      return true;
    } catch (e) {
      toast(mensagemErro(e));
      await recarregar();
      return false;
    }
  }, [recarregar, toast]);

  const fechar = useCallback(() => setForm(null), []);

  if (!dados) {
    return (
      <div className="center">
        {erro
          ? <div className="auth"><h2>Não consegui abrir a obra</h2><p className="muted">{erro}</p><button className="btn primary" onClick={() => recarregar()}>Tentar de novo</button></div>
          : <p className="splash">Carregando a obra…</p>}
      </div>
    );
  }

  const irPara = (a: Aba) => {
    window.history.replaceState(null, '', '#' + a);
    setAba(a);
    window.scrollTo({ top: 0 });
  };
  const ctx: Ctx = { dados, r: resumir(dados), agir, abrir: setForm, irPara };
  const contagem: Partial<Record<Aba, number>> = { etapas: dados.etapas.length, caixa: dados.lancamentos.length, cotacoes: dados.cotacoes.length };

  const abrirConfig = async () => {
    let pendentes: string[] = [];
    try { pendentes = await api.convites(casaId); } catch { /* segue sem a lista */ }
    setForm(formConfig(ctx, pendentes));
  };

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="eyebrow">Reforma e mobília</div>
          <h1>{dados.casa.nome}</h1>
          <p>{dados.casa.subtitulo || 'Controle de etapas, caixa e cotações'}</p>
        </div>
        <div className="top-actions">
          <button className="btn primary" onClick={() => setForm(formLancamento(ctx))}>+ Lançamento</button>
          <button className="icon-btn" aria-label="Configurações" title="Configurações" onClick={abrirConfig}>⚙</button>
          {api.modo === 'supabase' && (
            <button className="btn ghost small" title={sessao.email} onClick={() => api.sair()}>Sair</button>
          )}
        </div>
      </header>

      {api.modo === 'demo' && (
        <div className="banner info">Modo demonstração: os dados ficam só neste navegador. Configure o Supabase (veja o README) para usar com sua esposa.</div>
      )}
      {erro && <div className="banner">{erro} Os dados na tela podem estar desatualizados.</div>}

      <Resumo ctx={ctx} onConfig={abrirConfig} />

      <nav className="tabs" aria-label="Seções">
        {ABAS.map(([a, rotulo]) => (
          <button key={a} aria-current={aba === a ? 'page' : undefined} onClick={() => irPara(a)}>
            {rotulo}{contagem[a] ? <span className="count num">{contagem[a]}</span> : null}
          </button>
        ))}
      </nav>

      <main className="panel">
        {aba === 'geral' && <Geral ctx={ctx} />}
        {aba === 'etapas' && <Etapas ctx={ctx} />}
        {aba === 'caixa' && <Caixa ctx={ctx} />}
        {aba === 'cotacoes' && <Cotacoes ctx={ctx} />}
      </main>

      {form && <FormModal key={form.titulo} spec={form} onClose={fechar} />}
    </div>
  );
}
