# Análise

Vazio de propósito, por enquanto.

O notebook antigo foi removido: era inteiro em DuckDB, lia `../data/Ano-2025.csv`
direto (sem passar pelo lake) e fechava com duas frases que não vão para esta
aula — "custo total desta aula: R$ 0,00" e "o que a nuvem vende não é o motor".
A comparação entre rodar local e rodar na nuvem é neutra nesta apresentação:
cada lado com seu benefício real.

O que vier para cá deve **ler a `gold` que o pipeline escreveu**, não reprocessar
o CSV. Reimplementar a regra no notebook é como o número do slide e o número do
pipeline começam a divergir.

O Jupyter do stack monta esta pasta:

    make subir
    # http://localhost:8888  (token: semuni)

Lá dentro o `PYTHONPATH` já aponta para `/opt/src`, então
`from pipeline.config import carregar_config` funciona.
