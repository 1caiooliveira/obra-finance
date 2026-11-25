import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, mensagemErro, type Sessao } from './data/api';
import type { Casa } from './lib/types';
import Obra from './views/Obra';

export default function App() {
  const [sessao, setSessao] = useState<Sessao | null | undefined>(undefined);
  useEffect(() => {
    api.sessao().then(setSessao, () => setSessao(null));
    return api.aoMudarSessao(setSessao);
  }, []);

  if (sessao === undefined) return <div className="center"><p className="splash">Abrindo…</p></div>;
  if (!sessao) return <Login />;
  return <Portao sessao={sessao} />;
}

/** Descobre a obra de quem entrou (aceitando convites pendentes) ou oferece criar uma. */
function Portao({ sessao }: { sessao: Sessao }) {
  const [casa, setCasa] = useState<Casa | null | undefined>(undefined);
  const [erro, setErro] = useState('');

  const buscar = useCallback(async () => {
    setCasa(undefined);
    setErro('');
    try { setCasa(await api.minhaCasa()); }
    catch (e) { setErro(mensagemErro(e)); setCasa(null); }
  }, []);

  useEffect(() => { buscar(); }, [buscar, sessao.userId]);

  if (casa === undefined) return <div className="center"><p className="splash">Procurando a sua obra…</p></div>;
  if (!casa) return <NovaObra sessao={sessao} erroInicial={erro} aoCriar={setCasa} aoVerificar={buscar} />;
  return <Obra casaId={casa.id} sessao={sessao} />;
}

function Login() {
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setEnviando(true);
    try {
      if (modo === 'entrar') await api.entrar(email.trim(), senha);
      else {
        const { precisaConfirmar } = await api.criarConta(email.trim(), senha);
        if (precisaConfirmar) setMsg({ tipo: 'ok', texto: `Enviamos um link de confirmação para ${email.trim()}. Abra o e-mail, confirme e volte aqui para entrar.` });
      }
    } catch (err) {
      setMsg({ tipo: 'erro', texto: mensagemErro(err) });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="center">
      <div className="auth">
        <div>
          <div className="eyebrow">Reforma e mobília</div>
          <h1>Canteiro</h1>
        </div>
        <p className="muted">{modo === 'entrar' ? 'Entre para ver etapas, caixa e cotações da obra.' : 'Crie sua conta. Se alguém já te convidou, use o mesmo e-mail do convite.'}</p>
        <form onSubmit={enviar}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required minLength={6} value={senha} onChange={e => setSenha(e.target.value)} />
            {modo === 'criar' && <small>Pelo menos 6 caracteres.</small>}
          </div>
          {msg && <p className={msg.tipo === 'erro' ? 'form-err' : 'banner info'} role="alert">{msg.texto}</p>}
          <button className="btn primary" type="submit" disabled={enviando} style={{ justifyContent: 'center' }}>
            {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        <p className="switch muted">
          {modo === 'entrar' ? 'Primeira vez aqui? ' : 'Já tem conta? '}
          <button className="btn ghost small" type="button" onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setMsg(null); }}>
            {modo === 'entrar' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
}

function NovaObra({ sessao, erroInicial, aoCriar, aoVerificar }: { sessao: Sessao; erroInicial: string; aoCriar: (c: Casa) => void; aoVerificar: () => void }) {
  const [nome, setNome] = useState('Obra do Apê');
  const [erro, setErro] = useState(erroInicial);
  const [enviando, setEnviando] = useState(false);

  async function criar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try { aoCriar(await api.criarCasa(nome.trim())); }
    catch (err) { setErro(mensagemErro(err)); setEnviando(false); }
  }

  return (
    <div className="center">
      <div className="auth">
        <h2>Começar a obra</h2>
        <p className="muted">A obra já vem com 12 etapas de uma reforma de apê novo. Dá para editar, apagar ou criar outras depois.</p>
        <form onSubmit={criar}>
          <div className="field">
            <label htmlFor="nome">Nome da obra</label>
            <input id="nome" value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          {erro && <p className="form-err" role="alert">{erro}</p>}
          <button className="btn primary" type="submit" disabled={enviando} style={{ justifyContent: 'center' }}>{enviando ? 'Criando…' : 'Criar a obra'}</button>
        </form>
        {api.modo === 'supabase' && (
          <>
            <p className="muted" style={{ fontSize: 13 }}>
              A obra já foi criada por outra pessoa? Peça para ela te convidar com o e-mail <b>{sessao.email}</b> (no ⚙ de configurações) e depois clique abaixo.
            </p>
            <button className="btn" type="button" onClick={aoVerificar} style={{ justifyContent: 'center' }}>Já fui convidado: verificar</button>
            <button className="btn ghost small" type="button" onClick={() => api.sair()}>Sair</button>
          </>
        )}
      </div>
    </div>
  );
}
