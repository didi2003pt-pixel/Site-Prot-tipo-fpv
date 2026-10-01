# FPV Resultados Internacionais — Gala da Vela

Aplicação autónoma para recolha, análise e validação de resultados internacionais.

## Princípios
- Independente do website/protótipo FPV.
- Formulário público simples.
- Análise assistida de SailTi/HTML/PDF.
- Nunca valida automaticamente.
- Google Sheet privada como backoffice V1.
- Email apenas após validação pela FPV.

## Variáveis de ambiente
- `SHEET_WEBHOOK_URL` — URL da web app Google Apps Script.
- `APP_BASE_URL` — URL pública da aplicação.
- `MAX_PDF_MB` — opcional, default 12.

Sem `SHEET_WEBHOOK_URL`, a aplicação funciona em modo de demonstração para análise mas não aceita submissões finais.
