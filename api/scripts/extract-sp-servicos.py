#!/usr/bin/env python3
"""Extract Sapataria Paulista 'Serviços por Cliente' PDF → JSONL + QA.

Layout (not the Casa do Tênis pedidos report):
  CODE  client  DD/MM/YYYY  service  QTY  R$VALUE

Several lines can share one order code. They become one order with one item per line.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    print("Install pypdf: pip3 install pypdf", file=sys.stderr)
    raise

ROW_RE = re.compile(
    r"(\d{3,5}-\d{2})\s+"
    r"(.+?)\s+"
    r"(\d{2}/\d{2}/\d{4})\s+"
    r"(.+?)\s+"
    r"(\d+,\d{2})\s+"
    r"R\$\s*([\d.]+,\d{2})"
)


def heal(raw: str) -> str:
    text = raw.replace("\r", "\n")
    text = re.sub(r"(\d{3,5}-\d)\s*\n\s*(\d)", r"\1\2", text)
    text = re.sub(r"(\d{2}/\d{2}/\d{2})\s*\n\s*(\d{2})", r"\1\2", text)
    text = re.sub(r"(\d{2}/\d{2}/)\s*\n\s*(\d{4})", r"\1\2", text)
    text = re.sub(r"R\$\s+", "R$", text)
    text = re.sub(r"\s+", " ", text)
    return text


def money(raw: str) -> float:
    return float(raw.replace(".", "").replace(",", "."))


def iso_date(br: str) -> str:
    dd, mm, yyyy = br.split("/")
    return f"{yyyy}-{mm}-{dd}"


def tidy_name(raw: str) -> str:
    name = re.sub(r"\s+", " ", raw or "").strip(" -.")
    name = re.sub(r"(?<=[a-zà-ú])(?=[A-ZÁ-Ú])", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    if not name or name.lower() in {"nenhum", "(nenhum)"}:
        return "Cliente importado"
    return name


def extract_lines(text: str) -> list[dict]:
    rows = []
    for m in ROW_RE.finditer(text):
        code, client, date_br, service, _qty, value = m.groups()
        rows.append(
            {
                "code": code,
                "clientName": tidy_name(client),
                "date": iso_date(date_br),
                "service": re.sub(r"\s+", " ", service).strip(" ."),
                "price": money(value),
            }
        )
    return rows


def group_orders(lines: list[dict]) -> list[dict]:
    buckets: dict[str, list[dict]] = defaultdict(list)
    for line in lines:
        buckets[line["code"]].append(line)
    orders = []
    for code, group in buckets.items():
        dates = sorted({g["date"] for g in group})
        names = [g["clientName"] for g in group if g["clientName"] != "Cliente importado"]
        client = names[0] if names else "Cliente importado"
        total = round(sum(g["price"] for g in group), 2)
        orders.append(
            {
                "code": code,
                "clientName": client,
                "date": dates[0],
                "total": total,
                "services": total,
                "received": total,
                "toReceive": 0,
                "pairsHint": len(group),
                "lines": [{"name": g["service"], "price": g["price"]} for g in group],
            }
        )
    orders.sort(key=lambda o: (o["date"], o["code"]))
    return orders


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--out-dir", default="api/scripts/data")
    parser.add_argument("--out-prefix", default="sp-report001")
    args = parser.parse_args()

    reader = PdfReader(args.pdf)
    raw = "\n".join((page.extract_text() or "") for page in reader.pages)
    lines = extract_lines(heal(raw))
    orders = group_orders(lines)
    if not orders:
        print("Nenhuma linha lida. O PDF não bate com Serviços por Cliente.", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    jsonl = out_dir / f"{args.out_prefix}-orders.jsonl"
    qa_path = out_dir / f"{args.out_prefix}-qa.json"
    jsonl.write_text("".join(json.dumps(o, ensure_ascii=False) + "\n" for o in orders), encoding="utf-8")

    dates = [o["date"] for o in orders]
    qa = {
        "pdf": args.pdf,
        "pages": len(reader.pages),
        "serviceLines": len(lines),
        "uniqueCodes": len(orders),
        "dateMin": min(dates),
        "dateMax": max(dates),
        "zeroValueOrders": sum(1 for o in orders if o["total"] == 0),
        "sample": [
            {
                "code": o["code"],
                "date": o["date"],
                "clientName": o["clientName"],
                "total": o["total"],
                "services": [ln["name"] for ln in o["lines"]],
            }
            for o in orders[:8]
        ],
    }
    qa_path.write_text(json.dumps(qa, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: qa[k] for k in ("serviceLines", "uniqueCodes", "dateMin", "dateMax", "zeroValueOrders")}, indent=2))
    print("jsonl", jsonl)
    print("qa", qa_path)


if __name__ == "__main__":
    main()
