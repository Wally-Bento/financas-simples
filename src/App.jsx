import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import {
  pad, norm, itemGoalKey, generateId, parseAmountToCents, shiftDateMonths,
  splitInstallments, csvCell, sanitizeBackup, ensureCategories, baseItemName,
} from './lib/finance.js';
import { parseItauStatement, readPdfPages, hashStr } from './lib/itauPdf.js';
import {
  Wallet, TrendingUp, TrendingDown, Trash2, Download, Upload,
  Filter, PieChart, Utensils, Car, Home, Gamepad2, HeartPulse, GraduationCap,
  Briefcase, DollarSign, Tag, CheckCircle2, AlertCircle, AlertTriangle, X,
  ChevronLeft, ChevronRight, Pencil, Search, Target, Sun, Moon, Plus, Bell,
  Scissors, Sparkles, Droplets, Shirt, PiggyBank, Layers, BarChart3,
  LayoutGrid, ShoppingBag, Coffee, Gift, Baby, Smartphone, Zap, Check,
  ArrowUpRight, ArrowDownRight, Copy, Database, FileSpreadsheet, CreditCard,
  Palette, Eye, EyeOff, CalendarPlus, Share2, FolderCheck, RotateCcw,
  Calendar, ShieldCheck,
} from 'lucide-react';

// ============================================================================
// CONSTANTES, TEMAS, ÍCONES E PALETA
// ============================================================================
const KEYS = {
  TX: 'financas_simples_transactions_v3',
  OLD_TX: 'financas_simples_transactions_v2',
  CATS: 'financas_categories_v1',
  ITEM_GOALS: 'financas_simples_item_goals_v1',
  MONTHLY_BUDGETS: 'financas_monthly_budgets_v1',
  SAFETY_BUFFER: 'financas_safety_buffer_v1',
  BACKUP: 'financas_simples_last_backup_v2',
  BACKUP_TS: 'financas_simples_last_backup_ts_v1',
  AUTO_BACKUP: 'financas_auto_backup_info_v1',
  THEME: 'financas_simples_theme_v1',
  ACCENT: 'financas_accent_v1',
  NOSPEND: 'financas_simples_nospend_v1',
  REMINDER: 'financas_reminder_time_v1',
  PRIVACY: 'financas_privacy_mode_v1',
};

const AUTO_BACKUP_PATH = 'Financas/backup_automatico.json';

const ACCENT_THEMES = {
  emerald: {
    label: 'Esmeralda',
    main: '#10b981',
    dark: '#059669',
    gradient: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
    shadow: 'rgba(16, 185, 129, 0.28)',
    soft: 'rgba(16, 185, 129, 0.14)',
    text: '#34d399',
    textLight: '#059669',
  },
  violet: {
    label: 'Violeta',
    main: '#8b5cf6',
    dark: '#7c3aed',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
    shadow: 'rgba(139, 92, 246, 0.30)',
    soft: 'rgba(139, 92, 246, 0.15)',
    text: '#a78bfa',
    textLight: '#7c3aed',
  },
  ocean: {
    label: 'Oceano',
    main: '#0ea5e9',
    dark: '#0284c7',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
    shadow: 'rgba(14, 165, 233, 0.28)',
    soft: 'rgba(14, 165, 233, 0.15)',
    text: '#38bdf8',
    textLight: '#0284c7',
  },
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

const groupDateLabel = (iso) => {
  if (iso === todayISO()) return 'Hoje';
  if (iso === yesterdayISO()) return 'Ontem';
  const [y, m, d] = (iso || '').split('-').map(Number);
  if (!y || !m || !d) return iso || '';
  const currentYear = new Date().getFullYear();
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    ...(y !== currentYear ? { year: 'numeric' } : {}),
  }).replace('.', '');
};

const centsToInput = (c) => (c / 100).toFixed(2).replace('.', ',');
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
  if (Capacitor.isNativePlatform()) {
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
        dialogTitle: title || 'Salvar ou enviar arquivo',
      });
      return 'shared';
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (err?.name === 'AbortError' || /cancel/i.test(msg)) return 'cancelled';
      return 'failed';
    }
  }

  try {
    const file = new File([content], filename, { type: mimeType });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: title || filename });
      return 'shared';
    }
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled';
  }

  try {
    const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8;` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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

const storeEvents = { onError: null };

const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error(e); storeEvents.onError?.(e); return false; }
  },
};

const buildReminderICS = (time) => {
  const [h, m] = time.split(':');
  const day = todayISO().replace(/-/g, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Financas//PT', 'BEGIN:VEVENT',
    'UID:lembrete-diario@financas', `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
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

// ============================================================================
// SISTEMA DE TEMA E ESTILOS (DARK & LIGHT + 3 PALETAS)
// ============================================================================
const THEME_CSS = `
.fs-root {
  --bg-app: #f4f6fa;
  --bg-card: #ffffff;
  --bg-elevated: #eef2f6;
  --bg-glass: rgba(255, 255, 255, 0.86);
  --border-subtle: rgba(15, 23, 42, 0.07);
  --text-main: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --card-shadow: 0 2px 14px rgba(15, 23, 42, 0.04);

  font-variant-numeric: tabular-nums;
  background-color: var(--bg-app);
  color: var(--text-main);
  padding-bottom: calc(5.5rem + env(safe-area-inset-bottom));
}

.fs-root.dark {
  color-scheme: dark;
  --bg-app: #090d16;
  --bg-card: #111827;
  --bg-elevated: #1a2333;
  --bg-glass: rgba(9, 13, 22, 0.86);
  --border-subtle: rgba(255, 255, 255, 0.07);
  --text-main: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #64748b;
  --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.fs-glass-top {
  background-color: var(--bg-glass);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--border-subtle);
  padding-top: max(0.85rem, env(safe-area-inset-top));
}

.fs-glass-nav {
  background-color: var(--bg-glass);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-top: 1px solid var(--border-subtle);
  padding-bottom: max(0.55rem, env(safe-area-inset-bottom));
}

.fs-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--card-shadow);
}

.fs-elevated {
  background-color: var(--bg-elevated);
}

.fs-text-main { color: var(--text-main); }
.fs-text-sec { color: var(--text-secondary); }
.fs-text-muted { color: var(--text-muted); }
.fs-divider > :not([hidden]) ~ :not([hidden]) {
  border-top: 1px solid var(--border-subtle);
}

.fs-input {
  background-color: var(--bg-elevated);
  color: var(--text-main);
  border: 1px solid var(--border-subtle);
}
.fs-input:focus {
  outline: none;
  border-color: var(--accent);
}

.fs-safe-bottom { padding-bottom: max(1.25rem, env(safe-area-inset-bottom)); }
.fs-toast { bottom: calc(5.5rem + env(safe-area-inset-bottom)); }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// ============================================================================
// APP PRINCIPAL
// ============================================================================
export default function App() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [metasView, setMetasView] = useState('itens');
  const [catManageType, setCatManageType] = useState('despesa');

  const [transactions, setTransactions] = useState(loadTransactions);
  const [categories, setCategories] = useState(() => {
    const saved = store.get(KEYS.CATS);
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_CATEGORIES;
  });

  // Orçamento isolado por mês: { "2026-11": { "Higiene|lenco": { category: "Higiene", label: "Lenço", cents: 5000 } } }
  const [monthlyBudgets, setMonthlyBudgets] = useState(() => {
    const saved = store.get(KEYS.MONTHLY_BUDGETS);
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
    // Migração automática do formato antigo global (itemGoals) apenas para o mês atual
    const legacy = store.get(KEYS.ITEM_GOALS, {});
    if (legacy && Object.keys(legacy).length > 0) {
      return { [monthOf(todayISO())]: legacy };
    }
    return {};
  });

  // Reserva de segurança intocável (subtraída antes de liberar receita para orçamento)
  const [safetyBufferCents, setSafetyBufferCents] = useState(() => Number(store.get(KEYS.SAFETY_BUFFER, 0)) || 0);

  const [lastBackup, setLastBackup] = useState(() => store.get(KEYS.BACKUP, null));
  const [lastBackupTs, setLastBackupTs] = useState(() => store.get(KEYS.BACKUP_TS, null));
  const [autoBackupInfo, setAutoBackupInfo] = useState(() => store.get(KEYS.AUTO_BACKUP, null));
  const [month, setMonth] = useState(() => monthOf(todayISO()));
  const [dark, setDark] = useState(() => {
    const saved = store.get(KEYS.THEME);
    return saved ? saved === 'dark' : true;
  });
  const [accentKey, setAccentKey] = useState(() => {
    const saved = store.get(KEYS.ACCENT);
    return saved && ACCENT_THEMES[saved] ? saved : 'emerald';
  });
  const [hideValues, setHideValues] = useState(() => Boolean(store.get(KEYS.PRIVACY, false)));

  const accent = ACCENT_THEMES[accentKey] || ACCENT_THEMES.emerald;
  const accentText = dark ? accent.text : accent.textLight;

  const money = (cents) => (hideValues ? 'R$ •••••' : formatCurrency(cents));
  const compactMoney = (cents) => (hideValues ? '••••' : formatCompact(cents));

  const [noSpend, setNoSpend] = useState(() => store.get(KEYS.NOSPEND, []));
  const [reminderTime, setReminderTime] = useState(() => store.get(KEYS.REMINDER, '20:00'));
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [backupMenuOpen, setBackupMenuOpen] = useState(false);
  const [backupFallbackText, setBackupFallbackText] = useState('');
  const [backupFallbackExt, setBackupFallbackExt] = useState('json');

  // Modal de Lançamento / Edição
  const [quickOpen, setQuickOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState('despesa');
  const [isRefund, setIsRefund] = useState(false); // Estorno/reembolso abate gasto do item
  const [category, setCategory] = useState('Higiene');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO);
  const [installments, setInstallments] = useState(1);
  const [formError, setFormError] = useState('');

  // Modal de Replicar Orçamento para Outros Meses
  const [replicateModalOpen, setReplicateModalOpen] = useState(false);
  const [replicateTargets, setReplicateTargets] = useState([]);
  const [replicateMode, setReplicateMode] = useState('only_empty'); // 'only_empty' | 'overwrite'

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
  const [installDelete, setInstallDelete] = useState(null);
  const fileInputRef = useRef(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importExtraData, setImportExtraData] = useState(null);
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
    if (typeof toast?.undoTo !== 'function') return;
    toast.undoTo();
    setToast(null);
  };

  // Metas exclusivas do mês selecionado (isoladas dos demais meses)
  const currentMonthGoals = useMemo(() => monthlyBudgets[month] || {}, [monthlyBudgets, month]);

  useEffect(() => { store.set(KEYS.TX, transactions); }, [transactions]);
  useEffect(() => { store.set(KEYS.CATS, categories); }, [categories]);
  useEffect(() => { store.set(KEYS.MONTHLY_BUDGETS, monthlyBudgets); }, [monthlyBudgets]);
  useEffect(() => { store.set(KEYS.SAFETY_BUFFER, safetyBufferCents); }, [safetyBufferCents]);
  useEffect(() => { store.set(KEYS.NOSPEND, noSpend); }, [noSpend]);
  useEffect(() => { store.set(KEYS.ACCENT, accentKey); }, [accentKey]);
  useEffect(() => { store.set(KEYS.PRIVACY, hideValues); }, [hideValues]);
  useEffect(() => {
    store.set(KEYS.THEME, dark ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#090d16' : '#f4f6fa');
  }, [dark]);
  useEffect(() => { setSelectedSlice(null); setSelectedBarMonth(null); }, [month]);
  useEffect(() => { store.set(KEYS.REMINDER, reminderTime); }, [reminderTime]);

  useEffect(() => {
    storeEvents.onError = () => showToast('Não foi possível salvar neste aparelho. Faça um backup agora.', 'error');
    navigator.storage?.persist?.()?.catch?.(() => {});
    return () => { storeEvents.onError = null; };
  }, []);

  // Backup automático silencioso na pasta Documentos (nativo Android/iOS) após alterações
  const isFirstAutoBackupMount = useRef(true);
  useEffect(() => {
    if (isFirstAutoBackupMount.current) {
      isFirstAutoBackupMount.current = false;
      return;
    }
    if (!Capacitor.isNativePlatform()) return;

    const timer = setTimeout(async () => {
      const jsonText = JSON.stringify({
        app: 'Financas',
        version: 3,
        exportedAt: new Date().toISOString(),
        data: {
          transactions,
          categories,
          monthlyBudgets,
          safetyBufferCents,
          itemGoals: currentMonthGoals,
          noSpend,
        },
      }, null, 2);

      let savedLocation = null;
      try {
        await Filesystem.writeFile({
          path: AUTO_BACKUP_PATH,
          data: jsonText,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        savedLocation = 'Documentos/Financas';
      } catch {
        try {
          await Filesystem.writeFile({
            path: AUTO_BACKUP_PATH,
            data: jsonText,
            directory: Directory.Data,
            encoding: Encoding.UTF8,
            recursive: true,
          });
          savedLocation = 'Armazenamento interno do app';
        } catch {
          savedLocation = null;
        }
      }

      if (savedLocation) {
        const ts = Date.now();
        const label = new Date(ts).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        const info = { time: label, location: savedLocation, ts };
        setAutoBackupInfo(info);
        setLastBackup(label);
        setLastBackupTs(ts);
        store.set(KEYS.AUTO_BACKUP, info);
        store.set(KEYS.BACKUP, label);
        store.set(KEYS.BACKUP_TS, ts);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [transactions, categories, monthlyBudgets, safetyBufferCents, currentMonthGoals, noSpend]);

  const [, setDayTick] = useState(0);
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) setDayTick((n) => n + 1); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (installDelete) setInstallDelete(null);
      else if (replicateModalOpen) setReplicateModalOpen(false);
      else if (importOpen) setImportOpen(false);
      else if (backupFallbackText) setBackupFallbackText('');
      else if (monthDeleteOpen) setMonthDeleteOpen(false);
      else if (backupMenuOpen) setBackupMenuOpen(false);
      else if (reminderModalOpen) setReminderModalOpen(false);
      else if (catModalOpen) setCatModalOpen(false);
      else if (quickOpen) setQuickOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [installDelete, replicateModalOpen, importOpen, backupFallbackText, monthDeleteOpen, backupMenuOpen, reminderModalOpen, catModalOpen, quickOpen]);

  const cycleAccent = () => {
    const order = ['emerald', 'violet', 'ocean'];
    const next = order[(order.indexOf(accentKey) + 1) % order.length];
    setAccentKey(next);
    showToast(`Tema ${ACCENT_THEMES[next].label} ativado!`);
  };

  const backupOverdue = useMemo(() => {
    if (!lastBackupTs) return transactions.length > 4;
    return (Date.now() - Number(lastBackupTs)) > 7 * 24 * 60 * 60 * 1000;
  }, [lastBackupTs, transactions.length]);

  const getCategoryMeta = (catId) => {
    const found = categories.find((c) => c.id === catId || norm(c.label) === norm(catId));
    if (found) {
      return { ...found, Icon: ICONS_MAP[found.iconName] || Tag };
    }
    return { id: catId, label: catId, type: 'despesa', color: '#64748b', iconName: 'Tag', items: [], Icon: Tag };
  };

  // ----- Cálculos do Mês (Separando Receita Real, Estorno e Gasto Líquido) -----
  const monthTx = useMemo(() => transactions.filter((t) => monthOf(t.date) === month), [transactions, month]);

  const summary = useMemo(() => {
    // Receitas reais do mês (exclui estornos, pois estorno abate o gasto da categoria/item)
    const receitas = monthTx
      .filter((t) => t.type === 'receita' && !t.isRefund)
      .reduce((a, t) => a + t.cents, 0);

    // Gastos líquidos do mês (despesas menos estornos recebidos no mês)
    const despesas = Math.max(
      0,
      monthTx.reduce((a, t) => {
        if (t.type === 'despesa') return a + t.cents;
        if (t.type === 'receita' && t.isRefund) return a - t.cents;
        return a;
      }, 0)
    );

    const acumulado =
      transactions.filter((t) => t.type === 'receita').reduce((a, t) => a + t.cents, 0) -
      transactions.filter((t) => t.type === 'despesa').reduce((a, t) => a + t.cents, 0);

    return {
      receitas,
      despesas,
      saldoMes: receitas - despesas,
      acumulado,
    };
  }, [monthTx, transactions]);

  // Gasto líquido por categoria (despesas da categoria menos estornos daquela categoria)
  const spentByCat = useMemo(
    () => monthTx.reduce((acc, t) => {
      if (t.type === 'despesa') {
        acc[t.category] = (acc[t.category] || 0) + t.cents;
      } else if (t.type === 'receita' && t.isRefund) {
        acc[t.category] = Math.max(0, (acc[t.category] || 0) - t.cents);
      }
      return acc;
    }, {}),
    [monthTx]
  );

  // Gasto líquido por item (despesas do item menos estornos daquele item)
  const spentByCatItem = useMemo(
    () => monthTx.reduce((acc, t) => {
      const k = itemGoalKey(t.category, baseItemName(t.description));
      if (t.type === 'despesa') {
        acc[k] = (acc[k] || 0) + t.cents;
      } else if (t.type === 'receita' && t.isRefund) {
        acc[k] = Math.max(0, (acc[k] || 0) - t.cents);
      }
      return acc;
    }, {}),
    [monthTx]
  );

  const categoryGoalTotals = useMemo(() => {
    const totals = {};
    Object.values(currentMonthGoals).forEach((ig) => {
      if (ig?.cents > 0) {
        totals[ig.category] = (totals[ig.category] || 0) + ig.cents;
      }
    });
    return totals;
  }, [currentMonthGoals]);

  const totalAllGoals = useMemo(
    () => Object.values(categoryGoalTotals).reduce((a, b) => a + b, 0),
    [categoryGoalTotals]
  );

  // Lastro de Receita Real vs. Orçamento Alocado no Mês
  const allocationStats = useMemo(() => {
    const distributableIncome = Math.max(0, summary.receitas - safetyBufferCents);
    const freeToAllocate = Math.max(0, distributableIncome - totalAllGoals);
    const uncoveredDeficit = Math.max(0, totalAllGoals - distributableIncome);
    const effectiveCoveredBudget = Math.min(totalAllGoals, distributableIncome);
    return {
      distributableIncome,
      freeToAllocate,
      uncoveredDeficit,
      effectiveCoveredBudget,
    };
  }, [summary.receitas, safetyBufferCents, totalAllGoals]);

  const goalAlerts = useMemo(() => {
    return Object.values(currentMonthGoals)
      .filter((ig) => ig?.cents > 0)
      .map((ig) => {
        const k = itemGoalKey(ig.category, ig.label);
        const spent = spentByCatItem[k] || 0;
        const pct = (spent / ig.cents) * 100;
        return { ...ig, key: k, spent, pct };
      })
      .filter((x) => x.pct >= 85)
      .sort((a, b) => b.pct - a.pct);
  }, [currentMonthGoals, spentByCatItem]);

  const today = todayISO();
  const budget = useMemo(() => {
    // O teto real de gasto nunca excede a receita distribuível do mês (evita gastar o que não ganhou)
    const base = totalAllGoals > 0
      ? Math.min(totalAllGoals, allocationStats.distributableIncome)
      : allocationStats.distributableIncome;

    let daily = null;
    if (month === monthOf(today) && base > 0) {
      const daysLeft = daysInMonth(month) - Number(today.slice(8)) + 1;
      const spentNet = (fn) => monthTx.reduce((a, t) => {
        if (!fn(t.date)) return a;
        if (t.type === 'despesa') return a + t.cents;
        if (t.type === 'receita' && t.isRefund) return a - t.cents;
        return a;
      }, 0);
      const allowance = Math.max(base - Math.max(0, spentNet((d) => d < today)), 0) / daysLeft;
      const spentToday = Math.max(0, spentNet((d) => d === today));
      daily = { allowance, spentToday, daysLeft, pct: allowance > 0 ? (spentToday / allowance) * 100 : spentToday > 0 ? 100 : 0 };
    }
    const usedPct = base > 0 ? (summary.despesas / base) * 100 : 0;
    const status = base <= 0
      ? (totalAllGoals > 0 ? 'warning' : 'neutral')
      : summary.despesas > base
        ? 'danger'
        : usedPct >= 85 || allocationStats.uncoveredDeficit > 0
          ? 'warning'
          : 'ok';
    return {
      base,
      fromGoals: totalAllGoals > 0,
      remaining: base - summary.despesas,
      usedPct,
      status,
      daily,
    };
  }, [totalAllGoals, allocationStats, summary, month, monthTx, today]);

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
    const total = Object.values(spentByCat).reduce((a, b) => a + b, 0);
    if (!total) return [];
    const radius = 52;
    const circ = 2 * Math.PI * radius;
    let acc = 0;
    return Object.entries(spentByCat)
      .filter(([, value]) => value > 0)
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
  }, [spentByCat, categories]);

  const selectedDonut = donutSegments.find((s) => s.id === selectedSlice);

  const selectedCategoryBreakdown = useMemo(() => {
    if (!selectedSlice) return [];
    const catTotal = spentByCat[selectedSlice] || 0;
    if (!catTotal) return [];
    const map = new Map();
    monthTx
      .filter((t) => t.category === selectedSlice)
      .forEach((t) => {
        const clean = baseItemName(t.description);
        const k = norm(clean);
        const cur = map.get(k) || { key: itemGoalKey(selectedSlice, clean), label: clean, value: 0 };
        if (t.type === 'despesa') cur.value += t.cents;
        else if (t.type === 'receita' && t.isRefund) cur.value = Math.max(0, cur.value - t.cents);
        map.set(k, cur);
      });
    return [...map.values()]
      .filter((it) => it.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((it) => ({
        ...it,
        percentage: (it.value / catTotal) * 100,
        goal: currentMonthGoals[it.key]?.cents || 0,
      }));
  }, [selectedSlice, monthTx, spentByCat, currentMonthGoals]);

  const sixMonthsTrend = useMemo(() => {
    const list = [];
    for (let i = -5; i <= 0; i++) {
      const ym = shiftMonth(month, i);
      const txs = transactions.filter((t) => monthOf(t.date) === ym);
      const rec = txs.filter((t) => t.type === 'receita' && !t.isRefund).reduce((a, t) => a + t.cents, 0);
      const desp = Math.max(
        0,
        txs.reduce((a, t) => (t.type === 'despesa' ? a + t.cents : t.isRefund ? a - t.cents : a), 0)
      );
      list.push({ ym, label: shortMonthLabel(ym), receitas: rec, despesas: desp, saldo: rec - desp });
    }
    const maxVal = Math.max(1, ...list.flatMap((m) => [m.receitas, m.despesas]));
    return { list, maxVal };
  }, [transactions, month]);

  const futureInstallments = useMemo(() => {
    return [1, 2, 3].map((offset) => {
      const ym = shiftMonth(month, offset);
      const totalCents = transactions
        .filter((t) => monthOf(t.date) === ym && t.type === 'despesa' && t.groupId)
        .reduce((a, t) => a + t.cents, 0);
      return { ym, label: monthLabel(ym), totalCents };
    });
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

  // Histórico Filtrado e Agrupado por Data
  const filteredTransactions = useMemo(() => {
    const q = norm(search);
    return monthTx
      .filter((t) => filterType === 'todos' || t.type === filterType)
      .filter((t) => filterCategory === 'todas' || t.category === filterCategory)
      .filter((t) => !q || norm(t.description).includes(q) || norm(t.category).includes(q))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTx, filterType, filterCategory, search]);

  const groupedTransactions = useMemo(() => {
    const groups = [];
    const map = new Map();
    for (const t of filteredTransactions) {
      if (!map.has(t.date)) {
        const g = { date: t.date, items: [] };
        map.set(t.date, g);
        groups.push(g);
      }
      map.get(t.date).items.push(t);
    }
    return groups;
  }, [filteredTransactions]);

  const prevMonth = shiftMonth(month, -1);
  const prevMonthCopyable = useMemo(
    () => transactions.filter((t) => monthOf(t.date) === prevMonth && !t.groupId),
    [transactions, prevMonth]
  );

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
    const filtered = isRefund
      ? categories.filter((c) => c.type === 'despesa')
      : categories.filter((c) => c.type === type);
    return filtered.sort((a, b) => (count[b.id] || 0) - (count[a.id] || 0));
  }, [transactions, categories, type, isRefund]);

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
    setIsRefund(false);
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
    setIsRefund(false);
    const first = categories.find((c) => c.type === newType);
    if (first) setCategory(first.id);
    setDescription('');
    setInstallments(1);
  };

  const handleToggleRefund = (checked) => {
    setIsRefund(checked);
    const targetType = checked ? 'despesa' : 'receita';
    const first = categories.find((c) => c.type === targetType);
    if (first) setCategory(first.id);
    setDescription('');
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
    const refundFlag = type === 'receita' && isRefund;

    setCategories((prev) => prev.map((c) => {
      if (c.id !== category) return c;
      const exists = (c.items || []).some((it) => norm(it) === norm(baseDesc));
      if (exists || norm(baseDesc) === norm(c.label)) return c;
      return { ...c, items: [...(c.items || []), baseDesc] };
    }));

    if (wasEditing) {
      const updated = {
        ...(transactions.find((t) => t.id === editingId) || {}),
        id: editingId, date, type, category, description: cleanDesc, cents: totalCents,
        ...(refundFlag ? { isRefund: true } : { isRefund: false }),
      };
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setMonth(monthOf(date));
      setQuickOpen(false);
      resetForm();
      showToast('Lançamento atualizado!');
      return;
    }

    const numParcelas = type === 'despesa' && installments > 1 ? installments : 1;
    if (numParcelas > 1 && totalCents < numParcelas) {
      return setFormError('Valor muito baixo para dividir em parcelas.');
    }
    const groupId = numParcelas > 1 ? generateId() : null;

    const newEntries = splitInstallments(totalCents, numParcelas).map((cents, idx) => ({
      id: generateId(),
      date: shiftDateMonths(date, idx),
      type,
      category,
      description: numParcelas > 1 ? `${cleanDesc} (${idx + 1}/${numParcelas})` : cleanDesc,
      cents,
      ...(groupId ? { groupId } : {}),
      ...(refundFlag ? { isRefund: true } : {}),
    }));

    setTransactions((prev) => [...newEntries.reverse(), ...prev]);
    setMonth(monthOf(date));
    setQuickOpen(false);
    resetForm();
    showToast(
      refundFlag
        ? 'Estorno abatido no item!'
        : numParcelas > 1
          ? `Lançado em ${numParcelas}x!`
          : 'Lançamento registrado!'
    );
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setType(t.type);
    setIsRefund(Boolean(t.isRefund));
    setCategory(t.category);
    setDescription(t.description);
    setAmount(centsToInput(t.cents));
    setDate(t.date);
    setInstallments(1);
    setFormError('');
    setQuickOpen(true);
  };

  const handleDuplicate = (t) => {
    const copy = { ...t, id: generateId(), date: todayISO(), description: baseItemName(t.description) };
    delete copy.groupId;
    setTransactions((prev) => [copy, ...prev]);
    setMonth(monthOf(copy.date));
    showToast(
      `"${copy.description}" repetido hoje!`,
      'success',
      () => setTransactions((prev) => prev.filter((x) => x.id !== copy.id))
    );
  };

  const handleCopyPreviousMonth = () => {
    if (!prevMonthCopyable.length) return;
    const copies = prevMonthCopyable.map((t) => ({
      id: generateId(),
      date: shiftDateMonths(t.date, 1),
      type: t.type,
      category: t.category,
      description: baseItemName(t.description),
      cents: t.cents,
    }));
    const newIds = new Set(copies.map((c) => c.id));
    setTransactions((prev) => [...copies, ...prev]);
    showToast(
      `${copies.length} lançamentos de ${monthLabel(prevMonth)} copiados!`,
      'success',
      () => setTransactions((prev) => prev.filter((t) => !newIds.has(t.id)))
    );
  };

  const removeTransactions = (removed, message) => {
    const ids = new Set(removed.map((t) => t.id));
    setTransactions((prev) => prev.filter((t) => !ids.has(t.id)));
    showToast(message, 'info', () => setTransactions((prev) => [...removed, ...prev.filter((t) => !ids.has(t.id))]));
  };

  const handleDelete = (id) => {
    const target = transactions.find((t) => t.id === id);
    if (!target) return;
    const inGroup = target.groupId && transactions.some((t) => t.groupId === target.groupId && t.id !== target.id);
    if (inGroup) {
      setInstallDelete(target);
      return;
    }
    removeTransactions([target], 'Lançamento removido.');
  };

  const handleDeleteInstallments = (scope) => {
    const target = installDelete;
    setInstallDelete(null);
    if (!target) return;
    const group = transactions.filter((t) => t.groupId === target.groupId);
    const removed = scope === 'one'
      ? [target]
      : scope === 'next'
        ? group.filter((t) => t.date >= target.date)
        : group;
    removeTransactions(removed, removed.length === 1 ? 'Lançamento removido.' : `${removed.length} parcelas removidas.`);
  };

  const handleDeleteMonth = () => {
    const removed = monthTx;
    setMonthDeleteOpen(false);
    removeTransactions(removed, `${removed.length} lançamentos de ${monthLabel(month)} excluídos.`);
  };

  const markNoSpend = () => {
    setNoSpend((prev) => [...new Set([...prev, todayISO()])]);
    showToast('Dia marcado como sem gastos!');
  };

  const downloadReminder = async () => {
    setReminderModalOpen(false);
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

  // ----- Ações de Metas Isoladas por Mês com Trava de Receita Real -----
  const commitItemGoal = (catId, itemLabel, raw) => {
    const parsed = raw.trim() === '' ? 0 : parseAmountToCents(raw);
    if (isNaN(parsed)) return;
    const k = itemGoalKey(catId, itemLabel);
    const currentItemCents = currentMonthGoals[k]?.cents || 0;
    const maxAllowedForItem = currentItemCents + allocationStats.freeToAllocate;

    let finalCents = Math.max(0, parsed);
    if (finalCents > currentItemCents && finalCents > maxAllowedForItem) {
      finalCents = maxAllowedForItem;
      showToast(
        maxAllowedForItem <= currentItemCents
          ? 'Sem receita livre disponível neste mês para aumentar o orçamento.'
          : `Limitado ao saldo livre de ${formatCurrency(maxAllowedForItem)} deste mês.`,
        'error'
      );
    }

    setMonthlyBudgets((prev) => {
      const monthMap = { ...(prev[month] || {}) };
      if (finalCents <= 0) {
        delete monthMap[k];
      } else {
        monthMap[k] = { category: catId, label: itemLabel, cents: finalCents };
      }
      return { ...prev, [month]: monthMap };
    });
  };

  const handleAllocateRemainingToItem = (catId, itemLabel) => {
    if (allocationStats.freeToAllocate <= 0) return;
    const k = itemGoalKey(catId, itemLabel);
    const currentCents = currentMonthGoals[k]?.cents || 0;
    const targetCents = currentCents + allocationStats.freeToAllocate;
    setMonthlyBudgets((prev) => ({
      ...prev,
      [month]: {
        ...(prev[month] || {}),
        [k]: { category: catId, label: itemLabel, cents: targetCents },
      },
    }));
    showToast(`+${formatCurrency(allocationStats.freeToAllocate)} alocado em ${itemLabel}!`);
  };

  const upcomingMonthsList = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const ym = shiftMonth(month, idx + 1);
      return { ym, label: monthLabel(ym) };
    });
  }, [month]);

  const handleConfirmReplicateBudget = () => {
    if (!replicateTargets.length) return;
    const sourceGoals = monthlyBudgets[month] || {};

    setMonthlyBudgets((prev) => {
      const next = { ...prev };
      replicateTargets.forEach((targetYm) => {
        if (replicateMode === 'overwrite') {
          const cloned = {};
          Object.entries(sourceGoals).forEach(([k, ig]) => {
            cloned[k] = { ...ig };
          });
          next[targetYm] = cloned;
        } else {
          const existing = { ...(next[targetYm] || {}) };
          Object.entries(sourceGoals).forEach(([k, ig]) => {
            if (!existing[k] || !existing[k].cents) {
              existing[k] = { ...ig };
            }
          });
          next[targetYm] = existing;
        }
      });
      return next;
    });

    const count = replicateTargets.length;
    setReplicateModalOpen(false);
    setReplicateTargets([]);
    showToast(`Orçamento de ${monthLabel(month)} replicado para ${count} ${count === 1 ? 'mês' : 'meses'}!`);
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
      if (categories.some((c) => c.id !== editingCatId && norm(c.label) === norm(cleanLabel))) {
        return showToast('Já existe uma categoria com esse nome.', 'error');
      }
      setCategories((prev) => prev.map((c) => {
        if (c.id !== editingCatId) return c;
        return { ...c, id: cleanLabel, label: cleanLabel, color: catColor, iconName: catIconName, items: parsedItems };
      }));
      if (editingCatId !== cleanLabel) {
        setFilterCategory((f) => (f === editingCatId ? cleanLabel : f));
        setTransactions((prev) => prev.map((t) => (t.category === editingCatId ? { ...t, category: cleanLabel } : t)));
        setMonthlyBudgets((prev) => {
          const updated = {};
          Object.entries(prev).forEach(([ym, goalsMap]) => {
            const nextMap = {};
            Object.values(goalsMap || {}).forEach((ig) => {
              const newCat = ig.category === editingCatId ? cleanLabel : ig.category;
              nextMap[itemGoalKey(newCat, ig.label)] = { ...ig, category: newCat };
            });
            updated[ym] = nextMap;
          });
          return updated;
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
    const sameType = categories.filter((c) => c.type === cat.type);
    if (sameType.length <= 1) return showToast('Mantenha pelo menos uma categoria.', 'error');

    const fallback = sameType.find((c) => c.id !== cat.id && /^outr/.test(norm(c.id)))
      || sameType.find((c) => c.id !== cat.id);
    const moved = transactions.filter((t) => t.category === cat.id).length;
    const snap = { categories, transactions, monthlyBudgets };

    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    if (moved) {
      setTransactions((prev) => prev.map((t) => (t.category === cat.id ? { ...t, category: fallback.id } : t)));
    }
    setMonthlyBudgets((prev) => {
      const updated = {};
      Object.entries(prev).forEach(([ym, goalsMap]) => {
        const nextMap = {};
        Object.entries(goalsMap || {}).forEach(([k, ig]) => {
          if (ig.category !== cat.id) nextMap[k] = ig;
        });
        updated[ym] = nextMap;
      });
      return updated;
    });
    setFilterCategory((f) => (f === cat.id ? 'todas' : f));
    showToast(
      moved
        ? `Categoria "${cat.label}" removida. ${moved} lançamentos movidos para "${fallback.label}".`
        : `Categoria "${cat.label}" removida.`,
      'info',
      () => {
        setCategories(snap.categories);
        setTransactions(snap.transactions);
        setMonthlyBudgets(snap.monthlyBudgets);
      }
    );
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
    const targetKey = itemGoalKey(catId, itemLabel);
    setMonthlyBudgets((prev) => {
      const updated = {};
      Object.entries(prev).forEach(([ym, goalsMap]) => {
        const nextMap = { ...(goalsMap || {}) };
        delete nextMap[targetKey];
        updated[ym] = nextMap;
      });
      return updated;
    });
  };

  // ----- Exportar / Compartilhar Backup Completo (JSON) & Planilha (CSV) -----
  const stampBackup = () => {
    const ts = Date.now();
    const now = new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setLastBackup(now);
    setLastBackupTs(ts);
    store.set(KEYS.BACKUP, now);
    store.set(KEYS.BACKUP_TS, ts);
  };

  const buildBackupJSON = () => JSON.stringify({
    app: 'Financas',
    version: 3,
    exportedAt: new Date().toISOString(),
    data: {
      transactions,
      categories,
      monthlyBudgets,
      safetyBufferCents,
      itemGoals: currentMonthGoals,
      noSpend,
    },
  }, null, 2);

  const handleShareFamilyBackup = async () => {
    const jsonText = buildBackupJSON();
    setBackupMenuOpen(false);

    const res = await exportFileAndroidSafe({
      filename: `financas_familia_${todayISO()}.json`,
      content: jsonText,
      mimeType: 'application/json',
      title: 'Sincronizar Finanças (WhatsApp / Drive)',
    });

    if (res === 'cancelled') return;
    if (res === 'failed') {
      setBackupFallbackExt('json');
      setBackupFallbackText(jsonText);
    } else {
      stampBackup();
      showToast('Escolha o WhatsApp ou Google Drive para enviar!');
    }
  };

  const handleExportFullJSON = async () => {
    const jsonText = buildBackupJSON();
    setBackupMenuOpen(false);

    const res = await exportFileAndroidSafe({
      filename: `financas_backup_completo_${todayISO()}.json`,
      content: jsonText,
      mimeType: 'application/json',
      title: 'Backup Completo Finanças (.json)',
    });

    if (res === 'cancelled') return;
    if (res === 'failed') {
      setBackupFallbackExt('json');
      setBackupFallbackText(jsonText);
    } else {
      stampBackup();
      showToast('Backup completo (.json) pronto para salvar!');
    }
  };

  const handleRestoreAutoBackup = async () => {
    setBackupMenuOpen(false);
    try {
      let file = null;
      try {
        file = await Filesystem.readFile({
          path: AUTO_BACKUP_PATH,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
      } catch {
        file = await Filesystem.readFile({
          path: AUTO_BACKUP_PATH,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        });
      }
      if (!file?.data) {
        return showToast('Nenhum backup automático encontrado ainda.', 'error');
      }
      parseJSONBackupText(String(file.data).replace(/^\uFEFF/, '').trim());
    } catch {
      showToast('Nenhum backup automático encontrado na pasta Documentos.', 'error');
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
      const buf = await file.arrayBuffer();
      if (/\.pdf$/i.test(file.name) || new TextDecoder('latin1').decode(buf.slice(0, 5)) === '%PDF-') {
        return await importPDF(buf);
      }
      const text = decodeText(buf);
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

  // Extrato em PDF (Itaú): lê o texto, categoriza e evita duplicados
  const importPDF = async (buf) => {
    showToast('Lendo o PDF...', 'info');
    let rows;
    try {
      rows = parseItauStatement(await readPdfPages(buf));
    } catch (e) {
      return showToast(
        e?.name === 'PasswordException' ? 'Este PDF tem senha. Gere um extrato sem senha.' : 'Não foi possível ler o PDF (sem internet?).',
        'error'
      );
    }
    if (!rows.length) return showToast('Não encontrei lançamentos. O PDF pode ser uma imagem ou outro layout.', 'error');

    const learned = new Map();
    transactions.forEach((t) => learned.set(`${t.type}|${norm(baseItemName(t.description))}`, t.category));
    const count = {};
    const items = rows.map((r) => {
      const description = [r.tipo, r.desc].filter(Boolean).join(' · ') || 'Sem descrição';
      const key = `${r.date}|${r.type}|${r.cents}|${norm(description)}`;
      count[key] = (count[key] || 0) + 1;
      return {
        id: `pdf-${hashStr(key)}-${count[key]}`,
        date: r.date, type: r.type, description, cents: r.cents,
        category: learned.get(`${r.type}|${norm(description)}`) || guessCategoryFromList(`${r.tipo} ${r.desc}`, r.type, categories),
      };
    });
    clearTimeout(toastTimer.current);
    setToast(null);
    setImportPreview(items);
    setImportExtraData(null);
    setImportErrors([]);
    setImportMode('merge');
    setImportSource('pdf');
    setImportOpen(true);
  };

  const parseJSONBackupText = (text) => {
    let parsed;
    try { parsed = JSON.parse(text); } catch { return showToast('Erro ao interpretar o backup JSON.', 'error'); }
    const raw = parsed?.data || parsed;
    if (!Array.isArray(raw?.transactions)) {
      return showToast('Arquivo JSON inválido ou incompatível.', 'error');
    }
    const clean = sanitizeBackup(raw, Object.keys(ICONS_MAP));
    // Preserva a flag isRefund se existir nos lançamentos importados
    const refundIds = new Set(raw.transactions.filter((t) => t?.isRefund).map((t) => t.id));
    const txWithRefund = clean.transactions.map((t) => (refundIds.has(t.id) ? { ...t, isRefund: true } : t));

    if (!txWithRefund.length && raw.transactions.length) {
      return showToast('Nenhum lançamento válido encontrado no backup.', 'error');
    }
    setImportPreview(txWithRefund);
    setImportExtraData({
      categories: clean.categories,
      itemGoals: clean.itemGoals,
      monthlyBudgets: raw.monthlyBudgets && typeof raw.monthlyBudgets === 'object' ? raw.monthlyBudgets : null,
      safetyBufferCents: Number(raw.safetyBufferCents || 0),
      noSpend: clean.noSpend,
    });
    setImportErrors(new Array(clean.dropped).fill('inválido'));
    setImportMode('merge');
    setImportSource('json');
    setImportOpen(true);
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
      const rawCat = (ix.cat !== -1 ? c[ix.cat] : '').replace(/^'(?=[=+\-@])/, '').trim();
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
    const snapshot = { transactions, categories, monthlyBudgets, safetyBufferCents, noSpend };
    const undo = () => {
      setTransactions(snapshot.transactions);
      setCategories(snapshot.categories);
      setMonthlyBudgets(snapshot.monthlyBudgets);
      setSafetyBufferCents(snapshot.safetyBufferCents);
      setNoSpend(snapshot.noSpend);
    };
    const sig = (t) => `${t.date}|${t.type}|${t.category}|${t.description}|${t.cents}`;
    const onlyNew = (list) => {
      const ids = new Set(transactions.map((t) => t.id));
      const sigs = new Set(transactions.map(sig));
      return list.filter((t) => !ids.has(t.id) && !sigs.has(sig(t)));
    };

    if (importSource === 'json' && importExtraData) {
      if (importMode === 'replace') {
        const nextCats = ensureCategories(importExtraData.categories || categories, importPreview, COLOR_PALETTE);
        setTransactions(importPreview);
        setCategories(nextCats);
        if (importExtraData.monthlyBudgets) {
          setMonthlyBudgets(importExtraData.monthlyBudgets);
        } else {
          setMonthlyBudgets({ [month]: importExtraData.itemGoals || {} });
        }
        setSafetyBufferCents(importExtraData.safetyBufferCents || 0);
        setNoSpend(importExtraData.noSpend || []);
        showToast(
          `Backup completo restaurado (${importPreview.length} lançamentos, ${nextCats.length} categorias)!`,
          'success',
          undo
        );
      } else {
        const fresh = onlyNew(importPreview);
        const skipped = importPreview.length - fresh.length;
        setTransactions([...fresh, ...transactions]);
        setCategories((prev) => {
          const map = new Map(prev.map((c) => [norm(c.id), { ...c }]));
          (importExtraData.categories || []).forEach((inc) => {
            const k = norm(inc.id);
            if (!map.has(k)) {
              map.set(k, inc);
            } else {
              const cur = map.get(k);
              map.set(k, { ...cur, items: [...new Set([...(cur.items || []), ...(inc.items || [])])] });
            }
          });
          return ensureCategories([...map.values()], fresh, COLOR_PALETTE);
        });
        if (importExtraData.monthlyBudgets) {
          setMonthlyBudgets((prev) => {
            const merged = { ...prev };
            Object.entries(importExtraData.monthlyBudgets).forEach(([ym, goalsMap]) => {
              merged[ym] = { ...(goalsMap || {}), ...(merged[ym] || {}) };
            });
            return merged;
          });
        } else if (importExtraData.itemGoals) {
          setMonthlyBudgets((prev) => ({
            ...prev,
            [month]: { ...importExtraData.itemGoals, ...(prev[month] || {}) },
          }));
        }
        setNoSpend((prev) => [...new Set([...prev, ...(importExtraData.noSpend || [])])]);
        showToast(
          `Sincronizado: +${fresh.length} novos${skipped ? ` (${skipped} já existiam)` : ''}!`,
          'success',
          undo
        );
      }
    } else {
      setCategories((prev) => ensureCategories(prev, importPreview, COLOR_PALETTE));
      if (importMode === 'replace') {
        setTransactions(importPreview);
        showToast(`${importPreview.length} lançamentos restaurados.`, 'success', undo);
      } else {
        const fresh = onlyNew(importPreview);
        const skipped = importPreview.length - fresh.length;
        setTransactions([...fresh, ...transactions]);
        showToast(`${fresh.length} novos adicionados${skipped ? ` (${skipped} duplicados)` : ''}.`, 'success', undo);
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
    <div
      className={`fs-root ${dark ? 'dark' : ''} min-h-dvh font-sans transition-colors duration-200`}
      style={{ '--accent': accent.main, '--accent-soft': accent.soft }}
    >
      <style>{THEME_CSS}</style>

      {/* Toast */}
      {toast && (
        <div role="status" className="fs-toast fixed left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10">
          {toast.variant === 'error'
            ? <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            : <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: accent.main }} />}
          <span className="text-sm font-medium flex-1">{toast.text}</span>
          {toast.undoTo && (
            <button onClick={handleUndo} className="text-sm font-bold cursor-pointer" style={{ color: accent.text }}>
              Desfazer
            </button>
          )}
        </div>
      )}

      {/* Top App Bar */}
      <header className="fs-glass-top sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-3 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-white flex items-center justify-center shrink-0"
              style={{ background: accent.gradient, boxShadow: `0 4px 12px ${accent.shadow}` }}
            >
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold fs-text-main tracking-tight leading-none whitespace-nowrap">
                Finanças
              </h1>
              <p className="text-[10px] sm:text-[11px] fs-text-muted mt-0.5 truncate max-w-[115px] sm:max-w-none">
                {autoBackupInfo
                  ? `Auto: ${autoBackupInfo.time}`
                  : lastBackup
                    ? `Backup: ${lastBackup.replace(/\/\d{4},?/, '')}`
                    : 'Controle da Família'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.ofx,application/json,text/csv,text/plain,application/x-ofx,*/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => setHideValues((h) => !h)}
              aria-label={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
              title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
              className="fs-elevated fs-text-sec p-1.5 sm:p-2 rounded-xl cursor-pointer active:scale-95 transition-transform"
            >
              {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Importar ou mesclar arquivo recebido (.json, .csv, .ofx, .pdf)"
              className="fs-elevated fs-text-sec inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-2 text-xs font-semibold rounded-xl cursor-pointer active:scale-95 transition-transform"
            >
              <Upload className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <button
              onClick={() => setBackupMenuOpen(true)}
              title={backupOverdue ? 'Backup e compartilhamento com família' : 'Backup automático e compartilhamento'}
              style={{ background: accent.gradient, boxShadow: `0 3px 10px ${accent.shadow}` }}
              className="relative inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-2 text-xs font-bold text-white rounded-xl cursor-pointer active:scale-95 transition-transform"
            >
              <Share2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Backup</span>
              {backupOverdue && (
                <span
                  aria-label="Backup pendente"
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[var(--bg-app)]"
                />
              )}
            </button>
            <button
              onClick={() => setReminderModalOpen(true)}
              aria-label="Lembrete diário"
              title="Configurar lembrete diário na agenda"
              className="fs-elevated fs-text-sec p-1.5 sm:p-2 rounded-xl cursor-pointer active:scale-95 transition-transform"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={cycleAccent}
              aria-label="Trocar cor do tema"
              title={`Cor atual: ${accent.label} (toque para trocar)`}
              className="fs-elevated p-1.5 sm:p-2 rounded-xl cursor-pointer active:scale-95 transition-transform"
              style={{ color: accentText }}
            >
              <Palette className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              aria-label="Alternar claro/escuro"
              title={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              className="fs-elevated fs-text-sec p-1.5 sm:p-2 rounded-xl cursor-pointer active:scale-95 transition-transform"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-3.5 space-y-4">
        {/* Seletor de Mês */}
        {activeTab !== 'categorias' && (
          <div className="fs-card flex items-center justify-between px-2 py-1.5 rounded-2xl">
            <button
              aria-label="Mês anterior"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="p-2 fs-text-sec rounded-xl cursor-pointer active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMonth(monthOf(todayISO()))}
              className="px-4 py-1 text-sm font-extrabold fs-text-main cursor-pointer"
            >
              {monthLabel(month)}
            </button>
            <button
              aria-label="Próximo mês"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              className="p-2 fs-text-sec rounded-xl cursor-pointer active:scale-95 transition-transform"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* ABA 1: INÍCIO                                                    */}
        {/* ================================================================ */}
        {activeTab === 'inicio' && (
          <div className="space-y-4">
            {/* Hero Card com Semáforo de Orçamento Lastreado na Receita Real */}
            <section
              className="relative overflow-hidden rounded-3xl text-white p-5 transition-all duration-300"
              style={
                budget.status === 'danger'
                  ? {
                      background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                      boxShadow: '0 12px 30px -6px rgba(225, 29, 72, 0.38)',
                    }
                  : budget.status === 'warning'
                    ? {
                        background: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
                        boxShadow: '0 12px 30px -6px rgba(217, 119, 6, 0.35)',
                      }
                    : {
                        background: accent.gradient,
                        boxShadow: `0 12px 30px -6px ${accent.shadow}`,
                      }
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/90 flex items-center gap-1.5">
                    {budget.status === 'danger' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    {budget.status === 'warning' && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                    <span>
                      {budget.base <= 0
                        ? (totalAllGoals > 0 ? 'Orçamento aguardando receita' : 'Orçamento do mês')
                        : budget.remaining >= 0
                          ? budget.status === 'warning'
                            ? `Atenção: ${Math.round(budget.usedPct)}% usado`
                            : 'Você ainda pode gastar'
                          : 'Orçamento estourado em'}
                    </span>
                  </p>
                  {budget.base > 0 ? (
                    <>
                      <p className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
                        {money(Math.abs(budget.remaining))}
                      </p>
                      <p className="text-xs text-white/85 mt-1">
                        de {money(budget.base)} ({budget.fromGoals ? 'orçamento coberto pela receita' : 'receita líquida do mês'})
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-white/90 mt-1.5">
                      {totalAllGoals > 0
                        ? `Você planejou ${money(totalAllGoals)}, mas ainda não há receita lançada neste mês.`
                        : 'Registre uma receita e distribua nos itens na aba Metas para controlar seu teto.'}
                    </p>
                  )}
                </div>
                {streak > 0 && (
                  <span className="shrink-0 text-[11px] font-bold bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-full">
                    🔥 {streak} {streak === 1 ? 'dia' : 'dias'}
                  </span>
                )}
              </div>

              {budget.daily && (
                <div className="mt-4 pt-3.5 border-t border-white/20">
                  <div className="flex justify-between text-xs text-white/90 mb-1.5">
                    <span>
                      {budget.daily.allowance > 0 ? (
                        <>
                          Hoje: <strong>{money(budget.daily.spentToday)}</strong> / {money(budget.daily.allowance)}
                        </>
                      ) : (
                        <>
                          Hoje: <strong>{money(budget.daily.spentToday)}</strong> (limite diário esgotado)
                        </>
                      )}
                    </span>
                    <span>{budget.daily.daysLeft}d restantes</span>
                  </div>
                  <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budget.daily.pct >= 100 ? 'bg-amber-300' : budget.daily.pct >= 80 ? 'bg-amber-200' : 'bg-white'
                      }`}
                      style={{ width: `${Math.min(budget.daily.pct, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Cards Financeiros (Acumulado, Receitas, Despesas) */}
            <section className="grid grid-cols-3 gap-2.5">
              <div className="fs-card p-3.5 rounded-2xl">
                <p className="text-[11px] font-semibold fs-text-muted">Acumulado</p>
                <p className={`text-sm sm:text-base font-extrabold mt-0.5 truncate ${summary.acumulado >= 0 ? 'fs-text-main' : 'text-rose-500'}`}>
                  {money(summary.acumulado)}
                </p>
                <p
                  className="text-[10px] font-bold mt-0.5 truncate"
                  style={{ color: summary.saldoMes >= 0 ? accentText : '#f43f5e' }}
                >
                  Mês: {money(summary.saldoMes)}
                </p>
              </div>
              <div className="fs-card p-3.5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold fs-text-muted">Receitas</p>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-sm sm:text-base font-extrabold text-emerald-500 mt-0.5 truncate">
                  {money(summary.receitas)}
                </p>
                <p className="text-[10px] fs-text-muted mt-0.5">Entradas</p>
              </div>
              <div className="fs-card p-3.5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold fs-text-muted">Despesas</p>
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <p className="text-sm sm:text-base font-extrabold text-rose-500 mt-0.5 truncate">
                  {money(summary.despesas)}
                </p>
                <p className="text-[10px] fs-text-muted mt-0.5">Gasto líquido</p>
              </div>
            </section>

            {/* Alerta rápido de Metas por Item perto ou acima do limite */}
            {goalAlerts.length > 0 && (
              <button
                type="button"
                onClick={() => { setMetasView('itens'); setActiveTab('metas'); }}
                style={{
                  backgroundColor: goalAlerts[0].pct >= 100 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.13)',
                  borderColor: goalAlerts[0].pct >= 100 ? 'rgba(244, 63, 94, 0.35)' : 'rgba(245, 158, 11, 0.35)',
                }}
                className="w-full px-4 py-2.5 rounded-2xl border flex items-center justify-between gap-2 text-left cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 ${goalAlerts[0].pct >= 100 ? 'text-rose-500' : 'text-amber-500'}`}
                  />
                  <p className="text-xs font-bold fs-text-main truncate">
                    {goalAlerts[0].pct >= 100
                      ? `${goalAlerts[0].label} estourou a meta (${Math.round(goalAlerts[0].pct)}%)`
                      : `${goalAlerts[0].label} atingiu ${Math.round(goalAlerts[0].pct)}% da meta`}
                    {goalAlerts.length > 1 && ` · +${goalAlerts.length - 1}`}
                  </p>
                </div>
                <span className="text-[11px] font-extrabold shrink-0" style={{ color: accentText }}>
                  Metas →
                </span>
              </button>
            )}

            {/* Faixa discreta de Check-in */}
            {month === monthOf(today) && !loggedDays.has(today) && (
              <div className="fs-card px-4 py-2.5 rounded-2xl flex items-center justify-between gap-2">
                <span className="text-xs font-semibold fs-text-sec">Nada lançado hoje ainda</span>
                <button
                  onClick={markNoSpend}
                  style={{ backgroundColor: accent.soft, color: accentText }}
                  className="px-3 py-1.5 text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  Hoje não gastei
                </button>
              </div>
            )}

            {/* Histórico Completo Agrupado por Dia */}
            <section className="fs-card rounded-3xl overflow-hidden">
              <div className="p-4 space-y-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold fs-text-main flex items-center gap-1.5">
                    <Filter className="w-4 h-4" style={{ color: accent.main }} />
                    Lançamentos ({filteredTransactions.length})
                  </h2>
                  {monthTx.length > 0 && (
                    <button
                      onClick={() => setMonthDeleteOpen(true)}
                      className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Limpar mês
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 fs-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      placeholder="Buscar item (ex: Lenço)..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="fs-input w-full pl-8 pr-3 py-2 text-xs rounded-xl"
                    />
                  </div>
                  <select
                    aria-label="Tipo"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="fs-input px-2.5 py-2 text-xs font-semibold rounded-xl"
                  >
                    <option value="todos">Todos</option>
                    <option value="despesa">Despesas</option>
                    <option value="receita">Receitas</option>
                  </select>
                </div>

                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <button
                    onClick={() => setFilterCategory('todas')}
                    style={filterCategory === 'todas' ? { backgroundColor: accent.main, color: '#fff' } : undefined}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                      filterCategory === 'todas' ? '' : 'fs-elevated fs-text-sec'
                    }`}
                  >
                    Todas
                  </button>
                  {categories.map((c) => {
                    const active = filterCategory === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setFilterCategory(c.id)}
                        style={active ? { backgroundColor: accent.main, color: '#fff' } : undefined}
                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                          active ? '' : 'fs-elevated fs-text-sec'
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <p className="text-xs fs-text-muted">
                    Nenhum lançamento encontrado neste mês. Toque no botão <strong>+</strong> abaixo para começar.
                  </p>
                  {monthTx.length === 0 && prevMonthCopyable.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyPreviousMonth}
                      style={{ backgroundColor: accent.soft, color: accentText }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl cursor-pointer active:scale-95 transition-transform"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      Repetir {prevMonthCopyable.length} itens de {monthLabel(prevMonth)}
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {groupedTransactions.map((group) => (
                    <div key={group.date}>
                      <div
                        className="fs-elevated px-4 py-1.5 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider fs-text-muted"
                        style={{ borderBottom: '1px solid var(--border-subtle)', borderTop: '1px solid var(--border-subtle)' }}
                      >
                        <span>{groupDateLabel(group.date)}</span>
                        <span>{group.items.length} {group.items.length === 1 ? 'item' : 'itens'}</span>
                      </div>
                      <div className="fs-divider">
                        {group.items.map((item) => {
                          const meta = getCategoryMeta(item.category);
                          const Icon = meta.Icon;
                          const income = item.type === 'receita';
                          return (
                            <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                              >
                                <div
                                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                                >
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold fs-text-main truncate">{item.description}</p>
                                  <p className="text-[11px] fs-text-muted truncate">
                                    {meta.label}
                                    {item.isRefund ? ' · Estorno abatido' : ''}
                                  </p>
                                </div>
                              </button>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(item)}
                                  className={`text-sm font-extrabold cursor-pointer ${
                                    item.isRefund ? 'text-sky-500' : income ? 'text-emerald-500' : 'text-rose-500'
                                  }`}
                                >
                                  {income ? '+' : '-'} {money(item.cents)}
                                </button>
                                <button
                                  type="button"
                                  aria-label="Repetir hoje"
                                  title="Repetir lançamento hoje"
                                  onClick={() => handleDuplicate(item)}
                                  className="p-1.5 fs-text-muted hover:text-emerald-500 rounded-lg cursor-pointer"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ================================================================ */}
        {/* ABA 2: GRÁFICOS (DASHBOARD RÁPIDO E INTUITIVO)                   */}
        {/* ================================================================ */}
        {activeTab === 'graficos' && (
          <div className="space-y-4">
            <section className="grid grid-cols-2 gap-3">
              <div className="fs-card p-4 rounded-2xl">
                <p className="text-[11px] font-semibold fs-text-muted">Taxa de economia</p>
                <p className={`text-2xl font-extrabold mt-1 ${dashInsights.savingsRate >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {dashInsights.savingsRate}%
                </p>
                <p className="text-[11px] fs-text-muted mt-0.5">
                  {summary.receitas > 0 ? 'das receitas poupadas' : 'registre uma receita'}
                </p>
              </div>
              <div className="fs-card p-4 rounded-2xl">
                <p className="text-[11px] font-semibold fs-text-muted">Média diária gasta</p>
                <p className="text-2xl font-extrabold fs-text-main mt-1">
                  {money(dashInsights.dailyAvg)}
                </p>
                <p className="text-[11px] fs-text-muted mt-0.5">por dia neste mês</p>
              </div>
              <div className="fs-card p-4 rounded-2xl">
                <p className="text-[11px] font-semibold fs-text-muted">Maior categoria</p>
                <p className="text-sm font-extrabold fs-text-main mt-1 truncate">
                  {dashInsights.topCat ? dashInsights.topCat.label : '—'}
                </p>
                <p className="text-xs font-bold text-rose-500 mt-0.5">
                  {dashInsights.topCat ? money(dashInsights.topCat.value) : money(0)}
                </p>
              </div>
              <div className="fs-card p-4 rounded-2xl">
                <p className="text-[11px] font-semibold fs-text-muted">Item mais caro</p>
                <p className="text-sm font-extrabold fs-text-main mt-1 truncate">
                  {dashInsights.topItem ? dashInsights.topItem.label : '—'}
                </p>
                <p className="text-xs font-bold text-rose-500 mt-0.5">
                  {dashInsights.topItem ? money(dashInsights.topItem.value) : money(0)}
                </p>
              </div>
            </section>

            {/* Parcelas Futuras já Comprometidas */}
            {futureInstallments.some((f) => f.totalCents > 0) && (
              <section className="fs-card p-4 rounded-3xl space-y-2.5">
                <h2 className="text-xs font-extrabold uppercase tracking-wider fs-text-muted flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" style={{ color: accent.main }} />
                  Parcelas Futuras já Comprometidas
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {futureInstallments.map((f) => (
                    <div key={f.ym} className="fs-elevated p-3 rounded-2xl">
                      <p className="text-[11px] font-bold fs-text-muted truncate">{f.label}</p>
                      <p className="text-xs sm:text-sm font-extrabold fs-text-main mt-0.5">
                        {money(f.totalCents)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Evolução 6 Meses */}
            <section className="fs-card p-5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold fs-text-main flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" style={{ color: accent.main }} />
                  Receitas × Despesas (6 meses)
                </h2>
                <div className="flex items-center gap-3 text-[11px] font-semibold fs-text-sec">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Entradas</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Saídas</span>
                </div>
              </div>

              {activeBarData && (
                <div className="fs-elevated flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl text-xs">
                  <span className="font-bold fs-text-main">{monthLabel(activeBarData.ym)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-500 font-bold">+{money(activeBarData.receitas)}</span>
                    <span className="text-rose-500 font-bold">-{money(activeBarData.despesas)}</span>
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
                        isSel ? 'fs-elevated' : ''
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
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: isSel ? accentText : 'var(--text-muted)' }}
                      >
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Donut por Categoria + Detalhamento de Itens */}
            <section className="fs-card p-5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold fs-text-main flex items-center gap-2">
                  <PieChart className="w-4 h-4" style={{ color: accent.main }} />
                  {selectedDonut ? `Itens de ${selectedDonut.label}` : 'Gastos por Categoria'}
                </h2>
                {selectedDonut && (
                  <button
                    onClick={() => setSelectedSlice(null)}
                    style={{ color: accentText }}
                    className="text-xs font-bold cursor-pointer"
                  >
                    Ver todas
                  </button>
                )}
              </div>

              {donutSegments.length === 0 ? (
                <p className="text-xs fs-text-muted text-center py-8">Sem despesas registradas em {monthLabel(month)}.</p>
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
                        <span className="text-[10px] font-semibold fs-text-muted truncate max-w-24">
                          {selectedDonut ? selectedDonut.label : 'Total gasto'}
                        </span>
                        <span className="text-xs font-extrabold fs-text-main">
                          {selectedDonut ? compactMoney(selectedDonut.value) : compactMoney(summary.despesas)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full space-y-1.5">
                      {donutSegments.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedSlice((s) => (s === item.id ? null : item.id))}
                          className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl cursor-pointer ${
                            selectedSlice === item.id ? 'fs-elevated' : ''
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="font-bold fs-text-main truncate">{item.label}</span>
                          </span>
                          <span className="shrink-0 ml-2">
                            <strong className="fs-text-main">{item.percentage.toFixed(0)}%</strong>
                            <span className="fs-text-muted ml-1.5">({money(item.value)})</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedDonut && selectedCategoryBreakdown.length > 0 && (
                    <div className="pt-3 space-y-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <p className="text-xs font-bold fs-text-sec flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" style={{ color: accent.main }} />
                        Detalhamento dentro de {selectedDonut.label}
                      </p>
                      <div className="space-y-1.5">
                        {selectedCategoryBreakdown.map((sub) => (
                          <div key={sub.key} className="fs-elevated flex items-center justify-between text-xs px-3 py-2 rounded-xl">
                            <span className="font-semibold fs-text-main">{sub.label}</span>
                            <span>
                              <strong className="fs-text-main">{money(sub.value)}</strong>
                              {sub.goal > 0 && (
                                <span className={`ml-1.5 font-bold ${sub.value > sub.goal ? 'text-rose-500' : 'text-emerald-500'}`}>
                                  / {money(sub.goal)}
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

            {/* Top 5 Itens */}
            <section className="fs-card p-5 rounded-3xl space-y-3.5">
              <h2 className="text-sm font-extrabold fs-text-main flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                Top 5 Itens que mais pesaram
              </h2>
              {topItemsMonth.length === 0 ? (
                <p className="text-xs fs-text-muted text-center py-4">Nenhum item gasto neste mês.</p>
              ) : (
                <div className="space-y-3">
                  {topItemsMonth.map((it, idx) => (
                    <div key={`${it.category}-${it.label}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold fs-text-main truncate">
                          {idx + 1}. {it.label} <span className="font-normal fs-text-muted">({it.meta.label})</span>
                        </span>
                        <span className="font-extrabold fs-text-main shrink-0 ml-2">{money(it.value)}</span>
                      </div>
                      <div className="fs-elevated h-2 rounded-full overflow-hidden">
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
        {/* ABA 3: METAS / ORÇAMENTO ISOLADO POR MÊS COM LASTRO DE RECEITA   */}
        {/* ================================================================ */}
        {activeTab === 'metas' && (
          <div className="space-y-4">
            {/* Barra Superior: Saldo Livre para Alocar + Replicar Mês + Reserva de Segurança */}
            <section className="fs-card p-4 rounded-3xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider fs-text-muted">
                    Livre para alocar em {monthLabel(month)}
                  </p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span
                      className="text-2xl font-extrabold"
                      style={{
                        color: allocationStats.uncoveredDeficit > 0
                          ? '#f59e0b'
                          : allocationStats.freeToAllocate > 0
                            ? accentText
                            : 'var(--text-main)',
                      }}
                    >
                      {money(allocationStats.freeToAllocate)}
                    </span>
                    <span className="text-xs fs-text-muted">
                      de {money(allocationStats.distributableIncome)} disponíveis
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setReplicateTargets([]);
                    setReplicateMode('only_empty');
                    setReplicateModalOpen(true);
                  }}
                  style={{ background: accent.gradient, boxShadow: `0 4px 12px ${accent.shadow}` }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-white rounded-xl cursor-pointer active:scale-95 transition-transform"
                >
                  <Copy className="w-3.5 h-3.5" /> Replicar mês
                </button>
              </div>

              {/* Barra de Lastro (Orçado vs Receita Distribuível) */}
              <div>
                <div className="flex justify-between text-[11px] fs-text-sec mb-1">
                  <span>Orçado nos itens: <strong>{money(totalAllGoals)}</strong></span>
                  <span>
                    {allocationStats.distributableIncome > 0
                      ? `${Math.min(100, Math.round((totalAllGoals / allocationStats.distributableIncome) * 100))}% alocado`
                      : 'Aguardando receita'}
                  </span>
                </div>
                <div className="fs-elevated h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${
                        allocationStats.distributableIncome > 0
                          ? Math.min(100, (totalAllGoals / allocationStats.distributableIncome) * 100)
                          : totalAllGoals > 0
                            ? 100
                            : 0
                      }%`,
                      backgroundColor: allocationStats.uncoveredDeficit > 0 ? '#f59e0b' : accent.main,
                    }}
                  />
                </div>
              </div>

              {/* Alerta quando orçamento replicado ainda está acima da receita do mês */}
              {allocationStats.uncoveredDeficit > 0 && (
                <div
                  className="rounded-2xl px-3.5 py-2.5 border flex items-start gap-2 text-xs"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.35)' }}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="fs-text-main">
                    <strong>Orçamento descoberto em {money(allocationStats.uncoveredDeficit)}:</strong> as metas deste mês superam a receita real lançada. Novos aumentos estão bloqueados até entrar receita.
                  </p>
                </div>
              )}

              {/* Reserva de segurança mensal intocável */}
              <div className="pt-2 flex items-center justify-between gap-2 text-xs" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="flex items-center gap-1.5 fs-text-sec font-semibold">
                  <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: accent.main }} />
                  Reserva de segurança intocável:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] fs-text-muted">R$</span>
                  <input
                    key={`buffer-${safetyBufferCents}`}
                    type="text"
                    inputMode="decimal"
                    defaultValue={safetyBufferCents ? centsToInput(safetyBufferCents) : ''}
                    placeholder="0,00"
                    onBlur={(e) => {
                      const c = e.target.value.trim() === '' ? 0 : parseAmountToCents(e.target.value);
                      if (!isNaN(c) && c >= 0) setSafetyBufferCents(c);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    className="fs-input w-24 px-2.5 py-1 text-xs font-bold text-right rounded-xl"
                  />
                </div>
              </div>
            </section>

            {/* Sub-abas: 1. Definir por Itens | 2. Total por Categoria */}
            <div className="fs-card grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setMetasView('itens')}
                style={metasView === 'itens' ? { backgroundColor: accent.main, color: '#fff' } : undefined}
                className={`py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  metasView === 'itens' ? '' : 'fs-text-sec'
                }`}
              >
                1. Definir por Itens
              </button>
              <button
                type="button"
                onClick={() => setMetasView('categoria')}
                style={metasView === 'categoria' ? { backgroundColor: accent.main, color: '#fff' } : undefined}
                className={`py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  metasView === 'categoria' ? '' : 'fs-text-sec'
                }`}
              >
                2. Total por Categoria
              </button>
            </div>

            {/* VISÃO 1: DEFINIR METAS NOS ITENS (ISOLADAS NO MÊS ATUAL) */}
            {metasView === 'itens' && (
              <div className="space-y-4">
                {categories.filter((c) => c.type === 'despesa').map((cat) => {
                  const meta = getCategoryMeta(cat.id);
                  const Icon = meta.Icon;
                  const itemNames = new Set(cat.items || []);
                  Object.values(currentMonthGoals).forEach((ig) => { if (ig.category === cat.id) itemNames.add(ig.label); });
                  monthTx.forEach((t) => { if (t.category === cat.id && t.type === 'despesa') itemNames.add(baseItemName(t.description)); });
                  const itemsList = [...itemNames];
                  const catSumGoal = categoryGoalTotals[cat.id] || 0;

                  return (
                    <section key={cat.id} className="fs-card p-4 rounded-3xl space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold fs-text-main truncate">{cat.label}</h3>
                            <p className="text-[11px] fs-text-muted">
                              Total somado ({shortMonthLabel(month)}): <strong style={{ color: accentText }}>{money(catSumGoal)}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setAddingItemCat(addingItemCat === cat.id ? null : cat.id); setNewItemName(''); }}
                          style={{ backgroundColor: accent.soft, color: accentText }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-extrabold rounded-xl cursor-pointer"
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
                            className="fs-input flex-1 px-3 py-1.5 text-xs rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddItemFromMetas(cat.id)}
                            style={{ backgroundColor: accent.main }}
                            className="px-3 py-1.5 text-xs font-bold text-white rounded-xl cursor-pointer"
                          >
                            Criar
                          </button>
                        </div>
                      )}

                      {itemsList.length === 0 ? (
                        <p className="text-xs fs-text-muted">Nenhum item cadastrado. Toque em <strong>+ Item</strong> acima.</p>
                      ) : (
                        <div className="fs-divider">
                          {itemsList.map((itemLabel) => {
                            const k = itemGoalKey(cat.id, itemLabel);
                            const limit = currentMonthGoals[k]?.cents || 0;
                            const spent = spentByCatItem[k] || 0;
                            const available = Math.max(0, limit - spent);
                            const pct = limit > 0 ? (spent / limit) * 100 : 0;
                            const barColor = pct >= 100 ? '#f43f5e' : pct >= 85 ? '#f59e0b' : accent.main;

                            return (
                              <div key={k} className="py-2.5 first:pt-1 last:pb-0 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <button
                                      type="button"
                                      title={`Lançar gasto em ${itemLabel}`}
                                      onClick={() => openQuickWithPreset(cat.id, itemLabel)}
                                      style={{ backgroundColor: accent.soft, color: accentText }}
                                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold fs-text-main truncate">{itemLabel}</p>
                                      <p className="text-[11px] fs-text-muted">
                                        Gasto: <strong className="fs-text-sec">{money(spent)}</strong>
                                        {limit > 0 && (
                                          <>
                                            {' · '}
                                            <span className={spent > limit ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                                              {spent > limit ? `Passou ${money(spent - limit)}` : `Livre ${money(available)}`}
                                            </span>
                                          </>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {allocationStats.freeToAllocate > 0 && (
                                      <button
                                        type="button"
                                        title={`Alocar ${formatCurrency(allocationStats.freeToAllocate)} restantes aqui`}
                                        onClick={() => handleAllocateRemainingToItem(cat.id, itemLabel)}
                                        style={{ backgroundColor: accent.soft, color: accentText }}
                                        className="px-2 py-1 text-[10px] font-extrabold rounded-lg cursor-pointer"
                                      >
                                        +Resto
                                      </button>
                                    )}
                                    <span className="text-[11px] fs-text-muted">R$</span>
                                    <input
                                      key={`${month}-${k}-${limit}`}
                                      type="text"
                                      inputMode="decimal"
                                      defaultValue={limit ? centsToInput(limit) : ''}
                                      placeholder="0,00"
                                      onBlur={(e) => commitItemGoal(cat.id, itemLabel, e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                      className="fs-input w-24 px-2.5 py-1.5 text-xs font-bold text-right rounded-xl"
                                    />
                                  </div>
                                </div>
                                {limit > 0 && (
                                  <div className="fs-elevated h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full transition-all"
                                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
                                    />
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
                <div className="fs-card p-4 rounded-3xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold fs-text-muted">Orçamento Planejado ({shortMonthLabel(month)})</p>
                    <p className="text-2xl font-extrabold mt-0.5" style={{ color: accentText }}>
                      {money(totalAllGoals)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold fs-text-muted">Total Gasto no Mês</p>
                    <p className="text-lg font-extrabold fs-text-main mt-0.5">{money(summary.despesas)}</p>
                  </div>
                </div>

                {categories.filter((c) => c.type === 'despesa').map((cat) => {
                  const meta = getCategoryMeta(cat.id);
                  const Icon = meta.Icon;
                  const catGoal = categoryGoalTotals[cat.id] || 0;
                  const catSpent = spentByCat[cat.id] || 0;
                  const pct = catGoal > 0 ? (catSpent / catGoal) * 100 : 0;
                  const barColor = pct >= 100 ? '#f43f5e' : pct >= 85 ? '#f59e0b' : accent.main;
                  const catItemEntries = Object.values(currentMonthGoals).filter((ig) => ig.category === cat.id && ig.cents > 0);

                  return (
                    <section key={cat.id} className="fs-card p-4 rounded-3xl space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold fs-text-main truncate">{cat.label}</h3>
                            <p className="text-xs fs-text-muted">
                              Gasto: <strong className="fs-text-sec">{money(catSpent)}</strong> de{' '}
                              <strong style={{ color: accentText }}>{money(catGoal)}</strong>
                            </p>
                          </div>
                        </div>
                        {catGoal > 0 && (
                          <span
                            className="text-xs font-extrabold px-2.5 py-1 rounded-full"
                            style={{
                              backgroundColor: pct >= 100 ? 'rgba(244,63,94,0.15)' : accent.soft,
                              color: pct >= 100 ? '#f43f5e' : accentText,
                            }}
                          >
                            {pct.toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {catGoal > 0 && (
                        <div className="fs-elevated h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
                          />
                        </div>
                      )}

                      {catItemEntries.length > 0 ? (
                        <div className="pt-2 space-y-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <p className="text-[11px] font-semibold fs-text-muted">Composição da meta:</p>
                          {catItemEntries.map((ig) => {
                            const k = itemGoalKey(cat.id, ig.label);
                            const subSpent = spentByCatItem[k] || 0;
                            return (
                              <div key={k} className="flex items-center justify-between text-xs fs-text-sec">
                                <span>• {ig.label}</span>
                                <span>
                                  {money(subSpent)} / <strong className="fs-text-main">{money(ig.cents)}</strong>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] fs-text-muted">Sem metas definidas nos itens desta categoria.</p>
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
              <div className="fs-card grid grid-cols-2 gap-1 p-1 rounded-2xl">
                {['despesa', 'receita'].map((tp) => {
                  const active = catManageType === tp;
                  return (
                    <button
                      key={tp}
                      onClick={() => setCatManageType(tp)}
                      style={active ? { backgroundColor: accent.main, color: '#fff' } : undefined}
                      className={`px-4 py-2 text-xs font-extrabold rounded-xl cursor-pointer ${
                        active ? '' : 'fs-text-sec'
                      }`}
                    >
                      {tp === 'despesa' ? 'Despesas' : 'Receitas'}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={openCreateCategory}
                style={{ background: accent.gradient, boxShadow: `0 4px 12px ${accent.shadow}` }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold text-white rounded-2xl cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nova Categoria
              </button>
            </div>

            <div className="space-y-3">
              {categories.filter((c) => c.type === catManageType).map((cat) => {
                const meta = getCategoryMeta(cat.id);
                const Icon = meta.Icon;
                return (
                  <section key={cat.id} className="fs-card p-4 rounded-3xl space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold fs-text-main truncate">{cat.label}</h3>
                          <p className="text-[11px] fs-text-muted">
                            {(cat.items || []).length} {(cat.items || []).length === 1 ? 'item' : 'itens'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => openEditCategory(cat)}
                          aria-label={`Editar ${cat.label}`}
                          className="fs-elevated fs-text-sec p-2 rounded-xl cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          aria-label={`Excluir ${cat.label}`}
                          className="p-2 text-rose-500 rounded-xl cursor-pointer"
                          style={{ backgroundColor: 'rgba(244, 63, 94, 0.14)' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(cat.items || []).map((it) => (
                        <span
                          key={it}
                          className="fs-elevated fs-text-sec inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full"
                        >
                          {it}
                          <button
                            type="button"
                            aria-label={`Remover ${it}`}
                            onClick={() => handleRemoveInlineItem(cat.id, it)}
                            className="fs-text-muted hover:text-rose-500 cursor-pointer"
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
                        className="fs-input flex-1 px-3 py-1.5 text-xs rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddInlineItem(cat.id)}
                        style={{ backgroundColor: accent.soft, color: accentText }}
                        className="px-3 py-1.5 text-xs font-extrabold rounded-xl cursor-pointer"
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
      {/* BARRA DE NAVEGAÇÃO INFERIOR (GLASSMORPHISM + BOTÃO CENTRAL +)      */}
      {/* ================================================================== */}
      <nav aria-label="Navegação principal" className="fs-glass-nav fixed bottom-0 inset-x-0 z-40">
        <div className="max-w-3xl mx-auto px-2 pt-1.5 grid grid-cols-5 items-center">
          <button
            onClick={() => setActiveTab('inicio')}
            aria-current={activeTab === 'inicio' ? 'page' : undefined}
            style={{ color: activeTab === 'inicio' ? accentText : 'var(--text-muted)' }}
            className="flex flex-col items-center gap-0.5 py-1 text-[11px] font-bold cursor-pointer"
          >
            <Home className="w-5 h-5" />
            <span>Início</span>
          </button>

          <button
            onClick={() => setActiveTab('graficos')}
            aria-current={activeTab === 'graficos' ? 'page' : undefined}
            style={{ color: activeTab === 'graficos' ? accentText : 'var(--text-muted)' }}
            className="flex flex-col items-center gap-0.5 py-1 text-[11px] font-bold cursor-pointer"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Gráficos</span>
          </button>

          <div className="flex justify-center">
            <button
              onClick={openQuick}
              aria-label="Novo lançamento"
              style={{
                background: accent.gradient,
                boxShadow: `0 6px 20px ${accent.shadow}`,
                borderColor: 'var(--bg-app)',
              }}
              className="-mt-6 w-14 h-14 rounded-full border-4 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>

          <button
            onClick={() => setActiveTab('metas')}
            aria-current={activeTab === 'metas' ? 'page' : undefined}
            style={{ color: activeTab === 'metas' ? accentText : 'var(--text-muted)' }}
            className="flex flex-col items-center gap-0.5 py-1 text-[11px] font-bold cursor-pointer"
          >
            <Target className="w-5 h-5" />
            <span>Metas</span>
          </button>

          <button
            onClick={() => setActiveTab('categorias')}
            aria-current={activeTab === 'categorias' ? 'page' : undefined}
            style={{ color: activeTab === 'categorias' ? accentText : 'var(--text-muted)' }}
            className="flex flex-col items-center gap-0.5 py-1 text-[11px] font-bold cursor-pointer"
          >
            <LayoutGrid className="w-5 h-5" />
            <span>Categorias</span>
          </button>
        </div>
      </nav>

      {/* ================================================================== */}
      {/* MODAL: REPLICAR ORÇAMENTO PARA OUTROS MESES                        */}
      {/* ================================================================== */}
      {replicateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setReplicateModalOpen(false)}
        >
          <div className="fs-card fs-safe-bottom w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold fs-text-main flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: accent.main }} />
                Replicar {monthLabel(month)}
              </h3>
              <button
                type="button"
                onClick={() => setReplicateModalOpen(false)}
                aria-label="Fechar"
                className="p-1.5 fs-text-muted rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ['only_empty', 'Apenas itens vazios', 'Preserva ajustes já feitos nos meses futuros.'],
                ['overwrite', 'Substituir tudo', 'Copia idêntico ao orçamento deste mês.'],
              ].map(([modeKey, title, subtitle]) => {
                const active = replicateMode === modeKey;
                return (
                  <button
                    key={modeKey}
                    type="button"
                    onClick={() => setReplicateMode(modeKey)}
                    style={
                      active
                        ? { borderColor: accent.main, backgroundColor: accent.soft }
                        : { borderColor: 'var(--border-subtle)' }
                    }
                    className="p-3 text-left rounded-2xl border cursor-pointer"
                  >
                    <p className="text-xs font-extrabold fs-text-main">{title}</p>
                    <p className="text-[11px] fs-text-muted mt-0.5">{subtitle}</p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold fs-text-muted">Escolha os meses de destino</span>
                <button
                  type="button"
                  onClick={() =>
                    setReplicateTargets(
                      replicateTargets.length === upcomingMonthsList.length
                        ? []
                        : upcomingMonthsList.map((m) => m.ym)
                    )
                  }
                  style={{ color: accentText }}
                  className="text-xs font-extrabold cursor-pointer"
                >
                  {replicateTargets.length === upcomingMonthsList.length ? 'Desmarcar todos' : 'Selecionar 12 meses'}
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {upcomingMonthsList.map(({ ym, label }) => {
                  const checked = replicateTargets.includes(ym);
                  const hasBudgets = Object.keys(monthlyBudgets[ym] || {}).length > 0;
                  return (
                    <label
                      key={ym}
                      style={
                        checked
                          ? { borderColor: accent.main, backgroundColor: accent.soft }
                          : { borderColor: 'var(--border-subtle)' }
                      }
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl border cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 text-xs font-bold fs-text-main">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setReplicateTargets((prev) =>
                              prev.includes(ym) ? prev.filter((x) => x !== ym) : [...prev, ym]
                            )
                          }
                          className="rounded"
                        />
                        {label}
                      </span>
                      {hasBudgets && (
                        <span className="fs-elevated fs-text-muted text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Já possui metas
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReplicateModalOpen(false)}
                className="fs-elevated fs-text-sec px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={replicateTargets.length === 0}
                onClick={handleConfirmReplicateBudget}
                style={{ background: accent.gradient }}
                className="px-4 py-2.5 text-xs font-extrabold text-white rounded-xl cursor-pointer disabled:opacity-40"
              >
                Replicar ({replicateTargets.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: NOVO / EDITAR LANÇAMENTO                                    */}
      {/* ================================================================== */}
      {quickOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setQuickOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="fs-card fs-safe-bottom w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[92dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold fs-text-main">
                {editingId ? 'Editar lançamento' : 'Novo lançamento'}
              </h3>
              <button type="button" onClick={() => setQuickOpen(false)} aria-label="Fechar" className="p-1.5 fs-text-muted rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="fs-elevated grid grid-cols-2 gap-1.5 p-1 rounded-2xl">
              {['despesa', 'receita'].map((tp) => {
                const active = type === tp;
                return (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => handleTypeChange(tp)}
                    style={active ? { backgroundColor: 'var(--bg-card)' } : undefined}
                    className={`py-2 text-xs font-extrabold rounded-xl cursor-pointer ${
                      active
                        ? tp === 'despesa' ? 'text-rose-500 shadow-xs' : 'text-emerald-500 shadow-xs'
                        : 'fs-text-muted'
                    }`}
                  >
                    {tp === 'despesa' ? 'Despesa' : 'Receita'}
                  </button>
                );
              })}
            </div>

            {type === 'receita' && (
              <label
                className="fs-elevated flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isRefund}
                  onChange={(e) => handleToggleRefund(e.target.checked)}
                  className="rounded"
                />
                <span className="fs-text-sec">
                  É <strong>estorno / reembolso</strong> (abate o gasto do item sem inflar a receita do mês)
                </span>
              </label>
            )}

            <div className="space-y-2">
              <div className="flex items-baseline gap-2 pb-1.5" style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                <span className="text-xl font-bold fs-text-muted">R$</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-3xl font-extrabold bg-transparent fs-text-main focus:outline-none"
                />
              </div>
              <div className="flex gap-1.5">
                {[10, 20, 50, 100].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleAddQuickValue(v)}
                    className="fs-elevated fs-text-sec flex-1 py-1 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    +{v}
                  </button>
                ))}
              </div>
            </div>

            {!editingId && recents.length > 0 && (
              <div>
                <p className="text-[11px] font-bold fs-text-muted mb-1.5">Repetir recente</p>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {recents.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => { setCategory(r.category); setDescription(r.description); setAmount(centsToInput(r.cents)); }}
                      className="fs-elevated fs-text-sec shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full cursor-pointer"
                    >
                      {r.description} · {formatCurrency(r.cents)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[11px] font-bold fs-text-muted mb-1.5">1. Categoria</p>
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
                        on ? '' : 'fs-elevated fs-text-sec'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold fs-text-muted mb-1.5">2. Item / Detalhamento</p>
              {suggestedItemsForCategory.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {suggestedItemsForCategory.map((itemLabel) => {
                    const active = norm(description) === norm(itemLabel);
                    return (
                      <button
                        key={itemLabel}
                        type="button"
                        onClick={() => setDescription(itemLabel)}
                        style={active ? { backgroundColor: accent.main, color: '#fff' } : undefined}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full cursor-pointer ${
                          active ? '' : 'fs-elevated fs-text-sec'
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
                className="fs-input w-full px-3.5 py-2.5 text-sm rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {[['Hoje', todayISO()], ['Ontem', yesterdayISO()]].map(([lbl, v]) => {
                  const active = date === v;
                  return (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setDate(v)}
                      style={active ? { backgroundColor: accent.main, color: '#fff' } : undefined}
                      className={`px-3 py-1.5 text-xs font-bold rounded-full cursor-pointer ${
                        active ? '' : 'fs-elevated fs-text-sec'
                      }`}
                    >
                      {lbl}
                    </button>
                  );
                })}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="fs-input px-2.5 py-1 text-xs rounded-xl"
                />
              </div>

              {!editingId && type === 'despesa' && (
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 fs-text-muted" />
                  <select
                    aria-label="Parcelas"
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="fs-input px-2.5 py-1.5 text-xs font-bold rounded-xl"
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
              style={type === 'receita' ? { background: accent.gradient } : undefined}
              className={`w-full py-3.5 text-sm font-extrabold text-white rounded-2xl shadow-md cursor-pointer ${
                type === 'despesa' ? 'bg-rose-600 hover:bg-rose-700' : ''
              }`}
            >
              {editingId ? 'Salvar alterações' : isRefund ? 'Registrar estorno' : `Registrar ${type}`}
            </button>

            {editingId && (
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const target = transactions.find((t) => t.id === editingId);
                    setQuickOpen(false);
                    resetForm();
                    if (target) handleDuplicate(target);
                  }}
                  className="fs-elevated fs-text-sec py-2.5 text-xs font-extrabold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Repetir hoje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = editingId;
                    setQuickOpen(false);
                    resetForm();
                    handleDelete(idToDelete);
                  }}
                  style={{ backgroundColor: 'rgba(244, 63, 94, 0.14)' }}
                  className="py-2.5 text-xs font-extrabold text-rose-500 rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: CRIAR / EDITAR CATEGORIA                                    */}
      {/* ================================================================== */}
      {catModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setCatModalOpen(false)}
        >
          <form
            onSubmit={handleSaveCategory}
            className="fs-card fs-safe-bottom w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[92dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold fs-text-main">
                {editingCatId ? 'Editar categoria' : 'Nova categoria'}
              </h3>
              <button type="button" onClick={() => setCatModalOpen(false)} aria-label="Fechar" className="p-1.5 fs-text-muted rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold fs-text-muted mb-1">Nome da categoria</label>
              <input
                type="text"
                placeholder="Ex: Pets, Assinaturas, Carro..."
                value={catLabel}
                onChange={(e) => setCatLabel(e.target.value)}
                className="fs-input w-full px-3.5 py-2.5 text-sm rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold fs-text-muted mb-1.5">Cor</label>
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
              <label className="block text-xs font-bold fs-text-muted mb-1.5">Ícone</label>
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
                        active ? '' : 'fs-elevated fs-text-sec'
                      }`}
                    >
                      <Ic className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold fs-text-muted mb-1">
                Itens desta categoria (separados por vírgula)
              </label>
              <input
                type="text"
                placeholder="Ex: Ração, Vacina, Banho"
                value={catItemsText}
                onChange={(e) => setCatItemsText(e.target.value)}
                className="fs-input w-full px-3.5 py-2.5 text-sm rounded-xl"
              />
            </div>

            <button
              type="submit"
              style={{ background: accent.gradient }}
              className="w-full py-3 text-sm font-extrabold text-white rounded-2xl cursor-pointer"
            >
              Salvar categoria
            </button>
          </form>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: LEMBRETE DIÁRIO NA AGENDA                                   */}
      {/* ================================================================== */}
      {reminderModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setReminderModalOpen(false)}
        >
          <div className="fs-card max-w-sm w-full rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold fs-text-main flex items-center gap-2">
                <Bell className="w-4 h-4" style={{ color: accent.main }} />
                Lembrete diário
              </h3>
              <button onClick={() => setReminderModalOpen(false)} aria-label="Fechar" className="p-1 fs-text-muted cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs fs-text-sec">
              Escolha um horário para a agenda do seu celular lembrar você de registrar os gastos do dia:
            </p>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value || '20:00')}
              className="fs-input w-full px-3.5 py-2.5 text-sm font-bold rounded-xl"
            />
            <button
              onClick={downloadReminder}
              style={{ background: accent.gradient }}
              className="w-full py-3 text-xs font-extrabold text-white rounded-2xl cursor-pointer"
            >
              Adicionar na Agenda
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: BACKUP AUTOMÁTICO E COMPARTILHAMENTO COM FAMÍLIA            */}
      {/* ================================================================== */}
      {backupMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setBackupMenuOpen(false)}
        >
          <div className="fs-card fs-safe-bottom w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3.5 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold fs-text-main">Backup & Sincronizar Família</h3>
              <button onClick={() => setBackupMenuOpen(false)} aria-label="Fechar" className="p-1.5 fs-text-muted rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {Capacitor.isNativePlatform() && (
              <div
                className="p-3.5 rounded-2xl border flex items-start justify-between gap-2.5"
                style={{ backgroundColor: accent.soft, borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <FolderCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: accentText }} />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold fs-text-main">Backup automático ativo</p>
                    <p className="text-[11px] fs-text-sec mt-0.5">
                      {autoBackupInfo
                        ? `Última cópia: ${autoBackupInfo.time} (${autoBackupInfo.location})`
                        : 'Salva automaticamente em Documentos/Financas após cada lançamento.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRestoreAutoBackup}
                  title="Recuperar backup automático salvo na pasta Documentos"
                  className="fs-card px-2.5 py-1.5 text-[11px] font-extrabold rounded-xl inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  style={{ color: accentText }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleShareFamilyBackup}
              style={{ background: accent.gradient, boxShadow: `0 6px 18px ${accent.shadow}` }}
              className="w-full p-4 text-left rounded-2xl text-white flex items-start gap-3.5 cursor-pointer active:scale-[0.99] transition-transform"
            >
              <div className="p-2.5 rounded-xl bg-white/20 text-white shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold">Enviar para Família (WhatsApp / Drive)</p>
                <p className="text-xs text-white/90 mt-0.5">
                  Compartilhe com 1 toque pelo WhatsApp ou salve no Google Drive. No outro celular, basta importar usando <strong>Mesclar</strong>.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportFullJSON}
              className="fs-elevated w-full p-3.5 text-left rounded-2xl flex items-start gap-3.5 cursor-pointer"
            >
              <div className="fs-card p-2.5 rounded-xl shrink-0" style={{ color: accentText }}>
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold fs-text-main">Backup Completo (.json)</p>
                <p className="text-xs fs-text-muted mt-0.5">
                  Gera uma cópia completa de lançamentos, categorias e orçamentos mensais.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="fs-elevated w-full p-3.5 text-left rounded-2xl flex items-start gap-3.5 cursor-pointer"
            >
              <div className="fs-card p-2.5 rounded-xl fs-text-sec shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold fs-text-main">Planilha Excel (.csv)</p>
                <p className="text-xs fs-text-muted mt-0.5">
                  Exporta a tabela de lançamentos para Excel ou Google Planilhas.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Excluir parcela de um parcelamento */}
      {installDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setInstallDelete(null)}
        >
          <div className="fs-card rounded-3xl max-w-sm w-full p-5 space-y-3">
            <h3 className="text-base font-extrabold fs-text-main">Excluir parcela</h3>
            <p className="text-xs fs-text-sec">
              <strong>{installDelete.description}</strong> faz parte de um parcelamento
              de {transactions.filter((t) => t.groupId === installDelete.groupId).length} parcelas. O que deseja excluir?
            </p>
            <div className="space-y-2">
              <button onClick={() => handleDeleteInstallments('one')} className="fs-elevated fs-text-main w-full px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer">
                Só esta parcela
              </button>
              <button onClick={() => handleDeleteInstallments('next')} className="fs-elevated fs-text-main w-full px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer">
                Esta e as próximas
              </button>
              <button onClick={() => handleDeleteInstallments('all')} className="w-full px-4 py-2.5 text-xs font-bold text-white bg-rose-600 rounded-xl cursor-pointer">
                Todas as parcelas
              </button>
              <button onClick={() => setInstallDelete(null)} className="fs-text-sec w-full px-4 py-2 text-xs font-bold cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Excluir Mês */}
      {monthDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <div className="fs-card rounded-3xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-extrabold fs-text-main">Limpar {monthLabel(month)}?</h3>
            <p className="text-xs fs-text-sec">
              Serão apagados <strong>{monthTx.length}</strong> lançamentos deste mês. Os outros meses continuam salvos.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setMonthDeleteOpen(false)} className="fs-elevated fs-text-sec px-4 py-2 text-xs font-bold rounded-xl cursor-pointer">
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
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fs-card rounded-3xl max-w-md w-full p-5 space-y-3">
            <h3 className="text-base font-extrabold fs-text-main">Copiar backup (.{backupFallbackExt})</h3>
            <textarea readOnly value={backupFallbackText} rows={6} className="fs-input w-full p-2.5 text-xs font-mono rounded-xl" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setBackupFallbackText('')} className="fs-elevated fs-text-sec px-4 py-2 text-xs font-bold rounded-xl cursor-pointer">
                Fechar
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(backupFallbackText);
                  if (backupFallbackExt === 'json') stampBackup();
                  setBackupFallbackText('');
                  showToast('Backup copiado!');
                }}
                style={{ backgroundColor: accent.main }}
                className="px-4 py-2 text-xs font-bold text-white rounded-xl cursor-pointer"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Importar JSON / OFX / CSV */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fs-card rounded-3xl max-w-lg w-full p-5 space-y-4 max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold fs-text-main">
                {importSource === 'json'
                  ? 'Sincronizar / Restaurar Backup (.json)'
                  : importSource === 'ofx'
                    ? 'Importar extrato OFX'
                    : importSource === 'pdf'
                      ? 'Importar extrato PDF'
                      : 'Importar planilha CSV'}
              </h3>
              <button onClick={() => setImportOpen(false)} aria-label="Fechar" className="p-1 fs-text-muted cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="fs-elevated p-3 rounded-2xl text-xs space-y-1">
              <p className="fs-text-sec">
                Lançamentos encontrados: <strong style={{ color: accentText }}>{importPreview.length}</strong>
                {importErrors.length > 0 && ` (${importErrors.length} ignorados)`}
              </p>
              {importSource === 'json' && importExtraData && (
                <p className="fs-text-muted">
                  Inclui <strong>{importExtraData.categories?.length || 0} categorias</strong> e{' '}
                  <strong>
                    {importExtraData.monthlyBudgets
                      ? `${Object.keys(importExtraData.monthlyBudgets).length} meses de orçamento`
                      : `${Object.keys(importExtraData.itemGoals || {}).length} metas por item`}
                  </strong>.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ['merge', 'Mesclar (Família)', 'Soma os lançamentos novos aos seus sem duplicar.'],
                ['replace', 'Substituir tudo', 'Apaga os atuais e restaura exatamente este arquivo.'],
              ].filter(([m]) => !['ofx', 'pdf'].includes(importSource) || m === 'merge').map(([m, tit, sub]) => {
                const active = importMode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setImportMode(m)}
                    style={active ? { borderColor: accent.main, backgroundColor: accent.soft } : { borderColor: 'var(--border-subtle)' }}
                    className="p-3 text-left rounded-2xl border cursor-pointer"
                  >
                    <p className="text-xs font-extrabold fs-text-main">{tit}</p>
                    <p className="text-[11px] fs-text-muted mt-0.5">{sub}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setImportOpen(false)} className="fs-elevated fs-text-sec px-4 py-2 text-xs font-bold rounded-xl cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={handleConfirmImport}
                style={{ backgroundColor: accent.main }}
                className="px-4 py-2 text-xs font-bold text-white rounded-xl cursor-pointer"
              >
                {importMode === 'merge' ? 'Mesclar agora' : 'Restaurar tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
