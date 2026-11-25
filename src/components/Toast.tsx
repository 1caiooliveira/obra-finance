import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

const Ctx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  const toast = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 3800);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div id="toast" role="status" aria-live="polite" hidden={!msg}>{msg}</div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
