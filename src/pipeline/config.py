"""Carrega a configuracao do pipeline a partir do YAML + variaveis de ambiente."""

# o Python do cluster e o 3.8; as anotacoes ficam adiadas para nao
# quebrar no import (list[int] | None so existe como sintaxe a partir do 3.10)
from __future__ import annotations

import os
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parents[2]
CAMINHO_CONFIG = RAIZ / "config" / "config.yaml"


class Config:
    def __init__(self, caminho: Path = CAMINHO_CONFIG):
        with open(caminho, encoding="utf-8") as f:
            bruto = yaml.safe_load(f)

        self.url_template: str = bruto["fonte"]["url_template"]
        self.anos: list[int] = bruto["fonte"]["anos"]

        arm = bruto["armazenamento"]
        self.s3_endpoint: str = os.getenv("S3_ENDPOINT", arm["endpoint"])
        self.s3_access_key: str = os.getenv("S3_ACCESS_KEY", arm["access_key"])
        self.s3_secret_key: str = os.getenv("S3_SECRET_KEY", arm["secret_key"])
        self.bucket: str = arm["bucket"]
        self.prefixos: dict[str, str] = arm["prefixos"]

        self.spark_master: str = os.getenv("SPARK_MASTER", bruto["spark"]["master"])
        self.shuffle_partitions: int = bruto["spark"]["shuffle_partitions"]

    def caminho(self, camada: str, *partes: str) -> str:
        """s3a://lake/<camada>/<partes...>"""
        pedacos = [self.prefixos[camada], *partes]
        return f"s3a://{self.bucket}/" + "/".join(p for p in pedacos if p)

    def url(self, ano: int) -> str:
        return self.url_template.format(ano=ano)

    def arquivo_landing(self, ano: int) -> str:
        return f"Ano-{ano}.csv"


def carregar_config() -> Config:
    return Config()
