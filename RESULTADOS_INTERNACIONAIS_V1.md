# Resultados Internacionais FPV — Especificação funcional V1

## Objetivo
Criar um fluxo simples para recolher resultados internacionais de velejadores portugueses, reduzir o trabalho manual da FPV e manter uma base única que possa alimentar o website, histórico e exportação anual para Excel.

A solução deve privilegiar a simplicidade de submissão: o velejador/tripulação deve conseguir comunicar um resultado em cerca de um minuto.

## 1. Formulário público — apenas os campos definidos na reunião
Campos obrigatórios:
1. Data de início
2. Data de fim
3. Velejador / tripulação
4. Clube
5. Resultado
6. Link oficial dos resultados

### Regras
- Data de fim não pode ser anterior à data de início.
- O link deve ser um URL válido.
- O clube deve ser selecionado da base de clubes FPV sempre que possível.
- A submissão nunca é publicada automaticamente.
- O registo entra no estado **Pendente de validação**.

## 2. Registo interno
Cada submissão cria um registo único de **Resultado Internacional**.

Estados:
- Pendente
- Em validação
- Aprovado
- Rejeitado
- Publicado

Metadados internos automáticos:
- data/hora de submissão
- data/hora de validação
- utilizador FPV que validou
- URL de origem
- estado da análise automática
- nível de confiança da análise
- observações internas

## 3. Campos completos / exportação
O formulário público não deve pedir todos os campos do ficheiro anual.

O registo completo deve suportar a estrutura usada pela FPV no ficheiro de resultados, incluindo:
- Data Início
- Data Fim
- Radar
- Velejador / Tripulação
- Clube
- Resultado
- Resultado País
- Evento
- Escalão do evento
- Género
- Classe / Disciplina
- Categoria
- Local
- País
- N.º de países participantes
- N.º de embarcações participantes
- Link Resultados

O objetivo é que a FPV consiga exportar estes campos para Excel sem voltar a transcrever toda a informação.

## 4. Assistência automática a partir do link
Ao abrir um registo pendente, a plataforma pode analisar o link oficial e tentar preencher os campos internos em falta.

### A análise deve tentar identificar
- nome do evento
- classe / disciplina
- local
- país
- escalão
- número de embarcações
- número de países
- posição do velejador/tripulação
- códigos/países das embarcações classificadas
- Resultado País

### Regra fundamental
A análise automática é assistiva. Nunca publica ou valida sozinha.

Se a informação não puder ser determinada com segurança, deve apresentar algo como:
**“Não foi possível determinar este campo com confiança. Validar manualmente.”**

## 5. Cálculo de Resultado País
Objetivo: determinar a classificação de Portugal considerando a melhor posição de cada país.

Exemplo:
1.º ESP
2.º ITA
3.º ESP
4.º FRA
5.º ITA
6.º POR

Resultado geral de POR: 6.º
Resultado País: 4.º

### Regra base
Percorrer a classificação pela ordem final e contar apenas a primeira ocorrência de cada país até chegar à primeira embarcação/tripulação portuguesa relevante.

### Casos que exigem validação humana
- fleets/grupos diferentes
- classificações por escalão
- eventos por equipas
- códigos de país ausentes ou inconsistentes
- DNS / DNF / DSQ / RET
- empates
- classificação provisória
- múltiplas séries ou rankings paralelos

## 6. Compatibilidade com diferentes fontes
Os resultados internacionais não são publicados num formato único.

A V1 deve aceitar um URL e suportar best-effort:
- página HTML
- tabela web
- PDF acessível através de URL
- páginas de sistemas de gestão de regatas

Quando uma fonte bloquear leitura automática ou tiver estrutura ambígua, o backoffice mantém a validação manual.

Não é objetivo da V1 fazer scraping contínuo de todas as regatas internacionais.

## 7. Publicação no website
Depois da aprovação, o mesmo registo pode alimentar:

### Competição
**Competição → Resultados Internacionais**
- listagem pública
- pesquisa
- filtros por ano, classe e atleta/tripulação
- link para a fonte oficial

### Alto Rendimento
A mesma base, filtrada para os atletas/classes aplicáveis.

### Perfil de atleta
Quando existir relação inequívoca entre resultado e atleta, o resultado pode aparecer automaticamente no perfil.

### Pesquisa global
Resultados publicados devem poder ser encontrados pela pesquisa do site.

## 8. Exportação Excel
O backoffice deve permitir:
- escolher ano/período
- exportar resultados aprovados
- manter as colunas exigidas pela FPV
- incluir a coluna do link oficial
- gerar um ficheiro que minimize ou elimine a transcrição manual anual

## 9. Arquitetura WordPress recomendada
Novo Custom Post Type:
- **Resultado Internacional**

Relações:
- Atleta(s), quando existentes na base
- Clube
- Classe / disciplina

Taxonomias/campos controlados:
- ano
- classe
- país
- escalão
- género
- categoria

Implementação recomendada:
- plugin específico FPV para submissão, validação, assistência automática e exportação
- Divi responsável apenas pela apresentação pública
- credenciais/API de IA exclusivamente no servidor
- nenhum segredo ou token no frontend

## 10. Princípio da V1
**Entrada simples → enriquecimento assistido → validação humana → uma base única → múltiplas utilizações.**

A V1 não depende do SAILTI para funcionar. Se no futuro existirem APIs úteis, podem ser integradas sem alterar o modelo de dados central.
