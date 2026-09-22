# Auditoria da integração com o Metabase (antes do deploy on-premise)

Revisão somente de leitura do código atual. Abaixo, o que impede a publicação, por ordem de gravidade.

## 1. BLOQUEADOR — os nomes de coluna do Metabase não são reconhecidos

A leitura usa o mesmo mapeamento de colunas criado para a planilha SHIFT (`src/lib/import-normalize.ts`). Nenhum lugar do projeto cita `Conta_Nivel1`, `CodItem_Nivel5`, `SaldoOR` ou `SaldoRC` (busca feita em todo o repositório). Resultado esperado hoje:

| Campo da fonte | Situação atual |
| --- | --- |
| `CodEmpresa`, `Ano`, `Mes`, `CodCentroCusto`, `CentroCusto`, `Conta` | reconhecidos |
| `ItemContabil` | reconhecido (por coincidência, pelo apelido genérico "item") |
| `Conta_Nivel1` → origem | **não reconhecido** — a importação aborta com "Colunas obrigatórias ausentes: Origem" |
| `SaldoOR` → previsto | **não reconhecido** |
| `SaldoRC` → realizado | **não reconhecido** — aborta com "Previsto e/ou Realizado" |
| `CodConta` → codConta | **não reconhecido** (os apelidos só cobrem "cod conta", com espaço) |
| `CodItem_Nivel5` + 2 últimos dígitos de `CodItem` → codItemContabil | **não existe** nenhuma regra de derivação |

Risco adicional: `Conta_Nivel1` contém a palavra "conta" e pode ser capturada como a coluna de conta contábil se a coluna `Conta` mudar de nome. Ou seja, hoje o botão "Atualizar base de dados" não importa nada do Metabase, e no pior caso importaria valores errados.

**Correção necessária:** criar um mapeamento explícito e exclusivo da fonte Metabase (nome de coluna → campo), independente dos apelidos de planilha, incluindo:
- `Conta_Nivel1` = "DESPESAS" → `DESPESA`; "RECEITAS" → `RECEITA`; qualquer outro valor rejeita a linha;
- `codItemContabil` = `CodItem_Nivel5` + os 2 últimos dígitos de `CodItem`, com validação (se `CodItem` tiver menos de 2 dígitos ou `CodItem_Nivel5` estiver vazio, rejeitar a linha em vez de gerar código truncado);
- `SaldoOR`/`SaldoRC` convertidos pela validação numérica rigorosa já existente;
- falha explícita e nomeada quando qualquer coluna obrigatória faltar na resposta do Metabase.

## 2. ALTO — a importação XLSX de contingência foi removida

`src/routes/api/importar.ts` hoje só busca o Metabase; não aceita mais envio de arquivo, e `src/lib/import-local.ts` também perdeu a leitura de arquivo (a biblioteca `xlsx` continua instalada, mas sem uso). Se o Metabase estiver fora do ar, não há como carregar a base.

**Correção necessária:** manter as duas fontes — sem corpo na requisição, importa do Metabase; com arquivo `.xlsx` enviado, usa o caminho da planilha (limite de 50 MB, validação atual). O mesmo vale para o modo pré-visualização.

## 3. ALTO — agregação sem ano/empresa na chave (`import-local.ts`)

Confirmado: a chave de agregação é `origem|mes|cc|item|conta` e o payload guarda `ano`/`empresa` do **último** registro lido. Com a carga histórica de 5 anos, os valores de anos diferentes seriam somados no mesmo mês e o painel mostraria um único ano rotulado erroneamente.

**Correção necessária:** incluir `ano` (e `codEmpresa`) na chave e filtrar o payload pelo exercício exibido. Observação: o mesmo limite existe no painel como um todo — `dash_sesi.vw_fatos` é lido por um único ano (`src/lib/db.server.ts`), o que é correto para exibição, mas a tela não oferece escolha de exercício.

## 4. MÉDIO — carga histórica de 5 anos

O gravador já substitui apenas os anos recebidos (`DELETE ... WHERE ano = ANY(...)`), então a carga multi-ano é segura no banco. Dois pontos a ajustar:
- `dash_sesi.importacoes` grava só `anos[0]`; com 5 anos o registro fica incompleto (registrar a lista de anos ou o intervalo).
- A validação "tudo ou nada" continua válida, mas a carga de 5 anos exige tempo de resposta maior: o tempo-limite de leitura do Metabase é de 120 s e o painel não mostra progresso. Confirmar volume esperado e, se necessário, elevar o limite e enviar em lotes maiores.
- Se a fonte histórica vier por um link diferente do endpoint anual, será preciso permitir informar a URL de carga (variável de ambiente ou parâmetro), já que hoje existe apenas `METABASE_JSON_URL`.

## 5. MÉDIO — `NODE_TLS_REJECT_UNAUTHORIZED` global

Em `src/lib/metabase.server.ts` a variável é definida no processo inteiro quando `METABASE_TLS_INSECURE=true`. Isso desativa a verificação de certificado de **todas** as conexões do servidor (PostgreSQL, n8n, qualquer chamada externa) e permanece ativa para sempre.

**Correção necessária:** restringir a exceção ao Metabase, usando um agente HTTPS dedicado a esse host, e manter a verificação ativa no restante do sistema. Alternativa preferível: instalar a cadeia do certificado interno no servidor e não usar a exceção.

## 6. BAIXO — pontos de higiene

- Contas `310101` são excluídas na origem; nada no painel documenta isso. Vale exibir a observação na tela de atualização para evitar dúvidas na conferência.
- `/api/metabase` responde `200` com `ok:false` quando a consulta falha; funciona, mas dificulta monitoramento. Sugestão: manter `200` para a interface e registrar a falha no log com o status real do Metabase.
- O texto da tela "Atualização da Base" ainda descreve as colunas da planilha antiga; deve refletir a origem Metabase e a contingência por arquivo.

## Ordem sugerida antes do deploy

1. Mapeamento explícito Metabase + derivação do código de item (item 1).
2. Reativar a contingência XLSX (item 2).
3. Corrigir a chave de agregação com ano/empresa (item 3).
4. Ajustes de carga histórica e registro de anos (item 4).
5. TLS restrito ao host do Metabase (item 5).
6. Textos e observações (item 6).

## Perguntas em aberto

- A carga histórica de 5 anos virá do mesmo link ou de um arquivo/consulta separada?
- O painel precisa de um seletor de exercício para consultar os anos anteriores, ou só o ano corrente será exibido?
