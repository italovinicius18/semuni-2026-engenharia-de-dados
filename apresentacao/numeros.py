#!/usr/bin/env python3
"""Recalcula, a partir de dados/, cada numero que aparece nos slides, e confere
que o texto de fontes/slides.html ainda diz o mesmo.

Existe porque a Camara republica os CSVs com correcoes: entre 04/09 e 18/09 de
2026 o Ano-2025.csv ganhou 820 linhas e a TAM perdeu R$ 6,4 mi. Um slide que
diz um numero que o dados/ ja nao produz e um slide errado na frente da
plateia.

O que NAO entra: os numeros de 04/09 do slide 6 (o arquivo nao foi guardado;
ficam como registrados em memoria em 18/09/2026), o DESCRIBE HISTORY (precisa
do cluster) e a gold (idem). Tudo o mais vem do CSV, com pandas e DuckDB.

Uso:  make numeros
"""
import glob
import os
import re
import statistics
import sys
import tempfile
import time

import duckdb
import pandas as pd

RAIZ = os.path.join(os.path.dirname(__file__), "..")
DADOS = os.path.join(RAIZ, "dados")
FONTES = os.path.join(os.path.dirname(__file__), "fontes", "slides.html")


def br(n):
    """1560019 -> '1.560.019'"""
    return f"{int(round(n)):,}".replace(",", ".")


def medir():
    """Devolve {descricao: texto que tem que existir em slides.html}."""
    esperado = {}
    cols = ["numAno", "txtFornecedor", "txtCNPJCPF", "vlrDocumento"]
    anos = {}
    for f in sorted(glob.glob(os.path.join(DADOS, "Ano-*.csv"))):
        df = pd.read_csv(f, sep=";", encoding="utf-8", low_memory=False, usecols=cols)
        anos[int(os.path.basename(f)[4:8])] = df
    tudo = pd.concat(anos.values(), ignore_index=True)

    # slides 2, 7, 11: total de lancamentos
    esperado["total de lançamentos"] = br(len(tudo))

    # slide 4: por ano, linhas e sem CNPJ
    for ano, df in anos.items():
        sem = int(df.txtCNPJCPF.isna().sum())
        pct = f"{100 * sem / len(df):.1f}".replace(".", ",") + "%"
        esperado[f"{ano}: linhas"] = br(len(df))
        esperado[f"{ano}: sem CNPJ"] = br(sem)
        esperado[f"{ano}: % sem CNPJ"] = pct

    # slide 3: aereas 2025 sem CNPJ
    d25 = anos[2025]
    aer = d25.txtFornecedor.astype(str).str.upper().str.contains(r"\b(?:TAM|LATAM|GOL|AZUL)\b", regex=True, na=False)
    esperado["aéreas 2025: linhas"] = br(aer.sum())
    esperado["aéreas 2025: sem CNPJ"] = br(d25[aer].txtCNPJCPF.isna().sum())

    # slide 16: a TAM de 2025
    tam = d25[d25.txtFornecedor == "TAM"].vlrDocumento
    esperado["TAM 2025: positivos"] = br(tam[tam > 0].sum())
    esperado["TAM 2025: negativos"] = "-" + br(-tam[tam < 0].sum())
    esperado["TAM 2025: linhas negativas"] = br((tam < 0).sum())
    esperado["TAM 2025: soma"] = br(tam.sum())
    esperado["2025: linhas negativas"] = br((d25.vlrDocumento < 0).sum())
    esperado["7 anos: linhas negativas"] = br((tudo.vlrDocumento < 0).sum())

    # slide 17: grep chatgpt
    m = tudo.txtFornecedor.astype(str).str.contains(r"chat ?gpt|openai", case=False, regex=True)
    c = tudo[m]
    esperado["chatgpt: linhas"] = str(len(c))
    esperado["chatgpt: grafias"] = {9: "Nove grafias"}.get(c.txtFornecedor.nunique(), f"{c.txtFornecedor.nunique()} grafias")
    docs = c.txtCNPJCPF.value_counts()
    esperado["chatgpt: sentinela"] = f"{docs.get('000.000.000/0001-0', 0)}"
    esperado["chatgpt: com CNPJ real"] = str(len(c) - docs.get("000.000.000/0001-0", 0))
    esperado["chatgpt: R$"] = f"R$ {c.vlrDocumento.sum() / 1000:.1f}".replace(".", ",") + " mil"

    # slide 8: CSV -> Parquet, com DuckDB
    csv = os.path.join(DADOS, "Ano-2025.csv")
    pq = os.path.join(tempfile.gettempdir(), "semuni-Ano-2025.parquet")
    con = duckdb.connect()
    con.execute(f"COPY (SELECT * FROM read_csv('{csv}', delim=';', header=true)) TO '{pq}' (FORMAT PARQUET, COMPRESSION ZSTD)")
    esperado["parquet: tamanho"] = f"{os.path.getsize(csv) / 1e6:.1f} → {os.path.getsize(pq) / 1e6:.1f} MB".replace(".", ",")
    meta = con.execute(f"SELECT path_in_schema, sum(total_compressed_size) FROM parquet_metadata('{pq}') GROUP BY 1").fetchall()
    tot = sum(x[1] for x in meta)
    tres = sum(x[1] for x in meta if x[0] in ("txtFornecedor", "vlrDocumento", "numAno"))
    esperado["parquet: 3 colunas"] = f"{tres / 1e6:.1f} de {tot / 1e6:.1f} MB".replace(".", ",")

    def cron(q, n=5):
        ts = []
        for _ in range(n):
            t = time.perf_counter(); con.execute(q).fetchall(); ts.append((time.perf_counter() - t) * 1000)
        return statistics.median(ts)
    q = "SELECT txtFornecedor, sum(vlrDocumento) t FROM {} GROUP BY 1 ORDER BY 2 DESC LIMIT 3"
    tempos = (cron(q.format(f"read_csv('{csv}', delim=';', header=true)")), cron(q.format(f"'{pq}'")))
    os.unlink(pq)
    return esperado, tempos


def main():
    s = open(FONTES, encoding="utf-8").read()
    esperado, (t_csv, t_pq) = medir()
    ruins = 0
    for k, v in esperado.items():
        ok = v in s
        ruins += not ok
        print(f"  {'ok ' if ok else 'FALTA'}  {k:<28} {v}")
    # tempo varia com a maquina: o slide pode dizer ate 2,5x para cima ou para baixo
    m = re.search(r"(\d+) → (\d+) ms", s)
    if m:
        s_csv, s_pq = int(m.group(1)), int(m.group(2))
        dentro = (t_csv / 2.5 <= s_csv <= t_csv * 2.5) and (t_pq / 2.5 <= s_pq <= t_pq * 2.5)
        ruins += not dentro
        print(f"  {'ok ' if dentro else 'FALTA'}  {'tempo (medido agora)':<28} {t_csv:.0f} → {t_pq:.0f} ms  (slide diz {s_csv} → {s_pq})")
    print(f"\n{ruins} número(s) que o slide diz e o dados/ não produz")
    return 1 if ruins else 0


if __name__ == "__main__":
    sys.exit(main())
