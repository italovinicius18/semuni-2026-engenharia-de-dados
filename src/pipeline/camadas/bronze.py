"""Camada bronze: o CSV vira tabela Delta, sem nenhuma correcao de conteudo.

O que a bronze acrescenta e estrutura e rastreio: formato colunar transacional,
particionamento por ano, e as colunas de origem (qual arquivo, quando entrou).
O conteudo continua exatamente como a Camara publicou, tudo string. Isso e de
proposito: quando a regra de limpeza estiver errada — e uma hora vai estar —
esta tabela e o unico jeito de refazer sem baixar 500 MB de novo.

Uma opcao aqui vale a aula inteira: multiLine. O padrao do Spark e false, o do
DuckDB e true, e ha registros com quebra de linha dentro de um campo entre
aspas. Com o padrao do Spark esses registros viram linhas fantasma.
"""

# o Python do cluster e o 3.8; as anotacoes ficam adiadas para nao
# quebrar no import (list[int] | None so existe como sintaxe a partir do 3.10)
from __future__ import annotations

import logging

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F

from pipeline.config import Config

logger = logging.getLogger(__name__)


def ler_csv(spark: SparkSession, caminho: str, multi_line: bool = True) -> DataFrame:
    return (
        spark.read
        .option("header", True)
        .option("delimiter", ";")
        .option("encoding", "UTF-8")
        .option("multiLine", multi_line)
        .csv(caminho)
    )


def construir_ano(spark: SparkSession, config: Config, ano: int) -> int:
    origem = config.caminho("landing", config.arquivo_landing(ano))
    logger.info("lendo %s", origem)

    df = (
        ler_csv(spark, origem)
        .withColumn("ano_ref", F.lit(ano))
        .withColumn("arquivo_origem", F.lit(config.arquivo_landing(ano)))
        .withColumn("entrou_em", F.current_timestamp())
    )
    n = df.count()

    (
        df.write.format("delta")
        .mode("overwrite")
        # replaceWhere troca so a particao do ano: reprocessar 2023 nao mexe
        # nos outros seis anos que ja estao na tabela.
        .option("replaceWhere", f"ano_ref = {ano}")
        .option("mergeSchema", "true")
        .partitionBy("ano_ref")
        .save(config.caminho("bronze"))
    )
    logger.info("bronze ano %d: %s linhas", ano, f"{n:,}".replace(",", "."))
    return n


def construir(spark: SparkSession, config: Config, anos: list[int] | None = None) -> None:
    alvos = anos or config.anos
    # a primeira escrita cria a tabela; as seguintes trocam so a sua particao
    total = 0
    for i, ano in enumerate(alvos):
        if i == 0 and not _tabela_existe(spark, config):
            total += _primeira_escrita(spark, config, ano)
        else:
            total += construir_ano(spark, config, ano)
    logger.info("bronze: %s linhas em %d anos",
                f"{total:,}".replace(",", "."), len(alvos))


def _tabela_existe(spark: SparkSession, config: Config) -> bool:
    try:
        spark.read.format("delta").load(config.caminho("bronze")).limit(1).count()
        return True
    except Exception:
        return False


def _primeira_escrita(spark: SparkSession, config: Config, ano: int) -> int:
    """replaceWhere exige tabela existente; a primeira vez e overwrite normal."""
    origem = config.caminho("landing", config.arquivo_landing(ano))
    logger.info("lendo %s (primeira escrita)", origem)
    df = (
        ler_csv(spark, origem)
        .withColumn("ano_ref", F.lit(ano))
        .withColumn("arquivo_origem", F.lit(config.arquivo_landing(ano)))
        .withColumn("entrou_em", F.current_timestamp())
    )
    n = df.count()
    (
        df.write.format("delta")
        .mode("overwrite")
        .partitionBy("ano_ref")
        .save(config.caminho("bronze"))
    )
    logger.info("bronze ano %d: %s linhas", ano, f"{n:,}".replace(",", "."))
    return n
