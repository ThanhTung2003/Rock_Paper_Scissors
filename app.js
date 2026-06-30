import { ethers } from "ethers";
import { Attribution } from "ox/erc8021";

// ─── Builder Code (bc_0wp2arli) ───────────────────────────────────────────────
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ['bc_0wp2arli'] });

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_CHAIN_ID  = 8453;
const BASE_CHAIN_HEX = '0x2105';
const BASE_RPC       = 'https://mainnet.base.org';

// ─── ABI for KBBFees contract ─────────────────────────────────────────────────
const KBBFeesABI = [
    "function gameStartFee() external view returns (uint256)",
    "function payGameStart() external payable",
    "function totalPlayers() external view returns (uint256)",
    "event GameStartPaid(address indexed player, uint256 amount)"
];

// ─── Contract Address ─────────────────────────────────────────────────────────
const CONTRACT_ADDRESS =
    import.meta.env.VITE_CONTRACT_ADDRESS ||
    '0x0000000000000000000000000000000000000000';

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const userScoreSpan    = document.querySelector("#user-score");
const computerScoreSpan = document.querySelector("#computer-score");
const resultDiv        = document.querySelector(".result > p");
const rockDiv          = document.querySelector("#r");
const paperDiv         = document.querySelector("#p");
const scissorsDiv      = document.querySelector("#s");
const connectBtn       = document.querySelector("#connect-wallet-btn");
const startGameBtn     = document.querySelector("#start-game-btn");
const walletStatus     = document.querySelector("#wallet-status");
const actionMessage    = document.querySelector("#action-message");

// ─── State ────────────────────────────────────────────────────────────────────
let userScore      = 0;
let computerScore  = 0;
let hasPaidForRound = false;
let provider, signer, contract;

// ─── Toast helper ─────────────────────────────────────────────────────────────
function showToast(message) {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.innerText = message;
        toast.className = "toast show";
        setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
    }
}

// ─── Init Web3 ────────────────────────────────────────────────────────────────
async function initWeb3() {
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        try {
            const accounts = await provider.listAccounts();
            if (accounts.length > 0) handleAccountsChanged(accounts);
        } catch (err) {
            console.error(err);
        }
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
    } else {
        walletStatus.innerText = "Please install MetaMask or Coinbase Wallet.";
    }
}

async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        walletStatus.innerText = "Please connect to MetaMask.";
        connectBtn.style.display = "block";
        startGameBtn.style.display = "none";
    } else {
        signer   = await provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, KBBFeesABI, signer);
        const addr = typeof accounts[0] === 'string' ? accounts[0] : accounts[0].address;
        walletStatus.innerText = `Connected: ${addr.substring(0, 6)}...${addr.substring(38)}`;
        connectBtn.style.display  = "none";
        startGameBtn.style.display = "block";
    }
}

// ─── Connect Wallet ───────────────────────────────────────────────────────────
connectBtn.addEventListener('click', async () => {
    if (!window.ethereum) {
        showToast("Please install MetaMask or Coinbase Wallet.");
        return;
    }
    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Auto-switch to Base Mainnet (same as Brick_Breaker)
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_CHAIN_HEX }],
            });
        } catch (switchErr) {
            if (switchErr.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: BASE_CHAIN_HEX,
                        chainName: 'Base',
                        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                        rpcUrls: [BASE_RPC],
                        blockExplorerUrls: ['https://basescan.org'],
                    }],
                });
            } else {
                throw switchErr;
            }
        }

        const accounts = await provider.listAccounts();
        handleAccountsChanged(accounts);
    } catch (error) {
        console.error(error);
        showToast("Wallet connection failed.");
    }
});

// ─── Pay Start Fee (Brick_Breaker pattern: populateTransaction) ───────────────
startGameBtn.addEventListener('click', async () => {
    if (!contract) return;
    if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        showToast("Contract not deployed yet.");
        return;
    }
    try {
        startGameBtn.innerText = "Confirming...";
        startGameBtn.disabled  = true;
        walletStatus.innerText = "Waiting for wallet signature...";

        // Read fee live from contract (same as Brick_Breaker)
        const fee = await contract.gameStartFee();

        // Attach builder code via populateTransaction + DATA_SUFFIX (Brick_Breaker pattern)
        const txReq = await contract.payGameStart.populateTransaction({ value: fee });
        txReq.data  = txReq.data + DATA_SUFFIX.slice(2); // append builder suffix

        walletStatus.innerText = "Waiting for blockchain confirmation...";
        const tx = await signer.sendTransaction(txReq);
        await tx.wait();

        hasPaidForRound = true;
        startGameBtn.style.display = "none";
        actionMessage.innerText    = "Fee Paid! You can now make your choice.";
        actionMessage.style.color  = "green";
        walletStatus.innerText     = "Payment successful! ✅";
        setTimeout(() => { walletStatus.innerText = ""; }, 3000);
    } catch (err) {
        console.warn("Transaction failed:", err.message || err);
        showToast("Transaction failed, playing for free.");
        
        // Fallback to free play just like Brick_Breaker
        hasPaidForRound = true;
        startGameBtn.style.display = "none";
        actionMessage.innerText    = "Playing for free! Make your choice.";
        actionMessage.style.color  = "orange";
        walletStatus.innerText     = "Transaction failed. Free mode.";
        setTimeout(() => { walletStatus.innerText = ""; }, 3000);
    }
});

function main() {
    rockDiv.addEventListener("click", function () {
        if(!hasPaidForRound) return showToast("Please pay the fee (Start Game) before playing this round!");
        game("r");
    });

    paperDiv.addEventListener("click", function () {
        if(!hasPaidForRound) return showToast("Please pay the fee (Start Game) before playing this round!");
        game("p");
    });

    scissorsDiv.addEventListener("click", function () {
        if(!hasPaidForRound) return showToast("Please pay the fee (Start Game) before playing this round!");
        game("s");
    });
}

function getComputerChoice() {
    const choices = ["r", "p", "s"];
    const randomNumber = Math.floor(Math.random() * 3);
    return choices[randomNumber];
}

function game(userChoice) {
    const computerChoice = getComputerChoice();
    switch (userChoice + computerChoice) {
        // User wins: Rock beats Scissors, Paper beats Rock, Scissors beats Paper
        case "rs":
        case "pr":
        case "sp":
            win(userChoice, computerChoice);
            break;
        // User loses: Scissors beats Rock, Rock beats Paper, Paper beats Scissors
        case "sr":
        case "rp":
        case "ps":
            lose(userChoice, computerChoice);
            break;
        // Draw
        case "rr":
        case "pp":
        case "ss":
            draw(userChoice, computerChoice);
            break;
    }
    // Reset round
    hasPaidForRound = false;
    startGameBtn.style.display = "block";
    startGameBtn.innerText = "Pay Fee to Start (0.0000003 ETH)";
    startGameBtn.disabled = false;
    actionMessage.innerText = "Your turn.";
    actionMessage.style.color = "white";
}

function win(userChoice, computerChoice) {
    userScore++;
    userScoreSpan.innerHTML = userScore;
    resultDiv.innerHTML = ` ${convertKeyWords(userChoice)} vs ${convertKeyWords(computerChoice)} - You Win! `;
}

function lose(userChoice, computerChoice) {
    computerScore++;
    computerScoreSpan.innerHTML = computerScore;
    resultDiv.innerHTML = ` Computer chose ${convertKeyWords(computerChoice)} - You Lose! `;
}

function draw(userChoice, computerChoice) {
    resultDiv.innerHTML = "It's a Draw! ";
}

function convertKeyWords(letter) {
    if (letter === "r") return "Rock";
    if (letter === "p") return "Paper";
    return "Scissors"
}

// init on load
initWeb3();
main();
