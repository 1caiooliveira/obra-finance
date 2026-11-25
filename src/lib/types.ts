export type StatusEtapa = 'a_fazer' | 'andamento' | 'concluida';
export type StatusCotacao = 'cotando' | 'fechado' | 'descartado';

export interface Casa {
  id: string;
  nome: string;
  subtitulo: string | null;
  orcamento_total: number;
  reserva_pct: number;
  area_m2: number | null;
}

export interface Etapa {
  id: string;
  casa_id: string;
  nome: string;
  ordem: number;
  status: StatusEtapa;
  orcado: number;
  fornecedor: string | null;
  inicio: string | null;
  fim: string | null;
  notas: string | null;
}

export interface Lancamento {
  id: string;
  casa_id: string;
  etapa_id: string | null;
  descricao: string;
  valor: number;
  data: string;
  tipo: string | null;
  forma: string | null;
  fornecedor: string | null;
  pago_por: string | null;
  pago: boolean;
  pago_em: string | null;
  parcela: string | null;
  grupo: string | null;
  notas: string | null;
}

export interface Cotacao {
  id: string;
  casa_id: string;
  etapa_id: string | null;
  fornecedor: string;
  tipo: string | null;
  valor: number;
  status: StatusCotacao;
  contato: string | null;
  notas: string | null;
}

export interface DadosObra {
  casa: Casa;
  etapas: Etapa[];
  lancamentos: Lancamento[];
  cotacoes: Cotacao[];
}

export type Tabela = 'etapas' | 'lancamentos' | 'cotacoes';
export type LinhaDe<T extends Tabela> = T extends 'etapas' ? Etapa : T extends 'lancamentos' ? Lancamento : Cotacao;
export type NovaLinha<T extends Tabela> = Omit<LinhaDe<T>, 'id'>;

export const ST_ETAPA: Record<StatusEtapa, string> = {
  a_fazer: 'A fazer',
  andamento: 'Em andamento',
  concluida: 'Concluída',
};
export const ST_PROXIMO: Record<StatusEtapa, StatusEtapa> = {
  a_fazer: 'andamento',
  andamento: 'concluida',
  concluida: 'a_fazer',
};
export const ST_COTACAO: Record<StatusCotacao, string> = {
  cotando: 'Cotando',
  fechado: 'Fechado',
  descartado: 'Descartado',
};
export const TIPOS = ['Material', 'Mão de obra', 'Serviço', 'Móvel', 'Eletrodoméstico', 'Iluminação', 'Taxa e documentação', 'Outro'];
export const FORMAS = ['Pix', 'Cartão de crédito', 'Boleto', 'Débito', 'Transferência', 'Dinheiro', 'Financiado'];
