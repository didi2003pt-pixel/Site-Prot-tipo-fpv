# Protótipo FPV 2026

Protótipo front-end conceptual para modernização do website da Federação Portuguesa de Vela.

## Abrir
Abra `index.html` num browser moderno. Não é necessário servidor para a navegação principal.

## Estrutura
- `index.html` — homepage
- `calendario.html` — calendário com pesquisa/filtros funcionais
- `noticias.html` — área editorial com filtros
- `descobrir.html` — onboarding para novos praticantes
- `clubes.html` — conceito de pesquisa geográfica
- `federacao.html` — área institucional/documental
- `css/style.css`
- `js/main.js`

## Funcionalidades demonstradas
- design responsivo
- menu mobile
- pesquisa global tipo command palette
- animações de scroll com suporte a `prefers-reduced-motion`
- filtros de calendário
- filtros de notícias
- filtro de clubes
- estrutura sem dependências JavaScript pesadas

## Conteúdo
Foram usados títulos e dados públicos identificados no site oficial da FPV em setembro de 2026, incluindo:
- XXXVIII Campeonato de Portugal de Juniores e Absoluto
- Curso de treinadores de Vela — Grau II
- Circuito de Águas Interiores 2026
- Sistema de Seleção — Jogos Olímpicos LA 2028
- Volta a Portugal à Vela 2026
- Taça de Portugal de Escolas de Vela, Costa Nova, 04–06 setembro de 2026
- contactos institucionais públicos

Qualquer conteúdo inventado para demonstrar UX está marcado como “Conteúdo demonstrativo”.

## Imagens
O protótipo usa imagens remotas apenas para apresentação conceptual. Antes de produção, substituir por fotografia licenciada/da própria FPV e alojada no servidor oficial.

## Nota
Este protótipo não altera o site oficial e não contém backend, autenticação, base de dados nem integração com o myFPV.


## Compatibilidade responsiva
O protótipo foi reforçado para:
- iPhone e Safari móvel, incluindo `viewport-fit=cover` e safe areas
- Android/Chrome móvel
- tablets em orientação vertical e horizontal
- desktop e ecrãs largos

Breakpoints principais: 1080px, 1024px, 900px, 760px, 480px e 360px.

Foram ainda adicionados:
- alvos de toque de 44–48px
- prevenção de zoom automático de inputs no iOS
- proteção contra scroll horizontal causado por texto longo
- unidades `dvh` quando suportadas
- suporte a notch / Dynamic Island / display cutouts
- redução de animações via `prefers-reduced-motion`

Nota: a validação final em produção deve incluir testes em dispositivos físicos e Safari iOS, Chrome Android, Safari/Chrome desktop e Firefox.


## Versão final de apresentação
Esta versão inclui:
- identidade FPV com o emblema oficial fornecido para o protótipo
- arquitetura revista: Descobrir, Competição, Alto Rendimento, Formação, Clubes, Notícias, Federação
- eventos 2026 substituídos por informação real/publicada pela FPV
- remoção de links falsos ou perfis fictícios apresentados como reais
- separação explícita entre conteúdo oficial/referenciado e elementos demonstrativos
- refinamento final de responsive design para iPhone, Android, tablet e PC
- reforço de contraste, touch targets, safe areas e reduced motion

Antes de produção:
1. confirmar direitos e ficheiros mestres da identidade visual FPV;
2. substituir imagens remotas por fotografia oficial/licenciada alojada pela FPV;
3. integrar CMS, pesquisa, base de dados, calendário, licenças e myFPV;
4. realizar auditoria WCAG e testes em dispositivos físicos;
5. validar conteúdos com os responsáveis de cada área.


## Mapa e diretório de clubes
- A homepage usa um contorno geográfico real de Portugal Continental derivado de Natural Earth (dados de domínio público), apenas como elemento visual.
- A página de Clubes não incorpora um mapa interativo: pesquisa os 43 registos por nome/morada/região e abre Google Maps numa nova aba com o destino preenchido.
- Não são inventadas coordenadas no protótipo.
