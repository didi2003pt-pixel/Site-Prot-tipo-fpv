# FPV — Resultados Internacionais / Gala da Vela

Aplicação autónoma para a Federação Portuguesa de Vela receber, analisar e validar resultados internacionais submetidos pelos velejadores.

## V1 em utilização
A arquitetura escolhida para a urgência da Gala é:

**Google Apps Script + Google Sheets + Google Drive**

Não depende do website FPV nem do protótipo em desenvolvimento.

## Estrutura

```
fpv-resultados-gala/
├── app/
│   ├── Code.gs
│   └── Index.html
├── data/
│   └── clubes-fpv.json
├── docs/
│   ├── ARQUITETURA.md
│   ├── INSTALACAO.md
│   └── TESTES.md
└── README.md
```

## Fluxo
1. Velejador abre o link público.
2. Preenche os dados essenciais.
3. Indica link oficial ou PDF.
4. O sistema tenta analisar a fonte.
5. A submissão entra na Sheet como `PENDENTE`.
6. A FPV revê e valida.
7. Ao mudar para `VALIDADO`, o velejador recebe um email automático.
8. O envio do email fica registado para impedir duplicação.

## Fontes
A V1 já inclui suporte específico para o padrão SailTi testado durante o desenvolvimento. Outras fontes podem entrar como análise inconclusiva e ser revistas manualmente.

## Instalação
Ver `docs/INSTALACAO.md`.

## Testes antes da divulgação
Ver `docs/TESTES.md`.

## Princípio fundamental
**Nenhum resultado é automaticamente validado.**
