"""Conversa com o MinIO fora do Spark: subir CSV, listar, apagar.

Existe separado da sessao porque a ingestao nao precisa de cluster. Subir um
arquivo para o object storage e uma operacao de cliente HTTP, nao de motor de
processamento — e confundir as duas coisas e como a gente acaba com pipeline
que so roda se o Spark estiver de pe.
"""

# o Python do cluster e o 3.8; as anotacoes ficam adiadas para nao
# quebrar no import (list[int] | None so existe como sintaxe a partir do 3.10)
from __future__ import annotations

import logging
from pathlib import Path

import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import ClientError

from pipeline.config import Config

logger = logging.getLogger(__name__)


def cliente(config: Config):
    # de dentro do container o endpoint e minio:9000; de fora, localhost:9000
    return boto3.client(
        "s3",
        endpoint_url=config.s3_endpoint,
        aws_access_key_id=config.s3_access_key,
        aws_secret_access_key=config.s3_secret_key,
        config=BotoConfig(signature_version="s3v4"),
    )


def garantir_bucket(config: Config) -> None:
    s3 = cliente(config)
    try:
        s3.head_bucket(Bucket=config.bucket)
    except ClientError:
        logger.info("criando bucket %s", config.bucket)
        s3.create_bucket(Bucket=config.bucket)


def existe(config: Config, chave: str) -> bool:
    s3 = cliente(config)
    try:
        s3.head_object(Bucket=config.bucket, Key=chave)
        return True
    except ClientError:
        return False


def subir(config: Config, local: Path, chave: str) -> None:
    s3 = cliente(config)
    logger.info("subindo %s -> s3a://%s/%s (%.1f MB)",
                local.name, config.bucket, chave, local.stat().st_size / 1e6)
    s3.upload_file(str(local), config.bucket, chave)
