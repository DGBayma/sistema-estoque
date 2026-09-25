// ============================================================
// Utilitários para CPF
// ============================================================

/**
 * Remove tudo que não for dígito
 */
export function limparCPF(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, 11);
}

/**
 * Formata CPF: 111.111.111-11
 * Aceita string crua ou parcial e formata conforme digita
 */
export function formatarCPF(valor) {
  const cpf = limparCPF(valor);

  if (cpf.length <= 3) return cpf;
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/**
 * Valida CPF com dígitos verificadores
 */
export function validarCPF(cpf) {
  const limpo = limparCPF(cpf);

  if (limpo.length !== 11) return false;

  // Rejeita sequências repetidas (111.111.111-11, 222.222.222-22, etc)
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  // Validação do 1º dígito
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(limpo[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo[9])) return false;

  // Validação do 2º dígito
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(limpo[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo[10])) return false;

  return true;
}