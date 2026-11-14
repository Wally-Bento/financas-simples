import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, PlusCircle, Trash2, Download, Upload,
  Filter, PieChart, Utensils, Car, Home, Gamepad2, HeartPulse, GraduationCap,
  Briefcase, DollarSign, Tag, CheckCircle2, AlertCircle, X, Clock, RotateCcw,
  ChevronLeft, ChevronRight, Pencil, Search, Target, Sun, Moon, Plus, Bell,
} from 'lucide-react';

// ============================================================================
// CONSTANTES
// ============================================================================
const KEYS = {
  TX: 'financas_simples_transactions_v3',
  OLD_TX: 'financas_simples_transactions_v2',
  GOALS: 'financas_simples_goals_v1',
  BACKUP: 'financas_simples_last_backup_v2',
  THEME: 'financas_simples_theme_v1',
  NOSPEND: 'financas_simples_nospend_v1',
};

const CATEGORIES = [
  { id: 'Alimentação', label: 'Alimentação', type: 'despesa', color: '#f97316', icon: Utensils },
  { id: 'Moradia', label: 'Moradia', type: 'despesa', color: '#3b82f6', icon: Home },
  { id: 'Transporte', label: 'Transporte', type: 'despesa', color: '#eab308', icon: Car },
  { id: 'Saúde', label: 'Saúde', type: 'despesa', color: '#ef4444', icon: HeartPulse },
  { id: 'Lazer', label: 'Lazer', type: 'despesa', color: '#a855f7', icon: Gamepad2 },
  { id: 'Educação', label: 'Educação', type: 'despesa', color: '#06b6d4', icon: GraduationCap },
  { id: 'Outros Gastos', label: 'Outros Gastos', type: 'despesa', color: '#64748b', icon: Tag },
  { id: 'Salário', label: 'Salário', type: 'receita', color: '#10b981', icon: Briefcase },
  { id: 'Investimentos', label: 'Investimentos', type: 'receita', color: '#14b8a6', icon: TrendingUp },
  { id: 'Outras Receitas', label: 'Outras Receitas', type: 'receita', color: '#22c55e', icon: DollarSign },
];

const DEFAULT_GOALS = {
  'Alimentação': 120000, 'Moradia': 230000, 'Transporte': 45000,
  'Saúde': 35000, 'Lazer': 40000, 'Educação': 0, 'Outros Gastos': 30000,
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================
const pad = (n) => String(n).padStart(2, '0');
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
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
const formatCurrency = (cents) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);
const formatDateBR = (iso) => {
  const [y, m, d] = (iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso || '';
};
const centsToInput = (c) => (c / 100).toFixed(2).replace('.', ',');
const generateId = () => `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const norm = (s) => String(s ?? '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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

// Exportação compatível com Android WebView / APK (Share API -> Data URI -> Fallback)
const exportFileAndroidSafe = async ({ filename, content, mimeType, title }) => {
  try {
    const file = new File([content], filename, { type: mimeType });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: title || filename });
      return 'shared';
    }
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled';
  }

  try {
    const dataUri = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return 'downloaded';
  } catch {
    return 'failed';
  }
};

const EXPENSE_RULES = [
  ['Alimentação', ['mercado', 'supermercado', 'padaria', 'restaurante', 'lanchonete', 'ifood', 'rappi', 'acougue', 'hortifruti', 'pizza', 'pizzaria', 'cafe', 'atacadao', 'assai']],
  ['Transporte', ['uber', '99', 'posto', 'combustivel', 'shell', 'ipiranga', 'estacionamento', 'pedagio', 'sem parar', 'metro', 'onibus', 'bilhete unico']],
  ['Moradia', ['aluguel', 'condominio', 'energia', 'luz', 'enel', 'cemig', 'sabesp', 'agua', 'internet', 'vivo', 'claro', 'tim', 'gas', 'iptu']],
  ['Saúde', ['farmacia', 'drogaria', 'droga', 'raia', 'pacheco', 'hospital', 'clinica', 'unimed', 'dentista', 'laboratorio']],
  ['Lazer', ['netflix', 'spotify', 'cinema', 'steam', 'disney', 'hbo', 'youtube', 'playstation', 'xbox', 'ingresso']],
  ['Educação', ['escola', 'faculdade', 'curso', 'udemy', 'alura', 'livraria', 'mensalidade', 'colegio']],
];
const INCOME_RULES = [
  ['Salário', ['salario', 'folha', 'proventos', '13o']],
  ['Investimentos', ['rendimento', 'dividendo', 'dividendos', 'juros', 'cdb', 'resgate', 'tesouro', 'jcp']],
];
const guessCategory = (description, type) => {
  const d = norm(description);
  const rules = type === 'receita' ? INCOME_RULES : EXPENSE_RULES;
  const hit = rules.find(([, words]) => words.some((w) => new RegExp(`\\b${w}\\b`).test(d)));
  return hit ? hit[0] : type === 'receita' ? 'Outras Receitas' : 'Outros Gastos';
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

// Tema + suporte a Safe Area (Android 15/16+ Edge-to-Edge)
const THEME_CSS = `
.fs-root{font-variant-numeric:tabular-nums;padding-bottom:env(safe-area-inset-bottom)}
.fs-safe-top{padding-top:max(1rem,env(safe-area-inset-top))}
.fs-safe-bottom{padding-bottom:max(1.25rem,env(safe-area-inset-bottom))}
.fs-fab{bottom:calc(1.5rem + env(safe-area-inset-bottom))}
.fs-toast{bottom:calc(1.25rem + env(safe-area-inset-bottom))}
.fs-root button:focus-visible,.fs-root input:focus-visible,.fs-root select:focus-visible{outline:2px solid #10b981;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.fs-root *{transition:none!important}}
.fs-root.dark{color-scheme:dark;background:#0b1220;color:#e2e8f0}
.dark .bg-slate-50{background:#0b1220}
.dark .bg-white{background:#111a2e}
.dark .bg-slate-100{background:#1a2640}
.dark .bg-slate-900{background:#1e293b;border:1px solid #334155}
.dark .text-slate-900,.dark .hover\\:text-slate-900:hover,.dark .hover\\:text-slate-800:hover,.dark .hover\\:text-slate-700:hover{color:#f1f5f9}
.dark .text-slate-800{color:#e2e8f0}
.dark .text-slate-700{color:#cbd5e1}
.dark .text-slate-600{color:#a8b5c9}
.dark .text-slate-500{color:#94a3b8}
.dark .text-slate-400{color:#7a8aa3}
.dark .text-emerald-600{color:#34d399}
.dark .text-rose-600{color:#fb7185}
.dark .text-amber-600{color:#fbbf24}
.dark .border-slate-100,.dark .border-slate-200,.dark .border-slate-300{border-color:#22304a}
.dark .border-slate-700{border-color:#334155}
.dark .divide-slate-100>:not([hidden])~:not([hidden]){border-color:#1b2840}
.dark .hover\\:bg-slate-50:hover,.dark .hover\\:bg-slate-100:hover{background:#1a2640}
.dark .hover\\:bg-slate-50\\/80:hover{background:#15213a}
.dark .bg-emerald-50,.dark .bg-emerald-50\\/50{background:rgba(16,185,129,.12)}
.dark .bg-rose-50,.dark .bg-rose-50\\/50{background:rgba(244,63,94,.12)}
.dark .hover\\:bg-rose-50:hover,.dark .hover\\:bg-rose-100:hover{background:rgba(244,63,94,.22)}
.dark input,.dark select,.dark textarea{background:#111a2e;color:#e2e8f0}
.dark ::placeholder{color:#64748b}
`;

const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const yesterdayISO = () => { const d = new Date(); d.setDate(d.getDate() - 1); return isoOf(d); };
const daysInMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };

const buildReminderICS = (time) => {
  const [h, m] = time.split(':');
  const day = todayISO().replace(/-/g, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FinancasSimples//PT', 'BEGIN:VEVENT',
    'UID:lembrete-diario@financassimples', `DTSTAMP:${day}T000000Z`,
    `DTSTART:${day}T${h}${m}00`, 'DURATION:PT5M', 'RRULE:FREQ=DAILY',
    'SUMMARY:Lançar os gastos de hoje', 'BEGIN:VALARM', 'ACTION:DISPLAY',
    'DESCRIPTION:Lance seus gastos de hoje no FinançasSimples', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
};

const sampleData = () => {
  const date = todayISO();
  return [
    { id: 'tx-sample-1', date, type: 'receita', category: 'Salário', description: 'Salário mensal', cents: 550000 },
    { id: 'tx-sample-2', date, type: 'despesa', category: 'Moradia', description: 'Aluguel e condomínio', cents: 185000 },
    { id: 'tx-sample-3', date, type: 'despesa', category: 'Alimentação', description: 'Supermercado da semana', cents: 42050 },
    { id: 'tx-sample-4', date, type: 'despesa', category: 'Transporte', description: 'Combustível / aplicativo', cents: 19500 },
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
const inputCls = 'w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

// ============================================================================
// APP
// ============================================================================
export default function App() {
  const [transactions, setTransactions] = useState(loadTransactions);
  const [goals, setGoals] = useState(() => store.get(KEYS.GOALS, DEFAULT_GOALS));
  const [lastBackup, setLastBackup] = useState(() => store.get(KEYS.BACKUP, null));
  const [month, setMonth] = useState(() => monthOf(todayISO()));
  const [dark, setDark] = useState(() => {
    const saved = store.get(KEYS.THEME);
    return saved ? saved === 'dark' : Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  });

  const [quickOpen, setQuickOpen] = useState(false);
  const [noSpend, setNoSpend] = useState(() => store.get(KEYS.NOSPEND, []));
  const [reminderTime, setReminderTime] = useState('20:00');
  const [backupFallbackText, setBackupFallbackText] = useState('');

  // Formulário
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState('despesa');
  const [category, setCategory] = useState('Alimentação');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO);
  const [formError, setFormError] = useState('');
  const formRef = useRef(null);

  // Filtros e gráfico
  const [filterType, setFilterType] = useState('todos');
  const [filterCategory, setFilterCategory] = useState('todas');
  const [search, setSearch] = useState('');
  const [selectedSlice, setSelectedSlice] = useState(null);

  // Exclusão do mês inteiro
  const [monthDeleteOpen, setMonthDeleteOpen] = useState(false);

  // Importação
  const fileInputRef = useRef(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importMode, setImportMode] = useState('merge');
  const [importSource, setImportSource] = useState('csv');

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = (text, variant = 'success', undoTo = null) => {
    clearTimeout(toastTimer.current);
    setToast({ text, variant, undoTo });
    toastTimer.current = setTimeout(() => setToast(null), undoTo ? 7000 : 4000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const handleUndo = () => {
    if (!toast?.undoTo) return;
    setTransactions(toast.undoTo);
    setToast(null);
  };

  useEffect(() => { store.set(KEYS.TX, transactions); }, [transactions]);
  useEffect(() => { store.set(KEYS.GOALS, goals); }, [goals]);
  useEffect(() => { store.set(KEYS.NOSPEND, noSpend); }, [noSpend]);
  useEffect(() => {
    store.set(KEYS.THEME, dark ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1220' : '#059669');
  }, [dark]);
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // ----- Cálculos do mês -----
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

  const donutSegments = useMemo(() => {
    const total = summary.despesas;
    if (!total) return [];
    const radius = 54;
    const circ = 2 * Math.PI * radius;
    let acc = 0;
    return Object.entries(spentByCat)
      .map(([id, value]) => ({
        ...(CATEGORIES.find((c) => c.id === id) || { id, label: id, color: '#64748b' }),
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
  }, [spentByCat, summary.despesas]);

  const filteredTransactions = useMemo(() => {
    const q = norm(search);
    return monthTx
      .filter((t) => filterType === 'todos' || t.type === filterType)
      .filter((t) => filterCategory === 'todas' || t.category === filterCategory)
      .filter((t) => !q || norm(t.description).includes(q))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTx, filterType, filterCategory, search]);

  const selected = donutSegments.find((s) => s.id === selectedSlice);

  const today = todayISO();
  const budget = useMemo(() => {
    const goalsTotal = Object.values(goals).reduce((a, c) => a + (c || 0), 0);
    const base = goalsTotal > 0 ? goalsTotal : summary.receitas;
    let daily = null;
    if (month === monthOf(today) && base > 0) {
      const daysLeft = daysInMonth(month) - Number(today.slice(8)) + 1;
      const spent = (fn) => monthTx.filter((t) => t.type === 'despesa' && fn(t.date)).reduce((a, t) => a + t.cents, 0);
      const allowance = Math.max(base - spent((d) => d < today), 0) / daysLeft;
      const spentToday = spent((d) => d === today);
      daily = { allowance, spentToday, daysLeft, pct: allowance > 0 ? (spentToday / allowance) * 100 : spentToday > 0 ? 100 : 0 };
    }
    return { base, fromGoals: goalsTotal > 0, remaining: base - summary.despesas, daily };
  }, [goals, summary, month, monthTx, today]);

  const loggedDays = useMemo(() => new Set([...transactions.map((t) => t.date), ...noSpend]), [transactions, noSpend]);
  const streak = useMemo(() => {
    const d = new Date();
    if (!loggedDays.has(isoOf(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (loggedDays.has(isoOf(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }, [loggedDays]);

  const catOrder = useMemo(() => {
    const count = {};
    transactions.forEach((t) => { count[t.category] = (count[t.category] || 0) + 1; });
    return CATEGORIES.filter((c) => c.type === type).sort((a, b) => (count[b.id] || 0) - (count[a.id] || 0));
  }, [transactions, type]);

  const recents = useMemo(() => {
    const seen = new Set(), out = [];
    for (const t of [...transactions].sort((a, b) => b.date.localeCompare(a.date))) {
      const k = norm(t.description);
      if (t.type !== type || seen.has(k)) continue;
      seen.add(k);
      out.push(t);
      if (out.length === 4) break;
    }
    return out;
  }, [transactions, type]);

  // ----- Formulário -----
  const resetForm = () => {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setDate(todayISO());
    setFormError('');
  };

  const openQuick = () => { resetForm(); setQuickOpen(true); };

  const markNoSpend = () => {
    setNoSpend((prev) => [...new Set([...prev, todayISO()])]);
    showToast('Dia marcado como sem gastos.');
  };

  const downloadReminder = async () => {
    const res = await exportFileAndroidSafe({
      filename: 'lembrete-financas.ics',
      content: buildReminderICS(reminderTime),
      mimeType: 'text/calendar',
      title: 'Lembrete diário FinançasSimples',
    });
    if (res !== 'cancelled') {
      showToast('Abra o arquivo no app de Agenda/Calendário do celular.');
    }
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    const first = CATEGORIES.find((c) => c.type === newType);
    if (first) setCategory(first.id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cents = parseAmountToCents(amount);
    if (isNaN(cents) || cents <= 0) return setFormError('Informe um valor válido maior que zero.');
    if (!date) return setFormError('Selecione uma data válida.');

    const wasEditing = Boolean(editingId);
    const item = { id: editingId || generateId(), date, type, category, description: description.trim() || category, cents };
    setQuickOpen(false);
    setTransactions((prev) =>
      wasEditing ? prev.map((t) => (t.id === item.id ? item : t)) : [item, ...prev]
    );
    setMonth(monthOf(date));
    resetForm();
    showToast(wasEditing ? 'Lançamento atualizado!' : 'Lançamento registrado!');
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setType(t.type);
    setCategory(t.category);
    setDescription(t.description);
    setAmount(centsToInput(t.cents));
    setDate(t.date);
    setFormError('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleDelete = (id) => {
    const snapshot = transactions;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) resetForm();
    showToast('Lançamento removido.', 'info', snapshot);
  };

  const handleDeleteMonth = () => {
    const snapshot = transactions;
    const count = monthTx.length;
    if (monthTx.some((t) => t.id === editingId)) resetForm();
    setTransactions((prev) => prev.filter((t) => monthOf(t.date) !== month));
    setMonthDeleteOpen(false);
    showToast(`${count} lançamentos de ${monthLabel(month)} excluídos.`, 'info', snapshot);
  };

  const handleClearAll = () => {
    const snapshot = transactions;
    setTransactions([]);
    resetForm();
    showToast('Todos os lançamentos foram apagados.', 'info', snapshot);
  };

  const commitGoal = (id, raw) => {
    const cents = raw.trim() === '' ? 0 : parseAmountToCents(raw);
    if (isNaN(cents)) return;
    setGoals((g) => ({ ...g, [id]: cents }));
  };

  // ----- Exportar CSV -----
  const handleExportCSV = async () => {
    if (!transactions.length) return showToast('Não há lançamentos para exportar.', 'error');
    const headers = ['ID', 'Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'];
    const rows = transactions.map((t) =>
      [csvCell(t.id), t.date, t.type, csvCell(t.category), csvCell(t.description), centsToInput(t.cents)].join(';')
    );
    const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');

    const res = await exportFileAndroidSafe({
      filename: `financassimples_backup_${todayISO()}.csv`,
      content: csv,
      mimeType: 'text/csv',
      title: 'Backup FinançasSimples (CSV)',
    });

    if (res === 'cancelled') return;

    const now = new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    setLastBackup(now);
    store.set(KEYS.BACKUP, now);

    if (res === 'failed') {
      setBackupFallbackText(csv);
    } else {
      showToast('Backup CSV exportado com sucesso!');
    }
  };

  // ----- Importar CSV / OFX -----
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = decodeText(await file.arrayBuffer());
      if (/\.ofx$/i.test(file.name) || /<OFX>/i.test(text)) parseOFXText(text);
      else parseCSVText(text);
    } catch {
      showToast('Não foi possível ler o arquivo.', 'error');
    }
  };

  const parseOFXText = (text) => {
    const tag = (block, name) =>
      (block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, 'i')) || [])[1]?.trim() || '';
    const unescapeXml = (s) =>
      s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

    const learned = new Map();
    transactions.forEach((t) => learned.set(`${t.type}|${norm(t.description)}`, t.category));

    const items = [], errors = [];
    [...text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)].forEach((m, i) => {
      const b = m[1];
      const amt = parseFloat(tag(b, 'TRNAMT').replace(',', '.'));
      const d = tag(b, 'DTPOSTED').slice(0, 8);
      if (isNaN(amt) || amt === 0 || !/^\d{8}$/.test(d)) { errors.push(`Transação ${i + 1}`); return; }

      const t = amt < 0 ? 'despesa' : 'receita';
      const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      const cents = Math.round(Math.abs(amt) * 100);
      const desc = unescapeXml(tag(b, 'MEMO') || tag(b, 'NAME')).replace(/\s+/g, ' ').trim() || 'Sem descrição';
      const fit = tag(b, 'FITID');
      items.push({
        id: fit ? `ofx-${fit}-${date}-${cents}` : generateId(),
        date,
        type: t,
        category: learned.get(`${t}|${norm(desc)}`) || guessCategory(desc, t),
        description: desc,
        cents,
      });
    });

    if (!items.length) return showToast('Nenhuma transação encontrada neste arquivo OFX.', 'error');
    setImportPreview(items);
    setImportErrors(errors);
    setImportMode('merge');
    setImportSource('ofx');
    setImportOpen(true);
  };

  const parseCSVText = (text) => {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return showToast('O arquivo CSV está vazio ou sem dados válidos.', 'error');

    const delim = lines[0].includes(';') ? ';' : ',';
    const head = parseCSVLine(lines[0], delim).map(norm);
    const ix = { id: head.indexOf('id'), date: head.indexOf('data'), type: head.indexOf('tipo'),
      cat: head.indexOf('categoria'), desc: head.indexOf('descricao'), val: head.indexOf('valor') };
    if (ix.date === -1 || ix.type === -1 || ix.val === -1) {
      return showToast('Cabeçalho inválido. O CSV precisa ter ao menos: Data, Tipo e Valor.', 'error');
    }

    const items = [], errors = [];
    for (let i = 1; i < lines.length; i++) {
      const c = parseCSVLine(lines[i], delim);
      const rawType = norm(c[ix.type]);
      const t = ['receita', 'entrada'].includes(rawType) ? 'receita'
        : ['despesa', 'saida'].includes(rawType) ? 'despesa' : null;
      const d = normalizeDate(c[ix.date]);
      const cents = parseAmountToCents(c[ix.val]);
      if (!d || !t || isNaN(cents) || cents <= 0) {
        errors.push(`Linha ${i + 1}`);
        continue;
      }
      const cat = CATEGORIES.find((x) => x.type === t && norm(x.id) === norm(ix.cat !== -1 ? c[ix.cat] : ''));
      const desc = (ix.desc !== -1 ? c[ix.desc] : '').replace(/^'(?=[=+\-@])/, '');
      items.push({
        id: ix.id !== -1 && c[ix.id] ? c[ix.id] : generateId(),
        date: d,
        type: t,
        category: cat ? cat.id : t === 'receita' ? 'Outras Receitas' : 'Outros Gastos',
        description: desc || 'Sem descrição',
        cents,
      });
    }
    setImportPreview(items);
    setImportErrors(errors);
    setImportMode('merge');
    setImportSource('csv');
    setImportOpen(true);
  };

  const handleConfirmImport = () => {
    if (!importPreview.length) return;
    const snapshot = transactions;
    const sig = (t) => `${t.date}|${t.type}|${t.category}|${t.description}|${t.cents}`;

    if (importMode === 'replace') {
      setTransactions(importPreview);
      showToast(`${importPreview.length} lançamentos restaurados.`, 'success', snapshot);
    } else {
      const ids = new Set(transactions.map((t) => t.id));
      const sigs = new Set(transactions.map(sig));
      const fresh = importPreview.filter((t) => !ids.has(t.id) && !sigs.has(sig(t)));
      const skipped = importPreview.length - fresh.length;
      setTransactions([...fresh, ...transactions]);
      showToast(
        `${fresh.length} novos adicionados${skipped ? ` (${skipped} duplicados ignorados)` : ''}.`,
        'success',
        snapshot
      );
    }
    const latest = importPreview.map((t) => t.date).sort().pop();
    if (latest) setMonth(monthOf(latest));
    setImportOpen(false);
    setImportPreview([]);
    setImportErrors([]);
  };

  const formCategories = CATEGORIES.filter((c) => c.type === type);
  const goalCategories = CATEGORIES.filter((c) => c.type === 'despesa');

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className={`fs-root ${dark ? 'dark' : ''} min-h-screen bg-slate-50 text-slate-800 font-sans`}>
      <style>{THEME_CSS}</style>
      {toast && (
        <div
          role="status"
          className="fs-toast fixed left-4 right-20 sm:left-auto sm:right-24 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700"
        >
          {toast.variant === 'error'
            ? <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            : <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          <span className="text-sm font-medium flex-1">{toast.text}</span>
          {toast.undoTo && (
            <button onClick={handleUndo} className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 cursor-pointer">
              Desfazer
            </button>
          )}
        </div>
      )}

      <header className="fs-safe-top bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-sm"><Wallet className="w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Finanças<span className="text-emerald-600">Simples</span>
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{lastBackup ? `Último backup: ${lastBackup}` : 'Nenhum backup exportado ainda'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
              title={dark ? 'Tema claro' : 'Tema escuro'}
              className="p-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.ofx,text/csv,text/plain,application/x-ofx,*/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Importar OFX/CSV
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Exportar backup (CSV)
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Navegação de mês */}
        <div className="flex items-center justify-center gap-2">
          <button
            aria-label="Mês anterior"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMonth(monthOf(todayISO()))}
            title="Ir para o mês atual"
            className="min-w-44 px-4 py-2 text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            {monthLabel(month)}
          </button>
          <button
            aria-label="Próximo mês"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Quanto posso gastar */}
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {budget.base <= 0 ? 'Quanto posso gastar?' : budget.remaining >= 0 ? 'Você ainda pode gastar' : 'Você passou do orçamento em'}
              </p>
              {budget.base > 0 ? (
                <>
                  <p className={`text-3xl font-bold tracking-tight ${budget.remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(Math.abs(budget.remaining))}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    de {formatCurrency(budget.base)} ({budget.fromGoals ? 'soma das suas metas' : 'receitas do mês'}) em {monthLabel(month)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500 mt-1">Defina metas abaixo ou registre uma receita para ver quanto ainda pode gastar.</p>
              )}
            </div>
            {streak > 0 && (
              <span className="text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-3 py-1">
                {streak} {streak === 1 ? 'dia' : 'dias'} seguidos registrando
              </span>
            )}
          </div>

          {budget.daily && (
            <div>
              <div className="flex justify-between gap-2 text-xs text-slate-600 mb-1">
                <span>Hoje: {formatCurrency(budget.daily.spentToday)} de {formatCurrency(budget.daily.allowance)}</span>
                <span>{budget.daily.daysLeft} {budget.daily.daysLeft === 1 ? 'dia' : 'dias'} até o fim do mês</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-label="Gasto de hoje"
                aria-valuenow={Math.round(budget.daily.pct)} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full transition-all ${budget.daily.pct >= 100 ? 'bg-rose-500' : budget.daily.pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(budget.daily.pct, 100)}%` }} />
              </div>
            </div>
          )}

          {month === monthOf(today) && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-slate-700">
                {loggedDays.has(today) ? 'Hoje já está em dia.' : 'Nada registrado hoje.'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {!loggedDays.has(today) && (
                  <>
                    <button onClick={openQuick} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer">
                      Lançar agora
                    </button>
                    <button onClick={markNoSpend} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer">
                      Hoje não gastei
                    </button>
                  </>
                )}
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Bell className="w-3.5 h-3.5" />
                  <input type="time" aria-label="Horário do lembrete" value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value || '20:00')}
                    className="px-2 py-1 text-xs border border-slate-300 rounded-md" />
                  <button onClick={downloadReminder} className="underline underline-offset-2 hover:text-slate-800 cursor-pointer"
                    title="Adiciona um evento diário ao calendário do celular">
                    Lembrete diário
                  </button>
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Resumo */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500">Saldo acumulado</span>
              <div className="p-2 bg-slate-100 rounded-lg text-slate-700"><Wallet className="w-4 h-4" /></div>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${summary.acumulado >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatCurrency(summary.acumulado)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Neste mês: <span className={summary.saldoMes >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(summary.saldoMes)}</span>
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500">Receitas do mês</span>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><TrendingUp className="w-4 h-4" /></div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 tracking-tight">{formatCurrency(summary.receitas)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500">Despesas do mês</span>
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><TrendingDown className="w-4 h-4" /></div>
            </div>
            <p className="text-2xl font-bold text-rose-600 tracking-tight">{formatCurrency(summary.despesas)}</p>
          </div>
        </section>

        {/* Formulário + gráfico */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div ref={formRef} className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              {editingId ? <Pencil className="w-5 h-5 text-emerald-600" /> : <PlusCircle className="w-5 h-5 text-emerald-600" />}
              {editingId ? 'Editar lançamento' : 'Novo lançamento'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                {['despesa', 'receita'].map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => handleTypeChange(tp)}
                    className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                      type === tp
                        ? `bg-white shadow-sm ${tp === 'despesa' ? 'text-rose-600' : 'text-emerald-600'}`
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tp === 'despesa' ? 'Despesa' : 'Receita'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="f-desc" className="block text-xs font-medium text-slate-600 mb-1">Descrição (opcional)</label>
                  <input id="f-desc" type="text" placeholder="Ex: mercado, aluguel, freela" value={description}
                    onChange={(e) => setDescription(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="f-amount" className="block text-xs font-medium text-slate-600 mb-1">Valor (R$)</label>
                  <input id="f-amount" type="text" inputMode="decimal" placeholder="0,00" value={amount}
                    onChange={(e) => setAmount(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="f-cat" className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
                  <select id="f-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                    {formCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="f-date" className="block text-xs font-medium text-slate-600 mb-1">Data</label>
                  <input id="f-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </div>
              </div>

              {formError && (
                <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5" role="alert">
                  <AlertCircle className="w-4 h-4" /> {formError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className={`flex-1 py-2.5 px-4 text-sm font-semibold text-white rounded-xl transition-colors cursor-pointer ${
                    type === 'despesa' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {editingId ? 'Salvar alterações' : `Adicionar ${type === 'despesa' ? 'despesa' : 'receita'}`}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer">
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-600" /> Despesas por categoria
            </h2>
            {donutSegments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-slate-400">
                <PieChart className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">Sem despesas em {monthLabel(month)}.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
                <div className="relative w-36 h-36 shrink-0">
                  <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90" role="img" aria-label="Gráfico de despesas por categoria">
                    {donutSegments.map((seg) => (
                      <circle
                        key={seg.id} cx="70" cy="70" r={seg.radius} fill="transparent" stroke={seg.color}
                        strokeWidth={selectedSlice === seg.id ? 20 : 16}
                        strokeDasharray={seg.strokeDasharray} strokeDashoffset={seg.strokeDashoffset}
                        className="transition-all duration-200 cursor-pointer"
                        onClick={() => setSelectedSlice((s) => (s === seg.id ? null : seg.id))}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                    <span className="text-[11px] font-medium text-slate-400">{selected ? selected.label : 'Total gasto'}</span>
                    <span className="text-xs font-bold text-slate-800">
                      {selected ? `${selected.percentage.toFixed(1)}%` : formatCurrency(summary.despesas)}
                    </span>
                  </div>
                </div>
                <div className="w-full space-y-1 max-h-44 overflow-y-auto pr-1">
                  {donutSegments.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedSlice((s) => (s === item.id ? null : item.id))}
                      className={`w-full flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer ${selectedSlice === item.id ? 'bg-slate-100' : ''}`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-slate-700 truncate">{item.label}</span>
                      </span>
                      <span className="shrink-0 ml-2">
                        <span className="font-semibold text-slate-900">{item.percentage.toFixed(0)}%</span>
                        <span className="text-slate-400 ml-1.5">({formatCurrency(item.value)})</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Metas do mês */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" /> Metas de {monthLabel(month)}
          </h2>
          <p className="text-xs text-slate-500 mb-4">Defina um limite mensal por categoria. Use 0 para desligar a meta.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {goalCategories.map((cat) => {
              const spent = spentByCat[cat.id] || 0;
              const limit = goals[cat.id] || 0;
              const pct = limit ? (spent / limit) * 100 : 0;
              const bar = pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <label htmlFor={`g-${cat.id}`} className="text-sm font-medium text-slate-700 flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="truncate">{cat.label}</span>
                    </label>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                      <span>{formatCurrency(spent)} de R$</span>
                      <input
                        id={`g-${cat.id}`}
                        key={`${cat.id}-${limit}`}
                        type="text"
                        inputMode="decimal"
                        defaultValue={limit ? centsToInput(limit) : ''}
                        placeholder="sem meta"
                        onBlur={(e) => commitGoal(cat.id, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="w-24 px-2 py-1 text-xs text-right border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden" role="progressbar"
                    aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`Meta de ${cat.label}`}>
                    <div className={`h-full ${bar} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  {limit > 0 && pct >= 80 && (
                    <p className={`text-xs mt-1 ${pct >= 100 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {pct >= 100
                        ? `Meta estourada em ${formatCurrency(spent - limit)}`
                        : `Atenção: ${pct.toFixed(0)}% da meta usada`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Histórico */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-500" />
                <h2 className="text-base font-semibold text-slate-900">Histórico ({filteredTransactions.length})</h2>
              </div>
              <div className="flex items-center gap-2">
                {monthTx.length > 0 && (
                  <button onClick={() => setMonthDeleteOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir mês
                  </button>
                )}
                {transactions.length > 0 && (
                  <button onClick={handleClearAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer">
                    <RotateCcw className="w-3.5 h-3.5" /> Limpar tudo
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-40">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search" aria-label="Buscar por descrição" placeholder="Buscar descrição"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select aria-label="Filtrar por tipo" value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700">
                <option value="todos">Todos os tipos</option>
                <option value="receita">Só receitas</option>
                <option value="despesa">Só despesas</option>
              </select>
              <select aria-label="Filtrar por categoria" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700">
                <option value="todas">Todas as categorias</option>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              Nenhum lançamento em {monthLabel(month)} com esses filtros.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTransactions.map((item) => {
                const meta = CATEGORIES.find((c) => c.id === item.category);
                const Icon = meta?.icon || Tag;
                const income = item.type === 'receita';
                return (
                  <div key={item.id} className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 hover:bg-slate-50/80">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${meta?.color || '#64748b'}15`, color: meta?.color || '#64748b' }}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{item.description}</p>
                        <p className="text-xs text-slate-500">{item.category} • {formatDateBR(item.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <span className={`text-sm font-bold mr-1 ${income ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {income ? '+ ' : '- '}{formatCurrency(item.cents)}
                      </span>
                      <button aria-label={`Editar ${item.description}`} onClick={() => handleEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button aria-label={`Excluir ${item.description}`} onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <button onClick={openQuick} aria-label="Novo lançamento"
        className="fs-fab fixed right-4 sm:right-6 z-40 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center cursor-pointer">
        <Plus className="w-7 h-7" />
      </button>

      {/* Lançamento rápido */}
      {quickOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
          role="dialog" aria-modal="true" aria-label="Lançamento rápido"
          onClick={(e) => e.target === e.currentTarget && setQuickOpen(false)}>
          <form onSubmit={handleSubmit}
            className="fs-safe-bottom bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Novo lançamento</h3>
              <button type="button" aria-label="Fechar" onClick={() => setQuickOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              {['despesa', 'receita'].map((tp) => (
                <button key={tp} type="button" onClick={() => handleTypeChange(tp)}
                  className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                    type === tp ? `bg-white shadow-sm ${tp === 'despesa' ? 'text-rose-600' : 'text-emerald-600'}` : 'text-slate-600 hover:text-slate-900'
                  }`}>
                  {tp === 'despesa' ? 'Despesa' : 'Receita'}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="q-amount" className="sr-only">Valor em reais</label>
              <div className="flex items-baseline gap-2 border-b-2 border-slate-200 focus-within:border-emerald-500 pb-1">
                <span className="text-xl font-semibold text-slate-400">R$</span>
                <input id="q-amount" autoFocus type="text" inputMode="decimal" placeholder="0,00" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-3xl font-bold bg-transparent text-slate-900 focus:outline-none" />
              </div>
            </div>

            {recents.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Repetir recente</p>
                <div className="flex flex-wrap gap-2">
                  {recents.map((r) => (
                    <button key={r.id} type="button"
                      onClick={() => { setDescription(r.description); setCategory(r.category); setAmount(centsToInput(r.cents)); }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-50 rounded-full cursor-pointer">
                      {r.description} · {formatCurrency(r.cents)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Categoria">
              {catOrder.map((c) => {
                const on = category === c.id;
                return (
                  <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setCategory(c.id)}
                    style={on ? { backgroundColor: c.color, color: '#fff' } : undefined}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer ${on ? '' : 'bg-slate-100 text-slate-700 hover:bg-slate-50'}`}>
                    <c.icon className="w-3.5 h-3.5" /> {c.label}
                  </button>
                );
              })}
            </div>

            <input type="text" aria-label="Descrição (opcional)" placeholder="Descrição (opcional)" value={description}
              onChange={(e) => setDescription(e.target.value)} className={inputCls} />

            <div className="flex flex-wrap items-center gap-2">
              {[['Hoje', todayISO()], ['Ontem', yesterdayISO()]].map(([label, v]) => (
                <button key={label} type="button" onClick={() => setDate(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer ${date === v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {label}
                </button>
              ))}
              <input type="date" aria-label="Data" value={date} onChange={(e) => setDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded-lg" />
            </div>

            {formError && (
              <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5" role="alert">
                <AlertCircle className="w-4 h-4" /> {formError}
              </p>
            )}

            <button type="submit"
              className={`w-full py-3 text-sm font-semibold text-white rounded-xl cursor-pointer ${type === 'despesa' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              Adicionar {type === 'despesa' ? 'despesa' : 'receita'}
            </button>
          </form>
        </div>
      )}

      {/* Fallback de backup caso o WebView bloqueie downloads */}
      {backupFallbackText && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Copiar backup CSV</h3>
              <button aria-label="Fechar" onClick={() => setBackupFallbackText('')}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-500">Copie o conteúdo abaixo e salve em um arquivo <code>.csv</code> ou bloco de notas:</p>
              <textarea readOnly value={backupFallbackText} rows={6}
                className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-lg" />
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setBackupFallbackText('')}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer">
                Fechar
              </button>
              <button type="button"
                onClick={() => { navigator.clipboard?.writeText(backupFallbackText); setBackupFallbackText(''); showToast('Backup CSV copiado!'); }}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 cursor-pointer">
                Copiar CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação: excluir mês */}
      {monthDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="del-month-title">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0"><Trash2 className="w-5 h-5" /></div>
                <div>
                  <h3 id="del-month-title" className="text-base font-bold text-slate-900">
                    Excluir {monthLabel(month)}?
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Serão apagados <strong>{monthTx.length}</strong> lançamentos deste mês. Os outros meses não mudam.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-emerald-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-500">Receitas</p>
                  <p className="font-semibold text-emerald-600">{formatCurrency(summary.receitas)}</p>
                </div>
                <div className="bg-rose-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-500">Despesas</p>
                  <p className="font-semibold text-rose-600">{formatCurrency(summary.despesas)}</p>
                </div>
              </div>
              <button type="button" onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900 cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Exportar backup antes de excluir
              </button>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button type="button" autoFocus onClick={() => setMonthDeleteOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={handleDeleteMonth}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 cursor-pointer">
                Excluir mês
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de importação */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {importSource === 'ofx' ? 'Importar extrato OFX' : 'Importar backup CSV'}
              </h3>
              <button aria-label="Fechar" onClick={() => setImportOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-sm font-medium text-slate-700">
                  Registros válidos: <strong className="text-emerald-600">{importPreview.length}</strong>
                </span>
                {importErrors.length > 0 && (
                  <span className="text-xs font-medium text-amber-600">
                    {importErrors.length} linha(s) ignorada(s): {importErrors.slice(0, 5).join(', ')}{importErrors.length > 5 ? '…' : ''}
                  </span>
                )}
              </div>

              {importSource === 'ofx' && (
                <p className="text-xs text-slate-500">
                  As categorias foram sugeridas automaticamente (e aprendidas com seus lançamentos). Revise depois com o lápis.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['merge', 'Mesclar com dados atuais', 'Mantém o que você tem e adiciona só os novos (ignora duplicados).', 'emerald'],
                  ['replace', 'Substituir todos os dados', 'Apaga a lista atual e restaura exatamente este backup. Dá para desfazer logo depois.', 'rose'],
                ].filter(([mode]) => importSource === 'csv' || mode === 'merge').map(([mode, title, text, color]) => (
                  <button
                    key={mode} type="button" onClick={() => setImportMode(mode)}
                    className={`p-3.5 text-left rounded-xl border transition-all cursor-pointer ${
                      importMode === mode
                        ? color === 'rose' ? 'border-rose-600 bg-rose-50/50 ring-1 ring-rose-600' : 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{text}</p>
                  </button>
                ))}
              </div>

              {importPreview.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-48 overflow-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Data</th>
                          <th className="py-2 px-3">Categoria</th>
                          <th className="py-2 px-3">Descrição</th>
                          <th className="py-2 px-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.slice(0, 15).map((r, i) => (
                          <tr key={i}>
                            <td className="py-2 px-3 whitespace-nowrap">{formatDateBR(r.date)}</td>
                            <td className="py-2 px-3">{r.category}</td>
                            <td className="py-2 px-3 truncate max-w-44">{r.description}</td>
                            <td className={`py-2 px-3 text-right font-semibold whitespace-nowrap ${r.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {r.type === 'receita' ? '+' : '-'} {formatCurrency(r.cents)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importPreview.length > 15 && (
                    <div className="bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 border-t border-slate-200">
                      Mostrando os 15 primeiros de {importPreview.length} registros.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setImportOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                Cancelar
              </button>
              <button type="button" disabled={!importPreview.length} onClick={handleConfirmImport}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                Confirmar importação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
