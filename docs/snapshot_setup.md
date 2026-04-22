# Snapshot Governance Setup: Veritas Village

Este guia detalha como configurar a integração da DAO off-chain no [Snapshot](https://snapshot.org) utilizando contratos implantados na Rootstock (RSK) Testnet.

## Pré-requisitos

- Contratos deployados na RSK Testnet (veja `scripts/deploy.js`)
- Endereço do `VeritasMemberNFT` em mãos
- Carteira MetaMask configurada para RSK Testnet
- Pelo menos 1 NFT mintado

## 1. Configurando MetaMask para RSK Testnet

| Campo | Valor |
|---|---|
| Network Name | RSK Testnet |
| RPC URL | `https://public-node.testnet.rsk.co` |
| Chain ID | `31` |
| Symbol | `tRBTC` |
| Explorer | `https://explorer.testnet.rsk.co` |

## 2. Criando o Space no Snapshot

1. Acesse o [Snapshot](https://snapshot.org) e clique em **"Create a space"**.
2. Conecte sua carteira (não precisa de ENS na testnet).
3. Configure:
   - **Name:** `Veritas Village HOA`
   - **Symbol:** `VNFT`
   - **Network:** Selecione `Rootstock Testnet` (Chain ID `31`)

## 3. Configuração da Estratégia (Strategy)

A estratégia determina como o Snapshot calcula o poder de voto.  
**No nosso caso: 1 NFT = 1 Voto.**

1. Vá para **Settings → Strategies** e clique em **"Add strategy"**.
2. Busque pela estratégia **`erc721`**.
3. Configure com o JSON:

```json
{
  "address": "<ENDERECO_DO_VERITAS_MEMBER_NFT>",
  "symbol": "VNFT",
  "decimals": 0
}
```

4. Salve as configurações.

> **Nota:** Como um NFT é indivisível, `decimals: 0` garante a proporção 1:1 no snapshot.

## 4. Criando uma Proposta de Teste

1. No seu Space, clique em **"New Proposal"**.
2. Preencha:
   - **Title:** `[TESTE] Aprovação do Orçamento Q2 2026`
   - **Description:** Descrição da proposta
   - **Choices:** `A Favor`, `Contra`, `Abstenção`
   - **Voting Period:** Defina início e fim
3. Publique a proposta.

> O Snapshot captura o saldo de NFTs no bloco em que a proposta foi criada ("snapshot block"). Apenas holders naquele momento podem votar.

## 5. Votando

1. Conecte sua carteira na rede RSK Testnet.
2. Acesse a proposta.
3. Escolha sua opção e assine a transação (gasless — é uma assinatura EIP-712).

## 6. Integrando com o Monitor

Após criar uma proposta, copie o ID (hash) da proposta e configure no `.env`:

```env
PROPOSAL_ID=0xabc123...
```

Execute o monitor para cruzar dados:

```bash
python scripts/monitor.py
```

O monitor vai:
- Listar todos os proprietários e seu status de pagamento
- Consultar quem votou na proposta via GraphQL
- Alertar se algum inadimplente votou

## 7. Troubleshooting

| Problema | Solução |
|---|---|
| "Network not supported" | Verifique se selecionou RSK Testnet (Chain ID 31) |
| Voting power = 0 | NFT foi mintado após o snapshot block da proposta |
| Space não aparece | Pode demorar alguns minutos para indexar |
| Erro de RPC | Tente alternar o RPC URL para `https://public-node.testnet.rsk.co` |

## Próximos Passos

Após esta configuração:
1. Mintar NFTs para membros reais com `scripts/interact.js`
2. Criar propostas de governança
3. Executar o monitor periodicamente para compliance
4. Considerar integração com Gnosis Safe para multisig do Conselho
