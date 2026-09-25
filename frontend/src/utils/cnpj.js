export function limparCNPJ(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, 14);
}

export function formatarCNPJ(valor) {
  const cnpj = limparCNPJ(valor);

  if (cnpj.length <= 2) return cnpj;
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
  if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

export function validarCNPJ(cnpj) {
  const limpo = limparCNPJ(cnpj);
  if (limpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(limpo)) return false;

  const calcDigito = (base) => {
    let peso = base.length - 7;
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const base1 = limpo.slice(0, 12);
  const dig1 = calcDigito(base1);
  if (dig1 !== parseInt(limpo[12])) return false;

  const base2 = limpo.slice(0, 13);
  const dig2 = calcDigito(base2);
  if (dig2 !== parseInt(limpo[13])) return false;

  return true;
}