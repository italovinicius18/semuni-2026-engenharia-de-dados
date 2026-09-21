"""Consulta ad-hoc no lake, em SQL, direto do terminal.

Existe para projetar. No meio da aula da para abrir um terminal, escrever uma
pergunta em SQL e mostrar a resposta saindo da mesma tabela que o pipeline
escreveu — sem notebook, sem app, sem copiar arquivo para lugar nenhum.

As views tem o nome da camada. `SELECT * FROM silver WHERE ...` funciona porque
o Delta no MinIO ja e uma tabela; o que falta e so dar nome a ela.
"""

# o Python do cluster e o 3.8; as anotacoes ficam adiadas para nao
# quebrar no import (list[int] | None so existe como sintaxe a partir do 3.10)
from __future__ import annotations

import logging

from pyspark.sql import SparkSession

from pipeline.config import Config

logger = logging.getLogger(__name__)

# nome da view -> (camada, subcaminho dentro da camada)
TABELAS = {
    "bronze": ("bronze", ""),
    "silver": ("silver", ""),
    "fornecedores": ("gold", "fornecedores"),
    "fornecedores_total": ("gold", "fornecedores_total"),
}


def registrar_views(spark: SparkSession, config: Config) -> list[str]:
    """Da nome as tabelas do lake. Devolve as que existem."""
    prontas = []
    for view, (camada, sub) in TABELAS.items():
        caminho = config.caminho(camada, sub)
        try:
            spark.read.format("delta").load(caminho).createOrReplaceTempView(view)
            prontas.append(view)
        except Exception:
            # camada ainda nao construida: seguir sem a view e melhor do que
            # derrubar a consulta que nem ia usar essa tabela
            logger.warning("view %s indisponivel (%s ainda nao existe)", view, caminho)
    return prontas


def executar(spark: SparkSession, config: Config, sql: str, linhas: int = 40) -> None:
    prontas = registrar_views(spark, config)
    logger.info("views: %s", ", ".join(prontas) or "nenhuma")
    spark.sql(sql).show(linhas, truncate=False)


def historico(spark: SparkSession, config: Config, camada: str = "bronze") -> None:
    """O que o _delta_log guarda: toda operacao, com hora e o que mudou.

    Este e o slide do Delta. A tabela tem uma versao por ano escrito, e depois
    de um `make ano ANO=2023` ganha mais uma — onde da para ver que so a
    particao de 2023 foi trocada, e que as outras seis nem foram lidas.

    O ponto nao e a lista de versoes. E que a versao anterior continua ali:
    rodar a regra errada nao destruiu a resposta certa.
    """
    caminho = config.caminho(camada)
    hist = spark.sql(f"DESCRIBE HISTORY delta.`{caminho}`")
    hist.select("version", "timestamp", "operation",
                "operationParameters").show(50, truncate=60)

    versoes = [r.version for r in hist.select("version").collect()]
    if len(versoes) < 2:
        return

    print("\na mesma tabela, na primeira e na ultima versao:")
    for v in (min(versoes), max(versoes)):
        n = (spark.read.format("delta").option("versionAsOf", v)
             .load(caminho).count())
        print("  VERSION AS OF {}  ->  {} linhas".format(
            v, "{:,}".format(n).replace(",", ".")))
    print("\n  nenhuma das duas foi apagada. as duas continuam consultaveis.")
