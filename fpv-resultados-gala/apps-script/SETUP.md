# FPV — Resultados Internacionais / Gala da Vela

## Publicação da Web App

Esta versão funciona inteiramente em Google Apps Script + Google Sheets + Google Drive.

Não depende do website FPV nem do serviço Railway do protótipo.

### Ficheiros
- `Code.gs`
- `Index.html`

### Instalação

1. Abrir a Google Sheet **Resultados Internacionais — Gala FPV**.
2. Ir a **Extensões → Apps Script**.
3. No ficheiro `Code.gs`, substituir o conteúdo pelo ficheiro `Code.gs` deste pacote.
4. Criar um novo ficheiro HTML chamado exatamente **Index**.
5. Colar nele o conteúdo de `Index.html`.
6. Guardar o projeto.
7. No seletor de funções, escolher **setup**.
8. Executar `setup` uma vez.
9. Aceitar as permissões Google solicitadas.
10. Confirmar que o trigger `onEditValidation` foi criado em **Acionadores/Triggers**.
11. Ir a **Implementar → Nova implementação**.
12. Tipo: **Aplicação Web**.
13. Executar como: **Eu**.
14. Quem tem acesso: **Qualquer pessoa**.
15. Implementar.
16. Copiar o URL terminado em `/exec`.

Esse URL é o link público a enviar aos velejadores.

## Teste mínimo obrigatório

### Teste A — submissão
1. Abrir o URL público.
2. Usar um email de teste controlado pela FPV.
3. Preencher uma participação.
4. Usar um link SailTi conhecido.
5. Enviar.
6. Confirmar que aparece uma nova linha na folha `Submissões`.
7. Confirmar que recebe uma referência `RI-AAAA-XXXX`.
8. Confirmar que o estado inicial é `PENDENTE`.

### Teste B — validação
1. Na nova linha, alterar `Estado FPV` para `VALIDADO`.
2. Confirmar que:
   - `Validado Por` é preenchido;
   - `Data Validação` é preenchida;
   - `Email Enviado` passa a TRUE;
   - `Data Email` é preenchida;
   - o email de validação chega à caixa de teste.
3. Alterar o estado e voltar a `VALIDADO`.
4. Confirmar que não é enviado um segundo email.

## Segurança operacional

- A Sheet deve permanecer privada.
- A pasta Drive de PDFs deve permanecer privada.
- Não partilhar a Sheet com os velejadores.
- Partilhar apenas o URL da Web App.
- A análise automática nunca equivale a validação.
- A FPV deve confirmar a fonte oficial antes de mudar para `VALIDADO`.

## Limitações V1

- SailTi está suportado especificamente para o padrão de resultados já testado.
- Links de outros sistemas podem ficar como análise inconclusiva.
- PDFs são analisados no browser quando a tabela é interpretável; em caso de dúvida ficam para validação manual.
- O email obrigatório da V1 é apenas o de resultado validado.

## Estrutura Google já criada

Sheet:
https://docs.google.com/spreadsheets/d/1dsZUfvE32-QHOiLWw_oV9HVndptgihclEM2ZZQYMa18/edit

Pasta privada de PDFs:
https://drive.google.com/drive/folders/1no4n9kFXx9HjXY3N2H87b7ebzbRfsael
