# Configuração do Google Apps Script

1. Abrir a Google Sheet **Resultados Internacionais — Gala FPV**.
2. Extensões → Apps Script.
3. Substituir o conteúdo de `Code.gs` pelo ficheiro deste diretório.
4. Guardar.
5. Executar manualmente a função `setup` uma vez e aceitar as permissões solicitadas.
6. Implementar → Nova implementação → Aplicação Web.
7. Executar como: **Eu**.
8. Acesso: **Qualquer pessoa**.
9. Copiar o URL terminado em `/exec`.
10. Guardar esse URL apenas como variável privada `SHEET_WEBHOOK_URL` no serviço Railway.

O URL da web app não é colocado no HTML público.

A função `setup` cria o trigger instalável responsável pelo email quando a coluna **Estado FPV** muda para **VALIDADO**.
