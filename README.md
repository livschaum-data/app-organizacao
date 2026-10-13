# Âncora — acompanhamento de rotina diária

Aplicativo estático, preparado para hospedagem no GitHub Pages. Rotinas e histórico ficam no navegador e podem ser sincronizados entre dispositivos com Supabase Auth e uma tabela JSONB protegida por RLS.

## Configurar sincronização

1. O app já aponta para o mesmo projeto Supabase usado por Cardápio, Despensa e Vestuário, com a chave pública do navegador. A tabela do aplicativo Âncora é separada das tabelas desses aplicativos.
2. No SQL Editor desse projeto, execute [`supabase.sql`](supabase.sql) para criar a tabela e suas regras de acesso. Esse passo ainda precisa ser feito no painel Supabase.
3. Use o mesmo login dos outros aplicativos ou crie uma conta pelo painel de sincronização. Para publicar no GitHub Pages, cadastre o endereço publicado nas URLs permitidas de autenticação do Supabase.
4. Publique estes arquivos como site estático no GitHub Pages.

Até a tabela estar criada ou quando a conexão falhar, o app continua guardando alterações neste navegador. O painel mostra as alterações pendentes e a última sincronização confirmada.

## Histórico e CSV

O app grava automaticamente um registro de cada rotina e de cada passo por data, inclusive itens que ficaram pendentes. “Concluir meu dia” finaliza o registro daquele dia, marcando itens ainda abertos como não realizados. A seção Histórico permite rever cada data e baixar o histórico completo em CSV, em UTF-8.

Cada rotina e passo pode ter uma descrição opcional. Ao abrir uma data do histórico, use “Remover deste dia” diretamente no cartão da rotina; a programação dos demais dias continua igual. A remoção também é sincronizada entre dispositivos e os registros removidos deixam de aparecer no CSV.

Cada rotina também pode ter um horário agendado opcional. Em “Meu dia”, as rotinas com horário aparecem em ordem cronológica, seguidas pelas rotinas sem horário. O horário é incluído no histórico exportado em CSV.
