#!/usr/bin/env python3
"""Extract Casa do Tênis report001.pdf → JSONL + QA summary."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    print("Install pypdf: pip3 install pypdf", file=sys.stderr)
    raise

MONEY_RE = re.compile(r"R\$\s*([\d.]+,\d{2})")
MONEY_TOKEN_RE = re.compile(r"R\$[\d.]+,\d{2}")
ROW_ANCHOR_RE = re.compile(r"(\d{3,5}-\d{2})\s+(\d{2}/\d{2}/\d{4})")
PAIRS_RE = re.compile(r"(\d+)\s*pares?", re.I)
TRAILING_MONEY_RE = re.compile(r"(?:\s*R\$[\d.]+,\d{2})+\s*$")
# Name chunk at end of "before" text (after stripping previous row moneys)
NAME_TAIL_RE = re.compile(
    r"([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9'.\-]*(?:\s+[A-Za-zÀ-ÿ0-9'.\-]+){0,10})\s*$"
)
HEADER_JUNK_RE = re.compile(
    r"A\s*Casa\s*do\s*T[eê]nis|"
    r"Pedidos\s+por\s+(?:Cliente|Per[ií]odo)|"
    r"\d{2}/\d{2}/\d{4}\s*-\s*\d{2}/\d{2}/\d{4}|"
    r"Cliente\s*Pedi(?:do)?\s*Data\s*Vend(?:as)?|"
    r"Servi[cç]os\s*Desco(?:ntos)?|"
    r"Fret(?:e)?\s*Total\s*Receb(?:ido)?|"
    r"Atras(?:o)?\s*A\s*Receber|"
    r"Cliente\s*Pedi(?:do)?|"
    r"Data\s*Vend(?:as)?|"
    r"Descontos?|"
    r"Recebido|"
    r"Atraso|"
    r"Receber",
    re.I,
)
HEADER_CRUMBS = {
    "o",
    "a",
    "e",
    "er",
    "as",
    "r",
    "so",
    "do",
    "da",
    "de",
    "dos",
    "das",
    "ido",
    "ntos",
    "fret",
    "vend",
    "pedi",
    "pedido",
    "total",
    "cliente",
    "data",
    "servicos",
    "serviços",
    "receb",
    "recebe",
    "recebido",
    "atras",
    "atra",
    "atraso",
    "descontos",
    "desconto",
    "frete",
    "vendas",
    "servico",
    "serviço",
    "por",
    "periodo",
    "período",
}
BRAND_SUFFIX_RE = re.compile(
    r"(?i)([a-zá-ú])(puma|nike|adidas|force|prada|gucci|jordan|vans|converse|olympic|oficial|zegna)$"
)


def parse_money(raw: str) -> float:
    return float(raw.replace(".", "").replace(",", "."))


def title_case_words(name: str) -> str:
    parts = []
    for w in name.split():
        if not w:
            continue
        if w.lower() in {"de", "da", "do", "das", "dos", "e"} and parts:
            parts.append(w.lower())
        else:
            parts.append(w[0].upper() + w[1:] if len(w) > 1 else w.upper())
    return " ".join(parts)


def strip_header_crumbs(name: str) -> str:
    parts = name.split()
    while parts:
        token = parts[0].lower().strip(".-")
        if (
            token in HEADER_CRUMBS
            or token.startswith("receb")
            or token.startswith("atras")
            or token.startswith("atra")
        ):
            parts = parts[1:]
            continue
        break
    # Also drop leftover "R" alone after Recebe
    while parts and parts[0].lower() in {"r", "o", "a", "e"}:
        parts = parts[1:]
    return " ".join(parts)


def clean_client_name(raw: str) -> tuple[str, int | None]:
    name = MONEY_TOKEN_RE.sub(" ", raw or "")
    name = HEADER_JUNK_RE.sub(" ", name)
    name = re.sub(r"\d{2}/\d{2}/\d{4}", " ", name)
    name = re.sub(r"[^\wÀ-ÿ'.\- ]+", " ", name, flags=re.UNICODE)
    name = re.sub(r"\s+", " ", name).strip(" -.")

    pairs = None
    m = PAIRS_RE.search(name)
    if m:
        pairs = int(m.group(1))
        name = PAIRS_RE.sub(" ", name)

    spaced = re.sub(r"(?<=[a-zà-ú])(?=[A-ZÁ-Ú])", " ", name)
    spaced = re.sub(r"(?<=[A-Za-zÀ-ÿ])(?=\d)", " ", spaced)
    spaced = re.sub(r"(?<=\d)(?=[A-Za-zÀ-ÿ])", " ", spaced)
    spaced = BRAND_SUFFIX_RE.sub(r"\1 \2", spaced)
    spaced = re.sub(r"\s+", " ", spaced).strip()
    if len(spaced) >= 2:
        name = spaced

    name = strip_header_crumbs(name)
    name = title_case_words(name)
    name = re.sub(r"\s+", " ", name).strip()
    if len(name) < 2:
        return "Cliente importado", pairs
    return name, pairs


def name_before_code(text: str, code_start: int) -> str:
    """Take only the client name immediately before CODE — not previous row moneys."""
    before = text[:code_start]
    before = TRAILING_MONEY_RE.sub("", before)
    before = HEADER_JUNK_RE.sub(" ", before)
    before = before.replace("(", " ").replace(")", " ")
    before = re.sub(r"\s+", " ", before).strip()
    m = NAME_TAIL_RE.search(before)
    if not m:
        return ""
    return m.group(1).strip()


def normalize_text(raw: str) -> str:
    text = raw.replace("\r", "\n")
    # Heal PDF line breaks inside codes / dates (CdT exports often split mid-token)
    text = re.sub(r"(\d{3,5})\s*\n\s*(-\d{2})", r"\1\2", text)
    text = re.sub(r"(\d{3,5}-)\s*\n\s*(\d{2})", r"\1\2", text)
    # 14/09/\n2026
    text = re.sub(r"(\d{2}/\d{2}/)\s*\n\s*(\d{4})", r"\1\2", text)
    # 15/09/2\n026  (year split after first digit)
    text = re.sub(r"(\d{2}/\d{2}/)(\d)\s*\n\s*(\d{3})", r"\1\2\3", text)
    # 15/09\n/2026
    text = re.sub(r"(\d{2}/\d{2})\s*\n\s*(/\d{4})", r"\1\2", text)
    text = re.sub(r"R\$\s*\n\s*", "R$", text)
    text = re.sub(r"R\$\s+", "R$", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n+", "\n", text)
    # Collapse name line breaks before codes: "Foo\nBar\n3191-26" → "Foo Bar 3191-26"
    text = re.sub(r"\n(?!\d{3,5}-\d{2})", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def extract_rows(text: str) -> list[dict]:
    anchors = list(ROW_ANCHOR_RE.finditer(text))
    rows: list[dict] = []
    for i, m in enumerate(anchors):
        code, date_s = m.group(1), m.group(2)
        client_raw = name_before_code(text, m.start())
        client_name, pairs_hint = clean_client_name(client_raw)

        after_end = anchors[i + 1].start() if i + 1 < len(anchors) else min(len(text), m.end() + 280)
        after = text[m.end() : after_end]
        # Only moneys belonging to this row (stop before next name letters if needed)
        moneys = [parse_money(x) for x in MONEY_RE.findall(after)[:8]]
        while len(moneys) < 8:
            moneys.append(0.0)

        sales, services, discounts, freight, total, received, overdue, to_receive = moneys
        d, mo, y = date_s.split("/")
        iso = f"{y}-{mo}-{d}"

        rows.append(
            {
                "code": code,
                "clientNameRaw": client_raw[:200],
                "clientName": client_name,
                "pairsHint": pairs_hint,
                "date": iso,
                "dateBr": date_s,
                "sales": sales,
                "services": services,
                "discounts": discounts,
                "freight": freight,
                "total": total,
                "received": received,
                "overdue": overdue,
                "toReceive": to_receive,
            }
        )
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--pdf",
        default=str(Path(__file__).resolve().parents[2] / "report001.pdf"),
    )
    ap.add_argument(
        "--out-dir",
        default=str(Path(__file__).resolve().parent / "data"),
    )
    ap.add_argument(
        "--since",
        default="",
        help="Keep rows with date >= YYYY-MM-DD (inclusive). Empty = all.",
    )
    ap.add_argument(
        "--until",
        default="",
        help="Keep rows with date <= YYYY-MM-DD (inclusive). Empty = all.",
    )
    ap.add_argument(
        "--out-prefix",
        default="cdt-report001",
        help="Output basename (orders.jsonl / clients.json / qa.json)",
    )
    ap.add_argument(
        "--skip-full-qa",
        action="store_true",
        help="Do not require historical 1072-row totals (use for incremental PDFs).",
    )
    args = ap.parse_args()

    pdf_path = Path(args.pdf)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    prefix = args.out_prefix

    reader = PdfReader(str(pdf_path))
    raw = "\n".join((p.extract_text() or "") for p in reader.pages)
    text = normalize_text(raw)
    rows = extract_rows(text)
    rows_before_filter = len(rows)

    since = (args.since or "").strip()
    until = (args.until or "").strip()
    if since:
        rows = [r for r in rows if r["date"] >= since]
    if until:
        rows = [r for r in rows if r["date"] <= until]

    orders_path = out_dir / f"{prefix}-orders.jsonl"
    with orders_path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    clients = sorted({r["clientName"] for r in rows})
    clients_path = out_dir / f"{prefix}-clients.json"
    clients_path.write_text(json.dumps(clients, ensure_ascii=False, indent=2), encoding="utf-8")

    codes = [r["code"] for r in rows]
    dup_codes = [c for c, n in Counter(codes).items() if n > 1]
    sum_services = round(sum(r["services"] for r in rows), 2)
    sum_total = round(sum(r["total"] for r in rows), 2)
    sum_received = round(sum(r["received"] for r in rows), 2)
    dirty = [r["clientName"] for r in rows if "R$" in r["clientName"] or re.search(r"\d{20}", r["clientName"])]
    dates = sorted({r["date"] for r in rows}) if rows else []

    incremental = bool(since or until or args.skip_full_qa)
    qa = {
        "pdf": str(pdf_path),
        "pages": len(reader.pages),
        "rowsExtracted": rows_before_filter,
        "rows": len(rows),
        "since": since or None,
        "until": until or None,
        "dateMin": dates[0] if dates else None,
        "dateMax": dates[-1] if dates else None,
        "uniqueCodes": len(set(codes)),
        "duplicateCodes": dup_codes[:50],
        "duplicateCodeCount": len(dup_codes),
        "uniqueClients": len(clients),
        "sumServices": sum_services,
        "sumTotal": sum_total,
        "sumReceived": sum_received,
        "dirtyNames": dirty[:20],
        "dirtyNameCount": len(dirty),
        "sampleNames": [r["clientName"] for r in rows[:8]],
        "expectedRows": 1072,
        "expectedServices": 443639.99,
        "rowsOk": incremental or len(rows) == 1072,
        "servicesOk": incremental or abs(sum_services - 443639.99) < 0.05,
        "namesOk": len(dirty) == 0,
        "sample": rows[:3],
    }
    qa_path = out_dir / f"{prefix}-qa.json"
    qa_path.write_text(json.dumps(qa, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({k: qa[k] for k in qa if k != "sample"}, ensure_ascii=False, indent=2))
    print(f"Wrote {orders_path}")
    if not rows:
        print("WARNING: zero rows — check PDF / normalize", file=sys.stderr)
        return 2
    if not qa["namesOk"]:
        print("WARNING: dirty client names — review before apply", file=sys.stderr)
        return 2
    if not incremental and (not qa["rowsOk"] or not qa["servicesOk"]):
        print("WARNING: QA mismatch — review parser before import apply", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
