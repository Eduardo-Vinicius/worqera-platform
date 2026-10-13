function asNumberList(value, depth = 0) {
  if (depth > 4 || value == null || value === '') return [];
  if (typeof value === 'number') return Number.isFinite(value) ? [value] : [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const direct = Number(trimmed);
    if (Number.isFinite(direct)) return [direct];
    try {
      const normalized = trimmed.replace(/'/g, '"').replace(/([{,]\s*)(\d+)(\s*:)/g, '$1"$2"$3');
      return asNumberList(JSON.parse(normalized), depth + 1);
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    if (value.length === 1 && value[0] != null && typeof value[0] !== 'number') {
      const inner = asNumberList(value[0], depth + 1);
      if (inner.length && !Number.isFinite(Number(value[0]))) return inner;
    }
    return value.map((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) return item;
      if (typeof item === 'string' && item.trim() !== '' && Number.isFinite(Number(item))) return Number(item);
      if (item && typeof item === 'object') {
        const inner = asNumberList(item, depth + 1);
        return inner.length ? inner[0] : 0;
      }
      const num = Number(item);
      return Number.isFinite(num) ? num : 0;
    });
  }
  if (typeof value === 'object') {
    const indexes = Object.keys(value)
      .map((key) => Number(key))
      .filter((n) => Number.isInteger(n) && n >= 0);
    if (!indexes.length) return [];
    const list = Array(Math.max(...indexes) + 1).fill(0);
    for (const index of indexes) {
      const num = Number(value[index]);
      list[index] = Number.isFinite(num) ? num : 0;
    }
    return list;
  }
  return [];
}

function numberListIsClean(value) {
  return Array.isArray(value) && value.every((n) => typeof n === 'number' && Number.isFinite(n));
}

module.exports = { asNumberList, numberListIsClean };
