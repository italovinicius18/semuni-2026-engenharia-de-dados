# O cluster precisa das bibliotecas do job, nao so do Spark.
#
# A imagem oficial vem com o Spark e mais nada em Python. O driver do nosso job
# roda dentro do spark-master e le config/config.yaml, entao precisa de PyYAML.
# O pytest entra junto porque os testes das transformacoes precisam de uma
# SparkSession, e ela tem que ser a mesma do cluster.
#
# E uma linha, mas e a linha que separa "funciona na minha maquina" de
# "funciona no cluster": a dependencia do codigo tem que existir onde o codigo
# executa, nao onde ele foi escrito.
#
# Vale reparar no Python 3.8 da imagem. E por isso que o pacote pipeline usa
# `from __future__ import annotations` em vez de escrever list[int] | None
# direto: o codigo precisa rodar no Python do cluster, nao no do laptop.
FROM apache/spark:3.5.0

USER root
RUN pip3 install --no-cache-dir PyYAML==6.0.2 pytest==8.3.4
USER spark
