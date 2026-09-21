"""Camada silver: tipos certos e defeitos marcados em coluna. Nada apagado.

Os tres defeitos do dado da cota viram tres colunas booleanas em vez de virar
filtro. A diferenca importa: filtro joga informacao fora e quem consulta depois
nao sabe que foi jogada. Coluna deixa cada pergunta decidir.

  eh_estorno   valor liquido negativo: alguem devolveu dinheiro
  via_sigepa   sem CNPJ: passagem emitida pelo sistema da propria Camara
  servico_da_camara  CNPJ de raiz 00000000: ramal, celular funcional, Correios
  tem_glosa    a Camara cortou parte do valor pedido

E cria a chave natural: a raiz do CNPJ, os 8 primeiros digitos. E ela que junta
as dezenas de grafias do mesmo posto de gasolina numa empresa so.
"""

# o Python do cluster e o 3.8; as anotacoes ficam adiadas para nao
# quebrar no import (list[int] | None so existe como sintaxe a partir do 3.10)
from __future__ import annotations

import logging

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F

from pipeline.config import Config
from pipeline.qualidade import REGRAS_SILVER, conferir, exigir_colunas

logger = logging.getLogger(__name__)

COLUNAS_BRONZE = [
    "txNomeParlamentar", "sgUF", "sgPartido", "txtDescricao", "txtFornecedor",
    "txtCNPJCPF", "vlrDocumento", "vlrGlosa", "vlrLiquido", "numAno", "numMes",
]


def transformar(bronze: DataFrame) -> DataFrame:
    doc = F.regexp_replace(F.coalesce(F.col("txtCNPJCPF"), F.lit("")), "[^0-9]", "")
    return (
        bronze.select(
            F.col("txNomeParlamentar").alias("deputado"),
            F.col("sgUF").alias("uf"),
            F.col("sgPartido").alias("partido"),
            F.col("txtDescricao").alias("categoria"),
            F.col("txtFornecedor").alias("fornecedor"),
            F.when(F.length(doc) > 0, doc).alias("doc"),
            F.col("vlrDocumento").cast("double").alias("vlr_documento"),
            F.col("vlrGlosa").cast("double").alias("vlr_glosa"),
            F.col("vlrLiquido").cast("double").alias("vlr_liquido"),
            F.col("numAno").cast("int").alias("ano"),
            F.col("numMes").cast("int").alias("mes"),
            F.col("ano_ref"),
        )
        # a raiz do CNPJ e a mesma chave que existe fora deste arquivo:
        # da para cruzar com a Receita, com licitacao, com o que for.
        #
        # Menos quando a raiz e 00000000. Nenhum CNPJ de verdade comeca assim:
        # essa faixa e preenchimento interno da Camara, e nao e um valor so.
        # Sao pelo menos sete, cada um para um servico que ela mesma fornece —
        # 00000000000001 e celular funcional (30.748 lancamentos), ...0006 e
        # ramal (41.231), ...0007 sao os Correios, ...0010 e uma gaveta com
        # 961 grafias diferentes.
        #
        # Todos tem 14 digitos e passam em qualquer validacao de formato. Foi
        # assim que os sete viraram um fornecedor so, de R$ 15,1 mi, que ia
        # entrar no slide como o quarto maior da serie. Nao existe essa
        # empresa. Formato valido nao e a mesma coisa que significado valido.
        .withColumn("_raiz", F.when(F.length("doc") == 14,
                                    F.substring("doc", 1, 8)))
        .withColumn("raiz_cnpj",
                    F.when(F.col("_raiz") != "0" * 8, F.col("_raiz")))
        .withColumn("eh_estorno", F.col("vlr_liquido") < 0)
        .withColumn("tem_glosa", F.col("vlr_glosa") > 0)
        .withColumn("via_sigepa", F.col("doc").isNull())
        .withColumn("servico_da_camara", F.col("_raiz") == "0" * 8)
        .drop("_raiz")
    )


def construir(spark: SparkSession, config: Config, anos: list[int] | None = None) -> None:
    bronze = spark.read.format("delta").load(config.caminho("bronze"))
    exigir_colunas(bronze, COLUNAS_BRONZE)
    if anos:
        bronze = bronze.filter(F.col("ano_ref").isin(anos))

    silver = transformar(bronze).cache()
    # conferir antes de escrever: o relatorio sai no log mesmo que a escrita
    # falhe depois, e e o relatorio que diz se a fonte mudou de formato
    relatorio = conferir(silver, REGRAS_SILVER, "silver")
    n = relatorio["total"]

    escrita = (
        silver.write.format("delta").mode("overwrite")
        # mergeSchema, nao overwriteSchema: coluna nova e aditiva e nao apaga
        # nada, e isto continua funcionando junto com o replaceWhere de baixo,
        # que reprocessa um ano so. overwriteSchema brigaria com ele.
        .option("mergeSchema", "true")
        .partitionBy("ano_ref")
    )
    if anos:
        # reprocessar um ano so troca a particao dele
        lista = ", ".join(str(a) for a in anos)
        escrita = escrita.option("replaceWhere", f"ano_ref IN ({lista})")
    escrita.save(config.caminho("silver"))
    silver.unpersist()

    logger.info("silver: %s linhas", f"{n:,}".replace(",", "."))
