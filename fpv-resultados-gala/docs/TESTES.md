# Testes — FPV Resultados Internacionais / Gala da Vela

A V1 só deve ser divulgada depois destes testes passarem.

## 1. Submissão por link SailTi
Usar um email controlado pela FPV.

Caso já validado durante o desenvolvimento:
- fonte: página SailTi do Europeu 470;
- tripulação Beatriz Gago / Rodolfo Pires: 4.º geral;
- tripulação Diogo Costa / Carolina João: 10.º geral;
- Resultado País esperado nos dois casos: 4.º.

Confirmar:
- análise apresenta posição geral coerente;
- Resultado País é calculado;
- submissão não é automaticamente validada;
- nova linha aparece na Sheet;
- estado inicial = `PENDENTE`;
- referência = `RI-AAAA-XXXX`.

## 2. Submissão por PDF
Confirmar:
- PDF até 12 MB é aceite;
- ficheiro fica na pasta privada Drive;
- URL do Drive aparece na Sheet;
- se a análise for inconclusiva, a submissão continua;
- estado continua `PENDENTE`.

## 3. Datas inválidas
Data de fim anterior à data de início deve ser rejeitada.

## 4. Duplicados
Repetir a mesma submissão com os mesmos dados essenciais. O sistema deve identificar provável duplicado.

## 5. Validação e email
Na Sheet:
1. escolher uma submissão de teste;
2. alterar `Estado FPV` para `VALIDADO`;
3. confirmar preenchimento de `Validado Por` e `Data Validação`;
4. confirmar `Email Enviado = TRUE`;
5. confirmar `Data Email`;
6. verificar receção do email.

Depois:
1. alterar o estado para outro valor;
2. voltar a `VALIDADO`;
3. confirmar que não é enviado segundo email.

## 6. Estados
Testar a validação de dados da Sheet:
- PENDENTE
- EM ANÁLISE
- NECESSITA CORREÇÃO
- VALIDADO
- REJEITADO

## 7. Responsividade
Testar pelo menos:
- iPhone / Safari;
- Android / Chrome;
- tablet;
- desktop Chrome ou Edge.

## 8. Falha de análise
Usar uma fonte que o sistema não reconheça. Deve aparecer indicação de análise inconclusiva, nunca um resultado inventado.

## Critério final
Só divulgar o URL aos velejadores quando o ciclo completo funcionar:
**submissão → Sheet → revisão FPV → VALIDADO → email**.
