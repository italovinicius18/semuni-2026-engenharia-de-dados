"""A gold soma por raiz de CNPJ e deixa o estorno de fora. So isso, mas exatamente isso."""

from __future__ import annotations

from pipeline.camadas.gold import consolidado, por_ano

ESQUEMA = ("ano_ref int, raiz_cnpj string, fornecedor string, "
           "vlr_liquido double, eh_estorno boolean, deputado string")


def monta(spark, linhas):
    return spark.createDataFrame(linhas, ESQUEMA)


def test_soma_as_grafias_pela_raiz(spark):
    """Quatro grafias do mesmo posto viram uma linha com o total certo."""
    df = monta(spark, [
        (2025, "12345678", "POSTO SOL", 100.0, False, "A"),
        (2025, "12345678", "Posto Sol Ltda", 200.0, False, "B"),
        (2025, "12345678", "POSTO SOL LTDA.", 50.0, False, "A"),
        (2025, "12345678", "posto sol", 50.0, False, "C"),
    ])
    (r,) = por_ano(df).collect()
    assert r.total == 400.0
    assert r.lancamentos == 4
    assert r.grafias == 4      # quatro jeitos de escrever
    assert r.deputados == 3    # tres deputados


def test_estorno_fica_fora_da_soma(spark):
    """Estorno e dinheiro que voltou; a pergunta da gold e quanto saiu."""
    df = monta(spark, [
        (2025, "12345678", "POSTO", 300.0, False, "A"),
        (2025, "12345678", "POSTO", -100.0, True, "A"),
    ])
    (r,) = por_ano(df).collect()
    assert r.total == 300.0
    assert r.lancamentos == 1


def test_sem_raiz_nao_entra(spark):
    """SIGEPA nao tem fornecedor externo; somar sob NULL inventaria uma empresa."""
    df = monta(spark, [
        (2025, None, "PASSAGEM", 900.0, False, "A"),
        (2025, "12345678", "POSTO", 100.0, False, "A"),
    ])
    assert [r.raiz_cnpj for r in por_ano(df).collect()] == ["12345678"]


def test_anos_ficam_separados(spark):
    df = monta(spark, [
        (2024, "12345678", "POSTO", 100.0, False, "A"),
        (2025, "12345678", "POSTO", 300.0, False, "A"),
    ])
    ano_a_ano = por_ano(df)
    assert sorted((r.ano_ref, r.total) for r in ano_a_ano.collect()) == [
        (2024, 100.0), (2025, 300.0)]

    (t,) = consolidado(ano_a_ano).collect()
    assert t.total == 400.0
    assert t.anos == 2
