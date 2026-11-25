import { useCallback, useEffect, useRef, useState } from 'react';
import type { DadosObra } from '../lib/types';
import { api, mensagemErro } from './api';

/**
 * Carrega a obra e mantém atualizada: recarrega depois de cada alteração,
 * quando a aba volta a ficar visível e a cada minuto (para ver o que a outra
 * pessoa lançou).
 */
export function useObra(casaId: string) {
  const [dados, setDados] = useState<DadosObra | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const emCurso = useRef<Promise<void> | null>(null);
  const deNovo = useRef(false);

  // Uma carga por vez; um pedido no meio de outra carga roda logo em seguida,
  // para nunca ficar com dados de antes da última alteração.
  const recarregar = useCallback(async (): Promise<void> => {
    if (emCurso.current) { deNovo.current = true; return emCurso.current; }
    const run = (async () => {
      do {
        deNovo.current = false;
        try {
          setDados(await api.carregar(casaId));
          setErro(null);
        } catch (e) {
          setErro(mensagemErro(e));
        }
      } while (deNovo.current);
    })();
    emCurso.current = run;
    try { await run; } finally { emCurso.current = null; }
  }, [casaId]);

  useEffect(() => {
    recarregar();
    const quandoVisivel = () => { if (document.visibilityState === 'visible') recarregar(); };
    document.addEventListener('visibilitychange', quandoVisivel);
    window.addEventListener('focus', quandoVisivel);
    const t = window.setInterval(quandoVisivel, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', quandoVisivel);
      window.removeEventListener('focus', quandoVisivel);
      window.clearInterval(t);
    };
  }, [recarregar]);

  return { dados, erro, recarregar };
}
