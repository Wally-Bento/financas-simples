// INÍCIO DO ARQUIVO src/App.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  Wallet, TrendingUp, TrendingDown, Trash2, Download, Upload,
  Filter, PieChart, Utensils, Car, Home, Gamepad2, HeartPulse, GraduationCap,
  Briefcase, DollarSign, Tag, CheckCircle2, AlertCircle, X, Clock,
  ChevronLeft, ChevronRight, Pencil, Search, Target, Sun, Moon, Plus, Bell,
  Scissors, Sparkles, Droplets, Shirt, PiggyBank, Layers, BarChart3,
  LayoutGrid, ShoppingBag, Coffee, Gift, Baby, Smartphone, Zap, Check,
  ArrowUpRight, ArrowDownRight, Copy, Database, FileSpreadsheet, CreditCard,
} from 'lucide-react';

// ============================================================================
// CONSTANTES, ÍCONES E PALETA
// ============================================================================
const KEYS = {
  TX: 'financas_simples_transactions_v3',
  OLD_TX: 'financas_simples_transactions_v2',
  CATS: 'financas_categories_v1',
  ITEM_GOALS: 'financas_simples_item_goals_v1',
  BACKUP: 'financas_simples_last_backup_v2',
  THEME: 'financas_simples_theme_v1',
  NOSPEND: 'financas_simples_nospend_v1',
};

const ICONS_MAP = {
  Droplets, HeartPulse, Utensils, Scissors, Sparkles, Shirt, PiggyBank,
  GraduationCap, Home, Car, Gamepad2, Tag, Briefcase, TrendingUp,
  DollarSign, Baby, ShoppingBag, Coffee, Gift, Smartphone, Zap,
};

const ICON_OPTIONS = [
  'Droplets', 'HeartPulse', 'Utensils', 'Scissors', 'Sparkles', 'Shirt',
  'PiggyBank', 'GraduationCap', 'Home', 'Car', 'Gamepad2', 'Baby',
  'ShoppingBag', 'Coffee', 'Gift', 'Smartphone', 'Zap', 'Briefcase',
  'TrendingUp', 'DollarSign', 'Tag',
];

const COLOR_PALETTE = [
  '#10b981', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#14b8a6', '#64748b',
];

const DEFAULT_CATEGORIES = [
  { id: 'Higiene', label: 'Higiene', type: 'despesa', color: '#0ea5e9', iconName: 'Droplets', items: ['Lenço', 'Pomada', 'Fralda'] },
  { id: 'Saúde', label: 'Saúde', type: 'despesa', color: '#f43f5e', iconName: 'HeartPulse', items: ['Soro', 'Remédio/Vitamina'] },
  { id: 'Alimentação', label: 'Alimentação', type: 'despesa', color: '#f97316', iconName: 'Utensils', items: ['Mercado'] },
  { id: 'Salão e Estética', label: 'Salão e Estética', type: 'despesa', color: '#ec4899', iconName: 'Scissors', items: ['Corte Cabelo', 'Sobrancelha', 'Unha'] },
  { id: 'Cabelo e Corpo', label: 'Cabelo e Corpo', type: 'despesa', color: '#8b5cf6', iconName: 'Sparkles', items: ['Creme', 'Shampoo', 'Condicionador', 'Óleo de cabelo', 'Body Cream', 'Body Splash'] },
  { id: 'Skincare e Maquiagem', label: 'Skincare e Maquiagem', type: 'despesa', color: '#d946ef', iconName: 'Sparkles', items: ['Protetor solar', 'Sabonete facial', 'Hidratante rosto', 'Creme de estrias', 'Sérum clareador', 'Maquiagem'] },
  { id: 'Roupas', label: 'Roupas', type: 'despesa', color: '#6366f1', iconName: 'Shirt', items: ['Roupas'] },
  { id: 'Fundo de Reserva', label: 'Fundo de Reserva', type: 'despesa', color: '#10b981', iconName: 'PiggyBank', items: ['Fundo de reserva'] },
  { id: 'Educação', label: 'Educação', type: 'despesa', color: '#14b8a6', iconName: 'GraduationCap', items: ['Educação'] },
  { id: 'Moradia', label: 'Moradia', type: 'despesa', color: '#3b82f6', iconName: 'Home', items: ['Aluguel', 'Condomínio', 'Energia', 'Água', 'Internet'] },
  { id: 'Transporte', label: 'Transporte', type: 'despesa', color: '#eab308', iconName: 'Car', items: ['Combustível', 'Uber / 99', 'Estacionamento'] },
  { id: 'Lazer', label: 'Lazer', type: 'despesa', color: '#8b5cf6', iconName: 'Gamepad2', items: ['Streaming', 'Passeio'] },
  { id: 'Outros Gastos', label: 'Outros Gastos', type: 'despesa', color: '#64748b', iconName: 'Tag', items: [] },
  { id: 'Salário', label: 'Salário', type: 'receita', color: '#10b981', iconName: 'Briefcase', items: ['Salário mensal', 'Adiantamento'] },
  { id: 'Investimentos', label: 'Investimentos', type: 'receita', color: '#14b8a6', iconName: 'TrendingUp', items: ['Rendimentos', 'Dividendos'] },
  { id: 'Outras Receitas', label: 'Outras Receitas', type: 'receita', color: '#22c55e', iconName: 'DollarSign', items: [] },
];

// ============================================================================
// UTILITÁRIOS
// ============================================================================
const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const yesterdayISO = () => { const d = new Date(); d.setDate(d.getDate() - 1); return isoOf(d); };
const daysInMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const monthOf = (iso) => iso.slice(0, 7);

const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

const shiftDateMonths = (iso, deltaMonths) => {
  const [y, m, d] = iso.split('-').map(Number);
  const targetMonthIndex = (m - 1) + deltaMonths;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return `${targetYear}-${pad(targetMonth + 1)}-${pad(Math.min(d, maxDay))}`;
};

const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const shortMonthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const formatCurrency = (cents) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);

const formatCompact = (cents) => {
  const val = Math.abs(cents || 0) / 100;
  if (val >= 1000) return `R$ ${(val / 1000).toFixed(1).replace('.', ',')}k`;
  return `R$ ${val.toFixed(0)}`;
};

const formatDateBR = (iso) => {
  const [y, m, d] = (iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso || '';
};

const centsToInput = (c) => (c / 100).toFixed(2).replace('.', ',');
const generateId = () => `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const norm = (s) => String(s ?? '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const itemGoalKey = (catId, itemLabel) => `${catId}::${norm(itemLabel)}`;

const parseAmountToCents = (raw) => {
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

const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const parseCSVLine = (line, delim) => {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (ch === delim && !q) { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
};

const normalizeDate = (raw) => {
  const s = String(raw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

const decodeText = (buf) => {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { return new TextDecoder('windows-1252').decode(buf); }
};

const exportFileAndroidSafe = async ({ filename, content, mimeType, title }) => {
  try {
    const saved = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: title || filename,
      url: saved.uri,
      dialogTitle: title || 'Salvar arquivo',
    });
    return 'shared';
  } catch (err) {
    const msg = String(err?.message || err || '');
    if (err?.name === 'AbortError' || /cancel/i.test(msg)) return 'cancelled';
  }

  try {
    if (window.Capacitor?.isNativePlatform?.()) return 'failed';
    const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8;` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return 'downloaded';
  } catch {
    return 'failed';
  }
};

const guessCategoryFromList = (description, type, categories) => {
  const d = norm(description);
  const pool = categories.filter((c) => c.type === type);
  for (const cat of pool) {
    if (norm(cat.label) === d) return cat.id;
    if ((cat.items || []).some((it) => d.includes(norm(it)) || norm(it).includes(d))) {
      return cat.id;
    }
  }
  if (type === 'receita') {
    if (/\b(salario|folha|13o)\b/.test(d)) return 'Salário';
    if (/\b(rendimento|dividendo|juros|cdb|tesouro)\b/.test(d)) return 'Investimentos';
    return pool[pool.length - 1]?.id || 'Outras Receitas';
  }
  if (/\b(uber|99|posto|combustivel|shell|ipiranga|pedagio)\b/.test(d)) return 'Transporte';
  if (/\b(aluguel|condominio|energia|luz|agua|internet|iptu)\b/.test(d)) return 'Moradia';
  if (/\b(supermercado|padaria|restaurante|ifood|rappi|acougue)\b/.test(d)) return 'Alimentação';
  if (/\b(farmacia|drogaria|hospital|clinica|dentista)\b/.test(d)) return 'Saúde';
  return pool[pool.length - 1]?.id || 'Outros Gastos';
};

const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error(e); }
  },
};

const buildReminderICS = (time) => {
  const [h, m] = time.split(':');
  const day = todayISO().replace(/-/g, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Financas//PT', 'BEGIN:VEVENT',
    'UID:lembrete-diario@financas', `DTSTAMP:${day}T000000Z`,
    `DTSTART:${day}T${h}${m}00`, 'DURATION:PT5M', 'RRULE:FREQ=DAILY',
    'SUMMARY:Lançar os gastos de hoje', 'BEGIN:VALARM', 'ACTION:DISPLAY',
    'DESCRIPTION:Lance seus gastos de hoje no app Finanças', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
};

const sampleData = () => {
  const date = todayISO();
  return [
    { id: 'tx-sample-1', date, type: 'receita', category: 'Salário', description: 'Salário mensal', cents: 550000 },
    { id: 'tx-sample-2', date, type: 'despesa', category: 'Higiene', description: 'Lenço', cents: 4500 },
    { id: 'tx-sample-3', date, type: 'despesa', category: 'Higiene', description: 'Fralda', cents: 12000 },
    { id: 'tx-sample-4', date, type: 'despesa', category: 'Alimentação', description: 'Mercado', cents: 42050 },
  ];
};

const loadTransactions = () => {
  const v3 = store.get(KEYS.TX);
  if (Array.isArray(v3)) return v3;
  const v2 = store.get(KEYS.OLD_TX);
  if (Array.isArray(v2)) {
    return v2.map(({ amount, ...t }) => ({ ...t, cents: Math.round(Number(amount) * 100) || 0 }));
  }
  return sampleData();
};

const sumBy = (list, type) => list.filter((t) => t.type === type).reduce((a, t) => a + t.cents, 0);

const THEME_CSS = `
.fs-root{font-variant-numeric:tabular-nums;padding-bottom:calc(5.25rem + env(safe-area-inset-bottom))}
.fs-safe-top{padding-top:max(0.85rem,env(safe-area-inset-top))}
.fs-safe-bottom{padding-bottom:max(1.25rem,env(safe-area-inset-bottom))}
.fs-nav{padding-bottom:max(0.5rem,env(safe-area-inset-bottom))}
.fs-toast{bottom:calc(5.25rem + env(safe-area-inset-bottom))}
.fs-root button:focus-visible,.fs-root input:focus-visible,.fs-root select:focus-visible{outline:2px solid #10b981;outline-offset:2px}
.no-scrollbar::-webkit-scrollbar{display:none}
.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
.fs-root.dark{color-scheme:dark;background:#070d19;color:#e2e8f0}
.dark .bg-slate-50{background:#070d19}
.dark .bg-white{background:#0f172a}
.dark .bg-slate-100{background:#1e293b}
.dark .bg-slate-900{background:#1e293b;border-color:#334155}
.dark .text-slate-900,.dark .hover\\:text-slate-900:hover{color:#f8fafc}
.dark .text-slate-800{color:#e2e8f0}
.dark .text-slate-700{color:#cbd5e1}
.dark .text-slate-600{color:#94a3b8}
.dark .text-slate-500{color:#64748b}
.dark .text-slate-400{color:#64748b}
.dark .border-slate-100,.dark .border-slate-200,.dark .border-slate-300{border-color:#1e293b}
.dark .divide-slate-100>:not([hidden])~:not([hidden]){border-color:#1e293b}
.dark .hover\\:bg-slate-50:hover,.dark .hover\\:bg-slate-100:hover{background:#1e293b}
.dark .bg-emerald-50{background:rgba(16,185,129,.14)}
.dark .bg-rose-50{background:rgba(244,63,94,.14)}
.dark input,.dark select,.dark textarea{background:#0f172a;color:#f1f5f9;border-color:#334155}
`;

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

// ============================================================================
// APP PRINCIPAL
// ============================================================================
export default function App() {
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio' | 'graficos' | 'metas' | 'categorias'
  const [metasView, setMetasView] = useState('itens'); // 'itens' | 'categoria'
  const [catManageType, setCatManageType] = useState('despesa');

  const [transactions, setTransactions] = useState(loadTransactions);
  const [categories, setCategories] = useState(() => {
    const saved = store.get(KEYS.CATS);
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_CATEGORIES;
  });
  const [itemGoals, setItemGoals] = useState(() => store.get(KEYS.ITEM_GOALS, {}));
  const [lastBackup, setLastBackup] = useState(() => store.get(KEYS.BACKUP, null));
  const [month, setMonth] = useState(() => monthOf(todayISO()));
  const [dark, setDark] = useState(() => {
    const saved = store.get(KEYS.THEME);
    return saved ? saved === 'dark' : true;
  });

  const [noSpend, setNoSpend] = useState(() => store.get(KEYS.NOSPEND, []));
  const [reminderTime, setReminderTime] = useState('20:00');
  const [backupMenuOpen, setBackupMenuOpen] = useState(false);
  const [backupFallbackText, setBackupFallbackText] = useState('');
  const [backupFallbackExt, setBackupFallbackExt] = useState('json');

  // Modal de Lançamento / Edição
  const [quickOpen, setQuickOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState('despesa');
  const [category, setCategory] = useState('Higiene');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO);
  const [installments, setInstallments] = useState(1);
  const [formError, setFormError] = useState('');

  // Filtros do Histórico
  const [filterType, setFilterType] = useState('todos');
  const [filterCategory, setFilterCategory] = useState('todas');
  const [search, setSearch] = useState('');

  // Gráficos
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [selectedBarMonth, setSelectedBarMonth] = useState(null);

  // Adicionar item novo direto na aba Metas
  const [addingItemCat, setAddingItemCat] = useState(null);
  const [newItemName, setNewItemName] = useState('');

  // Modal Criar / Editar Categoria
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [catLabel, setCatLabel] = useState('');
  const [catType, setCatType] = useState('despesa');
  const [catColor, setCatColor] = useState('#10b981');
  const [catIconName, setCatIconName] = useState('Tag');
  const [catItemsText, setCatItemsText] = useState('');
  const [inlineItemInputs, setInlineItemInputs] = useState({});

  // Exclusão do mês / Importação
  const [monthDeleteOpen, setMonthDeleteOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importExtraData, setImportExtraData] = useState(null); // { categories, itemGoals, noSpend } quando for JSON
  const [importErrors, setImportErrors] = useState([]);
  const [importMode, setImportMode] = useState('merge');
  const [importSource, setImportSource] = useState('json');

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = (text, variant = 'success', undoTo = null) => {
    clearTimeout(toastTimer.current);
    setToast({ text, variant, undoTo });
    toastTimer.current = setTimeout(() => setToast(null), undoTo ? 7000 : 3500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const handleUndo = () => {
    if (!toast?.undoTo) return;
    setTransactions(toast.undoTo);
    setToast(null);
  };

  useEffect(() => { store.set(KEYS.TX, transactions); }, [transactions]);
  useEffect(() => { store.set(KEYS.CATS, categories); }, [categories]);
  useEffect(() => { store.set(KEYS.ITEM_GOALS, itemGoals); }, [itemGoals]);
  useEffect(() => { store.set(KEYS.NOSPEND, noSpend); }, [noSpend]);
  useEffect(() => {
    store.set(KEYS.THEME, dark ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#070d19' : '#059669');
  }, [dark]);
  useEffect(() => { setSelectedSlice(null); setSelectedBarMonth(null); }, [month]);

  const getCategoryMeta = (catId) => {
    const found = categories.find((c) => c.id === catId || norm(c.label) === norm(catId));
    if (found) {
      return { ...found, Icon: ICONS_MAP[found.iconName] || Tag };
    }
    return { id: catId, label: catId, type: 'despesa', color: '#64748b', iconName: 'Tag', items: [], Icon: Tag };
  };

  // ----- Cálculos do Mês e Acumulados -----
  const monthTx = useMemo(() => transactions.filter((t) => monthOf(t.date) === month), [transactions, month]);

  const summary = useMemo(() => {
    const receitas = sumBy(monthTx, 'receita');
    const despesas = sumBy(monthTx, 'despesa');
    return {
      receitas,
      despesas,
      saldoMes: receitas - despesas,
      acumulado: sumBy(transactions, 'receita') - sumBy(transactions, 'despesa'),
    };
  }, [monthTx, transactions]);

  const spentByCat = useMemo(
    () => monthTx.filter((t) => t.type === 'despesa').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.cents;
      return acc;
    }, {}),
    [monthTx]
  );

  // Remove sufixo de parcela "(1/3)" ao agrupar metas do item
  const baseItemName = (desc) => String(desc || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();

  const spentByCatItem = useMemo(
    () => monthTx.filter((t) => t.type === 'despesa').reduce((acc, t) => {
      const k = itemGoalKey(t.category, baseItemName(t.description));
      acc[k] = (acc[k] || 0) + t.cents;
      return acc;
    }, {}),
    [monthTx]
  );

  // Soma automática das metas dos itens por categoria
  const categoryGoalTotals = useMemo(() => {
    const totals = {};
    Object.values(itemGoals).forEach((ig) => {
      if (ig?.cents > 0) {
        totals[ig.category] = (totals[ig.category] || 0) + ig.cents;
      }
    });
    return totals;
  }, [itemGoals]);

  const totalAllGoals = useMemo(
    () => Object.values(categoryGoalTotals).reduce((a, b) => a + b, 0),
    [categoryGoalTotals]
  );

  // Quanto ainda posso gastar + Orçamento diário
  const today = todayISO();
  const budget = useMemo(() => {
    const base = totalAllGoals > 0 ? totalAllGoals : summary.receitas;
    let daily = null;
    if (month === monthOf(today) && base > 0) {
      const daysLeft = daysInMonth(month) - Number(today.slice(8)) + 1;
      const spent = (fn) => monthTx.filter((t) => t.type === 'despesa' && fn(t.date)).reduce((a, t) => a + t.cents, 0);
      const allowance = Math.max(base - spent((d) => d < today), 0) / daysLeft;
      const spentToday = spent((d) => d === today);
      daily = { allowance, spentToday, daysLeft, pct: allowance > 0 ? (spentToday / allowance) * 100 : spentToday > 0 ? 100 : 0 };
    }
    return { base, fromGoals: totalAllGoals > 0, remaining: base - summary.despesas, daily };
  }, [totalAllGoals, summary, month, monthTx, today]);

  // Sequência de dias registrando
  const loggedDays = useMemo(() => new Set([...transactions.map((t) => t.date), ...noSpend]), [transactions, noSpend]);
  const streak = useMemo(() => {
    const d = new Date();
    if (!loggedDays.has(isoOf(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (loggedDays.has(isoOf(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }, [loggedDays]);

  // Dados dos Gráficos
  const donutSegments = useMemo(() => {
    const total = summary.despesas;
    if (!total) return [];
    const radius = 52;
    const circ = 2 * Math.PI * radius;
    let acc = 0;
    return Object.entries(spentByCat)
      .map(([id, value]) => ({
        ...getCategoryMeta(id),
        value,
        percentage: (value / total) * 100,
      }))
      .sort((a, b) => b.value - a.value)
      .map((item) => {
        const seg = {
          ...item,
          radius,
          strokeDasharray: `${(item.percentage / 100) * circ} ${circ}`,
          strokeDashoffset: -((acc / 100) * circ),
        };
        acc += item.percentage;
        return seg;
      });
  }, [spentByCat, summary.despesas, categories]);

  const selectedDonut = donutSegments.find((s) => s.id === selectedSlice);

  const selectedCategoryBreakdown = useMemo(() => {
    if (!selectedSlice) return [];
    const catTotal = spentByCat[selectedSlice] || 0;
    if (!catTotal) return [];
    const map = new Map();
    monthTx
      .filter((t) => t.type === 'despesa' && t.category === selectedSlice)
      .forEach((t) => {
        const clean = baseItemName(t.description);
        const k = norm(clean);
        const cur = map.get(k) || { key: itemGoalKey(selectedSlice, clean), label: clean, value: 0 };
        cur.value += t.cents;
        map.set(k, cur);
      });
    return [...map.values()]
      .sort((a, b) => b.value - a.value)
      .map((it) => ({
        ...it,
        percentage: (it.value / catTotal) * 100,
        goal: itemGoals[it.key]?.cents || 0,
      }));
  }, [selectedSlice, monthTx, spentByCat, itemGoals]);

  const sixMonthsTrend = useMemo(() => {
    const list = [];
    for (let i = -5; i <= 0; i++) {
      const ym = shiftMonth(month, i);
      const txs = transactions.filter((t) => monthOf(t.date) === ym);
      const rec = sumBy(txs, 'receita');
      const desp = sumBy(txs, 'despesa');
      list.push({ ym, label: shortMonthLabel(ym), receitas: rec, despesas: desp, saldo: rec - desp });
    }
    const maxVal = Math.max(1, ...list.flatMap((m) => [m.receitas, m.despesas]));
    return { list, maxVal };
  }, [transactions, month]);

  const topItemsMonth = useMemo(() => {
    const map = new Map();
    monthTx
      .filter((t) => t.type === 'despesa')
      .forEach((t) => {
        const clean = baseItemName(t.description);
        const k = `${t.category}|${norm(clean)}`;
        const cur = map.get(k) || { label: clean, category: t.category, value: 0 };
        cur.value += t.cents;
        map.set(k, cur);
      });
    const arr = [...map.values()].sort((a, b) => b.value - a.value).slice(0, 5);
    const maxVal = arr[0]?.value || 1;
    return arr.map((it) => ({ ...it, meta: getCategoryMeta(it.category), pctBar: (it.value / maxVal) * 100 }));
  }, [monthTx, categories]);

  const dashInsights = useMemo(() => {
    const savingsRate = summary.receitas > 0
      ? Math.round(((summary.receitas - summary.despesas) / summary.receitas) * 100)
      : 0;
    const elapsedDays = month === monthOf(today) ? Number(today.slice(8)) : daysInMonth(month);
    const dailyAvg = elapsedDays > 0 ? Math.round(summary.despesas / elapsedDays) : 0;
    return {
      savingsRate,
      dailyAvg,
      topCat: donutSegments[0] || null,
      topItem: topItemsMonth[0] || null,
    };
  }, [summary, month, today, donutSegments, topItemsMonth]);

  // Histórico Filtrado
  const filteredTransactions = useMemo(() => {
    const q = norm(search);
    return monthTx
      .filter((t) => filterType === 'todos' || t.type === filterType)
      .filter((t) => filterCategory === 'todas' || t.category === filterCategory)
      .filter((t) => !q || norm(t.description).includes(q) || norm(t.category).includes(q))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTx, filterType, filterCategory, search]);

  // Sugestões de itens no modal de lançamento
  const suggestedItemsForCategory = useMemo(() => {
    const catMeta = getCategoryMeta(category);
    const seen = new Set();
    const out = [];
    for (const label of catMeta.items || []) {
      const k = norm(label);
      if (!seen.has(k)) { seen.add(k); out.push(label); }
    }
    for (const t of transactions) {
      if (t.category !== category) continue;
      const clean = baseItemName(t.description);
      const k = norm(clean);
      if (k && !seen.has(k)) { seen.add(k); out.push(clean); }
    }
    return out;
  }, [category, transactions, categories]);

  const catOrder = useMemo(() => {
    const count = {};
    transactions.forEach((t) => { count[t.category] = (count[t.category] || 0) + 1; });
    return categories.filter((c) => c.type === type).sort((a, b) => (count[b.id] || 0) - (count[a.id] || 0));
  }, [transactions, categories, type]);

  const recents = useMemo(() => {
    const seen = new Set(), out = [];
    for (const t of [...transactions].sort((a, b) => b.date.localeCompare(a.date))) {
      const clean = baseItemName(t.description);
      const k = `${t.category}|${norm(clean)}`;
      if (t.type !== type || seen.has(k)) continue;
      seen.add(k);
      out.push({ ...t, description: clean });
      if (out.length === 4) break;
    }
    return out;
  }, [transactions, type]);

  // ----- Ações de Lançamento -----
  const resetForm = () => {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setDate(todayISO());
    setInstallments(1);
    setFormError('');
  };

  const openQuick = () => {
    resetForm();
    const firstCat = categories.find((c) => c.type === 'despesa');
    setType('despesa');
    if (firstCat && !categories.some((c) => c.id === category && c.type === 'despesa')) {
      setCategory(firstCat.id);
    }
    setQuickOpen(true);
  };

  const openQuickWithPreset = (catId, itemLabel) => {
    resetForm();
    setType('despesa');
    setCategory(catId);
    setDescription(itemLabel);
    setQuickOpen(true);
  };

  const handleAddQuickValue = (addReais) => {
    const cur = parseAmountToCents(amount);
    const baseCents = isNaN(cur) || cur < 0 ? 0 : cur;
    setAmount(centsToInput(baseCents + addReais * 100));
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    const first = categories.find((c) => c.type === newType);
    if (first) setCategory(first.id);
    setDescription('');
    setInstallments(1);
  };

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    const meta = getCategoryMeta(newCat);
    setDescription(meta.items?.length === 1 ? meta.items[0] : '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalCents = parseAmountToCents(amount);
    if (isNaN(totalCents) || totalCents <= 0) return setFormError('Informe um valor válido maior que zero.');
    if (!date) return setFormError('Selecione uma data válida.');

    const cleanDesc = description.trim() || category;
    const baseDesc = baseItemName(cleanDesc);
    const wasEditing = Boolean(editingId);

    // Salva item novo automaticamente nas sugestões da categoria
    setCategories((prev) => prev.map((c) => {
      if (c.id !== category) return c;
      const exists = (c.items || []).some((it) => norm(it) === norm(baseDesc));
      if (exists || norm(baseDesc) === norm(c.label)) return c;
      return { ...c, items: [...(c.items || []), baseDesc] };
    }));

    if (wasEditing) {
      const updated = { id: editingId, date, type, category, description: cleanDesc, cents: totalCents };
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setMonth(monthOf(date));
      setQuickOpen(false);
      resetForm();
      showToast('Lançamento atualizado!');
      return;
    }

    const numParcelas = type === 'despesa' && installments > 1 ? installments : 1;
    const baseParcelCents = Math.floor(totalCents / numParcelas);
    const remainderCents = totalCents - baseParcelCents * numParcelas;

    const newEntries = Array.from({ length: numParcelas }, (_, idx) => ({
      id: generateId(),
      date: shiftDateMonths(date, idx),
      type,
      category,
      description: numParcelas > 1 ? `${cleanDesc} (${idx + 1}/${numParcelas})` : cleanDesc,
      cents: idx === 0 ? baseParcelCents + remainderCents : baseParcelCents,
    }));

    setTransactions((prev) => [...newEntries.reverse(), ...prev]);
    setMonth(monthOf(date));
    setQuickOpen(false);
    resetForm();
    showToast(numParcelas > 1 ? `Lançado em ${numParcelas}x!` : 'Lançamento registrado!');
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setType(t.type);
    setCategory(t.category);
    setDescription(t.description);
    setAmount(centsToInput(t.cents));
    setDate(t.date);
    setInstallments(1);
    setFormError('');
    setQuickOpen(true);
  };

  const handleDuplicate = (t) => {
    const snapshot = transactions;
    const copy = {
      ...t,
      id: generateId(),
      date: todayISO(),
      description: baseItemName(t.description),
    };
    setTransactions((prev) => [copy, ...prev]);
    setMonth(monthOf(copy.date));
    showToast(`"${copy.description}" repetido hoje!`, 'success', snapshot);
  };

  const handleDelete = (id) => {
    const snapshot = transactions;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    showToast('Lançamento removido.', 'info', snapshot);
  };

  const handleDeleteMonth = () => {
    const snapshot = transactions;
    const count = monthTx.length;
    setTransactions((prev) => prev.filter((t) => monthOf(t.date) !== month));
    setMonthDeleteOpen(false);
    showToast(`${count} lançamentos de ${monthLabel(month)} excluídos.`, 'info', snapshot);
  };

  const markNoSpend = () => {
    setNoSpend((prev) => [...new Set([...prev, todayISO()])]);
    showToast('Dia marcado como sem gastos!');
  };

  const downloadReminder = async () => {
    const res = await exportFileAndroidSafe({
      filename: 'lembrete-financas.ics',
      content: buildReminderICS(reminderTime),
      mimeType: 'text/calendar',
      title: 'Lembrete diário Finanças',
    });
    if (res === 'shared' || res === 'downloaded') {
      showToast('Escolha o app de Agenda/Calendário para ativar o aviso.');
    }
  };

  // ----- Ações de Metas por Item -----
  const commitItemGoal = (catId, itemLabel, raw) => {
    const cents = raw.trim() === '' ? 0 : parseAmountToCents(raw);
    if (isNaN(cents)) return;
    const k = itemGoalKey(catId, itemLabel);
    setItemGoals((prev) => {
      const next = { ...prev };
      if (cents <= 0) {
        delete next[k];
      } else {
        next[k] = { category: catId, label: itemLabel, cents };
      }
      return next;
    });
  };

  const handleAddItemFromMetas = (catId) => {
    const clean = newItemName.trim();
    if (!clean) return;
    setCategories((prev) => prev.map((c) => {
      if (c.id !== catId) return c;
      if ((c.items || []).some((it) => norm(it) === norm(clean))) return c;
      return { ...c, items: [...(c.items || []), clean] };
    }));
    setNewItemName('');
    setAddingItemCat(null);
    showToast(`Item "${clean}" adicionado!`);
  };

  // ----- Ações de Gerenciamento de Categorias e Itens -----
  const openCreateCategory = () => {
    setEditingCatId(null);
    setCatLabel('');
    setCatType(catManageType);
    setCatColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    setCatIconName('Tag');
    setCatItemsText('');
    setCatModalOpen(true);
  };

  const openEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setCatLabel(cat.label);
    setCatType(cat.type);
    setCatColor(cat.color);
    setCatIconName(cat.iconName || 'Tag');
    setCatItemsText((cat.items || []).join(', '));
    setCatModalOpen(true);
  };

  const handleSaveCategory = (e) => {
    e.preventDefault();
    const cleanLabel = catLabel.trim();
    if (!cleanLabel) return showToast('Informe o nome da categoria.', 'error');

    const parsedItems = catItemsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingCatId) {
      setCategories((prev) => prev.map((c) => {
        if (c.id !== editingCatId) return c;
        return { ...c, id: cleanLabel, label: cleanLabel, color: catColor, iconName: catIconName, items: parsedItems };
      }));
      if (editingCatId !== cleanLabel) {
        setTransactions((prev) => prev.map((t) => (t.category === editingCatId ? { ...t, category: cleanLabel } : t)));
        setItemGoals((prev) => {
          const next = {};
          Object.values(prev).forEach((ig) => {
            const newCat = ig.category === editingCatId ? cleanLabel : ig.category;
            next[itemGoalKey(newCat, ig.label)] = { ...ig, category: newCat };
          });
          return next;
        });
      }
      showToast('Categoria atualizada!');
    } else {
      if (categories.some((c) => norm(c.label) === norm(cleanLabel))) {
        return showToast('Já existe uma categoria com esse nome.', 'error');
      }
      setCategories((prev) => [
        { id: cleanLabel, label: cleanLabel, type: catType, color: catColor, iconName: catIconName, items: parsedItems },
        ...prev,
      ]);
      showToast(`Categoria "${cleanLabel}" criada!`);
    }
    setCatModalOpen(false);
  };

  const handleDeleteCategory = (cat) => {
    if (categories.filter((c) => c.type === cat.type).length <= 1) {
      return showToast('Mantenha pelo menos uma categoria.', 'error');
    }
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    setItemGoals((prev) => {
      const next = {};
      Object.entries(prev).forEach(([k, ig]) => {
        if (ig.category !== cat.id) next[k] = ig;
      });
      return next;
    });
    showToast(`Categoria "${cat.label}" removida.`, 'info');
  };

  const handleAddInlineItem = (catId) => {
    const val = (inlineItemInputs[catId] || '').trim();
    if (!val) return;
    setCategories((prev) => prev.map((c) => {
      if (c.id !== catId) return c;
      if ((c.items || []).some((it) => norm(it) === norm(val))) return c;
      return { ...c, items: [...(c.items || []), val] };
    }));
    setInlineItemInputs((prev) => ({ ...prev, [catId]: '' }));
    showToast(`"${val}" adicionado!`);
  };

  const handleRemoveInlineItem = (catId, itemLabel) => {
    setCategories((prev) => prev.map((c) => {
      if (c.id !== catId) return c;
      return { ...c, items: (c.items || []).filter((it) => norm(it) !== norm(itemLabel)) };
    }));
    setItemGoals((prev) => {
      const next = { ...prev };
      delete next[itemGoalKey(catId, itemLabel)];
      return next;
    });
  };

  // ----- Exportar Backup Completo (JSON) & Planilha (CSV) -----
  const stampBackup = () => {
    const now = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setLastBackup(now);
    store.set(KEYS.BACKUP, now);
  };

  const handleExportFullJSON = async () => {
    const payload = {
      app: 'Financas',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        transactions,
        categories,
        itemGoals,
        noSpend,
      },
    };
    const jsonText = JSON.stringify(payload, null, 2);
    setBackupMenuOpen(false);

    const res = await exportFileAndroidSafe({
      filename: `financas_backup_completo_${todayISO()}.json`,
      content: jsonText,
      mimeType: 'application/json',
      title: 'Backup Completo Finanças (.json)',
    });

    if (res === 'cancelled') return;
    stampBackup();
    if (res === 'failed') {
      setBackupFallbackExt('json');
      setBackupFallbackText(jsonText);
    } else {
      showToast('Backup completo (.json) pronto para salvar!');
    }
  };

  const handleExportCSV = async () => {
    if (!transactions.length) return showToast('Não há lançamentos para exportar.', 'error');
    const headers = ['ID', 'Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'];
    const rows = transactions.map((t) =>
      [csvCell(t.id), t.date, t.type, csvCell(t.category), csvCell(t.description), centsToInput(t.cents)].join(';')
    );
    const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    setBackupMenuOpen(false);

    const res = await exportFileAndroidSafe({
      filename: `financas_planilha_${todayISO()}.csv`,
      content: csv,
      mimeType: 'text/csv',
      title: 'Planilha Finanças (.csv)',
    });

    if (res === 'cancelled') return;
    stampBackup();
    if (res === 'failed') {
      setBackupFallbackExt('csv');
      setBackupFallbackText(csv);
    } else {
      showToast('Planilha CSV pronta para salvar!');
    }
  };

  // ----- Importar JSON Completo, CSV ou OFX -----
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = decodeText(await file.arrayBuffer());
      const trimmed = text.replace(/^\uFEFF/, '').trim();
      if (/\.json$/i.test(file.name) || trimmed.startsWith('{')) {
        parseJSONBackupText(trimmed);
      } else if (/\.ofx$/i.test(file.name) || /<OFX>/i.test(trimmed)) {
        parseOFXText(trimmed);
      } else {
        parseCSVText(trimmed);
      }
    } catch {
      showToast('Não foi possível ler o arquivo selecionado.', 'error');
    }
  };

  const parseJSONBackupText = (text) => {
    try {
      const parsed = JSON.parse(text);
      const data = parsed?.data || parsed;
      if (!Array.isArray(data?.transactions)) {
        return showToast('Arquivo JSON inválido ou incompatível.', 'error');
      }
      const validTxs = data.transactions.filter((t) => t && t.date && t.type && typeof t.cents === 'number' && t.cents > 0);
      const validCats = Array.isArray(data.categories) && data.categories.length ? data.categories : null;
      const validGoals = data.itemGoals && typeof data.itemGoals === 'object' ? data.itemGoals : {};
      const validNoSpend = Array.isArray(data.noSpend) ? data.noSpend : [];

      setImportPreview(validTxs);
      setImportExtraData({ categories: validCats, itemGoals: validGoals, noSpend: validNoSpend });
      setImportErrors([]);
      setImportMode('replace');
      setImportSource('json');
      setImportOpen(true);
    } catch {
      showToast('Erro ao interpretar o backup JSON.', 'error');
    }
  };

  const parseOFXText = (text) => {
    const tag = (block, name) => (block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, 'i')) || [])[1]?.trim() || '';
    const unescapeXml = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    const learned = new Map();
    transactions.forEach((t) => learned.set(`${t.type}|${norm(baseItemName(t.description))}`, t.category));

    const items = [], errors = [];
    [...text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)].forEach((m, i) => {
      const b = m[1];
      const amt = parseFloat(tag(b, 'TRNAMT').replace(',', '.'));
      const d = tag(b, 'DTPOSTED').slice(0, 8);
      if (isNaN(amt) || amt === 0 || !/^\d{8}$/.test(d)) { errors.push(`Transação ${i + 1}`); return; }
      const t = amt < 0 ? 'despesa' : 'receita';
      const dateStr = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      const cents = Math.round(Math.abs(amt) * 100);
      const desc = unescapeXml(tag(b, 'MEMO') || tag(b, 'NAME')).replace(/\s+/g, ' ').trim() || 'Sem descrição';
      const fit = tag(b, 'FITID');
      items.push({
        id: fit ? `ofx-${fit}-${dateStr}-${cents}` : generateId(),
        date: dateStr,
        type: t,
        category: learned.get(`${t}|${norm(desc)}`) || guessCategoryFromList(desc, t, categories),
        description: desc,
        cents,
      });
    });

    if (!items.length) return showToast('Nenhuma transação encontrada no OFX.', 'error');
    setImportPreview(items);
    setImportExtraData(null);
    setImportErrors(errors);
    setImportMode('merge');
    setImportSource('ofx');
    setImportOpen(true);
  };

  const parseCSVText = (text) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return showToast('Arquivo CSV vazio ou inválido.', 'error');
    const delim = lines[0].includes(';') ? ';' : ',';
    const head = parseCSVLine(lines[0], delim).map(norm);
    const ix = { id: head.indexOf('id'), date: head.indexOf('data'), type: head.indexOf('tipo'), cat: head.indexOf('categoria'), desc: head.indexOf('descricao'), val: head.indexOf('valor') };
    if (ix.date === -1 || ix.type === -1 || ix.val === -1) return showToast('O CSV precisa ter Data, Tipo e Valor.', 'error');

    const items = [], errors = [];
    for (let i = 1; i < lines.length; i++) {
      const c = parseCSVLine(lines[i], delim);
      const rawType = norm(c[ix.type]);
      const t = ['receita', 'entrada'].includes(rawType) ? 'receita' : ['despesa', 'saida'].includes(rawType) ? 'despesa' : null;
      const d = normalizeDate(c[ix.date]);
      const cents = parseAmountToCents(c[ix.val]);
      if (!d || !t || isNaN(cents) || cents <= 0) { errors.push(`Linha ${i + 1}`); continue; }
      const desc = (ix.desc !== -1 ? c[ix.desc] : '').replace(/^'(?=[=+\-@])/, '');
      const rawCat = (ix.cat !== -1 ? c[ix.cat] : '').trim();
      const foundCat = categories.find((x) => x.type === t && norm(x.id) === norm(rawCat));
      items.push({
        id: ix.id !== -1 && c[ix.id] ? c[ix.id] : generateId(),
        date: d,
        type: t,
        category: foundCat ? foundCat.id : (rawCat || guessCategoryFromList(desc, t, categories)),
        description: desc || 'Sem descrição',
        cents,
      });
    }
    setImportPreview(items);
    setImportExtraData(null);
    setImportErrors(errors);
    setImportMode('merge');
    setImportSource('csv');
    setImportOpen(true);
  };

  const handleConfirmImport = () => {
    const snapshot = transactions;
    const sig = (t) => `${t.date}|${t.type}|${t.category}|${t.description}|${t.cents}`;

    // Se for Backup Completo JSON, restaura também categorias, metas e dias sem gasto
    if (importSource === 'json' && importExtraData) {
      if (importMode === 'replace') {
        setTransactions(importPreview);
        if (importExtraData.categories) setCategories(importExtraData.categories);
        setItemGoals(importExtraData.itemGoals || {});
        setNoSpend(importExtraData.noSpend || []);
        showToast(
          `Backup completo restaurado (${importPreview.length} lançamentos, ${importExtraData.categories?.length || categories.length} categorias)!`,
          'success',
          snapshot
        );
      } else {
        const ids = new Set(transactions.map((t) => t.id));
        const sigs = new Set(transactions.map(sig));
        const fresh = importPreview.filter((t) => !ids.has(t.id) && !sigs.has(sig(t)));
        setTransactions([...fresh, ...transactions]);

        if (importExtraData.categories) {
          setCategories((prev) => {
            const map = new Map(prev.map((c) => [norm(c.id), { ...c }]));
            importExtraData.categories.forEach((inc) => {
              const k = norm(inc.id);
              if (!map.has(k)) {
                map.set(k, inc);
              } else {
                const cur = map.get(k);
                const mergedItems = [...new Set([...(cur.items || []), ...(inc.items || [])])];
                map.set(k, { ...cur, items: mergedItems });
              }
            });
            return [...map.values()];
          });
        }
        setItemGoals((prev) => ({ ...importExtraData.itemGoals, ...prev }));
        setNoSpend((prev) => [...new Set([...prev, ...(importExtraData.noSpend || [])])]);
        showToast(`Backup mesclado (+${fresh.length} lançamentos e categorias)!`, 'success', snapshot);
      }
    } else {
      // CSV ou OFX: também cria automaticamente qualquer categoria nova que veio no arquivo
      setCategories((prev) => {
        const next = [...prev];
        importPreview.forEach((t) => {
          if (!next.some((c) => norm(c.id) === norm(t.category))) {
            next.push({
              id: t.category,
              label: t.category,
              type: t.type,
              color: COLOR_PALETTE[next.length % COLOR_PALETTE.length],
              iconName: 'Tag',
              items: [baseItemName(t.description)],
            });
          }
        });
        return next;
      });

      if (importMode === 'replace') {
        setTransactions(importPreview);
        showToast(`${importPreview.length} lançamentos restaurados.`, 'success', snapshot);
      } else {
        const ids = new Set(transactions.map((t) => t.id));
        const sigs = new Set(transactions.map(sig));
        const fresh = importPreview.filter((t) => !ids.has(t.id) && !sigs.has(sig(t)));
        const skipped = importPreview.length - fresh.length;
        setTransactions([...fresh, ...transactions]);
        showToast(`${fresh.length} novos adicionados${skipped ? ` (${skipped} duplicados)` : ''}.`, 'success', snapshot);
      }
    }

    const latest = importPreview.map((t) => t.date).sort().pop();
    if (latest) setMonth(monthOf(latest));
    setImportOpen(false);
    setImportPreview([]);
    setImportExtraData(null);
  };

  const activeBarData = sixMonthsTrend.list.find((m) => m.ym === (selectedBarMonth || month)) || sixMonthsTrend.list[5];

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className={`fs-root ${dark ? 'dark' : ''} min-h-screen bg-slate-50 text-slate-800 font-sans`}>
      <style>{THEME_CSS}</style>

      {/* Toast */}
      {toast && (
        <div role="status" className="fs-toast fixed left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700">
          {toast.variant === 'error'
            ? <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            : <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          <span className="text-sm font-medium flex-1">{toast.text}</span>
          {toast.undoTo && (
            <button onClick={handleUndo} className="text-sm font-bold text-emerald-400 cursor-pointer">
              Desfazer
            </button>
          )}
        </div>
      )}

      {/* Top App Bar */}
      <header className="fs-safe-top bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 pb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">
                Finanças
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lastBackup ? `Backup: ${lastBackup}` : 'Controle da Família'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.ofx,application/json,text/csv,text/plain,application/x-ofx,*/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Importar backup (.json), planilha (.csv) ou extrato (.ofx)"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/70 rounded-xl cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <button
              onClick={() => setBackupMenuOpen(true)}
              title="Opções de backup e exportação"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup</span>
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              aria-label="Alternar tema"
              className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200/70 rounded-xl cursor-pointer"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-5">
        {/* Seletor de Mês */}
        {activeTab !== 'categorias' && (
          <div className="flex items-center justify-between bg-white px-2 py-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <button
              aria-label="Mês anterior"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMonth(monthOf(todayISO()))}
              className="px-4 py-1 text-sm font-bold text-slate-900 cursor-pointer"
            >
              {monthLabel(month)}
            </button>
            <button
              aria-label="Próximo mês"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* ABA 1: INÍCIO (RESUMO + QUANTO POSSO GASTAR + HISTÓRICO)          */}
        {/* ================================================================ */}
        {activeTab === 'inicio' && (
          <div className="space-y-5">
            {/* Hero Card */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white p-5 shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                    {budget.base <= 0
                      ? 'Orçamento do mês'
                      : budget.remaining >= 0
                        ? 'Você ainda pode gastar'
                        : 'Orçamento estourado em'}
                  </p>
                  {budget.base > 0 ? (
                    <>
                      <p className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
                        {formatCurrency(Math.abs(budget.remaining))}
                      </p>
                      <p className="text-xs text-emerald-100/90 mt-1">
                        de {formatCurrency(budget.base)} ({budget.fromGoals ? 'soma das metas dos itens' : 'receitas do mês'})
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-emerald-50 mt-1.5">
                      Defina metas na aba <strong>Metas</strong> ou registre uma receita para acompanhar seu limite.
                    </p>
                  )}
                </div>
                {streak > 0 && (
                  <span className="shrink-0 text-[11px] font-bold bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full">
                    🔥 {streak} {streak === 1 ? 'dia' : 'dias'}
                  </span>
                )}
              </div>

              {budget.daily && (
                <div className="mt-4 pt-3.5 border-t border-white/15">
                  <div className="flex justify-between text-xs text-emerald-50 mb-1.5">
                    <span>Hoje: <strong>{formatCurrency(budget.daily.spentToday)}</strong> / {formatCurrency(budget.daily.allowance)}</span>
                    <span>{budget.daily.daysLeft}d restantes</span>
                  </div>
                  <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${budget.daily.pct >= 100 ? 'bg-rose-400' : budget.daily.pct >= 80 ? 'bg-amber-300' : 'bg-white'}`}
                      style={{ width: `${Math.min(budget.daily.pct, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Cards Financeiros */}
            <section className="grid grid-cols-3 gap-2.5">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[11px] font-medium text-slate-500">Acumulado</p>
                <p className={`text-sm sm:text-base font-extrabold mt-0.5 truncate ${summary.acumulado >= 0 ? 'text-slate-900' : 'text-rose-500'}`}>
                  {formatCurrency(summary.acumulado)}
                </p>
                <p className={`text-[10px] font-semibold mt-0.5 truncate ${summary.saldoMes >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  Mês: {formatCurrency(summary.saldoMes)}
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-slate-500">Receitas</p>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-sm sm:text-base font-extrabold text-emerald-500 mt-0.5 truncate">
                  {formatCurrency(summary.receitas)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Entradas</p>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-slate-500">Despesas</p>
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <p className="text-sm sm:text-base font-extrabold text-rose-500 mt-0.5 truncate">
                  {formatCurrency(summary.despesas)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Saídas</p>
              </div>
            </section>

            {/* Check-in Diário & Lembrete */}
            {month === monthOf(today) && (
              <section className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {loggedDays.has(today) ? '✅ Dia de hoje registrado' : '📝 Nada lançado hoje ainda'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                    <Bell className="w-3 h-3" />
                    <input
                      type="time"
                      aria-label="Horário do lembrete"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value || '20:00')}
                      className="px-1.5 py-0.5 text-[11px] border border-slate-200 rounded-md"
                    />
                    <button onClick={downloadReminder} className="underline text-emerald-600 font-semibold cursor-pointer">
                      Lembrete na agenda
                    </button>
                  </div>
                </div>
                {!loggedDays.has(today) && (
                  <button
                    onClick={markNoSpend}
                    className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    Hoje não gastei
                  </button>
                )}
              </section>
            )}

            {/* Histórico Completo com Busca, Filtros e Duplicar */}
            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-emerald-500" />
                    Lançamentos ({filteredTransactions.length})
                  </h2>
                  {monthTx.length > 0 && (
                    <button
                      onClick={() => setMonthDeleteOpen(true)}
                      className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
                    >
                      Limpar mês
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      placeholder="Buscar item (ex: Lenço)..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                  <select
                    aria-label="Tipo"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-2.5 py-2 text-xs font-semibold border border-slate-200 rounded-xl"
                  >
                    <option value="todos">Todos</option>
                    <option value="despesa">Despesas</option>
                    <option value="receita">Receitas</option>
                  </select>
                </div>

                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <button
                    onClick={() => setFilterCategory('todas')}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                      filterCategory === 'todas' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Todas
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setFilterCategory(c.id)}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                        filterCategory === c.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-400">
                  Nenhum lançamento encontrado neste mês. Toque no botão <strong>+</strong> abaixo para começar.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTransactions.map((item) => {
                    const meta = getCategoryMeta(item.category);
                    const Icon = meta.Icon;
                    const income = item.type === 'receita';
                    return (
                      <div key={item.id} className="px-4 py-3.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{item.description}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {meta.label} • {formatDateBR(item.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <span className={`text-sm font-extrabold mr-1 ${income ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {income ? '+' : '-'} {formatCurrency(item.cents)}
                          </span>
                          <button
                            aria-label="Repetir hoje"
                            title="Repetir lançamento hoje"
                            onClick={() => handleDuplicate(item)}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            aria-label="Editar"
                            title="Editar"
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            aria-label="Excluir"
                            title="Excluir"
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ================================================================ */}
        {/* ABA 2: GRÁFICOS (DASHBOARD RÁPIDO E INTUITIVO)                   */}
        {/* ================================================================ */}
        {activeTab === 'graficos' && (
          <div className="space-y-5">
            {/* 4 Indicadores Rápidos */}
            <section className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500">Taxa de economia</p>
                <p className={`text-2xl font-extrabold mt-1 ${dashInsights.savingsRate >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {dashInsights.savingsRate}%
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {summary.receitas > 0 ? 'das receitas poupadas' : 'registre uma receita'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500">Média diária gasta</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {formatCurrency(dashInsights.dailyAvg)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">por dia neste mês</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500">Maior categoria</p>
                <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">
                  {dashInsights.topCat ? dashInsights.topCat.label : '—'}
                </p>
                <p className="text-xs font-bold text-rose-500 mt-0.5">
                  {dashInsights.topCat ? formatCurrency(dashInsights.topCat.value) : 'R$ 0,00'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500">Item mais caro</p>
                <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">
                  {dashInsights.topItem ? dashInsights.topItem.label : '—'}
                </p>
                <p className="text-xs font-bold text-rose-500 mt-0.5">
                  {dashInsights.topItem ? formatCurrency(dashInsights.topItem.value) : 'R$ 0,00'}
                </p>
              </div>
            </section>

            {/* Gráfico 1: Evolução 6 Meses */}
            <section className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  Receitas × Despesas (6 meses)
                </h2>
                <div className="flex items-center gap-3 text-[11px] font-semibold">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Entradas</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Saídas</span>
                </div>
              </div>

              {activeBarData && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3.5 py-2.5 rounded-2xl text-xs">
                  <span className="font-bold text-slate-800">{monthLabel(activeBarData.ym)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-500 font-bold">+{formatCurrency(activeBarData.receitas)}</span>
                    <span className="text-rose-500 font-bold">-{formatCurrency(activeBarData.despesas)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-6 gap-2 items-end h-40 pt-4">
                {sixMonthsTrend.list.map((m) => {
                  const recH = Math.max(4, Math.round((m.receitas / sixMonthsTrend.maxVal) * 112));
                  const despH = Math.max(4, Math.round((m.despesas / sixMonthsTrend.maxVal) * 112));
                  const isSel = (selectedBarMonth || month) === m.ym;
                  return (
                    <button
                      key={m.ym}
                      type="button"
                      onClick={() => setSelectedBarMonth(m.ym)}
                      className={`flex flex-col items-center gap-1.5 p-1.5 rounded-2xl transition-all cursor-pointer ${
                        isSel ? 'bg-slate-100 ring-1 ring-emerald-500/50' : ''
                      }`}
                    >
                      <div className="flex items-end gap-1 h-28">
                        <div
                          className="w-3 sm:w-4 rounded-t-md bg-emerald-500 transition-all"
                          style={{ height: `${m.receitas ? recH : 3}px` }}
                        />
                        <div
                          className="w-3 sm:w-4 rounded-t-md bg-rose-500 transition-all"
                          style={{ height: `${m.despesas ? despH : 3}px` }}
                        />
                      </div>
                      <span className={`text-[11px] font-bold ${isSel ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Gráfico 2: Donut por Categoria + Detalhamento de Itens */}
            <section className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-500" />
                  {selectedDonut ? `Itens de ${selectedDonut.label}` : 'Gastos por Categoria'}
                </h2>
                {selectedDonut && (
                  <button
                    onClick={() => setSelectedSlice(null)}
                    className="text-xs font-bold text-emerald-500 cursor-pointer"
                  >
                    Ver todas
                  </button>
                )}
              </div>

              {donutSegments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Sem despesas registradas em {monthLabel(month)}.</p>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative w-36 h-36 shrink-0">
                      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                        {donutSegments.map((seg) => (
                          <circle
                            key={seg.id}
                            cx="70"
                            cy="70"
                            r={seg.radius}
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth={selectedSlice === seg.id ? 22 : 16}
                            strokeDasharray={seg.strokeDasharray}
                            strokeDashoffset={seg.strokeDashoffset}
                            className="transition-all duration-200 cursor-pointer"
                            onClick={() => setSelectedSlice((s) => (s === seg.id ? null : seg.id))}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                        <span className="text-[10px] font-semibold text-slate-400 truncate max-w-24">
                          {selectedDonut ? selectedDonut.label : 'Total gasto'}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {selectedDonut ? formatCompact(selectedDonut.value) : formatCompact(summary.despesas)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full space-y-1.5">
                      {donutSegments.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedSlice((s) => (s === item.id ? null : item.id))}
                          className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl cursor-pointer ${
                            selectedSlice === item.id ? 'bg-slate-100 ring-1 ring-emerald-500/40' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="font-bold text-slate-800 truncate">{item.label}</span>
                          </span>
                          <span className="shrink-0 ml-2">
                            <strong className="text-slate-900">{item.percentage.toFixed(0)}%</strong>
                            <span className="text-slate-400 ml-1.5">({formatCurrency(item.value)})</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedDonut && selectedCategoryBreakdown.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-500" />
                        Detalhamento dentro de {selectedDonut.label}
                      </p>
                      <div className="space-y-1.5">
                        {selectedCategoryBreakdown.map((sub) => (
                          <div key={sub.key} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-xl">
                            <span className="font-semibold text-slate-800">{sub.label}</span>
                            <span>
                              <strong className="text-slate-900">{formatCurrency(sub.value)}</strong>
                              {sub.goal > 0 && (
                                <span className={`ml-1.5 font-bold ${sub.value > sub.goal ? 'text-rose-500' : 'text-emerald-500'}`}>
                                  / {formatCurrency(sub.goal)}
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Gráfico 3: Top 5 Itens do Mês */}
            <section className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                Top 5 Itens que mais pesaram
              </h2>
              {topItemsMonth.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Nenhum item gasto neste mês.</p>
              ) : (
                <div className="space-y-3">
                  {topItemsMonth.map((it, idx) => (
                    <div key={`${it.category}-${it.label}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate">
                          {idx + 1}. {it.label} <span className="font-normal text-slate-400">({it.meta.label})</span>
                        </span>
                        <span className="font-extrabold text-slate-900 shrink-0 ml-2">{formatCurrency(it.value)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${it.pctBar}%`, backgroundColor: it.meta.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ================================================================ */}
        {/* ABA 3: METAS (VISÃO POR ITENS vs. TOTAL POR CATEGORIA)           */}
        {/* ================================================================ */}
        {activeTab === 'metas' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => setMetasView('itens')}
                className={`py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  metasView === 'itens' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                1. Definir por Itens
              </button>
              <button
                type="button"
                onClick={() => setMetasView('categoria')}
                className={`py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  metasView === 'categoria' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                2. Total por Categoria
              </button>
            </div>

            {/* VISÃO 1: DEFINIR METAS NOS ITENS */}
            {metasView === 'itens' && (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 text-xs text-slate-700">
                  Defina o limite mensal de cada item (ex.: <strong>Lenço</strong> dentro de <strong>Higiene</strong>). Toque no <strong>+</strong> ao lado do item para registrar um gasto nele na hora.
                </div>

                {categories.filter((c) => c.type === 'despesa').map((cat) => {
                  const meta = getCategoryMeta(cat.id);
                  const Icon = meta.Icon;
                  const itemNames = new Set(cat.items || []);
                  Object.values(itemGoals).forEach((ig) => { if (ig.category === cat.id) itemNames.add(ig.label); });
                  monthTx.forEach((t) => { if (t.category === cat.id && t.type === 'despesa') itemNames.add(baseItemName(t.description)); });
                  const itemsList = [...itemNames];
                  const catSumGoal = categoryGoalTotals[cat.id] || 0;

                  return (
                    <section key={cat.id} className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-slate-900 truncate">{cat.label}</h3>
                            <p className="text-[11px] text-slate-500">
                              Total somado: <strong className="text-emerald-500">{formatCurrency(catSumGoal)}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setAddingItemCat(addingItemCat === cat.id ? null : cat.id); setNewItemName(''); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Item
                        </button>
                      </div>

                      {addingItemCat === cat.id && (
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Nome do novo item..."
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddItemFromMetas(cat.id)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-xl cursor-pointer"
                          >
                            Criar
                          </button>
                        </div>
                      )}

                      {itemsList.length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhum item cadastrado. Toque em <strong>+ Item</strong> acima.</p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {itemsList.map((itemLabel) => {
                            const k = itemGoalKey(cat.id, itemLabel);
                            const limit = itemGoals[k]?.cents || 0;
                            const spent = spentByCatItem[k] || 0;
                            const pct = limit > 0 ? (spent / limit) * 100 : 0;
                            const barColor = pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

                            return (
                              <div key={k} className="py-2.5 first:pt-1 last:pb-0 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <button
                                      type="button"
                                      title={`Lançar gasto em ${itemLabel}`}
                                      onClick={() => openQuickWithPreset(cat.id, itemLabel)}
                                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-800 truncate">{itemLabel}</p>
                                      <p className="text-[11px] text-slate-500">
                                        Gasto: <strong className="text-slate-700">{formatCurrency(spent)}</strong>
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[11px] text-slate-400">Meta R$</span>
                                    <input
                                      key={`${k}-${limit}`}
                                      type="text"
                                      inputMode="decimal"
                                      defaultValue={limit ? centsToInput(limit) : ''}
                                      placeholder="0,00"
                                      onBlur={(e) => commitItemGoal(cat.id, itemLabel, e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                      className="w-24 px-2.5 py-1.5 text-xs font-bold text-right border border-slate-200 rounded-xl"
                                    />
                                  </div>
                                </div>
                                {limit > 0 && (
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}

            {/* VISÃO 2: TOTAIS CONSOLIDADOS POR CATEGORIA */}
            {metasView === 'categoria' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Orçamento Total Planejado</p>
                    <p className="text-2xl font-extrabold text-emerald-500 mt-0.5">{formatCurrency(totalAllGoals)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500">Total Gasto no Mês</p>
                    <p className="text-lg font-extrabold text-slate-900 mt-0.5">{formatCurrency(summary.despesas)}</p>
                  </div>
                </div>

                {categories.filter((c) => c.type === 'despesa').map((cat) => {
                  const meta = getCategoryMeta(cat.id);
                  const Icon = meta.Icon;
                  const catGoal = categoryGoalTotals[cat.id] || 0;
                  const catSpent = spentByCat[cat.id] || 0;
                  const pct = catGoal > 0 ? (catSpent / catGoal) * 100 : 0;
                  const barColor = pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
                  const catItemEntries = Object.values(itemGoals).filter((ig) => ig.category === cat.id && ig.cents > 0);

                  return (
                    <section key={cat.id} className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-slate-900 truncate">{cat.label}</h3>
                            <p className="text-xs text-slate-500">
                              Gasto: <strong className="text-slate-800">{formatCurrency(catSpent)}</strong> de{' '}
                              <strong className="text-emerald-500">{formatCurrency(catGoal)}</strong>
                            </p>
                          </div>
                        </div>
                        {catGoal > 0 && (
                          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                            pct >= 100 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
                          }`}>
                            {pct.toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {catGoal > 0 && (
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      )}

                      {catItemEntries.length > 0 ? (
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <p className="text-[11px] font-semibold text-slate-400">Composição da meta:</p>
                          {catItemEntries.map((ig) => {
                            const k = itemGoalKey(cat.id, ig.label);
                            const subSpent = spentByCatItem[k] || 0;
                            return (
                              <div key={k} className="flex items-center justify-between text-xs text-slate-600">
                                <span>• {ig.label}</span>
                                <span>
                                  {formatCurrency(subSpent)} / <strong className="text-slate-800">{formatCurrency(ig.cents)}</strong>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">Sem metas definidas nos itens desta categoria.</p>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* ABA 4: CATEGORIAS E ITENS (CRIAR, EDITAR, COR, ÍCONE, APAGAR)    */}
        {/* ================================================================ */}
        {activeTab === 'categorias' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-2xl border border-slate-200/80">
                {['despesa', 'receita'].map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setCatManageType(tp)}
                    className={`px-4 py-2 text-xs font-extrabold rounded-xl cursor-pointer ${
                      catManageType === tp ? 'bg-emerald-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    {tp === 'despesa' ? 'Despesas' : 'Receitas'}
                  </button>
                ))}
              </div>
              <button
                onClick={openCreateCategory}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nova Categoria
              </button>
            </div>

            <div className="space-y-3">
              {categories.filter((c) => c.type === catManageType).map((cat) => {
                const meta = getCategoryMeta(cat.id);
                const Icon = meta.Icon;
                return (
                  <section key={cat.id} className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-slate-900 truncate">{cat.label}</h3>
                          <p className="text-[11px] text-slate-500">
                            {(cat.items || []).length} {(cat.items || []).length === 1 ? 'item' : 'itens'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditCategory(cat)}
                          aria-label={`Editar ${cat.label}`}
                          className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-xl cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          aria-label={`Excluir ${cat.label}`}
                          className="p-2 text-rose-500 bg-rose-50 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(cat.items || []).map((it) => (
                        <span
                          key={it}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full"
                        >
                          {it}
                          <button
                            type="button"
                            aria-label={`Remover ${it}`}
                            onClick={() => handleRemoveInlineItem(cat.id, it)}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder={`Adicionar item em ${cat.label}...`}
                        value={inlineItemInputs[cat.id] || ''}
                        onChange={(e) => setInlineItemInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInlineItem(cat.id))}
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddInlineItem(cat.id)}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ================================================================== */}
      {/* BARRA DE NAVEGAÇÃO INFERIOR                                        */}
      {/* ================================================================== */}
      <nav aria-label="Navegação principal" className="fs-nav fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90">
        <div className="max-w-3xl mx-auto px-2 pt-1.5 grid grid-cols-5 items-center">
          <button
            onClick={() => setActiveTab('inicio')}
            className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-bold cursor-pointer ${
              activeTab === 'inicio' ? 'text-emerald-500' : 'text-slate-400'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Início</span>
          </button>

          <button
            onClick={() => setActiveTab('graficos')}
            className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-bold cursor-pointer ${
              activeTab === 'graficos' ? 'text-emerald-500' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Gráficos</span>
          </button>

          <div className="flex justify-center">
            <button
              onClick={openQuick}
              aria-label="Novo lançamento"
              className="-mt-6 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>

          <button
            onClick={() => setActiveTab('metas')}
            className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-bold cursor-pointer ${
              activeTab === 'metas' ? 'text-emerald-500' : 'text-slate-400'
            }`}
          >
            <Target className="w-5 h-5" />
            <span>Metas</span>
          </button>

          <button
            onClick={() => setActiveTab('categorias')}
            className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-bold cursor-pointer ${
              activeTab === 'categorias' ? 'text-emerald-500' : 'text-slate-400'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span>Categorias</span>
          </button>
        </div>
      </nav>

      {/* ================================================================== */}
      {/* MODAL: NOVO / EDITAR LANÇAMENTO                                    */}
      {/* ================================================================== */}
      {quickOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setQuickOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="fs-safe-bottom bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingId ? 'Editar lançamento' : 'Novo lançamento'}
              </h3>
              <button type="button" onClick={() => setQuickOpen(false)} className="p-1.5 text-slate-400 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
              {['despesa', 'receita'].map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => handleTypeChange(tp)}
                  className={`py-2 text-xs font-extrabold rounded-xl cursor-pointer ${
                    type === tp
                      ? `bg-white shadow-xs ${tp === 'despesa' ? 'text-rose-500' : 'text-emerald-500'}`
                      : 'text-slate-500'
                  }`}
                >
                  {tp === 'despesa' ? 'Despesa' : 'Receita'}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-2 border-b-2 border-slate-200 focus-within:border-emerald-500 pb-1.5">
                <span className="text-xl font-bold text-slate-400">R$</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-3xl font-extrabold bg-transparent text-slate-900 focus:outline-none"
                />
              </div>
              <div className="flex gap-1.5">
                {[10, 20, 50, 100].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleAddQuickValue(v)}
                    className="flex-1 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-lg cursor-pointer"
                  >
                    +{v}
                  </button>
                ))}
              </div>
            </div>

            {!editingId && recents.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 mb-1.5">Repetir recente</p>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {recents.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => { setCategory(r.category); setDescription(r.description); setAmount(centsToInput(r.cents)); }}
                      className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full cursor-pointer"
                    >
                      {r.description} · {formatCurrency(r.cents)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5">1. Categoria</p>
              <div className="flex flex-wrap gap-1.5">
                {catOrder.map((c) => {
                  const meta = getCategoryMeta(c.id);
                  const Icon = meta.Icon;
                  const on = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCategoryChange(c.id)}
                      style={on ? { backgroundColor: c.color, color: '#fff' } : undefined}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full cursor-pointer ${
                        on ? '' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5">2. Item / Detalhamento</p>
              {suggestedItemsForCategory.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {suggestedItemsForCategory.map((itemLabel) => {
                    const active = norm(description) === norm(itemLabel);
                    return (
                      <button
                        key={itemLabel}
                        type="button"
                        onClick={() => setDescription(itemLabel)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full cursor-pointer ${
                          active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {itemLabel}
                      </button>
                    );
                  })}
                </div>
              )}
              <input
                type="text"
                placeholder="Selecione acima ou digite um item..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {[['Hoje', todayISO()], ['Ontem', yesterdayISO()]].map(([lbl, v]) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setDate(v)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full cursor-pointer ${
                      date === v ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              {!editingId && type === 'despesa' && (
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    aria-label="Parcelas"
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-xl"
                  >
                    <option value={1}>À vista (1x)</option>
                    {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>{n}x parcelas</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {formError && (
              <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> {formError}
              </p>
            )}

            <button
              type="submit"
              className={`w-full py-3.5 text-sm font-extrabold text-white rounded-2xl shadow-md cursor-pointer ${
                type === 'despesa' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {editingId ? 'Salvar alterações' : `Registrar ${type}`}
            </button>
          </form>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: CRIAR / EDITAR CATEGORIA (COR, ÍCONE, ITENS)                 */}
      {/* ================================================================== */}
      {catModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setCatModalOpen(false)}
        >
          <form
            onSubmit={handleSaveCategory}
            className="fs-safe-bottom bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingCatId ? 'Editar categoria' : 'Nova categoria'}
              </h3>
              <button type="button" onClick={() => setCatModalOpen(false)} className="p-1.5 text-slate-400 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nome da categoria</label>
              <input
                type="text"
                placeholder="Ex: Pets, Assinaturas, Carro..."
                value={catLabel}
                onChange={(e) => setCatLabel(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Cor</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setCatColor(hex)}
                    style={{ backgroundColor: hex }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white cursor-pointer"
                  >
                    {catColor === hex && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Ícone</label>
              <div className="grid grid-cols-7 gap-2">
                {ICON_OPTIONS.map((name) => {
                  const Ic = ICONS_MAP[name] || Tag;
                  const active = catIconName === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setCatIconName(name)}
                      style={active ? { backgroundColor: catColor, color: '#fff' } : undefined}
                      className={`p-2 rounded-xl flex items-center justify-center cursor-pointer ${
                        active ? '' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Ic className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Itens desta categoria (separados por vírgula)
              </label>
              <input
                type="text"
                placeholder="Ex: Ração, Vacina, Banho"
                value={catItemsText}
                onChange={(e) => setCatItemsText(e.target.value)}
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl cursor-pointer"
            >
              Salvar categoria
            </button>
          </form>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: OPÇÕES DE BACKUP (COMPLETO .JSON vs PLANILHA .CSV)          */}
      {/* ================================================================== */}
      {backupMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setBackupMenuOpen(false)}
        >
          <div className="fs-safe-bottom bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Exportar dados</h3>
              <button onClick={() => setBackupMenuOpen(false)} className="p-1.5 text-slate-400 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportFullJSON}
              className="w-full p-4 text-left rounded-2xl border-2 border-emerald-500 bg-emerald-50/60 hover:bg-emerald-50 flex items-start gap-3.5 cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900">Backup Completo (.json)</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Salva <strong>tudo</strong>: lançamentos, categorias criadas (cores, ícones e itens) e metas. Ideal para restaurar o app depois.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full p-4 text-left rounded-2xl border border-slate-200 hover:bg-slate-50 flex items-start gap-3.5 cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900">Planilha Excel (.csv)</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exporta apenas a tabela de lançamentos para abrir no Excel ou Google Planilhas.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Excluir Mês */}
      {monthDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900">Limpar {monthLabel(month)}?</h3>
            <p className="text-xs text-slate-500">
              Serão apagados <strong>{monthTx.length}</strong> lançamentos deste mês. Os outros meses continuam salvos.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setMonthDeleteOpen(false)} className="px-4 py-2 text-xs font-bold bg-slate-100 rounded-xl cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleDeleteMonth} className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl cursor-pointer">
                Apagar mês
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Fallback Backup Texto */}
      {backupFallbackText && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-3 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900">Copiar backup (.{backupFallbackExt})</h3>
            <textarea readOnly value={backupFallbackText} rows={6} className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-xl" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setBackupFallbackText('')} className="px-4 py-2 text-xs font-bold bg-slate-100 rounded-xl cursor-pointer">
                Fechar
              </button>
              <button
                onClick={() => { navigator.clipboard?.writeText(backupFallbackText); setBackupFallbackText(''); showToast('Backup copiado!'); }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl cursor-pointer"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Importar JSON / OFX / CSV */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                {importSource === 'json'
                  ? 'Restaurar Backup Completo (.json)'
                  : importSource === 'ofx'
                    ? 'Importar extrato OFX'
                    : 'Importar planilha CSV'}
              </h3>
              <button onClick={() => setImportOpen(false)} className="p-1 text-slate-400 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1">
              <p className="text-slate-700">
                Lançamentos encontrados: <strong className="text-emerald-500">{importPreview.length}</strong>
                {importErrors.length > 0 && ` (${importErrors.length} ignorados)`}
              </p>
              {importSource === 'json' && importExtraData && (
                <p className="text-slate-500">
                  Inclui <strong>{importExtraData.categories?.length || 0} categorias</strong> e{' '}
                  <strong>{Object.keys(importExtraData.itemGoals || {}).length} metas por item</strong>.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ['replace', 'Substituir tudo', 'Restaura exatamente o estado deste backup.'],
                ['merge', 'Mesclar', 'Mantém os atuais e soma os novos sem duplicar.'],
              ].filter(([m]) => importSource !== 'ofx' || m === 'merge').map(([m, tit, sub]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setImportMode(m)}
                  className={`p-3 text-left rounded-2xl border cursor-pointer ${
                    importMode === m ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
                  }`}
                >
                  <p className="text-xs font-extrabold text-slate-900">{tit}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setImportOpen(false)} className="px-4 py-2 text-xs font-bold bg-slate-100 rounded-xl cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleConfirmImport} className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl cursor-pointer">
                Importar agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// FIM DO ARQUIVO src/App.jsx