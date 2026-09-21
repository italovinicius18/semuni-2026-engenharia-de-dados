#!/usr/bin/env bash
# Baixa os jars uma vez. Depois disso o stack sobe sem internet.
#
# Isso importa no dia da aula: o auditorio pode nao ter wi-fi, e sem estes cinco
# arquivos o Spark nao fala s3a:// nem Delta. Rode em casa; o `make subir` ja
# chama este script, e ele pula o que ja estiver em jars/.
set -euo pipefail
cd "$(dirname "$0")/../jars"
M=https://repo1.maven.org/maven2
baixa(){ [ -f "$(basename "$1")" ] || curl -fsSL -O "$M/$1"; echo "  $(basename "$1")"; }
baixa io/delta/delta-spark_2.12/3.2.0/delta-spark_2.12-3.2.0.jar
baixa io/delta/delta-storage/3.2.0/delta-storage-3.2.0.jar
baixa org/apache/hadoop/hadoop-aws/3.3.4/hadoop-aws-3.3.4.jar
baixa com/amazonaws/aws-java-sdk-bundle/1.12.262/aws-java-sdk-bundle-1.12.262.jar
baixa org/antlr/antlr4-runtime/4.9.3/antlr4-runtime-4.9.3.jar
