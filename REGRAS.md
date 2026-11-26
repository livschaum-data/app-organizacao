# Regras de progresso e recorrência — Projetos

Este documento descreve as regras usadas na seção **Projetos** do Âncora. A fonte única de cálculo é o resolvedor `resolveProgress(owner, opções)` em `app.js`. As telas não recalculam progresso por conta própria: elas chamam o resolvedor e exibem o valor com a origem.

## 1. Resolvedor central

```js
resolveProgress(owner, { mode, monthKey | period, skipStandBy })
```

- `owner`: um projeto (tem `tasks`) ou uma atividade.
- `mode`:
  - `current`: progresso global/atual (aba Lista, diálogo do projeto, aba Recorrentes).
  - `month`: progresso de um mês (`YYYY-MM`) na aba Progresso.
  - `history`: valor de uma coluna do Histórico (`YYYYMM`).
- Retorno:
  ```js
  { value, origin, scope, monthKey, label, detail, automatic }
  ```
  - `value`: número de 0 a 100 ou `null` (sem medição).
  - `origin`: chave da regra que produziu o valor.
  - `detail`: explicação legível, usada em tooltips e na aba “Como o progresso é calculado”.

As funções antigas continuam existindo como atalhos finos:

| Atalho | Chamada equivalente |
| --- | --- |
| `taskProgress(task)` | `resolveProgress(task, {mode:'current'}).value` |
| `projectProgress(project)` | `resolveProgress(project, {mode:'current'}).value` |
| `taskProgressForMonth(task, m)` | `resolveProgress(task, {mode:'month', monthKey:m}).value` |
| `projectProgressForMonth(p, m)` | `resolveProgress(p, {mode:'month', monthKey:m}).value` |
| `taskHistoryValue(task, p)` | `resolveProgress(task, {mode:'history', period:p}).value` |
| `projectHistoryValue(p, p)` | `resolveProgress(p, {mode:'history', period:p}).value` |

## 2. Origens exibidas na interface

| Origem | Selo | Quando aparece |
| --- | --- | --- |
| `manual` | Manual | Atividade/projeto com progresso informado manualmente. |
| `recorded` | Valor do mês | Valor salvo no histórico de um mês aberto. |
| `snapshot` | Snapshot | Valor salvo no fechamento de um mês. Não muda ao editar ocorrências. |
| `final` | Status final | Status Concluída, Remodelada ou Descartada após o mês de encerramento. |
| `standby` | Stand-by / herdado | Mês em Stand-by: usa o valor do último mês que não estava em Stand-by. |
| `habit` | Hábito | Aderência do mês: marcações ÷ esperado até hoje (mês atual) ou esperado do mês (meses passados). |
| `habit-consistency` | Consistência / 3m | Média ponderada dos últimos 3 meses: atual ×3, anterior ×2, retrasado ×1. |
| `forecast` | Previsão | Mês futuro: previsão do progresso global atual. Não é salvo no histórico. |
| `recurring-global` | Global | Média ponderada de todas as ocorrências medidas (mês atual/aberto). |
| `recurring-month` | Mês | Média simples das ocorrências medidas no mês (meses passados). |
| `average` | Média | Média simples das atividades do projeto com medição. |
| `empty` | Sem medição | Não há valor aplicável. |

Os selos aparecem nos cartões de projeto, nas linhas de atividade, no diálogo do projeto, na aba Recorrentes, na matriz do Histórico, no editor de mês e no diálogo de edição. O `title` de cada selo explica a regra e, quando aplicável, o mês de origem.

## 3. Status e progresso

### Status finais

`Concluída`, `Remodelada` e `Descartada` são status finais.

- **Concluída**: progresso 100% no **mês atual/global** e em todos os meses **após** o `endDate`. No mês de encerramento e nos anteriores, usa o valor registrado/cálculo do mês; sem medição registrada, fica “—”, sem fallback para 100%.
  - No mês atual de um item `Concluída`, o progresso e o status ficam **automáticos e desabilitados** no editor de mês e no histórico do diálogo de edição. O mês de encerramento passado e os anteriores continuam editáveis pelo registro/cálculo.
- **Remodelada / Descartada**: a partir do mês seguinte ao `endDate`, o status é repetido e o progresso é replicado.
  - Usa o valor registrado no mês de encerramento (`completionPeriod`).
  - Se não houver, usa o último valor registrado até o encerramento.
  - Se ainda não houver valor, o resultado é “sem medição”.

### Stand-by

- Vale para o mês atual e para qualquer mês marcado como Stand-by no histórico de status.
- O valor é herdado do último mês anterior que **não** estava em Stand-by.
- Tem precedência sobre as demais regras do mês (inclusive recorrência e hábito).
- Se não houver valor herdado, o resultado é “sem medição”.
- No editor de mês e no histórico do diálogo de edição, o **progresso** de um mês Stand-by fica herdado e **não editável**; o **status** continua editável.

### Status normais

`Em andamento` usa as regras do item (hábito, recorrência, manual ou histórico do mês).

**Status em meses passados/futuros:** se não houver `statusHistory[period]` para aquele mês e o item não estiver em status final, o status fica **em branco**. Não usa o status atual como fallback. O **mês atual** usa o status atual quando não há status salvo. Ao fechar um mês passado sem status registrado, o `statusHistory[period]` fica em branco.

## 4. Atividades

### Hábitos

Há dois valores diferentes, e ambos aparecem na interface.

**Aderência do mês** (`habit`)

Usada na aba Progresso do mês, no Histórico e no calendário de hábitos.

- `esperado` = `habitTarget` para meses passados.
- No mês atual, `esperado` é prorrateado até hoje:
  `arredondar(habitTarget × dias corridos ÷ dias do mês)`.
  - Exemplo: meta 30, dia 3 → esperado 3; 2 marcações → **67%**, não 7%.
  - Se o hábito começou no meio do mês, os dias são contados a partir do `startDate`.
  - Se o primeiro mês foi parcial, o esperado desse mês também é prorrateado.
- Progresso = `min(100, marcações ÷ esperado × 100)`.
- Se `esperado` for 0 (início do mês ou antes do início), mostra “—”.
- Meses futuros: sem medição.
- Meses anteriores ao início do hábito: sem medição.
- Meses com ocorrências registradas, mas sem marcações: 0%.

**Consistência 3m** (`habit-consistency`)

Usada no progresso **global** e no **cálculo do projeto em qualquer mês permitido**: aba Lista, aba Progresso do projeto, diálogo do projeto e fechamento de mês. A janela termina no **mês calculado**: para o mês atual, são os 3 meses até hoje; para um mês passado, são os 3 meses até aquele mês.

- Janela: mês atual, mês anterior e mês retrasado.
- Pesos: **atual ×3, anterior ×2, retrasado ×1**.
- Cada mês usa:
  - snapshot, se o mês estiver fechado;
  - valor registrado, se houver;
  - aderência do mês (prorrateada no mês atual), caso contrário.
- Meses sem medição são ignorados e os pesos restantes são normalizados.
  - Exemplo: atual 60% ×3, anterior 80% ×2, retrasado 50% ×1 →
    `(180 + 160 + 50) ÷ 6 = 65%`.
- Se nenhum dos 3 meses tiver medição, o resultado é “sem medição”.

Na tela de hábitos, a coluna **Mês** mostra a aderência do mês e a coluna **Consistência 3m** mostra o valor global. Nas atividades, o valor principal do mês continua sendo a aderência mensal e o selo `3m XX%` mostra a consistência. **A aderência do mês vale apenas para o próprio hábito; o projeto usa sempre a consistência 3m até o mês selecionado.**

### Tela do hábito

- Clicar no nome de um hábito abre a **tela do hábito**, com o mês completo em formato de calendário.
- O mês pode ser alterado pelo seletor, pelos botões **‹/›** ou por **Atual**.
- O resumo mostra: **esperado mensal** (a meta do hábito), **esperado no mês** (prorrateado no mês atual ou em mês parcial), **marcadas**, **aderência** e **consistência 3m** até o mês selecionado.
- Dias até hoje em meses passados ficam editáveis para preenchimento retroativo. Dias futuros e anteriores ao início do hábito ficam bloqueados.
- **Editar hábito** abre o formulário completo da atividade.
- Em um mês de projeto já fechado, as marcações atualizam o hábito e a consistência, mas **não recalculam o snapshot do projeto**; a tela avisa isso.

### Recorrências

Ocorrências com resultado `skipped` (ignorada) ou `scheduled` (pendente) não entram na média. Ocorrências sem progresso medido também são ignoradas.

**Mês atual ou mês aberto**

- Usa o **progresso global ponderado**.
- Pesos, das ocorrências medidas mais recentes para as mais antigas:
  - 3 ocorrências mais recentes: peso 3
  - as 3 seguintes: peso 2
  - as 6 seguintes: peso 1
  - as demais: peso 0 (não entram)
- Máximo de 12 ocorrências com peso.
- Sem ocorrências medidas: usa o progresso manual da atividade.

**Meses passados**

- Usa a **média simples** das ocorrências medidas naquele mês.
- Se houver valor salvo no histórico, o valor salvo tem prioridade.

### Manual

- Atividades não recorrentes e sem valor calculável usam `progress`.
- Valor vazio significa “sem medição”.

## 5. Projetos

1. Projeto **Concluída** → 100%.
2. Projeto em **Stand-by** → valor herdado do último mês não Stand-by; sem valor herdado, sem medição.
3. No **mês atual/global**, projeto com **progresso manual** → usa o manual.
4. No **mês atual/global**, caso contrário → **média simples** das atividades com medição.
5. Em **meses passados abertos** → **média simples** das atividades com o progresso do mês. O progresso manual global do projeto **não** é usado como fallback do passado.
   - **Hábitos entram pela consistência 3m**, não pela aderência do mês. Em status final: `Concluída` = 100%; `Remodelada`/`Descartada` ficam fora. Em Stand-by: vale o valor herdado.
   - Atividades com status **Remodelada** ou **Descartada** ficam fora.
   - Atividades sem medição ficam fora.
6. Projeto sem nenhuma atividade medida → sem medição.

Na aba **Progresso**, no mês atual o projeto usa o **progresso manual**, se houver; caso contrário, a média das atividades com o progresso do mês. Em **meses passados abertos**, usa a **média do mês** e o manual global não entra como fallback. Um **valor salvo no mês** tem prioridade sobre o manual global naquele mês. **Para hábitos, usa sempre a consistência 3m**, em qualquer mês com cálculo permitido, exceto quando o hábito está em status final ou Stand-by. A aderência mensal do hábito aparece apenas na própria atividade. Em meses fechados, usa o snapshot salvo; se não houver snapshot, mostra “—” e não recalcula. A coluna do **Histórico** usa a mesma regra: snapshot nos meses fechados e cálculo do mês nos meses abertos (manual no mês atual).

## 6. Fechamento e reabertura de mês

- O fechamento é explícito: usar **Fechar mês**. Salvar valores não fecha o mês.
- **Projetos/atividades que ainda não existiam no mês não são gravados** no fechamento e não aparecem no editor daquele mês.
  - O projeto existe a partir do seu `startDate`. **Projeto sem `startDate` é inexistente** para fins de fechamento/histórico; a primeira atividade **não** é usada como início.
  - A atividade existe a partir do seu `startDate` ou, se não tiver, do `startDate` do projeto. Ela nunca existe antes do início do projeto.
  - Para voltar a gravar um projeto sem início, basta preencher a data de início do projeto.
- No editor de mês do Histórico, **Fechar mês** fica ao lado de **Salvar mês**: ele salva os campos editados e abre uma **prévia** com status, progresso e o **selo de origem** do progresso que serão gravados. Só o botão **Confirmar fechamento** fecha o mês. Cancelar mantém o mês aberto. Se o mês já estiver fechado, o botão fica desabilitado como **Mês fechado**; **Salvar mês** continua disponível para ajustes manuais.
- O estado fica em `closedProjectMonths`, `everClosedProjectMonths` e `closedProjectMonthsUpdatedAt` (versão 14 do estado).
- Ao fechar:
  - grava `project.history[period]` e `project.statusHistory[period]`;
  - grava `history` e `statusHistory` de cada atividade;
  - para status finais, replica o status e o progresso.
- **Projeto:** o snapshot recebe o **valor exibido no mês** (`projectProgressForMonth`). No mês atual, esse valor é o **progresso global** (inclui o manual, quando houver, e a consistência 3m dos hábitos), salvo se houver um **valor salvo manualmente no próprio mês**, que prevalece e é preservado no fechamento. Nos meses passados, é o cálculo do mês; **se não houver medição naquele mês, fica sem medição (“—”) e não usa o progresso atual nem o manual global como fallback**.
- **Hábito:** o snapshot do hábito recebe a **aderência do mês** (`habitMonthStats`), não a consistência. **Em Stand-by, o valor herdado prevalece** sobre a aderência do mês.
  - Isso significa que o snapshot do projeto pode ser diferente da média dos snapshots das atividades. O projeto guarda o valor global; o hábito guarda o valor mensal.
- **Mês passado que já foi fechado** (mesmo depois de reaberto) **não recalcula recorrência nem hábito**. Ele usa o valor salvo; se não houver valor, mostra “—”. Alterações manuais continuam permitidas e são gravadas no histórico. O marcador permanente fica em `everClosedProjectMonths`.
- Ao fechar um **mês passado aberto**, atividade ou projeto **sem medição naquele mês** ficam sem medição (“—”); não salvam o progresso atual. O mês atual continua usando o valor atual, porque é o mês corrente.
- **Mês atual fechado e depois reaberto** volta a recalcular pelas recorrências/hábitos, porque a reabertura do mês atual limpa o histórico automático e libera a edição.
- Mês passado que nunca foi fechado continua calculando normalmente.
- **Mês futuro** é apenas previsão: mostra o progresso global atual com o selo **previsão**, não é gravado no histórico e o botão **Fechar mês** fica desabilitado.
- Só o mês atual e aberto pode atualizar o histórico a partir de ocorrências (`canRecalculateTaskHistory`).
- Para editar um mês fechado, usar **Reabrir histórico**. Ao reabrir um mês atual, os valores automáticos voltam a valer; ao reabrir um mês passado, os valores ficam editáveis.
- O histórico exibe o selo **Snapshot** nos meses fechados. O selo **mês** fica restrito a meses abertos (valor registrado ou cálculo do mês ainda editável). O selo **previsão** indica mês futuro.
- No Histórico, células de meses **anteriores ao início** do projeto/atividade mostram **“—” e não abrem para edição**, inclusive no modo de edição da linha.
- **Indicadores de estado:** a barra do mês mostra **Aberto**, **Fechado**, **Já fechado**, **Reaberto** ou **Previsão**. Na matriz do Histórico, o cabeçalho usa **🔒** para mês fechado e **↺** para mês já fechado/reaberto. O seletor do editor de mês e o histórico do diálogo de edição mostram o mesmo estado.

## 7. Ocorrências e projeção da próxima data

### Visibilidade

Todas as telas usam `projectOccurrenceItems(task)`:

- todas as ocorrências reais;
- mais **uma** próxima ocorrência pendente projetada, se ainda não estiver coberta;
- a próxima não é persistida; é apenas uma projeção virtual;
- não há próxima projetada para atividade com status **Concluída**;
- uma data é considerada coberta quando coincide com a `date` ou a `expectedDate` de alguma ocorrência existente.

Isso vale para a aba **Tarefas recorrentes**, o **calendário do projeto**, as visões diária/secundária/semanal/mensal/cronograma e o diálogo do projeto.

### Âncora da recorrência

Para frequências mensal, bimestral, trimestral, semestral e anual:

1. Toma a ocorrência mais recente (pela `date`).
2. Usa a **data original** (`expectedDate`) dessa ocorrência como âncora — não a data ajustada.
3. Avança o intervalo da frequência (1, 2, 3, 6 ou 12 meses).
4. Se a data calculada ficar antes ou igual à data ajustada mais recente, avança intervalos completos até superá-la.
5. Ignora datas já cobertas e datas anteriores a hoje.
6. Se ultrapassar o `endDate`, não projeta.

Para diário, semanal e quinzenal, a âncora é a `startDate` (ou a primeira ocorrência) e os dias da semana configurados.

Exemplo: trimestral, ocorrência mais recente com original **04/01/2027** ajustada para **05/02/2027** → próxima **04/04/2027**. Registrando a de 04/04 → próxima **04/07/2027**.

### Indicadores

- Coluna **Data original** sempre visível, mesmo quando é igual à data.
- Selo **Remarcada** quando `expectedDate` difere da `date`.
- Selo **Próxima** na ocorrência virtual projetada.
- No calendário, os cards usam as classes `is-next` e `is-rescheduled` e mostram as etiquetas “próxima” e “remarcada”.
- Nas visões do app, os cards de ocorrência também mostram “Próxima” e “Remarcada”.

## 8. Histórico

- Colunas mensais usam `resolveProgress(..., {mode:'history', period})`.
- Meses fechados → **Snapshot**; sem snapshot salvo → “—”, sem recálculo.
- Meses abertos com valor salvo → **Valor do mês**.
- Projeto em mês aberto sem valor salvo → **cálculo do mês** (média das atividades; **Manual** no mês atual, quando o projeto tem progresso manual). O cálculo aparece no Histórico e no gráfico, não só na aba Progresso.
- Status final → **Status final**; sem valor registrado no encerramento, “—”, sem replicar o progresso atual.
- Stand-by → **herdado**, com o mês de origem no tooltip; sem valor herdado, “—”.
- Hábito → **Hábito** (aderência do mês, prorrateada quando for o mês atual). A consistência 3m não substitui o valor da coluna mensal. No projeto, o hábito entra pela consistência; em status final, `Concluída` = 100% e `Remodelada`/`Descartada` ficam fora; em Stand-by, vale o herdado.
- Recorrência passada → **Mês** (média das ocorrências do mês).
- “—” = sem medição.

O editor de mês e o histórico do diálogo de edição mostram o mesmo selo ao lado do valor. O editor de mês pré-preenche o valor calculado do mês aberto; o histórico do diálogo de edição mantém apenas os valores salvos, para não gravar cálculos automáticos sem intenção. Na edição de uma linha do Histórico, **Salvar sem alterar não grava os valores calculados**: só os campos alterados são persistidos.

O **gráfico de evolução** usa o mesmo intervalo e o mesmo resolvedor do Histórico. Por isso ele inclui valores herdados (Stand-by), status final e meses calculados que não têm registro próprio, inclusive o cálculo mensal do projeto em meses abertos. O resumo do gráfico indica quantos pontos são herdados/calculados.

## 9. Visões e consistência

- Configuração → Visões permite escolher as visões do app e incluir **Ocorrências de projetos** em diária, secundária, semanal, mensal e cronograma.
- A aba Recorrentes, o calendário e as visões do app compartilham `projectOccurrenceItems`, `recurringNextOccurrence` e `projectTaskNextDate`.
- Não há mais definições duplicadas de `recurringView` ou `projectCalendarView`; existe uma única função para cada tela.
- Rótulos padronizados: **Manual**, **Valor do mês**, **Snapshot**, **Status final**, **Stand-by/herdado**, **Hábito**, **Global**, **Mês**, **Média** e **Sem medição**.

## 10. Testes de regra

Checklist usado nos testes headless (Edge com perfil isolado):

| Cenário | Entrada | Resultado esperado |
| --- | --- | --- |
| Stand-by no mês atual | Status Stand-by; outubro com 42% | 42%, origem `standby`, herdado de outubro |
| Status final | Remodelada; fim 15/09/2026; histórico 63% em 09/2026 | 63% em 11/2026, origem `final` |
| Mês fechado | Histórico 55% em 10/2026; ocorrência de 99% no mesmo mês | 55%, origem `snapshot`, sem recálculo |
| Hábito no mês atual | Meta 30; 15 marcações no dia 25 | Esperado 25 → 60%, origem `habit` |
| Tela do hábito | Clicar no nome do hábito | Abre o mês completo com esperado mensal, esperado no mês, marcadas, aderência e consistência 3m |
| Tela do hábito em mês passado | Selecionar janeiro e clicar no dia 20 | Marca/desmarca o dia e atualiza o resumo e o calendário |
| Tela do hábito em mês futuro | Selecionar dezembro | Dias bloqueados; esperado mensal continua visível |
| Consistência 3m | Atual 60% ×3, anterior 80% ×2, retrasado 50% ×1 | 65%, origem `habit-consistency` |
| Fechamento de hábito | Fechar o mês atual de um hábito | Snapshot do hábito recebe a aderência do mês, não a consistência 3m |
| Fechamento de projeto | Hábito com mês 60% e consistência 65% | Snapshot do projeto recebe 65% (progresso global) |
| Projeto com hábito no mês | Hábito 60% no mês e 65% de consistência | Projeto usa 65%; a atividade mantém 60% e o selo 3m 65% |
| Projeto em mês passado aberto | Hábito out 80%, set 50%, ago 33% (consistência até out = 62%) | Projeto usa 62%; o hábito em outubro mantém 80% |
| Mês passado sem medição | Fechar mês passado sem histórico/ocorrência | Atividade e projeto ficam “—”; não salvam o progresso atual |
| Mês passado sem status | Fechar mês passado sem `statusHistory` | Status fica em branco; não usa o status atual |
| Mês atual sem status salvo | Abrir o mês atual | Usa o status atual do projeto/atividade |
| Projeto/atividade antes do início | Fechar um mês anterior ao `startDate` | Projeto/atividade não são gravados nem aparecem no editor |
| Projeto sem `startDate` | Fechar qualquer mês | Projeto e atividades ficam inexistentes; nada é gravado até definir o início do projeto |
| Edição antes do início | Abrir a edição da linha no Histórico | Células anteriores ao início ficam “—” e não editáveis |
| Prévia de fechamento | Clicar em Fechar mês | Mostra status, progresso e selo de origem do que será gravado; cancelar mantém aberto |
| Consistência no mês passado | Fechar outubro de um hábito com consistência até outubro | Projeto salva a consistência até outubro; o hábito salva a aderência de outubro |
| Mês fechado sem snapshot | Mês fechado, sem valor em `history` | “—” e nenhum recálculo de recorrência/hábito |
| Mês passado reaberto sem valor | Mês passado já fechado, reaberto e sem histórico | Continua “—” (não volta a calcular) |
| Mês atual reaberto | Mês atual fechado, depois reaberto | Volta a calcular pelas recorrências/hábitos |
| Mês futuro | Navegar para o mês seguinte | Mostra o global atual com selo **previsão**; não grava snapshot e não permite fechar |
| Indicador de fechamento | Matriz do Histórico e seletor de mês | 🔒 para fechado, ↺ para já fechado/reaberto; barra com o estado do mês |
| Fechar mês no editor | Editar janeiro no Histórico e clicar em Fechar mês | Salva os campos, fecha janeiro, grava snapshots e mostra 🔒 no cabeçalho |
| Gráfico com Stand-by | Projeto em Stand-by com último mês registrado em outubro | O gráfico inclui novembro com o valor herdado, ponto cinza e resumo “1 herdado/calculado” |
| Recorrência no mês aberto | Ocorrências 60, 90 e 30 | Média ponderada 60%, origem `recurring-global` |
| Recorrência em mês passado | Ocorrências 60 e 90 em 10/2026 | Média simples 75%, origem `recurring-month` |
| Próxima ocorrência | Última original 05/11/2026, mensal, ajustada para 07/11 | Próxima 05/12/2026 |
| Ocorrência remarcada | `expectedDate` 05/11, `date` 07/11 | Coluna original 05/11, selo “Remarcada” |
| Próxima projetada | Sem ocorrência futura | Selo “Próxima” no calendário e nas visões |
| Média do projeto | Atividades 42% e 60%; uma Remodelada | 51%, Remodelada fora do cálculo |
| Manual no mês atual | Projeto manual 80%, atividades 60% e 40% em janeiro | Lista, mês atual e fechamento atual usam 80%; janeiro passado aberto usa 50% da média |
| Status final global | Projeto Remodelada, fim 12/2025, histórico 50% | Lista e meses seguintes usam 50%, origem `final`; sem histórico, “—” |
| Histórico de mês aberto | Projeto com atividades 60% e 40% em janeiro, sem histórico | Histórico e gráfico mostram 50% em janeiro, origem `média` |
| Editar linha sem alterar | Abrir Editar na linha do projeto e Salvar | Nenhum valor calculado é gravado; o histórico salvo continua igual |
| Editar linha com alteração | Mudar novembro de 80% para 85% e Salvar | Só novembro é gravado como 85%, origem `Valor do mês` |
| Fechar mês atual com valor salvo | Salvar 85% em novembro e fechar novembro | Prévia mostra 85%; o snapshot mantém 85%, origem `snapshot`, sem sobrescrever com o global |
| Stand-by sem herança | Item Stand-by sem valor no mês anterior | “Sem medição” na Lista, no mês e no Histórico |
| Stand-by no fechamento | Hábito Stand-by com herdado 80% e aderência 50% no mês | Prévia e snapshot usam 80% herdado; a aderência não prevalece |
| Sem medição | Sem histórico, sem progresso manual, sem ocorrências | “Sem medição” |

Também foi feita uma comparação automatizada entre a versão anterior e a nova, com o mesmo estado salvo:

- 54 cartões de projeto na aba Progresso;
- 54 linhas na aba Lista;
- 44 linhas na aba Recorrentes;
- 244 linhas na matriz do Histórico.

Na comparação da versão anterior à consistência de hábitos, nenhuma diferença de valor foi encontrada; as diferenças ficaram restritas aos selos de origem e às etiquetas de ocorrência. A partir da versão com consistência 3m, os hábitos podem divergir intencionalmente do cálculo antigo (mês prorrateado + consistência).

## 11. Onde mexer

| Regra | Local |
| --- | --- |
| Resolvedor e origens | `app.js` → `resolveProgress`, `PROGRESS_ORIGIN_META` |
| Fechamento/reabertura | `closeProjectMonth`, `reopenProjectMonthHistory`, `projectMonthFrozen`, `everClosedProjectMonths` |
| Próxima ocorrência | `projectTaskNextDate`, `projectOccurrenceItems` |
| Aba Recorrentes | `recurringView` |
| Calendário | `projectCalendarView` |
| Visões do app | `projectOccurrenceEntriesForDate`, `projectOccurrenceCard` |
| Histórico | `projectHistoryAllView`, `openProjectMonthEditor`, `renderHistoryEditor` |
