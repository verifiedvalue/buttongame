let gameContract;

const gameAbi = [
    {
        "inputs": [],
        "stateMutability": "payable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "name": "OwnableInvalidOwner",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "OwnableUnauthorizedAccount",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "blockTarget",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "creatorWallet",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "currentWinner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "enablePlays",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "endGameMet",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "freePlay",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "freePlayUsed",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "freePlaysUsed",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "isEndGameMet",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "lastBlockPlayed",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "numPlays",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "pauseGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "pauseInterval",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "payWinner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "play",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "playEnabled",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "players",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "pot",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "restartGame",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "resumeGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_creatorWallet",
                "type": "address"
            }
        ],
        "name": "setCreatorWallet",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "startBlock",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "winnerPaid",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

//Primary Contract and Base Block Information
const gameContractAddress = '0x4d9Ef8693C276d98D1B13894d65688856Cc0DC13';
const baseProvider = new Web3('https://mainnet.base.org');
const degenProvider = new Web3('https://rpc.degen.tips');
gameContract = new degenProvider.eth.Contract(gameAbi, gameContractAddress);

let connectedAddress;
let accounts;
let isConnecting = false;

//Dynamic Page Elements
const connectedElement = document.getElementById('connectStatus');
const currentElement = document.getElementById('current');
const winnerElement = document.getElementById('winner');
const blockElement = document.getElementById('block');
const blocksToGoElement = document.getElementById('blocksToGo');
const currentPeriodElement = document.getElementById('currentPeriod');
const targetElement = document.getElementById('target');
const potElement = document.getElementById('pot');
const targetProgressElement = document.getElementById('target-progress');
const thresholdProgressElement = document.getElementById('threshold-progress');
const resetProgressElement = document.getElementById('reset-progress');
const resetProgElement = document.getElementById('resetProg');
const timeEstElement = document.getElementById('timeEst');

var blockTimer;
var currentWinner;
let provider;

// Check Free Plays for Connected User
async function isFreePlayEligible() {

	const freePlayUsed = await gameContract.methods.freePlayUsed(connectedAddress).call();
    const freePlaysUsed = await gameContract.methods.freePlaysUsed().call();
    console.log(freePlaysUsed);
    //const freePlaysCount = await gameContract.methods.freePlaysUsed().call();
	return !freePlayUsed && freePlaysUsed < 69;
}

//Change Play Button Text depending on Free Play or Game Over
async function updatePlayButtonText(blocksToGo, winnerAddr) {
    if( blocksToGo < 0) {
        
        if(connectedAddress === undefined) {
            playButton.innerText = 'CONNECT TO PLAY';
        } else if(connectedAddress.toLowerCase() === winnerAddr.toLowerCase()){
            playButton.innerText = 'COLLECT WINNINGS';
        } else if(winnerAddr === "0x0000000000000000000000000000000000000000"){
            console.log("Start Game")
		    playButton.innerText = 'START GAME';
        }
        else {
            console.log("GAME OVER")
		    playButton.innerText = 'GAME OVER';
        }
        
        return;
    }

    else if (connectedAddress === undefined){
        playButton.innerText = 'CONNECT TO PLAY';
        return
    }
    else {
        const isEligible = await isFreePlayEligible();
	    const playButton = document.getElementById('playButton');
		playButton.innerText = isEligible ? '1 FREE PLAY' : 'PLAY 1 DEGEN';
	}	

    
	
	
  
  }

//Update Winner Address Display
function updateWinnerText(winnerAddress, winnerElement) {
	if (connectedAddress === undefined){
        winnerElement.textContent = winnerAddress.substring(0, 8);
		winnerElement.classList.add("winner");
    }
    else{
        if (winnerAddress.toLowerCase() === connectedAddress.toLowerCase()) {
		
		winnerElement.textContent = '🎩YOU';
        winnerElement.classList.add("green-text");
	}   else {
        winnerElement.textContent = winnerAddress.substring(0, 6);
		winnerElement.classList.add("green-text");	
	}
    }


  }

//Connected User Called Play Function, init contract call tx
async function playGame() {
    // If already connecting, return to avoid multiple connection attempts
    if (isConnecting) {
        return;
    }
    if (await ethereum.request({ method: 'net_version' }) != "0x27bc86aa"){
        await connectToProvider();
    }

    // If not connected, initiate connection
    if (!connectedAddress) {
        isConnecting = true;
        try {
            await connectToProvider();
            isConnecting = false;
            // Check if still not connected after attempting to connect
            if (!connectedAddress) {
                console.error('Could not connect to Ethereum provider');
                return;
            }
        } catch (error) {
            isConnecting = false;
            console.error('Error connecting to Ethereum provider:', error);
            return;
        }
        return
    }
    if (provider == undefined) {
        provider = new Web3(window.ethereum);
        gameWriteContract = new provider.eth.Contract(gameAbi, gameContractAddress);
    }
    
    

    // If connected, proceed with contract calls
    try {
        const isEligible = await isFreePlayEligible();
        const playAmount = isEligible ? '0' : provider.utils.toWei('1', 'ether');

        if (blockTimer < 0 && connectedAddress.toLowerCase() === currentWinner.toLowerCase()){
            console.log("Paying Winner");
            await gameWriteContract.methods.payWinner().send({ from: connectedAddress });
        } else {
            if (isEligible) {
                await gameWriteContract.methods.freePlay().send({ from: connectedAddress });
            } else {
                await gameWriteContract.methods.play().send({ from: connectedAddress, value: playAmount });
            }
        }

    } catch (error) {
        // Handle user rejection or any other error
        console.error('Transaction rejected or error occurred:', error);
        // You can display a message to the user or handle the error accordingly
    }
}

async function connectToProvider() {
    console.log("Connecting to Provider")
    if (window.ethereum) {
        window.web3 = new Web3(ethereum);
        try {
            // Requesting user accounts
            accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            console.log(accounts);

            // Get the current chain ID
            const chainId = await ethereum.request({ method: 'net_version' });
            console.log(chainId);

            // Check if the connected chain ID is 0x27bc86aa
            if (chainId !== '0x27bc86aa') {
                console.error('Please connect to Degen Chain');
                await ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x27bc86aa' }],
                 })
                return;
            }

            // User is connected to the correct chain, continue with the application logic
            connectedAddress = accounts[0];
            updateDisplayedAddress(connectedAddress);
            ethereum.on('accountsChanged', handleAccountsChanged);
            
        } catch (error) {
            console.error('User denied account access or an error occurred:', error);
        }
    } else if (window.web3) {
        window.web3 = new Web3(web3.currentProvider);
    } else {
        console.error('No web3 instance detected');
    }
}

async function handleAccountsChanged() {
    if (connectedAddress == undefined) {
        console.log('Please connect to an Ethereum wallet');
    
    } else {
        accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Handling Account Change");
        if (accounts[0] != connectedAddress){
            connectedAddress = accounts[0];
            console.log("Updating Account:", accounts[0]);
        }
               
    }
    
}

function updateDisplayedAddress(address) {
    const walletAddressDiv = document.getElementById('walletAddress');
    if (address) {
      walletAddressDiv.textContent = `Connected: ${address.substring(0, 6)}`;
    } else {
      walletAddressDiv.textContent = 'Not Connected';
    }
  }

function formatTime(blocksToWin){
    seconds = Number(blocksToWin)*2;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function getBlockInterval(startBlock, currentBlock) {
    if (currentBlock - startBlock < 500) {
      var marking = document.getElementById("300");
      marking.classList.add("currentReset"); // Set color
      resetProgElement.textContent = (currentBlock - 500 - startBlock)*-1;
      return 300;
    }
    if (currentBlock - startBlock < 1000) {
      var remove = document.getElementById("300");
      remove.classList.remove("currentReset");
      var marking = document.getElementById("200");
      marking.classList.add("currentReset"); // Set color
      resetProgElement.textContent = (currentBlock - 1000 - startBlock)*-1;
      return 200;
    }
    if (currentBlock - startBlock < 1500) {
      var remove = document.getElementById("200");
      remove.classList.remove("currentReset");
      var marking = document.getElementById("100");
      marking.classList.add("currentReset"); // Set color
      resetProgElement.textContent = (currentBlock - 1500 - startBlock)*-1;
      return 100;
    }
    if (currentBlock - startBlock < 2000) {
      var remove = document.getElementById("100");
      remove.classList.remove("currentReset");
      var marking = document.getElementById("50");
      marking.classList.add("currentReset"); // Set color
      resetProgElement.textContent = (currentBlock- 2000 - startBlock)*-1;
      return 50;
    }
    var marking = document.getElementById("25");
    var remove = document.getElementById("50");
    remove.classList.remove("currentReset");
    marking.classList.add("currentReset"); // Set color
    resetProgElement.textContent = "Overtime";
    return 25;
  }

window.addEventListener('load', async () => {
    // Initialize Game Variables
	currentWinner = await gameContract.methods.currentWinner().call();
	var currentBlock = await baseProvider.eth.getBlockNumber();
	var blockTarget = await gameContract.methods.blockTarget().call();
	var pot = await gameContract.methods.pot().call();
	var startBlock = await gameContract.methods.startBlock().call();
    blockTimer = blockTarget - currentBlock;
    var targetProgress = ((300 - blockTimer) / (300)) * 100;
    var potValue = parseFloat(baseProvider.utils.fromWei(pot, 'ether'));

setInterval(async () => {
	console.log(connectedAddress);
    //Update Game Vars
    currentWinner = await gameContract.methods.currentWinner().call();
	currentBlock = await baseProvider.eth.getBlockNumber();
	blockTarget = await gameContract.methods.blockTarget().call();
	pot = await gameContract.methods.pot().call();

    //Delete after testing
    startBlock = await gameContract.methods.startBlock().call();


    //Update Calculated Values
    blockTimer = blockTarget - currentBlock;
    targetProgress = ((300 - blockTimer) / (300)) * 100;
  	
    // Call Update Functions when the page loads
	updatePlayButtonText(blockTimer, currentWinner);
	updateWinnerText(currentWinner, winnerElement);
    
    

    //Additional Game Stats
	//blockElement.textContent = currentBlock;
    if (blockTimer < 0){
        blocksToGoElement.textContent = '0';
        resetProgElement.textContent = "Game Over";

    } else {
        getBlockInterval(startBlock, currentBlock);
        blocksToGoElement.textContent = blockTimer;
        timeEstElement.textContent = "(~" + String(formatTime(blockTimer)) + ")";
        
    }
    
    //Show Progress Bar
    targetProgressElement.style.width = targetProgress + '%';

    //Format and Update Pot
    potValue = parseFloat(baseProvider.utils.fromWei(pot, 'ether'));
    potElement.textContent = (potValue.toFixed(1)) + "  DEGEN";


}, 1000);






});






