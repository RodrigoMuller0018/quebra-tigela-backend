/**
 * Telefone celular brasileiro normalizado: 13 dígitos exatos.
 * Formato: 55 (DDI) + 2 dígitos DDD + 9 + 8 dígitos.
 * Ex: "5511999998888"
 *
 * NÃO aceita fixo (sem o 9 inicial no número) porque WhatsApp só funciona em celular.
 */
export const REGEX_TELEFONE_BR = /^55\d{2}9\d{8}$/;

/**
 * Normaliza string de telefone removendo tudo que não é dígito.
 * Se não tem DDI 55, adiciona. Útil pra aceitar entrada com máscara do front.
 */
export function normalizarTelefone(valor: string): string {
  const so = valor.replace(/\D+/g, '');
  if (so.startsWith('55')) return so;
  return '55' + so;
}
