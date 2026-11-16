// Importação de extrato em PDF (conta corrente e fatura Itaú)
import { norm, parseAmountToCents } from './finance.js';

const PDFJS_VERSION = '4.8.69';
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;
const PDFJS_WORKER_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

let pdfjsPromise = null;

const getPdfJs = async () => {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* @vite-ignore */ PDFJS_CDN).then((lib) => {
      if (lib?.GlobalWorkerOptions) {
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      }
      return lib;
    });
  }
  return pdfjsPromise;
};

export const hashStr = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

// Lê o ArrayBuffer do PDF e extrai os blocos de texto com coordenadas (x, y) por página
export const readPdfPages = async (arrayBuffer) => {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .filter((it) => typeof it.str === 'string' && it.str.trim())
      .map((it) => ({
        str: it.str,
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
      }));
    pages.push(items);
  }

  return pages;
};

// Parser para Extrato de Conta Corrente Itaú (Data | Lançamentos | Descrição | Valor | Saldo)
// e fallback para Fatura de Cartão Itaú (DD/MM ESTABELECIMENTO VALOR)
export const parseItauStatement = (pages) => {
  const numRe = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/;
  const dateFullRe = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const dateShortRe = /^(\d{2})\/(\d{2})$/;

  const rows = [];
  let descX = null;
  let inTable = false;
  let last = null;
  let detectedYear = String(new Date().getFullYear());

  // Tenta detectar o ano do documento (ex: "01/11/2026 a 30/11/2026")
  for (const items of pages) {
    for (const it of items) {
      const mYear = it.str.match(/\b\d{2}\/\d{2}\/(20\d{2})\b/);
      if (mYear) {
        detectedYear = mYear[1];
        break;
      }
    }
  }

  for (const items of pages) {
    const sorted = [...items].filter((i) => i.str.trim()).sort((a, b) => b.y - a.y);
    const lines = [];

    for (const it of sorted) {
      const ln = lines[lines.length - 1];
      if (ln && Math.abs(ln.y - it.y) <= 3) {
        ln.items.push(it);
      } else {
        lines.push({ y: it.y, items: [it] });
      }
    }

    for (const ln of lines) {
      const its = ln.items.sort((a, b) => a.x - b.x);
      const text = its.map((i) => i.str.trim()).join(' ');
      const n = norm(text);

      // Ignora rodapés e resumos
      if (
        n.includes('posicao consolidada') ||
        n.includes('saldo anterior') ||
        n.includes('saldo total') ||
        n.includes('saldo disponivel') ||
        n.includes('total de entradas') ||
        n.includes('total de saidas')
      ) {
        if (n.includes('posicao consolidada')) inTable = false;
        last = null;
        continue;
      }

      // Cabeçalho da tabela de Conta Corrente Itaú
      if (n.startsWith('data') && (n.includes('descricao') || n.includes('lancamentos'))) {
        const descCol = its.find((i) => norm(i.str).startsWith('descricao'));
        descX = descCol ? descCol.x : 180;
        inTable = true;
        last = null;
        continue;
      }

      // 1) Formato Conta Corrente Itaú (DD/MM/AAAA)
      const firstStr = its[0]?.str.trim() || '';
      const fullDateMatch = firstStr.match(dateFullRe);

      if (fullDateMatch) {
        const isoDate = `${fullDateMatch[3]}-${fullDateMatch[2]}-${fullDateMatch[1]}`;
        const nums = its.filter((i) => numRe.test(i.str.trim()));

        if (nums.length > 0) {
          // Quando há Valor e Saldo na mesma linha, o Valor da transação é o primeiro número
          const valItem = nums.length >= 2 ? nums[0] : nums[0];
          const valStr = valItem.str.trim();
          const isNegative = valStr.startsWith('-');
          const cents = parseAmountToCents(valStr.replace('-', ''));

          const middleItems = its.filter(
            (i) => i !== its[0] && !nums.includes(i)
          );

          const tipoParts = [];
          const descParts = [];

          for (const m of middleItems) {
            if (descX && m.x >= descX - 10) {
              descParts.push(m.str.trim());
            } else {
              tipoParts.push(m.str.trim());
            }
          }

          if (cents > 0) {
            last = {
              date: isoDate,
              type: isNegative ? 'despesa' : 'receita',
              tipo: tipoParts.join(' ').trim(),
              desc: descParts.join(' ').trim(),
              cents,
            };
            rows.push(last);
            continue;
          }
        }
      }

      // 2) Formato Fatura de Cartão Itaú (DD/MM ESTABELECIMENTO VALOR)
      const shortDateMatch = firstStr.match(dateShortRe);
      if (shortDateMatch && its.length >= 3) {
        const lastItem = its[its.length - 1];
        const valStr = lastItem.str.trim();
        if (numRe.test(valStr)) {
          const isNegative = valStr.startsWith('-');
          const cents = parseAmountToCents(valStr.replace('-', ''));
          const middleText = its
            .slice(1, -1)
            .map((i) => i.str.trim())
            .join(' ')
            .trim();

          if (cents > 0 && middleText && !/pagamento efetuado/i.test(middleText)) {
            const isoDate = `${detectedYear}-${shortDateMatch[2]}-${shortDateMatch[1]}`;
            last = {
              date: isoDate,
              type: isNegative ? 'receita' : 'despesa',
              tipo: 'Cartão Itaú',
              desc: middleText,
              cents,
            };
            rows.push(last);
            continue;
          }
        }
      }

      // 3) Linha de continuação de descrição (ex: nome do favorecido Pix na linha de baixo)
      if (inTable && last && its.length <= 3 && !its.some((i) => numRe.test(i.str.trim()))) {
        const extra = text.trim();
        if (extra && !/^(data|lancamentos|valor|saldo)/i.test(norm(extra))) {
          last.desc = [last.desc, extra].filter(Boolean).join(' ');
        }
      }
    }
  }

  return rows;
};
