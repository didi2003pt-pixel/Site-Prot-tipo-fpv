# Arquitetura V1 — FPV Resultados Internacionais

## Objetivo
Receber resultados internacionais enviados pelos velejadores, apoiar a sua verificação e permitir à FPV validar cada registo antes de o considerar institucionalmente aceite.

## Componentes

### 1. Web App pública
Google Apps Script HTML Service.

Responsável por:
- formulário;
- lista de clubes;
- validação no browser;
- análise assistida de PDF;
- chamada à análise de URL no servidor;
- confirmação de submissão.

### 2. Apps Script
`app/Code.gs`.

Responsável por:
- validação no servidor;
- geração sequencial de referência `RI-AAAA-XXXX`;
- proteção básica contra abuso e duplicados;
- análise de links SailTi;
- escrita na Sheet;
- armazenamento de PDFs na Drive;
- workflow de validação;
- email após `VALIDADO`.

### 3. Google Sheet privada
Backoffice operacional da V1.

Estado inicial de cada registo:
`PENDENTE`.

Estados disponíveis:
`PENDENTE`, `EM ANÁLISE`, `NECESSITA CORREÇÃO`, `VALIDADO`, `REJEITADO`.

### 4. Google Drive privada
Arquivo dos PDFs submetidos.

## Regra de confiança
A análise automática nunca equivale a validação institucional.

Quando a fonte não puder ser interpretada com segurança:
`ANÁLISE AUTOMÁTICA INCONCLUSIVA — REQUER VALIDAÇÃO MANUAL`.

A submissão não deve ser bloqueada por esse motivo.

## Email
O trigger instalável `onEditValidation` reage quando a FPV altera manualmente o estado para `VALIDADO`.

O email é enviado uma única vez e o estado de envio fica registado na Sheet.

## Isolamento
Esta aplicação:
- não altera o website FPV atual;
- não altera o protótipo do novo site;
- não depende de CSS/JS globais do site;
- não depende do Railway para a V1 da Gala.

## Evolução futura
Depois da Gala, a mesma estrutura de dados pode ser migrada para WordPress ou para um backend dedicado sem alterar o princípio do fluxo:
**submissão → análise → validação humana → arquivo/exportação**.
