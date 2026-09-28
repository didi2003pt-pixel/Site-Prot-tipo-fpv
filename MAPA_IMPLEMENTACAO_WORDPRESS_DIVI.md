# Mapa de implementação WordPress + Divi

## Custom Post Types recomendados
- **Atleta** — arquivo + perfil individual.
- **Clube** — arquivo + perfil individual.
- **Formação / Curso** — arquivo + detalhe.
- **Documento** — arquivo central com filtros e relações.
- **Resultado Internacional** — submissão pública simples + validação interna + publicação + exportação.

## Taxonomias
- Classe
- Região
- Área
- Categoria
- Subcategoria
- Ano
- País
- Escalão
- Género
- Tags

## Templates
- archive-atletas / single-atleta
- archive-clubes / single-clube
- archive-formacao / single-formacao
- archive-documentos
- archive-resultados-internacionais / fluxo de submissão
- artigo de notícia
- página institucional genérica
- template de órgão/conselho

## Componentes / módulos reutilizáveis
- Header e navegação
- Hero institucional / editorial
- Card atleta
- Card clube
- Pesquisa e filtros
- Linha de documento
- Course card
- Tags
- Conteúdo relacionado
- CTA externo
- Formulário de submissão de resultado internacional
- Linha/cartão de resultado internacional
- Footer

## WordPress vs. plataforma operacional
### Manter no WordPress
- Descobrir
- Alto Rendimento
- Formação institucional
- Clubes
- Notícias
- Federação
- Centro de Documentação
- Resultados Internacionais validados pela FPV

### Encaminhar para plataforma operacional
- calendário competitivo
- provas
- rankings
- resultados operacionais das provas
- serviços operacionais/licenças conforme configuração final
- myFPV conforme configuração final

## Princípio documental
Existe uma única base de Documentos. As páginas de Federação, Arbitragem, Formação e Alto Rendimento devem abrir subconjuntos filtrados, evitando duplicação.


## Resultados Internacionais — fluxo específico
- Formulário público com 6 campos: Data de início, Data de fim, Velejador/Tripulação, Clube, Resultado e Link oficial.
- Submissões entram como **Pendente de validação**.
- A FPV completa/valida os restantes campos internos antes da publicação.
- A análise automática do link pode auxiliar a preencher evento, classe, local, país, participantes e Resultado País, mas nunca aprova ou publica sozinha.
- O backoffice deve exportar para Excel segundo a estrutura anual usada pela FPV, incluindo o link oficial.
- Esta base pertence ao WordPress institucional e é distinta dos resultados operacionais geridos pela plataforma de competição.
