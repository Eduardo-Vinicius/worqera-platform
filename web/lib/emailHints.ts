export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isEmail(value: string) {
  return EMAIL_RE.test(value.trim().toLowerCase())
}

const KNOWN = [
  "gmail.com",
  "hotmail.com",
  "hotmail.com.br",
  "outlook.com",
  "outlook.com.br",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
  "globo.com",
  "ig.com.br",
]

const DIRECT: Record<string, string> = {
  "gmail.com.br": "gmail.com",
  "gmail.br": "gmail.com",
  "icloud.com.br": "icloud.com",
  "uol.com": "uol.com.br",
  "bol.com": "bol.com.br",
}

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = keep
    }
  }
  return row[b.length]
}

/** "ana@gmial.con" → "ana@gmail.com". Null when the domain looks right or is unknown. */
export function suggestEmail(value: string): string | null {
  const email = value.trim().toLowerCase()
  const at = email.lastIndexOf("@")
  if (at < 1 || at === email.length - 1) return null
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (KNOWN.includes(domain)) return null
  if (DIRECT[domain]) return `${local}@${DIRECT[domain]}`
  let best: string | null = null
  let bestDistance = 3
  for (const known of KNOWN) {
    const d = distance(domain, known)
    if (d < bestDistance) {
      best = known
      bestDistance = d
    }
  }
  return best ? `${local}@${best}` : null
}
