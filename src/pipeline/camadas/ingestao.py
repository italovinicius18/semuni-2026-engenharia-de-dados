"""Ingestao: baixa o CSV de cada ano da Camara e poe na landing do MinIO.

Nao roda Spark. Baixar arquivo e copiar para object storage nao precisa de
cluster, e manter isso fora do Spark significa que voce pode preparar o dado
em casa, com internet boa, e chegar na sala com o lake pronto.

A landing guarda o arquivo exatamente como o portal publicou, inclusive o zip
que veio quebrado se vier. Nada aqui interpreta conteudo.
"""

# o Python do cluster e o 3.8; as anotacoes ficam adiadas para nao
# quebrar no import (list[int] | None so existe como sintaxe a partir do 3.10)
from __future__ import annotations

import logging
import zipfile
from pathlib import Path

import requests

from pipeline.config import Config
from pipeline.infra import armazenamento

logger = logging.getLogger(__name__)

RAIZ = Path(__file__).resolve().parents[3]
DADOS = RAIZ / "dados"


def chave_landing(config: Config, ano: int) -> str:
    return f"{config.prefixos['landing']}/{config.arquivo_landing(ano)}"


def baixar(config: Config, ano: int, forcar: bool = False) -> Path:
    """Baixa e descompacta o ano em dados/. Devolve o caminho do CSV."""
    DADOS.mkdir(exist_ok=True)
    csv = DADOS / config.arquivo_landing(ano)
    if csv.exists() and not forcar:
        logger.info("%s ja existe (%.1f MB)", csv.name, csv.stat().st_size / 1e6)
        return csv

    url = config.url(ano)
    zip_local = csv.with_suffix(".csv.zip")
    logger.info("baixando %s", url)
    with requests.get(url, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(zip_local, "wb") as f:
            for pedaco in r.iter_content(chunk_size=1 << 20):
                f.write(pedaco)

    with zipfile.ZipFile(zip_local) as z:
        z.extractall(DADOS)
    zip_local.unlink()
    logger.info("%s pronto (%.1f MB)", csv.name, csv.stat().st_size / 1e6)
    return csv


def executar(config: Config, anos: list[int] | None = None, forcar: bool = False) -> None:
    armazenamento.garantir_bucket(config)
    for ano in anos or config.anos:
        csv = baixar(config, ano, forcar=forcar)
        chave = chave_landing(config, ano)
        if armazenamento.existe(config, chave) and not forcar:
            logger.info("s3a://%s/%s ja esta la", config.bucket, chave)
            continue
        armazenamento.subir(config, csv, chave)
