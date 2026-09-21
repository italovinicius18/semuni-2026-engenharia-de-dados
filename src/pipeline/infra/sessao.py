"""Criacao da SparkSession.

O job roda dentro do cluster do docker-compose: o driver no spark-master e os
executores nos workers. Nenhum dos tres tem o dado no disco — tudo vai e volta
por s3a://, falando com o MinIO. Essa separacao e o argumento da aula, entao
ela esta no codigo e nao so no desenho.

As duas maneiras de arrumar os jars do s3a e do Delta estao aqui de proposito:

  jars locais    o que acontece na aula. os .jar ja estao em /opt/jars, dentro
                 do container, e o Spark sobe sem tocar na rede.
  maven          o que acontece na primeira vez, e num laptop sem o stack. o
                 Spark baixa as coordenadas do Maven Central.

O mesmo codigo, dois ambientes. Quem nao tiver o container em pe consegue rodar
a bronze contra um MinIO qualquer sem editar nada.
"""

# o Python do cluster e o 3.8; as anotacoes ficam adiadas para nao
# quebrar no import (list[int] | None so existe como sintaxe a partir do 3.10)
from __future__ import annotations

import logging
from pathlib import Path

from pyspark.sql import SparkSession

from pipeline.config import Config

logger = logging.getLogger(__name__)

JARS_NO_CONTAINER = Path("/opt/jars")

PACOTES_MAVEN = ",".join([
    "io.delta:delta-spark_2.12:3.2.0",
    "org.apache.hadoop:hadoop-aws:3.3.4",
    # o SDK da AWS tem que ser exatamente o que o hadoop-aws 3.3.4 espera;
    # versao mais nova quebra com NoSuchMethodError em tempo de execucao
    "com.amazonaws:aws-java-sdk-bundle:1.12.262",
])


def _dependencias(builder: SparkSession.Builder) -> SparkSession.Builder:
    jars = sorted(JARS_NO_CONTAINER.glob("*.jar")) if JARS_NO_CONTAINER.is_dir() else []
    if jars:
        logger.info("usando %d jars de %s", len(jars), JARS_NO_CONTAINER)
        return builder.config("spark.jars", ",".join(str(j) for j in jars))
    logger.info("jars locais ausentes; resolvendo pelo Maven")
    return builder.config("spark.jars.packages", PACOTES_MAVEN)


def criar_spark(config: Config, nome: str = "ceap") -> SparkSession:
    builder = _dependencias(SparkSession.builder.appName(nome).master(config.spark_master))

    return (
        builder
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .config("spark.sql.catalog.spark_catalog",
                "org.apache.spark.sql.delta.catalog.DeltaCatalog")
        .config("spark.hadoop.fs.s3a.endpoint", config.s3_endpoint)
        .config("spark.hadoop.fs.s3a.access.key", config.s3_access_key)
        .config("spark.hadoop.fs.s3a.secret.key", config.s3_secret_key)
        .config("spark.hadoop.fs.s3a.path.style.access", "true")
        .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
        .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false")
        .config("spark.sql.shuffle.partitions", config.shuffle_partitions)
        .getOrCreate()
    )
