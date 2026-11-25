import type { StatusEtapa } from './types';

/** Etapas criadas junto com uma obra nova: reforma de apê entregue pela construtora. */
export const ETAPAS_PADRAO: { nome: string; status: StatusEtapa; notas: string | null }[] = [
  { nome: 'Planejamento e aprovação no condomínio', status: 'andamento', notas: 'Layout e medidas, regulamento e horários de obra do condomínio, plano de reforma com ART/RRT (NBR 16280) antes de quebrar qualquer coisa.' },
  { nome: 'Elétrica: pontos e infraestrutura', status: 'a_fazer', notas: 'Pontos para a iluminação de sobrepor (sem forro rebaixado, a fiação passa aparente ou por canaletas), tomadas extras e circuitos de eletros.' },
  { nome: 'Banheiro: troca de revestimentos', status: 'a_fazer', notas: 'Retirada do revestimento atual, impermeabilização se mexer no piso do box, novo revestimento e rejunte.' },
  { nome: 'Piso do apartamento inteiro', status: 'a_fazer', notas: 'Material com 10% de sobra para recortes, argamassa, rodapé e mão de obra do pedreiro.' },
  { nome: 'Pintura', status: 'a_fazer', notas: 'Primeira demão antes da marcenaria; retoques no final.' },
  { nome: 'Móveis planejados', status: 'a_fazer', notas: 'Medição final só com piso pronto. Prazo de fábrica costuma ser de 30 a 60 dias: fechar cedo.' },
  { nome: 'Vidros, box e espelhos', status: 'a_fazer', notas: 'Medição do box depois do revestimento do banheiro pronto.' },
  { nome: 'Iluminação de sobrepor', status: 'a_fazer', notas: 'Trilhos, spots, plafons e pendentes, mais a instalação.' },
  { nome: 'Persianas e cortinas', status: 'a_fazer', notas: null },
  { nome: 'Eletrodomésticos', status: 'a_fazer', notas: 'Confirmar medidas dos nichos da marcenaria antes de comprar.' },
  { nome: 'Móveis soltos: sofá, mesa e camas', status: 'a_fazer', notas: null },
  { nome: 'Limpeza pós-obra e mudança', status: 'a_fazer', notas: null },
];
