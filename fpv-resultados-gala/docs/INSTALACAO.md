# Instalação — FPV Resultados Internacionais / Gala da Vela

## Pré-requisitos
- Google Sheet privada `Resultados Internacionais — Gala FPV`.
- Pasta Drive privada `FPV Gala — PDFs Resultados Internacionais`.
- Conta Google da FPV com autorização para Apps Script, Sheets, Drive e envio de email.

## Publicar a aplicação
1. Abrir a Sheet **Resultados Internacionais — Gala FPV**.
2. Ir a **Extensões → Apps Script**.
3. Substituir o conteúdo de `Code.gs` pelo ficheiro `app/Code.gs`.
4. Criar um ficheiro HTML chamado exatamente **Index**.
5. Colar o conteúdo de `app/Index.html`.
6. Guardar.
7. Selecionar a função `setup` e executar uma vez.
8. Aceitar as permissões solicitadas pelo Google.
9. Confirmar em **Acionadores/Triggers** que existe `onEditValidation`.
10. Ir a **Implementar → Nova implementação → Aplicação Web**.
11. Executar como: **Eu**.
12. Acesso: **Qualquer pessoa**.
13. Implementar e copiar o URL terminado em `/exec`.

Esse URL é o único endereço que deve ser enviado aos velejadores.

## Não partilhar
- Google Sheet.
- Pasta de PDFs.
- Projeto Apps Script.
- IDs internos ou permissões administrativas.

## Atualizações futuras
Quando houver alterações no código:
1. atualizar `Code.gs` e/ou `Index.html`;
2. guardar;
3. criar uma nova versão da implementação da Web App;
4. testar antes de substituir o link divulgado, se o Google gerar um endereço diferente.
