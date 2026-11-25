import type { FormSpec, Perigo } from '../components/FormModal';
import { api } from '../data/api';
import { gerarParcelas, ordenarEtapas } from '../lib/calc';
import { fmt, hojeISO } from '../lib/format';
import { FORMAS, ST_COTACAO, ST_ETAPA, TIPOS, type Cotacao, type Etapa, type Lancamento } from '../lib/types';
import { unicos, type Ctx } from './ctx';

const opcoesEtapa = (ctx: Ctx): [string, string][] => [['', 'Sem etapa'], ...ordenarEtapas(ctx.dados.etapas).map(e => [e.id, e.nome] as [string, string])];

export function formLancamento(ctx: Ctx, l?: Lancamento, etapaPadrao = ''): FormSpec {
  const novo = !l;
  const { casa, lancamentos, cotacoes } = ctx.dados;
  const perigos: Perigo[] = [];
  if (l) {
    perigos.push({ rotulo: 'Excluir', confirmar: 'Confirmar exclusão', executar: () => ctx.agir(() => api.excluir('lancamentos', [l.id]), 'Lançamento excluído') });
    const irmas = l.grupo ? lancamentos.filter(x => x.grupo === l.grupo) : [];
    if (irmas.length > 1) {
      perigos.push({ rotulo: `Excluir as ${irmas.length} parcelas`, confirmar: `Confirmar: excluir ${irmas.length}`, executar: () => ctx.agir(() => api.excluir('lancamentos', irmas.map(x => x.id)), `${irmas.length} parcelas excluídas`) });
    }
  }
  return {
    titulo: novo ? 'Novo lançamento' : 'Editar lançamento',
    nota: l?.parcela ? `Parcela ${l.parcela}. A edição vale só para esta parcela.` : undefined,
    valores: l ?? { data: hojeISO(), etapa_id: etapaPadrao, parcelas: 1 },
    campos: [
      { k: 'descricao', label: 'Descrição', obrig: true, placeholder: 'Ex.: Porcelanato sala e quartos' },
      { k: 'valor', label: novo ? 'Valor total' : 'Valor', tipo: 'money', obrig: true, meio: true },
      { k: 'data', label: novo ? 'Data (ou 1º vencimento)' : 'Data / vencimento', tipo: 'date', obrig: true, meio: true },
      { k: 'etapa_id', label: 'Etapa', tipo: 'select', opcoes: opcoesEtapa(ctx), meio: true },
      { k: 'tipo', label: 'Tipo', tipo: 'select', opcoes: TIPOS.map(t => [t, t]), meio: true },
      { k: 'forma', label: 'Forma de pagamento', tipo: 'select', opcoes: FORMAS.map(t => [t, t]), meio: true },
      ...(novo ? [{ k: 'parcelas', label: 'Parcelas', tipo: 'number' as const, min: 1, max: 60, step: 1, meio: true, dica: 'Cria uma linha por parcela, mês a mês.' }] : []),
      { k: 'fornecedor', label: 'Fornecedor / loja', meio: true, sugestoes: unicos([...lancamentos.map(x => x.fornecedor), ...cotacoes.map(x => x.fornecedor)]) },
      { k: 'pago_por', label: 'Quem pagou', meio: true, sugestoes: unicos(lancamentos.map(x => x.pago_por)) },
      { k: 'pago', label: novo ? 'Já foi pago (só a 1ª parcela, se parcelado)' : 'Pago', tipo: 'checkbox' },
      { k: 'notas', label: 'Observações', tipo: 'textarea' },
    ],
    perigos,
    salvar: async v => {
      const base = {
        casa_id: casa.id,
        descricao: v.descricao,
        etapa_id: v.etapa_id || null,
        tipo: v.tipo,
        forma: v.forma,
        fornecedor: v.fornecedor || null,
        pago_por: v.pago_por || null,
        notas: v.notas || null,
      };
      if (l) {
        return ctx.agir(() => api.atualizar('lancamentos', l.id, { ...base, valor: v.valor, data: v.data, pago: v.pago, pago_em: v.pago ? l.pago_em ?? hojeISO() : null }), 'Lançamento atualizado');
      }
      const linhas = gerarParcelas(base, v.valor, v.parcelas ?? 1, v.data, v.pago, crypto.randomUUID());
      return ctx.agir(() => api.inserir('lancamentos', linhas), linhas.length > 1 ? `${linhas.length} parcelas lançadas` : 'Lançamento salvo');
    },
  };
}

export function formEtapa(ctx: Ctx, e?: Etapa): FormSpec {
  const { casa, etapas, cotacoes, lancamentos } = ctx.dados;
  const maxOrdem = etapas.reduce((a, x) => Math.max(a, x.ordem), 0);
  const temGasto = !!e && lancamentos.some(l => l.etapa_id === e.id);
  return {
    titulo: e ? 'Editar etapa' : 'Nova etapa',
    valores: e ?? { ordem: maxOrdem + 1, status: 'a_fazer' },
    campos: [
      { k: 'nome', label: 'Nome', obrig: true, placeholder: 'Ex.: Piso do apartamento' },
      { k: 'status', label: 'Status', tipo: 'select', opcoes: Object.entries(ST_ETAPA), meio: true },
      { k: 'ordem', label: 'Ordem na obra', tipo: 'number', min: 1, step: 1, meio: true },
      { k: 'orcado', label: 'Valor previsto', tipo: 'money', meio: true, dica: 'Fechar uma cotação preenche isso.' },
      { k: 'fornecedor', label: 'Quem executa', meio: true, sugestoes: unicos([...cotacoes.map(x => x.fornecedor), ...etapas.map(x => x.fornecedor)]) },
      { k: 'inicio', label: 'Início', tipo: 'date', meio: true },
      { k: 'fim', label: 'Fim', tipo: 'date', meio: true },
      { k: 'notas', label: 'Observações', tipo: 'textarea' },
    ],
    perigos: e ? [{
      rotulo: 'Excluir etapa',
      confirmar: temGasto ? 'Excluir? Os gastos ficam sem etapa' : 'Confirmar exclusão',
      executar: () => ctx.agir(() => api.excluir('etapas', [e.id]), 'Etapa excluída'),
    }] : [],
    salvar: v => {
      const linha = {
        nome: v.nome, status: v.status, ordem: Math.round(v.ordem ?? maxOrdem + 1), orcado: v.orcado ?? 0,
        fornecedor: v.fornecedor || null, inicio: v.inicio || null, fim: v.fim || null, notas: v.notas || null,
      };
      return e
        ? ctx.agir(() => api.atualizar('etapas', e.id, linha), 'Etapa atualizada')
        : ctx.agir(() => api.inserir('etapas', [{ ...linha, casa_id: casa.id }]), 'Etapa criada');
    },
  };
}

export function formCotacao(ctx: Ctx, c?: Cotacao): FormSpec {
  const { casa, cotacoes, lancamentos } = ctx.dados;
  return {
    titulo: c ? 'Editar cotação' : 'Nova cotação',
    valores: c ?? { status: 'cotando' },
    campos: [
      { k: 'etapa_id', label: 'Etapa', tipo: 'select', opcoes: opcoesEtapa(ctx), meio: true },
      // "Sem tipo" para as cotações cadastradas antes deste campo existir não virarem "Material" sem querer.
      { k: 'tipo', label: 'Tipo', tipo: 'select', opcoes: [['', 'Sem tipo'], ...TIPOS.map(t => [t, t] as [string, string])], meio: true },
      { k: 'fornecedor', label: 'Fornecedor', obrig: true, meio: true, sugestoes: unicos([...cotacoes.map(x => x.fornecedor), ...lancamentos.map(x => x.fornecedor)]) },
      { k: 'valor', label: 'Valor', tipo: 'money', meio: true },
      { k: 'status', label: 'Status', tipo: 'select', opcoes: Object.entries(ST_COTACAO), meio: true },
      { k: 'contato', label: 'Contato', meio: true, placeholder: 'Telefone, Instagram, site…' },
      { k: 'notas', label: 'O que inclui / observações', tipo: 'textarea', placeholder: 'Ex.: material incluso, prazo de 15 dias, 50% de entrada' },
    ],
    perigos: c ? [{ rotulo: 'Excluir', confirmar: 'Confirmar exclusão', executar: () => ctx.agir(() => api.excluir('cotacoes', [c.id]), 'Cotação excluída') }] : [],
    salvar: v => {
      const linha = { etapa_id: v.etapa_id || null, tipo: v.tipo || null, fornecedor: v.fornecedor, valor: v.valor ?? 0, status: v.status, contato: v.contato || null, notas: v.notas || null };
      return c
        ? ctx.agir(() => api.atualizar('cotacoes', c.id, linha), 'Cotação atualizada')
        : ctx.agir(() => api.inserir('cotacoes', [{ ...linha, casa_id: casa.id }]), 'Cotação salva');
    },
  };
}

/** Fecha uma cotação e passa a soma das cotações fechadas da etapa para o previsto dela. */
export function fecharCotacao(ctx: Ctx, c: Cotacao) {
  const e = ctx.dados.etapas.find(x => x.id === c.etapa_id);
  const soma = ctx.dados.cotacoes
    .filter(x => x.etapa_id === c.etapa_id && (x.id === c.id || x.status === 'fechado'))
    .reduce((a, x) => a + x.valor, 0);
  return ctx.agir(async () => {
    await api.atualizar('cotacoes', c.id, { status: 'fechado' });
    if (e) await api.atualizar('etapas', e.id, { orcado: soma, ...(e.fornecedor ? {} : { fornecedor: c.fornecedor }) });
  }, e ? `Fechado. Previsto de ${e.nome}: ${fmt(soma)}` : 'Cotação fechada');
}

export function formConfig(ctx: Ctx, pendentes: string[]): FormSpec {
  const { casa } = ctx.dados;
  const podeConvidar = api.modo === 'supabase';
  return {
    titulo: 'Orçamento e configurações',
    nota: pendentes.length ? `Convite aguardando: ${pendentes.join(', ')}. A pessoa cria a conta com esse e-mail e entra direto nesta obra.` : undefined,
    valores: casa,
    campos: [
      { k: 'orcamento_total', label: 'Orçamento total', tipo: 'money', meio: true, dica: 'Tudo: obra, móveis e eletros.' },
      { k: 'reserva_pct', label: 'Reserva de contingência (%)', tipo: 'number', min: 0, max: 50, step: 1, meio: true, dica: 'Costuma ficar entre 10% e 15%.' },
      { k: 'area_m2', label: 'Área do apê (m²)', tipo: 'number', min: 0, step: 0.01, meio: true, dica: 'Para calcular o custo por m².' },
      { k: 'nome', label: 'Nome da obra', meio: true, placeholder: 'Obra do Apê' },
      { k: 'subtitulo', label: 'Subtítulo', placeholder: 'Ex.: Entregue pela construtora em agosto de 2026' },
      ...(podeConvidar ? [{ k: 'convite', label: 'Convidar alguém para esta obra', tipo: 'email' as const, placeholder: 'email@exemplo.com', dica: 'A pessoa cria a conta com esse e-mail e passa a ver e editar tudo.' }] : []),
    ],
    salvar: v => ctx.agir(async () => {
      if (v.convite && !/^\S+@\S+\.\S+$/.test(v.convite)) throw new Error('O e-mail do convite parece incompleto.');
      await api.salvarCasa(casa.id, {
        orcamento_total: v.orcamento_total ?? 0,
        reserva_pct: v.reserva_pct ?? 10,
        area_m2: v.area_m2 ?? null,
        nome: v.nome || 'Obra do Apê',
        subtitulo: v.subtitulo || null,
      });
      if (v.convite) await api.convidar(casa.id, v.convite);
    }, v.convite ? `Salvo. Convite registrado para ${v.convite}` : 'Configurações salvas'),
  };
}
