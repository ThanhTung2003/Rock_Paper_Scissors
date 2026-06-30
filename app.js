import { ethers } from "ethers";
import { Attribution } from "ox/erc8021";

// ─── Builder Code (bc_0wp2arli) ───────────────────────────────────────────────
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ['bc_0wp2arli'] });

// Instead of alert()
function showToast(message) {
    const toast = document.getElementById("toast");
    if(toast) {
        toast.innerText = message;
        toast.className = "toast show";
        setTimeout(function(){ toast.className = toast.className.replace("show", ""); }, 3000);
    }
}


// ABI for KBBFees contract (minimal ABI for payGameStart)
const KBBFeesABI = [
    "function payGameStart() external payable",
    "event GameStartPaid(address indexed player, uint256 amount)"
];

// Provide your deployed contract address here later
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const START_FEE = ethers.parseEther("0.0000003"); // 0.0000003 ETH

const userScoreSpan = document.querySelector("#user-score");
const computerScoreSpan = document.querySelector("#computer-score");
const scoreBoardDiv = document.querySelector(".score-board");
const resultDiv = document.querySelector(".result > p");
const rockDiv = document.querySelector("#r");
const paperDiv = document.querySelector("#p");
const scissorsDiv = document.querySelector("#s");

const connectBtn = document.querySelector("#connect-wallet-btn");
const startGameBtn = document.querySelector("#start-game-btn");
const walletStatus = document.querySelector("#wallet-status");
const actionMessage = document.querySelector("#action-message");

let userScore = 0;
let computerScore = 0;
let hasPaidForRound = false;

let provider;
let signer;
let contract;

async function initWeb3() {
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        try {
            const accounts = await provider.listAccounts();
            if (accounts.length > 0) {
                handleAccountsChanged(accounts);
            }
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
        signer = await provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, KBBFeesABI, signer);
        
        walletStatus.innerText = `Connected: ${accounts[0].address.substring(0,6)}...${accounts[0].address.substring(38)}`;
        connectBtn.style.display = "none";
        startGameBtn.style.display = "block";
    }
}

connectBtn.addEventListener('click', async () => {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            handleAccountsChanged([accounts[0]]); // Pass as array of strings, ethers handles wrapped addresses
            
            // Check network (Base mainnet is 8453)
            const network = await provider.getNetwork();
            if (network.chainId !== 8453n && network.chainId !== 84531n) {
                walletStatus.innerText += " (Please switch to Base Mainnet or Sepolia)";
            }
        } catch (error) {
            console.error(error);
        }
    }
});

startGameBtn.addEventListener('click', async () => {
    if (!contract) return;
    try {
        startGameBtn.innerText = "Processing...";
        startGameBtn.disabled = true;
        // Attach builder code via ox/erc8021 Attribution
        const iface = new ethers.Interface(KBBFeesABI);
        const calldata = iface.encodeFunctionData("payGameStart", []);
        const txData = calldata + DATA_SUFFIX.slice(2);
        const tx = await signer.sendTransaction({
            to: CONTRACT_ADDRESS,
            value: START_FEE,
            data: txData,
        });
        await tx.wait();
        
        hasPaidForRound = true;
        startGameBtn.style.display = "none";
        actionMessage.innerText = "Fee Paid! You can now make your choice.";
        actionMessage.style.color = "green";
    } catch (err) {
        console.error(err);
        showToast("Transaction failed or rejected.");
        startGameBtn.innerText = "Pay Fee to Start (0.0000003 ETH)";
        startGameBtn.disabled = false;
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
