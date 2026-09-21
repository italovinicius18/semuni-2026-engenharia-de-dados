"""Uma SparkSession local, sem cluster e sem Delta.

As transformacoes das camadas sao funcoes de DataFrame para DataFrame. Testar
isso nao precisa de MinIO, de Delta nem de worker: precisa de um Spark qualquer
e de umas dez linhas inventadas. O teste roda em segundos e falha por motivo de
regra, nunca por motivo de infraestrutura.

E por isso que `transformar` e `por_ano` vivem separadas de `construir` nos
modulos das camadas: `construir` fala com o mundo, as outras duas so pensam.
"""

from __future__ import annotations

import pytest
from pyspark.sql import SparkSession


@pytest.fixture(scope="session")
def spark() -> SparkSession:
    sessao = (
        SparkSession.builder
        .appName("testes")
        .master("local[2]")
        .config("spark.sql.shuffle.partitions", "2")
        .config("spark.ui.enabled", "false")
        .getOrCreate()
    )
    sessao.sparkContext.setLogLevel("ERROR")
    yield sessao
    sessao.stop()
