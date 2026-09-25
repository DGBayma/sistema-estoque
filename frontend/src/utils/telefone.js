export function limparTelefone(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, 11);
}

export function formatarTelefone(valor) {
  const tel = limparTelefone(valor);

  if (tel.length <= 2) return tel;
  if (tel.length <= 6) return `(${tel.slice(0, 2)}) ${tel.slice(2)}`;
  if (tel.length <= 10) return `(${tel.slice(0, 2)}) ${tel.slice(2, 6)}-${tel.slice(6)}`;
  return `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`;
}

export function validarTelefone(valor) {
  const tel = limparTelefone(valor);
  return tel.length === 10 || tel.length === 11;
}