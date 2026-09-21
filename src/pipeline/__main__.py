"""CLI do pipeline da cota parlamentar.

Exemplos:
    python -m pipeline rodar                            # tudo, todos os anos
    python -m pipeline rodar --camadas bronze           # so a bronze
    python -m pipeline rodar --anos 2025                # reprocessa um ano
    python -m pipeline rodar --camadas silver,gold --anos 2024,2025
    python -m pipeline consultar "SELECT * FROM fornecedores LIMIT 5"
    python -m pipeline historico                        # o _delta_log da bronze

As camadas rodam sempre na ordem canonica, nao na ordem em que voce digitou.
"""

# o Python do cluster e o 3.8; as anotacoes ficam adiadas para nao
# quebrar no import (list[int] | None so existe como sintaxe a partir do 3.10)
from __future__ import annotations

import argparse
import logging
import sys

from pipeline.config import carregar_config

CAMADAS = ["ingestao", "bronze", "silver", "gold"]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("pipeline")


def ler_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="pipeline")
    sub = p.add_subparsers(dest="comando", required=True)

    rodar = sub.add_parser("rodar", help="executa camadas do pipeline")
    rodar.add_argument("--camadas", default=",".join(CAMADAS),
                       help=f"separadas por virgula ({','.join(CAMADAS)})")
    rodar.add_argument("--anos", default=None,
                       help="anos separados por virgula (default: config.yaml)")
    rodar.add_argument("--forcar-download", action="store_true",
                       help="baixa de novo mesmo se o arquivo ja estiver na landing")

    consultar = sub.add_parser("consultar", help="consulta ad-hoc no lake, em SQL")
    consultar.add_argument("sql")

    hist = sub.add_parser("historico", help="DESCRIBE HISTORY de uma camada")
    hist.add_argument("--camada", default="bronze", choices=["bronze", "silver"])

    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = ler_args(argv if argv is not None else sys.argv[1:])
    config = carregar_config()

    if args.comando in ("consultar", "historico"):
        from pipeline import consulta
        from pipeline.infra.sessao import criar_spark

        spark = criar_spark(config, nome=args.comando)
        spark.sparkContext.setLogLevel("ERROR")
        if args.comando == "consultar":
            consulta.executar(spark, config, args.sql)
        else:
            consulta.historico(spark, config, args.camada)
        spark.stop()
        return

    pedidas = [c.strip() for c in args.camadas.split(",")]
    desconhecidas = [c for c in pedidas if c not in CAMADAS]
    if desconhecidas:
        raise SystemExit(f"camada desconhecida: {desconhecidas}. validas: {CAMADAS}")
    pedidas = [c for c in CAMADAS if c in pedidas]

    anos = [int(a.strip()) for a in args.anos.split(",")] if args.anos else None

    # os imports sao tardios de proposito. A ingestao nao depende de Spark, e
    # `python -m pipeline rodar --camadas ingestao` tem que funcionar num laptop
    # que nem pyspark instalado tem. Import no topo do arquivo transformaria
    # essa independencia em mentira.
    if "ingestao" in pedidas:
        from pipeline.camadas import ingestao
        logger.info("== camada: ingestao ==")
        ingestao.executar(config, anos, forcar=args.forcar_download)

    com_spark = [c for c in pedidas if c != "ingestao"]
    if com_spark:
        from pipeline.camadas import bronze, gold, silver
        from pipeline.infra.sessao import criar_spark

        spark = criar_spark(config)
        spark.sparkContext.setLogLevel("WARN")
        for nome, modulo in [("bronze", bronze), ("silver", silver), ("gold", gold)]:
            if nome in com_spark:
                logger.info("== camada: %s ==", nome)
                modulo.construir(spark, config, anos)
        spark.stop()

    logger.info("pipeline terminou")


if __name__ == "__main__":
    main()
