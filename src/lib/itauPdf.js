// Importação de extrato em PDF (conta corrente Itaú).
// O pdf.js é carregado da CDN só quando você importa um PDF (precisa de internet nesse momento).
import { norm, parseAmountToCents } from './finance.js';

export const hashStr = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

// Colunas do extrato: Data | Lançamentos | Descrição | Valor | Saldo
// Recebe, por página, itens de texto { str, x, y } e devolve [{ date, type, tipo, desc, cents }].
export const parseItauStatement = (pages) => {
  const numRe = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/;
  const dateRe = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const rows = [];
  let descX = null, inTable = false, last = null;
  for (const items of pages) {
    const sorted = items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y);
    const lines = [];
    for (const it of sorted) {
      const ln = lines[lines.length - 1];
      if (ln && Math.abs(ln.y - it.y) <= 3) ln.items.push(it);
      else lines.push({ y: it.y, items: [it] });
    }
    for (const ln of lines) {
      const its = ln.items.sort((a, b) => a.x - b.x);
      const text = its.map((i) => i.str.trim()).join(' ');
      const n = norm(text);
      if (n.includes('posicao consolidada')) { inTable = false; last = null; continue; }
      if (n.startsWith('data') && n.includes('descricao')) {
        descX = its.find((i) => norm(i.str).startsWith('descricao')).x;
        inTable = true; last = null; continue;
      }
      if (!inTable) continue;