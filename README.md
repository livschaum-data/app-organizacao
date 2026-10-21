# Âncora — acompanhamento de rotina diária

Aplicativo estático, preparado para hospedagem no GitHub Pages. Rotinas, âncoras, áreas e histórico ficam no navegador e podem ser sincronizados entre dispositivos com Supabase Auth e uma tabela JSONB protegida por RLS.

O menu lateral reúne Visão diária, Âncoras e Rotinas. A visão diária mostra blocos editáveis de Tema do dia, Casa, Lazer, Estudos, Movimento e Extras, além das rotinas da data. As âncoras pré-cadastradas foram transcritas dos exemplos fornecidos e podem ter nome, ícone, área, descrição, dias da semana e período editados. Áreas também podem ser criadas, renomeadas, coloridas, reordenadas e excluídas quando vazias. Todos esses cadastros usam a mesma sincronização das rotinas.

No computador, o botão no cabeçalho recolhe ou expande o menu lateral e lembra a escolha neste navegador. Na Visão diária, as áreas ficam à esquerda e as rotinas ocupam uma coluna inteira à direita; no celular, os blocos ficam em sequência.

## Configurar sincronização

1. O app já aponta para o mesmo projeto Supabase usado por Cardápio, Despensa e Vestuário, com a chave pública do navegador. A tabela do aplicativo Âncora é separada das tabelas desses aplicativos.
2. Se a tabela ainda não existir, execute [`supabase.sql`](supabase.sql) no SQL Editor do projeto para criar a tabela e suas regras de acesso.
3. Use o mesmo login dos outros aplicativos ou crie uma conta pelo painel de sincronização. Para publicar no GitHub Pages, cadastre o endereço publicado nas URLs permitidas de autenticação do Supabase.
4. Publique estes arquivos como site estático no GitHub Pages.

Até a tabela estar criada ou quando a conexão falhar, o app continua guardando alterações neste navegador. O painel mostra as alterações pendentes e a última sincronização confirmada.

## Histórico e CSV

O app grava automaticamente um registro de cada rotina e de cada passo por data, inclusive itens que ficaram pendentes. “Concluir meu dia” finaliza o registro daquele dia, marcando itens ainda abertos como não realizados. A seção Histórico permite rever cada data e baixar o histórico completo em CSV, em UTF-8.

Cada rotina e passo pode ter uma descrição opcional. Ao abrir uma data do histórico, use “Remover deste dia” diretamente no cartão da rotina; a programação dos demais dias continua igual. A remoção também é sincronizada entre dispositivos e os registros removidos deixam de aparecer no CSV.

Cada rotina também pode ter um horário agendado opcional. Em “Meu dia”, as rotinas com horário aparecem em ordem cronológica, seguidas pelas rotinas sem horário. O horário é incluído no histórico exportado em CSV.

## Visão diária e resumo

Na Visão diária, o seletor Blocos/Cronograma alterna entre os cartões existentes e uma linha do tempo com as rotinas e tarefas que têm horário sugerido. A duração de cada bloco pode ser ajustada na edição da rotina ou tarefa; quando não informada, vale 45 minutos. Âncoras e itens sem horário ficam disponíveis acima da linha do tempo. A escolha do formato é lembrada neste navegador.

As anotações pertencem à data aberta na Visão diária, são salvas automaticamente e seguem a mesma sincronização em nuvem dos demais dados. Também entram na exportação CSV do histórico de rotinas, inclusive quando a data tem apenas anotação.

O Resumo mostra, por mês e por semana, quantos dias têm rotinas ou tarefas pendentes. As semanas podem ser expandidas para abrir diretamente a data correspondente. Datas passadas incompletas aparecem em vermelho nas visões diária, semanal e no histórico. O acompanhamento começa na primeira data com registros existentes; dias anteriores não são contados como pendentes.
