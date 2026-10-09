const KEY = 'bob-roll:scores:v1';
const MAX_ENTRIES = 1000;

export function normalizeName(value) {
  if (typeof value !== 'string' || value.length > 200) throw new Error('Informe um nome de até 24 caracteres.');
  const name = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (!name || [...name].length > 24 || !/^[\p{L}\p{M}\p{N} .’\x27_-]+$/u.test(name) || !/[\p{L}\p{N}]/u.test(name)) {
    throw new Error('Use de 1 a 24 caracteres: letras, números, espaços, ponto, apóstrofo, hífen ou sublinhado.');
  }
  return name;
}

export function normalizePhone(value) {
  const phone = String(value ?? '').replace(/[\s()+.-]/g, '');
  if (!/^\d{10,15}$/.test(phone)) throw new Error('Informe um telefone com DDD (10 a 15 dígitos).');
  return phone;
}

export function rankingCSV(rows) {
  const cell = value => `"${String(value).replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`;
  return '\uFEFF' + [['Nome', 'Pontuação', 'Data', 'Hora'], ...rows.slice(0, 10).map(entry => {
    const date = new Date(entry.date);
    return [entry.name, entry.score, date.toLocaleDateString('pt-BR'), date.toLocaleTimeString('pt-BR')];
  })].map(row => row.map(cell).join(';')).join('\r\n');
}

const order = (a, b) => b.score - a.score || Date.parse(b.date) - Date.parse(a.date);

function cleanEntry(item) {
  try {
    if (!item || !Number.isSafeInteger(item.score) || item.score < 0 ||
        !Number.isSafeInteger(item.collected) || item.collected < 0 ||
        item.score < item.collected * 10 || item.score > item.collected * 100 ||
        item.score % 5 !== 0 || typeof item.date !== 'string' || !Number.isFinite(Date.parse(item.date))) return null;
    return {
      name: normalizeName(item.name),
      score: item.score,
      collected: item.collected,
      date: new Date(item.date).toISOString(),
      id: typeof item.id === 'string' && item.id.length <= 100 ? item.id : ''
    };
  } catch {
    return null;
  }
}

function consolidate(items) {
  const byId = new Map();
  for (const item of items) {
    const entry = cleanEntry(item);
    if (entry) byId.set(entry.id || `${entry.date}:${entry.name}`, entry);
  }
  return [...byId.values()].sort(order).slice(0, MAX_ENTRIES);
}

async function firebaseAPI() {
  const ready = globalThis.hiperCatchFirebaseReady;
  const api = ready ? await ready : null;
  if (!api) throw new Error('O serviço do Firebase não está disponível.');
  return api;
}

export class RankingService {
  constructor(storage) {
    this.memory = [];
    this.persistent = true;
    this.lastError = null;
    try {
      this.storage = storage ?? globalThis.localStorage;
      this.memory = this.read();
    } catch {
      this.storage = null;
      this.persistent = false;
    }
  }

  read() {
    if (!this.storage) return this.memory;
    try {
      const raw = this.storage.getItem(KEY) || '[]';
      if (raw.length > 2000000) throw new Error('History too large');
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error('Invalid history');
      this.memory = consolidate(data);
      if (data.some(item => item && Object.hasOwn(item, 'phone'))) {
        this.storage.setItem(KEY, JSON.stringify(this.memory));
      }
      return this.memory;
    } catch {
      this.persistent = false;
      return this.memory;
    }
  }

  async saveScore(result) {
    const entry = cleanEntry({
      name: result?.name,
      score: result?.score,
      collected: result?.collected,
      id: result?.runId,
      date: new Date().toISOString()
    });
    if (!entry || !entry.id) throw new Error('Nome ou pontuação inválidos.');

    this.memory = consolidate([...this.read(), entry]);
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      this.storage.setItem(KEY, JSON.stringify(this.memory));
      this.persistent = true;
    } catch {
      this.persistent = false;
      this.storage = null;
    }

    try {
      const api = await firebaseAPI();
      const result = await api.submitCompletedRun({ runId: entry.id, nome: entry.name, pontos: entry.score });
      this.lastError = null;
      return { ...entry, id: result.id, synced: true };
    } catch (error) {
      this.lastError = error;
      console.warn('A pontuação ficou no ranking local porque a sincronização falhou:', error);
      return { ...entry, synced: false };
    }
  }

  async getRanking(limit = 10) {
    const safeLimit = Number.isInteger(limit) ? Math.max(0, Math.min(limit, 10)) : 10;
    try {
      const api = await firebaseAPI();
      const rows = await api.getTopRanking();
      this.lastError = null;
      return rows.slice(0, safeLimit);
    } catch (error) {
      this.lastError = error;
      console.warn('Ranking global indisponível; usando resultados locais:', error);
      return [...this.read()]
        .sort(order)
        .slice(0, safeLimit)
        .map(entry => ({ ...entry, date: entry.date }));
    }
  }
}
