import { describe, it, expect } from 'vitest';
import {
  parseAmountToCents, splitInstallments, shiftDateMonths, csvCell,
  sanitizeBackup, ensureCategories, baseItemName, isValidISODate, itemGoalKey,
} from './finance.js';

describe('parseAmountToCents', () => {
  it('interpreta formatos brasileiros e americanos', () => {
    expect(parseAmountToCents('10,50')).toBe(1050);
    expect(parseAmountToCents('1.234,56')).toBe(123456);
    expect(parseAmountToCents('1,234.56')).toBe(123456);
    expect(parseAmountToCents('R$ 12')).toBe(1200);
    expect(parseAmountToCents('12.50')).toBe(1250);
  });
  it('trata ponto de milhar sem decimais', () => {
    expect(parseAmountToCents('1.234')).toBe(123400);
  });
  it('evita erro de ponto flutuante', () => {
    expect(parseAmountToCents('0,29')).toBe(29);
    expect(parseAmountToCents('1,15')).toBe(115);
  });
  it('retorna NaN para entrada inválida', () => {
    expect(parseAmountToCents('')).toBeNaN();
    expect(parseAmountToCents('abc')).toBeNaN();
    expect(parseAmountToCents('12,3,4')).toBeNaN();
  });
});

describe('splitInstallments', () => {
  it('a soma das parcelas é sempre o total', () => {
    [[10000, 3], [1, 1], [9999, 12], [100, 7]].forEach(([total, n]) => {
      const parts = splitInstallments(total, n);
      expect(parts).toHaveLength(n);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
    });
  });
  it('a diferença de centavos fica na primeira parcela', () => {
    expect(splitInstallments(10000, 3)).toEqual([3334, 3333, 3333]);
  });
});

describe('shiftDateMonths', () => {
  it('respeita o último dia do mês', () => {
    expect(shiftDateMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftDateMonths('2024-01-31', 1)).toBe('2024-02-29');
  });
  it('vira o ano corretamente', () => {
    expect(shiftDateMonths('2026-11-15', 3)).toBe('2027-02-15');
    expect(shiftDateMonths('2026-03-10', -3)).toBe('2025-12-10');
  });
});

describe('csvCell', () => {
  it('neutraliza fórmulas', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('@soma')).toBe("'@soma");
  });
  it('escapa separador e aspas', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
  });
});

describe('baseItemName e itemGoalKey', () => {
  it('remove o sufixo de parcela', () => {
    expect(baseItemName('Fralda (2/3)')).toBe('Fralda');
    expect(baseItemName('Mercado')).toBe('Mercado');
  });
  it('ignora acentos e maiúsculas na chave', () => {
    expect(itemGoalKey('Saúde', 'Remédio')).toBe('Saúde::remedio');
  });
});

describe('isValidISODate', () => {
  it('rejeita datas impossíveis', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('26-01-01')).toBe(false);
    expect(isValidISODate('2026-02-28')).toBe(true);
  });
});

describe('sanitizeBackup', () => {
  const icons = ['Tag', 'Home'];

  it('descarta lançamentos inválidos e conta quantos', () => {
    const r = sanitizeBackup({
      transactions: [
        { id: 'a', date: '2026-01-05', type: 'despesa', category: 'Mercado', description: 'Arroz', cents: 1000 },
        { id: 'b', date: '2026-02-30', type: 'despesa', category: 'Mercado', cents: 1000 },
        { id: 'c', date: '2026-01-05', type: 'outro', category: 'Mercado', cents: 1000 },
        { id: 'd', date: '2026-01-05', type: 'despesa', category: 'Mercado', cents: -5 },
        { id: 'e', date: '2026-01-05', type: 'despesa', category: '', cents: 100 },
        null,
      ],
    }, icons);
    expect(r.transactions).toHaveLength(1);
    expect(r.dropped).toBe(5);
  });

  it('arredonda centavos e troca ids repetidos', () => {
    const r = sanitizeBackup({
      transactions: [
        { id: 'x', date: '2026-01-05', type: 'receita', category: 'Salário', cents: 100.4 },
        { id: 'x', date: '2026-01-06', type: 'receita', category: 'Salário', cents: 200 },
      ],
    }, icons);
    expect(r.transactions[0].cents).toBe(100);
    expect(r.transactions[0].id).not.toBe(r.transactions[1].id);
  });

  it('corrige categorias com cor, ícone ou itens inválidos', () => {
    const r = sanitizeBackup({
      transactions: [],
      categories: [
        { id: 'Casa', label: 'Casa', type: 'despesa', color: 'vermelho', iconName: 'Inexistente', items: ['Luz', 'luz', '', 'Água'] },
        { id: 'Casa', label: 'Casa 2', type: 'despesa' },
        { label: 'Sem tipo', type: 'x' },
      ],
    }, icons);
    expect(r.categories).toHaveLength(1);
    expect(r.categories[0].color).toBe('#64748b');
    expect(r.categories[0].iconName).toBe('Tag');
    expect(r.categories[0].items).toEqual(['Luz', 'Água']);
  });

  it('reconstrói metas e filtra dias sem gasto inválidos', () => {
    const r = sanitizeBackup({
      transactions: [],
      itemGoals: { qualquer: { category: 'Higiene', label: 'Lenço', cents: 8000 }, ruim: { category: 'X', label: 'Y', cents: 0 } },
      noSpend: ['2026-01-01', '2026-01-01', 'ontem'],
    }, icons);
    expect(r.itemGoals['Higiene::lenco'].cents).toBe(8000);
    expect(Object.keys(r.itemGoals)).toHaveLength(1);
    expect(r.noSpend).toEqual(['2026-01-01']);
  });

  it('aceita entrada vazia ou lixo sem quebrar', () => {
    expect(sanitizeBackup(null).transactions).toEqual([]);
    expect(sanitizeBackup('texto').categories).toBeNull();
  });
});

describe('ensureCategories', () => {
  it('cria categorias que só existem nos lançamentos', () => {
    const out = ensureCategories(
      [{ id: 'Casa', label: 'Casa', type: 'despesa', items: [] }],
      [{ category: 'Pets', type: 'despesa', description: 'Ração (1/2)' }, { category: 'casa', type: 'despesa', description: 'x' }],
      ['#111111', '#222222'],
    );
    expect(out).toHaveLength(2);
    expect(out[1].id).toBe('Pets');
    expect(out[1].items).toEqual(['Ração']);
  });
});
