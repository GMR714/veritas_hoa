"""
Veritas Village HOA — Monitor de Inadimplência + Governança

Uso:
    python scripts/monitor.py
    python scripts/monitor.py --days 60
    python scripts/monitor.py --export report.json

Funcionalidades:
    - Conecta à RSK Testnet via RPC
    - Lista todos os NFTs e seus status de pagamento
    - Identifica proprietários inadimplentes
    - Consulta votantes de propostas ativas no Snapshot
    - Cruza dados: inadimplentes que votaram
    - Exporta relatório em JSON (opcional)
"""

import argparse
import json
import sys
import time
from datetime import datetime, timedelta

import requests
from web3 import Web3

import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# ─── Configurações ─────────────────────────────────────────────────
RPC_URL = os.getenv("RPC_URL", "https://public-node.testnet.rsk.co")
TREASURY_ADDRESS = os.getenv("TREASURY_ADDRESS", "")
NFT_ADDRESS = os.getenv("NFT_ADDRESS", "")
SNAPSHOT_GRAPHQL_URL = "https://hub.snapshot.org/graphql"
PROPOSAL_ID = os.getenv(
    "PROPOSAL_ID",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
)

# ─── ABIs Mínimas ──────────────────────────────────────────────────
TREASURY_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "lastPaidTimestamp",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "nftId", "type": "uint256"},
            {"internalType": "uint256", "name": "daysThreshold", "type": "uint256"},
        ],
        "name": "isDelinquent",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getBalance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "minDuesAmount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

NFT_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

# ─── Cores ANSI ────────────────────────────────────────────────────
class C:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    MAGENTA = "\033[95m"
    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"


def header(text):
    width = 62
    try:
        line = "═" * width
        print(f"\n{C.CYAN}{C.BOLD}{line}{C.RESET}")
    except UnicodeEncodeError:
        line = "=" * width
        print(f"\n{C.CYAN}{C.BOLD}{line}{C.RESET}")
    print(f"{C.CYAN}{C.BOLD}  {text}{C.RESET}")
    try:
        line = "═" * width
        print(f"{C.CYAN}{C.BOLD}{line}{C.RESET}")
    except UnicodeEncodeError:
        line = "=" * width
        print(f"{C.CYAN}{C.BOLD}{line}{C.RESET}")


def section(text):
    try:
        line = "──"
        trail = "─" * (55 - len(text))
        print(f"\n{C.BLUE}{C.BOLD}{line} {text} {trail}{C.RESET}")
    except UnicodeEncodeError:
        print(f"\n{C.BLUE}{C.BOLD}-- {text} {'-' * (55 - len(text))}{C.RESET}")


def ok(text):
    try:
        print(f"  {C.GREEN}✅ {text}{C.RESET}")
    except UnicodeEncodeError:
        print(f"  {C.GREEN}[OK] {text}{C.RESET}")


def warn(text):
    try:
        print(f"  {C.YELLOW}⚠️  {text}{C.RESET}")
    except UnicodeEncodeError:
        print(f"  {C.YELLOW}[!] {text}{C.RESET}")


def error(text):
    try:
        print(f"  {C.RED}❌ {text}{C.RESET}")
    except UnicodeEncodeError:
        print(f"  {C.RED}[X] {text}{C.RESET}")


def info(text):
    print(f"  {C.DIM}{text}{C.RESET}")


# ─── Snapshot GraphQL ──────────────────────────────────────────────
def get_snapshot_proposal(proposal_id):
    """Obtém detalhes de uma proposta do Snapshot."""
    query = """
    query Proposal($id: String!) {
      proposal(id: $id) {
        id
        title
        state
        choices
        scores
        scores_total
        votes
        start
        end
      }
    }
    """
    try:
        response = requests.post(
            SNAPSHOT_GRAPHQL_URL,
            json={"query": query, "variables": {"id": proposal_id}},
            timeout=10,
        )
        if response.status_code == 200:
            data = response.json()
            if "data" in data and data["data"].get("proposal"):
                return data["data"]["proposal"]
    except Exception as e:
        warn(f"Erro ao consultar proposta no Snapshot: {e}")
    return None


def get_snapshot_voters(proposal_id):
    """Obtém endereços que votaram em uma proposta do Snapshot."""
    query = """
    query Votes($id: String!) {
      votes(
        first: 1000
        skip: 0
        where: { proposal: $id }
        orderBy: "created"
        orderDirection: desc
      ) {
        voter
        choice
        vp
        created
      }
    }
    """
    try:
        response = requests.post(
            SNAPSHOT_GRAPHQL_URL,
            json={"query": query, "variables": {"id": proposal_id}},
            timeout=10,
        )
        if response.status_code == 200:
            data = response.json()
            if "data" in data and "votes" in data["data"]:
                return data["data"]["votes"]
    except Exception as e:
        warn(f"Erro ao consultar votos no Snapshot: {e}")
    return []


# ─── Core Logic ────────────────────────────────────────────────────
def scan_members(nft, treasury, days_threshold):
    """Escaneia todos os NFTs e retorna dados de membros."""
    members = []
    current_time = int(time.time())
    threshold_seconds = days_threshold * 24 * 3600

    try:
        total = nft.functions.totalSupply().call()
    except Exception:
        # Fallback: iterar até ownerOf reverter
        total = None

    nft_id = 1
    max_id = total if total else 9999

    while nft_id <= max_id:
        try:
            owner = nft.functions.ownerOf(nft_id).call()
            last_paid = treasury.functions.lastPaidTimestamp(nft_id).call()

            if last_paid == 0:
                status = "NUNCA PAGOU"
                is_delinquent = True
                days_overdue = "INF"
            elif current_time - last_paid > threshold_seconds:
                status = "INADIMPLENTE"
                is_delinquent = True
                days_overdue = (current_time - last_paid) // 86400
            else:
                status = "EM DIA"
                is_delinquent = False
                days_ago = (current_time - last_paid) // 86400
                days_overdue = f"-{days_ago}d"

            members.append(
                {
                    "nft_id": nft_id,
                    "owner": owner,
                    "owner_short": f"{owner[:6]}...{owner[-4:]}",
                    "last_paid": last_paid,
                    "last_paid_date": (
                        datetime.fromtimestamp(last_paid).strftime("%Y-%m-%d %H:%M")
                        if last_paid > 0
                        else "---"
                    ),
                    "status": status,
                    "is_delinquent": is_delinquent,
                    "days_overdue": days_overdue,
                }
            )
            nft_id += 1
        except Exception:
            break

    return members


def print_member_table(members, days_threshold):
    """Exibe tabela formatada de membros."""
    section(f"Status dos Membros (threshold: {days_threshold} dias)")

    if not members:
        warn("Nenhum NFT encontrado.")
        return

    # Header
    print(
        f"  {C.BOLD}{'ID':>4}  {'Proprietário':<15}  {'Último Pgto':<18}  {'Status':<15}  {'Atraso':<8}{C.RESET}"
    )
    try:
        line = "─"
        print(f"  {line * 4}  {line * 15}  {line * 18}  {line * 15}  {line * 8}")
    except UnicodeEncodeError:
        print(f"  {'-' * 4}  {'-' * 15}  {'-' * 18}  {'-' * 15}  {'-' * 8}")

    for m in members:
        status_color = C.RED if m["is_delinquent"] else C.GREEN
        status_icon = "✅" if not m["is_delinquent"] else "❌"
        try:
            print(
                f"  {m['nft_id']:>4}  {m['owner_short']:<15}  "
                f"{m['last_paid_date']:<18}  "
                f"{status_color}{status_icon} {m['status']:<13}{C.RESET}  "
                f"{m['days_overdue']}"
            )
        except UnicodeEncodeError:
            icon = "[OK]" if not m["is_delinquent"] else "[X]"
            print(
                f"  {m['nft_id']:>4}  {m['owner_short']:<15}  "
                f"{m['last_paid_date']:<18}  "
                f"{status_color}{icon} {m['status']:<13}{C.RESET}  "
                f"{m['days_overdue']}"
            )

    # Summary
    total = len(members)
    delinquent = sum(1 for m in members if m["is_delinquent"])
    current = total - delinquent

    print(f"\n  {C.BOLD}Resumo:{C.RESET}")
    print(f"    Total de lotes:    {C.BOLD}{total}{C.RESET}")
    print(f"    Em dia:            {C.GREEN}{current}{C.RESET}")
    print(f"    Inadimplentes:     {C.RED}{delinquent}{C.RESET}")

    if total > 0:
        pct = (current / total) * 100
        bar_len = 30
        filled = int(bar_len * current / total)
        color = C.GREEN if pct >= 80 else C.YELLOW if pct >= 50 else C.RED
        try:
            bar = f"{'█' * filled}{'░' * (bar_len - filled)}"
            print(f"    Adimplência:       {color}{bar} {pct:.0f}%{C.RESET}")
        except UnicodeEncodeError:
            bar = f"{'#' * filled}{'.' * (bar_len - filled)}"
            print(f"    Adimplencia:       {color}{bar} {pct:.0f}%{C.RESET}")


def print_governance_cross(members, proposal_id):
    """Cruza dados de inadimplência com votos no Snapshot."""
    section("Cruzamento: Governança × Adimplência")

    # Fetch proposal
    proposal = get_snapshot_proposal(proposal_id)
    if proposal:
        state_color = C.GREEN if proposal["state"] == "active" else C.DIM
        print(f"  Proposta: {C.BOLD}{proposal['title']}{C.RESET}")
        print(
            f"  Estado:   {state_color}{proposal['state']}{C.RESET}  |  "
            f"Votos: {proposal['votes']}  |  "
            f"Score Total: {proposal['scores_total']:.1f}"
        )
    else:
        info(
            "Proposta não encontrada ou ID inválido. "
            "Verifique PROPOSAL_ID no .env."
        )

    # Fetch voters
    votes = get_snapshot_voters(proposal_id)
    if not votes:
        info("Nenhum voto encontrado para esta proposta.")
        return

    voter_addresses = {v["voter"].lower() for v in votes}
    delinquent_owners = {
        m["owner"].lower(): m for m in members if m["is_delinquent"]
    }

    # Cross reference
    bad_voters = []
    for addr in voter_addresses:
        if addr in delinquent_owners:
            bad_voters.append(delinquent_owners[addr])

    if bad_voters:
        print(f"\n  {C.BG_RED}{C.BOLD} ⚠ ALERTAS DE INTEGRIDADE ⚠ {C.RESET}\n")
        for m in bad_voters:
            print(
                f"  {C.RED}🚨 NFT #{m['nft_id']} ({m['owner_short']}) — "
                f"INADIMPLENTE mas VOTOU na proposta!{C.RESET}"
            )
    else:
        ok("Nenhum proprietário inadimplente participou da votação.")

    # Show who voted and is current
    current_voters = [
        addr for addr in voter_addresses if addr not in delinquent_owners
    ]
    if current_voters:
        info(f"Votantes em dia: {len(current_voters)}")


def export_report(members, filepath):
    """Exporta relatório para JSON."""
    report = {
        "generated_at": datetime.now().isoformat(),
        "rpc_url": RPC_URL,
        "nft_address": NFT_ADDRESS,
        "treasury_address": TREASURY_ADDRESS,
        "total_members": len(members),
        "delinquent_count": sum(1 for m in members if m["is_delinquent"]),
        "members": [
            {
                "nft_id": m["nft_id"],
                "owner": m["owner"],
                "last_paid_timestamp": m["last_paid"],
                "last_paid_date": m["last_paid_date"],
                "status": m["status"],
                "is_delinquent": m["is_delinquent"],
            }
            for m in members
        ],
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    ok(f"Relatório exportado para: {filepath}")


# ─── Main ──────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Veritas Village HOA — Monitor de Inadimplência"
    )
    parser.add_argument(
        "--days",
        type=int,
        default=30,
        help="Dias de threshold para inadimplência (padrão: 30)",
    )
    parser.add_argument(
        "--export",
        type=str,
        default=None,
        help="Exportar relatório para arquivo JSON",
    )
    parser.add_argument(
        "--no-snapshot",
        action="store_true",
        help="Pular consulta ao Snapshot",
    )
    args = parser.parse_args()

    header("Veritas Village HOA — Monitor")

    # ─── Conexão ───────────────────────
    section("Conexão RPC")
    w3 = Web3(Web3.HTTPProvider(RPC_URL))

    if not w3.is_connected():
        error("Não foi possível conectar ao nó da RSK Testnet.")
        error(f"URL: {RPC_URL}")
        sys.exit(1)

    chain_id = w3.eth.chain_id
    block = w3.eth.block_number
    ok(f"Conectado! Chain ID: {chain_id} | Bloco: {block}")
    info(f"RPC: {RPC_URL}")

    # ─── Verificar endereços ───────────
    if not TREASURY_ADDRESS or not NFT_ADDRESS:
        warn("Endereços de contrato não definidos no .env!")
        warn("Execute o deploy primeiro:")
        info("  npx hardhat run scripts/deploy.js --network rskTestnet")
        info("  Depois atualize NFT_ADDRESS e TREASURY_ADDRESS no .env")
        sys.exit(0)

    info(f"NFT:      {NFT_ADDRESS}")
    info(f"Treasury: {TREASURY_ADDRESS}")

    # ─── Instanciar contratos ──────────
    treasury = w3.eth.contract(
        address=Web3.to_checksum_address(TREASURY_ADDRESS), abi=TREASURY_ABI
    )
    nft = w3.eth.contract(
        address=Web3.to_checksum_address(NFT_ADDRESS), abi=NFT_ABI
    )

    # ─── Treasury Info ─────────────────
    section("Info do Treasury")
    try:
        balance = treasury.functions.getBalance().call()
        min_dues = treasury.functions.minDuesAmount().call()
        info(f"Saldo:       {Web3.from_wei(balance, 'ether')} RBTC")
        info(f"Taxa mínima: {Web3.from_wei(min_dues, 'ether')} RBTC")
    except Exception as e:
        warn(f"Erro ao ler Treasury: {e}")

    # ─── Escanear membros ──────────────
    members = scan_members(nft, treasury, args.days)
    print_member_table(members, args.days)

    # ─── Cruzar com Snapshot ───────────
    if not args.no_snapshot and PROPOSAL_ID and not PROPOSAL_ID.startswith("0x000000"):
        print_governance_cross(members, PROPOSAL_ID)
    elif not args.no_snapshot:
        section("Governança (Snapshot)")
        info("PROPOSAL_ID não configurado. Pule com --no-snapshot ou configure no .env.")

    # ─── Exportar ──────────────────────
    if args.export:
        section("Exportação")
        export_report(members, args.export)

    print(f"\n{C.DIM}  Executado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{C.RESET}\n")


if __name__ == "__main__":
    main()
