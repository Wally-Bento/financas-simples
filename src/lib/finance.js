// Funções puras do app Finanças: dinheiro, datas, CSV e validação de backup.
// Ficam fora do App.jsx para poderem ser testadas (npm test).

export const pad = (n) => String(n).padStart(2, '0');

export const norm = (s) =>
  String(s ?? '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const itemGoalKey = (catId, itemLabel) => `${catId}::${norm(itemLabel)}`;

export const generateId = () => `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// "Fralda (2/3)" -> "Fralda"
export const baseItemName = (desc) =>
  String(desc || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();

// Converte "1.234,56", "R$ 12", "12.50" etc. em centavos inteiros. Retorna NaN se inválido.
export const parseAmountToCents = (raw) => {
  let s = String(raw ?? '').replace(/R\$|\s/g, '');
  if (!s) return NaN;
  const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc !== -1 && ld !== -1) {
    s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lc !== -1) {
    s = s.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  return /^\d+(\.\d+)?$/.test(s) ? Math.round(parseFloat(s) * 100) : NaN;
};

// Soma n meses a uma data ISO, respeitando o último dia do mês (31/01 + 1 mês = 28/02).
export const shiftDateMonths = (iso, deltaMonths) => {
  const [y, m, d] = iso.split('-').map(Number);
  const targetMonthIndex = (m - 1) + deltaMonths;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return `${targetYear}-${pad(targetMonth + 1)}-${pad(Math.min(d, maxDay))}`;
};

// Divide um valor em n parcelas; a diferença de centavos vai para a primeira.
export const splitInstallments = (totalCents, n) => {
  const count = Math.max(1, Math.floor(n) || 1);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + remainder : base));
};

// Neutraliza células que o Excel interpretaria como fórmula e escapa ; " e quebras de linha.
export const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ---------------------------------------------------------------------------
// Validação de backup / importação
// ---------------------------------------------------------------------------
const TYPES = ['despesa', 'receita'];
const HEX_RE = /^#[0-9a-f]{6}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isValidISODate = (s) => {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

// Recebe o conteúdo bruto de um backup e devolve apenas dados válidos.
// `dropped` conta os lançamentos descartados por estarem inválidos.
export const sanitizeBackup = (data, iconNames = []) => {
  const src = data && typeof data === 'object' ? data : {};
  let dropped = 0;

  const seenIds = new Set();
  const transactions = [];
  (Array.isArray(src.transactions) ? src.transactions : []).forEach((t) => {
    const cents = Math.round(Number(t?.cents));
    const category = String(t?.category ?? '').trim();
    if (!t || typeof t !== 'object' || !isValidISODate(t.date) || !TYPES.includes(t.type)
      || !Number.isFinite(cents) || cents <= 0 || !category) {
      dropped++;
      return;
    }
    let id = typeof t.id === 'string' && t.id ? t.id : generateId();
    if (seenIds.has(id)) id = generateId();
    seenIds.add(id);
    const tx = {
      id,
      date: t.date,
      type: t.type,
      category,
      description: String(t.description ?? '').trim() || category,
      cents,
    };
    if (typeof t.groupId === 'string' && t.groupId) tx.groupId = t.groupId;
    transactions.push(tx);
  });

  const categories = [];
  const seenCats = new Set();
  (Array.isArray(src.categories) ? src.categories : []).forEach((c) => {
    if (!c || typeof c !== 'object') return;
    const label = String(c.label ?? c.id ?? '').trim();
    const id = String(c.id ?? label).trim() || label;
    if (!label || !TYPES.includes(c.type) || seenCats.has(norm(id))) return;
    seenCats.add(norm(id));
    const items = [];
    const seenItems = new Set();
    (Array.isArray(c.items) ? c.items : []).forEach((it) => {
      const s = String(it ?? '').trim();
      if (s && !seenItems.has(norm(s))) { seenItems.add(norm(s)); items.push(s); }
    });
    categories.push({
      id,
      label,
      type: c.type,
      color: HEX_RE.test(c.color) ? c.color : '#64748b',
      iconName: iconNames.includes(c.iconName) ? c.iconName : 'Tag',
      items,
    });
  });

  const itemGoals = {};
  if (src.itemGoals && typeof src.itemGoals === 'object' && !Array.isArray(src.itemGoals)) {
    Object.values(src.itemGoals).forEach((g) => {
      const category = String(g?.category ?? '').trim();
      const label = String(g?.label ?? '').trim();
      const cents = Math.round(Number(g?.cents));
      if (!category || !label || !Number.isFinite(cents) || cents <= 0) return;
      itemGoals[itemGoalKey(category, label)] = { category, label, cents };
    });
  }

  const noSpend = [...new Set((Array.isArray(src.noSpend) ? src.noSpend : []).filter(isValidISODate))];

  return {
    transactions,
    categories: categories.length ? categories : null,
    itemGoals,
    noSpend,
    dropped,
  };
};

// Garante que toda categoria usada pelos lançamentos exista na lista.
export const ensureCategories = (categories, txs, palette) => {
  const next = [...categories];
  txs.forEach((t) => {
    if (next.some((c) => norm(c.id) === norm(t.category))) return;
    next.push({
      id: t.category,
      label: t.category,
      type: t.type,
      color: palette[next.length % palette.length],
      iconName: 'Tag',
      items: [baseItemName(t.description)],
    });
  });
  return next;
};
