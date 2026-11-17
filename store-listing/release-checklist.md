# Checklist de envio — Chrome Web Store

## Materiais locais prontos

- [x] ZIP limpo com manifesto na raiz, script, popup e ícone
- [x] Ícone PNG 128×128
- [x] Imagem promocional PNG 440×280
- [x] Screenshots PNG 1280×800 em pt-BR e inglês
- [x] Tiles promocionais PNG 440×280 em pt-BR e inglês
- [x] Nome, resumo e descrição em `listing-pt-BR.md` e `listing-en.md`
- [x] Popup localizado em pt-BR e inglês
- [x] Rascunho de finalidade, permissões e declaração de privacidade em `privacy-dashboard.md`
- [x] Política de privacidade preparada em `../privacy-policy.html`
- [x] Testes locais para plataformas simuladas e preferências do popup
- [x] Hub mostra ícones/wordmarks e nomes dos cinco domínios cobertos
- [x] Caixa de sugestões no popup prepara e-mail para revisão e envio pelo usuário

## Ações no Developer Dashboard

- [ ] Criar/verificar a conta do publicador e informar nome do desenvolvedor
- [ ] Hospedar `privacy-policy.html` e `privacy-policy.en.html` em URLs públicas HTTPS e informar o contato/site de suporte
- [ ] Enviar o ZIP de `dist/` como rascunho
- [ ] Cadastrar listings pt-BR e inglês, screenshots, tiles promocionais e URLs
- [ ] Declarar no formulário Privacy practices o processamento local de domínio e rótulos/atributos da página, coerente com a política
- [ ] Justificar `storage` e o acesso aos domínios específicos; declarar que não executa código remoto
- [ ] Selecionar categoria Entretenimento e mercados pretendidos
- [ ] Instalar a build empacotada e validar em sessões reais nos serviços antes de submeter para revisão
- [ ] Submeter para revisão e acompanhar eventuais pedidos do Chrome Web Store

## Nota sobre evidência

Os testes usam controles simulados em páginas locais; não provam compatibilidade com as páginas autenticadas nem estabilidade dos seletores nos serviços reais.
