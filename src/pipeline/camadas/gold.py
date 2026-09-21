"""Camada gold: uma tabela por pergunta.

Duas perguntas, duas tabelas:

  fornecedores       quanto cada empresa recebeu, somando as grafias pela raiz
                     do CNPJ, por ano
  fornecedores_total o mesmo, somado nos sete anos

A gold e onde as decisoes ficam explicitas. Estorno fora da soma? Sim, porque a
pergunta e "quanto saiu", e um estorno e dinheiro que voltou. Quem discordar
consulta a silver, que tem a coluna e nao perdeu nada.
"""

# o Python do cluster e o 3.8; as anotacoes ficam adiadas para nao
# quebrar no import (list[int] | None so existe como sintaxe a partir do 3.10)
from __future__ import annotations

import logging

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F

from pipeline.config import Config

logger = logging.getLogger(__name__)


def por_ano(silver: DataFrame) -> DataFrame:
    return (
        silver
        .filter(~F.col("eh_estorno") & F.col("raiz_cnpj").isNotNull())
        .groupBy("ano_ref", "raiz_cnpj")
        .agg(
            # mode, nao first: `first` devolve a grafia que calhou de vir na
            # primeira particao, e muda de uma execucao para a outra. Numa
            # apresentacao isso significa a mesma empresa aparecendo como
            # "Latam Linhas Aereas S.A" num ensaio e "TAM LINHAS AEREAS S/A."
            # no dia. A grafia mais frequente e a que a plateia reconhece.
            F.mode("fornecedor").alias("fornecedor"),
            # dinheiro em decimal, nao em double: alem de nao acumular o erro
            # de ponto flutuante, evita a soma sair como 4.995776813000504E7
            # justo no slide que a plateia esta lendo.
            F.sum("vlr_liquido").cast("decimal(18,2)").alias("total"),
            F.count("*").alias("lancamentos"),
            F.countDistinct("fornecedor").alias("grafias"),
            F.countDistinct("deputado").alias("deputados"),
        )
    )


def consolidado(ano_a_ano: DataFrame) -> DataFrame:
    return (
        ano_a_ano
        .groupBy("raiz_cnpj")
        .agg(
            F.mode("fornecedor").alias("fornecedor"),
            F.sum("total").cast("decimal(18,2)").alias("total"),
            F.sum("lancamentos").alias("lancamentos"),
            F.countDistinct("ano_ref").alias("anos"),
        )
    )


def construir(spark: SparkSession, config: Config, anos: list[int] | None = None) -> None:
    silver = spark.read.format("delta").load(config.caminho("silver"))
    if anos:
        silver = silver.filter(F.col("ano_ref").isin(anos))

    ano_a_ano = por_ano(silver).cache()
    n = ano_a_ano.count()
    (
        ano_a_ano.write.format("delta").mode("overwrite")
        # overwriteSchema aqui, e so aqui. A gold e reconstruida inteira a cada
        # execucao a partir da silver, entao mudar o tipo de uma coluna custa
        # dois minutos de Spark. Na bronze a mesma opcao apagaria o unico
        # registro do que a Camara publicou.
        .option("overwriteSchema", "true")
        .partitionBy("ano_ref")
        .save(config.caminho("gold", "fornecedores"))
    )
    logger.info("gold/fornecedores: %s linhas", f"{n:,}".replace(",", "."))

    total = consolidado(ano_a_ano)
    m = total.count()
    (
        total.write.format("delta").mode("overwrite")
        .option("overwriteSchema", "true")
        .save(config.caminho("gold", "fornecedores_total"))
    )
    logger.info("gold/fornecedores_total: %s empresas", f"{m:,}".replace(",", "."))
    ano_a_ano.unpersist()
