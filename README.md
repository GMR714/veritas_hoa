# Veritas Village HOA System

> 🏘️ Sistema de Gestão de Condomínio (HOA) on-chain para a comunidade Veritas Village, construído sobre Rootstock (RSK) Testnet com Dashboard 3D Imersivo.

## 🚀 Como Rodar (Quick Start)

Para inicializar o projeto completo (Contratos + Dashboard 3D):

```bash
# 1. Instalar dependências
npm install

# 2. Compilar os contratos
npx hardhat compile

# 3. Iniciar o Dashboard 3D (Acesse http://localhost:8080)
python -m http.server 8080 --directory frontend

# 4. Rodar a Simulação de Governança (RSK Testnet)
npx hardhat run scripts/simulate_governance.js --network rskTestnet
```

## Visão Geral

O sistema combina **governança off-chain** (Snapshot) com **arrecadação on-chain** (Smart Contracts) para gerenciar um condomínio descentralizado:

- **VeritasMemberNFT (ERC-721)** — Cada NFT representa um lote/casa. 1 NFT = 1 Voto.
- **VeritasTreasury** — Coleta taxas condominiais em tRBTC e rastreia adimplência.
- **Snapshot** — Votação off-chain gasless, ponderada pelo saldo de NFTs.
- **Monitor Python** — Dashboard CLI para verificar inadimplência e cruzar com dados de governança.

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Smart Contracts | Solidity 0.8.20 + OpenZeppelin v5 |
| Framework | Hardhat |
| Rede | Rootstock Testnet (Chain ID 31) |
| Governança | Snapshot (erc721 strategy) |
| Monitor | Python 3 + Web3.py |

## Estrutura do Projeto

```
Verita/
├── contracts/
│   ├── VeritasMemberNFT.sol    # ERC-721 — Membership NFT
│   └── VeritasTreasury.sol     # Treasury — Coleta de taxas
├── scripts/
│   ├── deploy.js               # Script de deploy (Hardhat)
│   ├── interact.js             # Demo interativo pós-deploy
│   ├── monitor.py              # Dashboard de monitoramento
│   └── requirements.txt        # Dependências Python
├── test/
│   ├── VeritasMemberNFT.test.js
│   └── VeritasTreasury.test.js
├── docs/
│   └── snapshot_setup.md       # Guia de configuração do Snapshot
├── hardhat.config.js
├── package.json
└── .env                        # Configurações (não commitar!)
```

## Quick Start

### 1. Instalar Dependências

```bash
# Node.js
npm install

# Python (para o monitor)
pip install -r scripts/requirements.txt
```

### 2. Configurar Environment

Copie e edite o arquivo `.env`:

```env
RPC_URL=https://public-node.testnet.rsk.co
PRIVATE_KEY=sua_private_key_aqui_0x...
NFT_ADDRESS=
TREASURY_ADDRESS=
PROPOSAL_ID=
```

> ⚠️ **Nunca commite sua PRIVATE_KEY.** O `.env` está no `.gitignore`.

### 3. Compilar Smart Contracts

```bash
npx hardhat compile
```

### 4. Rodar Testes

```bash
npx hardhat test
```

Resultado esperado: **28 testes passando** cobrindo:
- Deploy e ownership
- Minting de NFTs com permissões
- Pagamento de taxas com validações
- Checagem de inadimplência com time-travel
- Saque de fundos pelo conselho
- Cenário de ciclo completo

### 5. Deploy na RSK Testnet

```bash
# Certifique-se de ter tRBTC na conta
# Faucet: https://faucet.rsk.co/

npx hardhat run scripts/deploy.js --network rskTestnet
```

Copie os endereços gerados para o `.env`.

### 6. Interagir com os Contratos

```bash
# Demo local (deploy automatico)
npx hardhat run scripts/interact.js --network localhost

# Na testnet (usa endereços do .env)
npx hardhat run scripts/interact.js --network rskTestnet
```

### 7. Monitorar Inadimplência

```bash
# Padrão: 30 dias de threshold
python scripts/monitor.py

# Customizar threshold
python scripts/monitor.py --days 60

# Exportar relatório JSON
python scripts/monitor.py --export relatorio.json

# Sem consulta ao Snapshot
python scripts/monitor.py --no-snapshot
```

## Smart Contracts

### VeritasMemberNFT.sol

| Função | Acesso | Descrição |
|---|---|---|
| `safeMint(to)` | Owner | Cria NFT para um membro |
| `totalSupply()` | Público | Total de NFTs mintados |
| `ownerOf(tokenId)` | Público | Dono de um NFT específico |
| `transferFrom(from, to, id)` | Dono | Transferir propriedade |

### VeritasTreasury.sol

| Função | Acesso | Descrição |
|---|---|---|
| `payDues(nftId)` | Dono do NFT | Pagar taxa (envia tRBTC) |
| `setMinDues(amount)` | Owner | Definir taxa mínima |
| `isDelinquent(nftId, days)` | Público | Verificar inadimplência |
| `withdraw()` | Owner | Sacar fundos |
| `getBalance()` | Público | Saldo do contrato |
| `lastPaidTimestamp(nftId)` | Público | Último pagamento |
| `minDuesAmount()` | Público | Taxa mínima atual |

## Governança (Snapshot)

Consulte o guia completo em [`docs/snapshot_setup.md`](docs/snapshot_setup.md).

**Resumo:**
1. Crie um Space no [Snapshot](https://snapshot.org)
2. Configure a rede como RSK Testnet (Chain ID 31)
3. Use a strategy `erc721` apontando para o endereço do `VeritasMemberNFT`
4. 1 NFT = 1 Voto

## Roadmap

- [x] Smart Contracts (NFT + Treasury)
- [x] Testes unitários (28 testes)
- [x] Script de deploy
- [x] Script de interação
- [x] Monitor de inadimplência (Python)
- [x] Guia do Snapshot
- [ ] Frontend web (dashboard visual)
- [ ] Integração com multisig (Gnosis Safe)
- [ ] Alertas automáticos (e-mail/Telegram)
- [ ] Deploy em mainnet RSK

## Licença

MIT
