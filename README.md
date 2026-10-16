# Financeiro COSTALOG

Painel financeiro React/Vite com backend Express para consultar o DSS. As credenciais do DSS e a senha de acesso ao painel devem existir somente nas variáveis secretas do servidor.

## Desenvolvimento local

1. Instale Node.js 20 ou superior.
2. Execute `npm install`.
3. Crie um arquivo `.env` local com as variáveis listadas em `.env.example`.
4. Execute `npm run dev`.
5. Acesse o endereço local exibido pelo Vite/Express.

## Hospedagem de produção

Este projeto precisa ser hospedado como **serviço Node.js**, porque o painel depende das rotas Express `/api/financeiro/auth` e `/api/financeiro/dss`. O GitHub Pages não executa o backend e, sozinho, não serve para esta aplicação.

O arquivo `render.yaml` define uma configuração inicial para o Render. Ao criar o serviço:

1. Configure `FINANCE_ACCESS_PASSWORD` com uma senha longa e exclusiva.
2. Configure `DSS_BASE_URL` como `https://costalog.dssinformatica.com.br/wsdss/` (confirme o caminho com a documentação do DSS).
3. Preencha `DSS_USER`, `DSS_PASSWORD` e `DSS_DATABASE` com as credenciais fornecidas pelo administrador do DSS.
4. Cadastre os segredos no painel do provedor, nunca no GitHub nem em variáveis `VITE_*`.
5. Após o deploy, valide o login e consulte um período pequeno de contas a pagar e receber.

## Segurança

- A API financeira exige autenticação e falha fechada se `FINANCE_ACCESS_PASSWORD` não estiver configurada.
- O login cria um cookie `HttpOnly`, `SameSite=Strict` e, em produção, `Secure`.
- O backend aceita somente os endpoints DSS explicitamente permitidos.
- Troque quaisquer credenciais que já tenham sido expostas em commits anteriores; apagar valores do arquivo atual não os remove do histórico do Git.

## Scripts

- `npm run dev`: servidor de desenvolvimento.
- `npm run build`: gera o frontend em `dist`.
- `npm start`: inicia o servidor Express para produção.
- `npm run lint`: executa a checagem TypeScript.

> O deploy e as consultas reais ao DSS ainda precisam ser testados antes de considerar o sistema pronto para produção.
