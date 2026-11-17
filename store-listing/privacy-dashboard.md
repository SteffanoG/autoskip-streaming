# Rascunho para a aba Privacy practices

Preencher os campos do Developer Dashboard com estes dados, conferindo-os com o comportamento da versão enviada:

## Single purpose

Localizar controles de pular aberturas/resumos e avançar episódios nos serviços de streaming compatíveis, executando apenas as ações habilitadas pelo usuário.

## Permission justification

- `storage`: salvar no armazenamento local do Chrome as três preferências do popup. Nenhuma preferência é transmitida.
- Acesso aos domínios listados em `content_scripts.matches`: ler rótulos e atributos acessíveis de controles de reprodução e clicar nos controles correspondentes às preferências do usuário. A extensão não observa outros sites.

## Remote code

Não executa código remoto.

## Data use / disclosure

Divulgar claramente que a extensão processa localmente o domínio e rótulos/atributos dos controles de reprodução nas páginas compatíveis, apenas para a função principal. Não retém nem transmite esses dados. As preferências são gravadas localmente via `chrome.storage.local`. Não há analytics, venda nem transmissão direta a servidores próprios/terceiros.

O campo de sugestão prepara um e-mail para `autoskipstreamings@outlook.com`; a pessoa revisa e decide se envia pelo aplicativo/provedor de e-mail. A extensão não armazena o texto. Descrever o nome do serviço sugerido como conteúdo opcional fornecido pelo usuário e refletir esse fluxo na categoria de dados do Dashboard se aplicável.

O Dashboard pede seleção de categorias de dados. Como a extensão acessa conteúdo da página e o domínio para executar uma função descrita ao usuário, revisar as categorias “website content” e “web browsing activity” na interface e declará-las de forma consistente com a política publicada. Não marcar “nenhum dado” sem confirmar que a classificação do formulário trata acesso transitório local como uso/handling.

Certificar Limited Use somente após confirmar que a política pública está no ar e que listing, UI, código e declarações dizem a mesma coisa.

## Ainda depende do publicador

- Publicar `privacy-policy.html` em URL HTTPS pública e inserir essa URL no Dashboard.
- Informar nome do desenvolvedor e contato/site de suporte; e-mail público de suporte definido: `autoskipstreamings@outlook.com`.
- Confirmar mercados/países, visibilidade e conta de publicador.
