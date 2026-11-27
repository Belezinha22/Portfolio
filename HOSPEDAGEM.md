# Preparar autenticação e hospedagem

O portfólio fica público para visitantes. Adicionar, editar e remover registros requer sua sessão autenticada, e o Supabase também bloqueia essas operações no banco e no Storage para qualquer outro usuário.

## 1. Criar o administrador no Supabase

1. Crie um projeto no [Supabase](https://supabase.com/).
2. Em **Authentication > Users**, crie seu usuário com seu email e uma senha forte. Não habilite cadastro público.
3. Copie o UUID desse usuário.
4. Abra `supabase-setup.sql`, substitua todas as ocorrências de `UUID_DO_ADMIN` pelo UUID e execute o script no **SQL Editor** do Supabase.
5. No `supabase-config.js`, preencha também `adminUserId` com o mesmo UUID. Isso oculta controles administrativos para outras sessões; as políticas SQL continuam sendo a proteção real.
6. Em **Authentication > Providers > Email**, mantenha desativado o cadastro aberto. Crie outros usuários somente se desejar, mas as políticas continuarão permitindo alterações apenas para o UUID definido no SQL.

## 2. Conectar o site

1. No Supabase, copie o **Project URL** e a **publishable key** em **Project Settings > API Keys**.
2. Preencha `supabase-config.js` com os três valores: Project URL, publishable key e UUID de administrador.
3. Para publicação estática, URL, publishable key e UUID podem ser públicos. Nunca use `secret` ou `service_role` no navegador.

## 3. Publicar

Publique `index.html`, `styles.css`, `app.js`, `supabase-config.js` e qualquer outro arquivo estático no provedor de hospedagem. Cadastre o domínio publicado em **Authentication > URL Configuration > Site URL** e Redirect URLs.

Após publicar, teste a página anônima e o login do administrador. A página mostra os certificados publicamente; a área de administração aparece após autenticação.

## Habilitar envio de PDFs

Como o bucket do Supabase já foi configurado, execute uma vez o conteúdo de `supabase-pdf-setup.sql` no **SQL Editor**. Isso permite arquivos PDF de até 10 MB; imagens continuam limitadas a 4 MB. O PDF aparece na visualização detalhada e pode ser aberto em tamanho completo.
