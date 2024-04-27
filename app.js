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
        "inputs": [
            {
                "internalType": "address",
                "name": "freeAddress",
                "type": "address"
            }
        ],
        "name": "checkFreePlay",
        "outputs": [
            {
                "internalType": "bool",
                "name": "isFreePlay",
                "type": "bool"
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
        "name": "getAllPlayerStats",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "",
                "type": "address[]"
            },
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
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
        "name": "paidPlays",
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
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "playCount",
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
        "name": "playerAddresses",
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
const gameContractAddress = '0xEf2f32eF173E4266BE9be187aD6017E12d4b2E52';
const baseProvider = new Web3('https://mainnet.base.org');
const degenProvider = new Web3('https://rpc.degen.tips');
const ethProvider = new ethers.providers.JsonRpcProvider('https://eth-mainnet.public.blastapi.io');
console.log(ethProvider);
gameContract = new degenProvider.eth.Contract(gameAbi, gameContractAddress);

let connectedAddress;
let accounts;
let isConnecting = false;
let ensNamesEnabled = false;

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
const toggleSwitch = document.getElementById('toggleSwitch');
const bodyElement = document.body;

var blockTimer;
var currentWinner;
let provider;
var chainId;


// Check Free Plays for Connected User
async function isFreePlayEligible() {
    console.log("before");
	return await gameContract.methods.checkFreePlay(connectedAddress).call();
    console.log("after");

}

//Change Play Button Text depending on Free Play or Game Over
async function updatePlayButtonText(blocksToGo, winnerAddr) {
    if( blocksToGo < -10) {
        
        if(connectedAddress === undefined) {
            playButton.innerText = 'CONNECT TO PLAY';
        } else if(connectedAddress.toLowerCase() === winnerAddr.toLowerCase()){
            if (await gameContract.methods.winnerPaid().call()){
                console.log("Winner Paid: ");
                console.log();
                playButton.innerText = 'GAME OVER';
            } else {
                playButton.innerText = 'COLLECT WINNINGS';
            }
                
            
            
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
        console.log(isEligible);
	    const playButton = document.getElementById('playButton');
		playButton.innerText = isEligible ? '1 FREE PLAY' : 'PLAY 1 DEGEN';
	}	

    
	
	
  
  }

//Update Winner Address Display
function updateWinnerText(winnerAddress, winnerElement) {

	if (connectedAddress === undefined){
        winnerElement.textContent = winnerAddress;
		winnerElement.classList.add("winner");
    }
    else {
        if (currentWinner.toLowerCase() === connectedAddress.toLowerCase()) {
            winnerElement.classList.remove("winner");
            winnerElement.classList.add("green-text");

            if (winnerAddress.includes('.eth')){
                winnerElement.textContent = '🎩' + winnerAddress;
            } else {
                winnerElement.textContent = '🎩YOU';
            }
		
	}   else {
            winnerElement.textContent = winnerAddress;
            winnerElement.classList.add("winner");
	}
    }


  }

//Connected User Called Play Function, init contract call tx
async function playGame() {
    
    if(!connectedAddress) {
        console.log("No Connection");
        return connectToProvider();
    }

    if (provider == undefined) {
        provider = new Web3(window.ethereum);
        gameWriteContract = new provider.eth.Contract(gameAbi, gameContractAddress);
    }
    
    const network = await ethereum.request({ method: 'net_version' });
    if(network !== '0x27bc86aa' && network !== '666666666'){
        return connectToProvider();
        
    }
    const balance = await degenProvider.eth.getBalance(connectedAddress);
    const gameState = await gameContract.methods.playEnabled().call();
    console.log(gameState);
    console.log(balance);
    if(balance <= 0){
        showError("You don't have any bridged degen!", true, 'https://bridge.degen.tips/', 'Official Bridge ⤴');
        return;
    }

    if(!gameState){
        showError("Game has not started");
        return;
    }
    // If connected, proceed with contract calls
    const blockTarget = await gameContract.methods.blockTarget().call();
    console.log(blockTarget);
    if (blockTarget != 0 && blockTimer < -8 && connectedAddress.toLowerCase() !== currentWinner.toLowerCase()) {
        showError("Game is over");
        return
    }
    try {
        const isEligible = await isFreePlayEligible();
        const playAmount = isEligible ? '0' : provider.utils.toWei('1', 'ether');
        
        if (blockTimer < -10 && connectedAddress.toLowerCase() === currentWinner.toLowerCase()){
            const winnerPaid = await gameContract.methods.winnerPaid().call();
            if (!winnerPaid){
                console.log("Paying Winner");
                await gameWriteContract.methods.payWinner().send({ from: connectedAddress });
            } else {
                showError("Game is over");
                return
            }
            
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
            chainId = await ethereum.request({ method: 'net_version' });
            console.log(chainId);

            // Check if the connected chain ID is 0x27bc86aa
            if (chainId !== '0x27bc86aa' && chainId !== '666666666') {
                console.error('Please connect to Degen Chain');
                showError("Please Connect to Degen Chain", false, '');
                await ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x27bc86aa', // Must be a hexadecimal number, e.g., '0x1' for Ethereum Mainnet
                        chainName: 'Degen Network',
                        nativeCurrency: {
                            name: 'Degen',
                            symbol: 'DEGEN', // Typically 2-4 characters
                            decimals: 18
                        },
                        rpcUrls: ['https://rpc.degen.tips'], // The RPC URL for the network

                    }],
                });
                await ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x27bc86aa' }],
                });
                
            }

            // User is connected to the correct chain, continue with the application logic
            connectedAddress = accounts[0];
            const ensName = await ethProvider.lookupAddress(connectedAddress);
            console.log("ENS Name: ", ensName);
            updatePlayButtonText(blockTimer, currentWinner);
            if (ensName != null){
                updateDisplayedAddress(ensName);
            } else {
                updateDisplayedAddress(connectedAddress.substring(0, 6));
            }


            
            ethereum.on('accountsChanged', handleAccountsChanged);
            
        } catch (error) {
            console.error('User denied account access or an error occurred:', error);
        }
    } else if (window.web3) {
        window.web3 = new Web3(web3.currentProvider);
    } else {
        showError("You dont have a Web3 Wallet!", true, 'https://metamask.io/', 'Install Metamask ⤴') 
        console.error('No web3 instance detected');
    }
}

async function addDegenChain(){

}

async function handleAccountsChanged() {
    if (connectedAddress == undefined) {
        console.log('Please connect to an Ethereum wallet');
    
    } else {
        accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Handling Account Change");
        if (accounts[0] != connectedAddress){
            connectedAddress = accounts[0];
            updatePlayButtonText(blockTimer, currentWinner);
            updateWinnerText(currentWinner.substring(0, 6), winnerElement);
            const ensName = await getEns(connectedAddress);
            console.log("ensName: ", ensName);
            if (ensName != null){
                updateDisplayedAddress(ensName);
            } else {
                updateDisplayedAddress(connectedAddress.substring(0, 6));
            }
            console.log("Updating Account:", accounts[0]);
        }
               
    }
    
}

function updateDisplayedAddress(address) {
    const walletAddressDiv = document.getElementById('walletAddress');
    if (address) {
      walletAddressDiv.textContent = `Connected: ${address}`;
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

async function getEns (address) {
    const ensName = await ethProvider.lookupAddress(address);
    console.log("got ens");
    console.log(address);
    if (ensName != null){
        return ensName;
    } else {
        return address.substring(0, 8);
    }

}

async function displayTopPlayers() {
    try {
        // Call the getAllPlayerStats function from the smart contract
        const [addresses, counts] = await gameContract.methods.getAllPlayerStats().call();

        // Combine addresses and counts into a single array of objects
        let players = addresses.map((address, index) => ({
            address: address,
            plays: counts[index]
        }));

        // Sort players by the number of plays in descending order
        players.sort((a, b) => b.plays - a.plays);

        // Select the top 10 players
        const topPlayers = players.slice(0, 10);

        // Display the top 10 players
        console.log("Top 10 Players:");
        topPlayers.forEach((player, index) => {
            console.log(`${index + 1}. Address: ${player.address}, Plays: ${player.plays}`);
        });

    } catch (error) {
        console.error("Failed to fetch or process player data:", error);
    }
}

// Get the modal
var modal = document.getElementById("errorModal");

// Get the <span> element that closes the modal
var closeButton = document.getElementsByClassName("close-button")[0];

// When the user clicks on the button, open the modal 
function showError(message, shouldRedirect = false, redirectUrl = '', buttonText = 'Click Here') {
    const modal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    const errorButton = document.getElementById('errorButton');

    // Set the error message
    errorMessage.textContent = message;

    // Configure the button if redirection is needed
    if (shouldRedirect) {
        errorButton.textContent = buttonText; // Set custom button text
        errorButton.style.display = 'inline-block'; // Show the button
        errorButton.onclick = function() { // Set the redirect action
            window.open(redirectUrl, '_blank');
        };
    } else {
        errorButton.style.display = 'none'; // Hide the button if not needed
    }

    // Show the modal
    modal.style.display = 'block';

    // Add event listener for closing the modal
    document.querySelector('.close-button').onclick = function() {
        modal.style.display = 'none';
    };
}

// When the user clicks on <span> (x), close the modal
closeButton.onclick = function() {
    modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}


// function getBlockInterval(startBlock, currentBlock) {
//     if (currentBlock - startBlock < 500) {
//       var marking = document.getElementById("300");
//       marking.classList.add("currentReset"); // Set color
//       resetProgElement.textContent = (currentBlock - 500 - startBlock)*-1;
//       return 300;
//     }
//     if (currentBlock - startBlock < 1000) {
//       var remove = document.getElementById("300");
//       remove.classList.remove("currentReset");
//       var marking = document.getElementById("200");
//       marking.classList.add("currentReset"); // Set color
//       resetProgElement.textContent = (currentBlock - 1000 - startBlock)*-1;
//       return 200;
//     }
//     if (currentBlock - startBlock < 1500) {
//       var remove = document.getElementById("200");
//       remove.classList.remove("currentReset");
//       var marking = document.getElementById("100");
//       marking.classList.add("currentReset"); // Set color
//       resetProgElement.textContent = (currentBlock - 1500 - startBlock)*-1;
//       return 100;
//     }
//     if (currentBlock - startBlock < 2000) {
//       var remove = document.getElementById("100");
//       remove.classList.remove("currentReset");
//       var marking = document.getElementById("50");
//       marking.classList.add("currentReset"); // Set color
//       resetProgElement.textContent = (currentBlock- 2000 - startBlock)*-1;
//       return 50;
//     }
//     var marking = document.getElementById("25");
//     var remove = document.getElementById("50");
//     remove.classList.remove("currentReset");
//     marking.classList.add("currentReset"); // Set color
//     resetProgElement.textContent = "Overtime";
//     return 25;
//   }

window.addEventListener('load', async () => {
    // Initialize Game Variables
	currentWinner = await gameContract.methods.currentWinner().call();
	var currentBlock = await baseProvider.eth.getBlockNumber();
	var blockTarget = await gameContract.methods.blockTarget().call();
	var pot = await gameContract.methods.pot().call();
    blockTimer = blockTarget - currentBlock;

    var targetProgress = targetProgress = ((100 - blockTimer) / 100) * 100;
    var potValue = parseFloat(baseProvider.utils.fromWei(pot, 'ether'));
    updateWinnerText(await getEns(currentWinner), winnerElement);
    potElement.textContent = (potValue.toFixed(0)) + "  DEGEN";
    blocksToGoElement.textContent = Math.max(0, Math.min(100, blockTimer));
    targetProgressElement.style.width = `${Math.max(0, Math.min(100, targetProgress))}%`;
    updatePlayButtonText(blockTimer, currentWinner);


setInterval(async () => {

    //Update Game Vars
    var newBlock = await gameContract.methods.blockTarget().call();
    var newPot = await gameContract.methods.pot().call();

    if (newPot !== pot || newBlock !== blockTarget){
        //Update the page when change to game state
        currentWinner = await gameContract.methods.currentWinner().call();
        pot = newPot
        blockTarget = newBlock
        //ENS Name
    } 

    //Update the timer every time
    currentBlock = await baseProvider.eth.getBlockNumber();
    blockTimer = blockTarget - currentBlock;
	targetProgress = ((100 - blockTimer) / 100) * 100;
    console.log(targetProgress);
	await updatePlayButtonText(blockTimer, currentWinner);
    updateWinnerText(await getEns(currentWinner), winnerElement);

    //Additional Game Stats
	//blockElement.textContent = currentBlock;
    if (blockTimer < 0){
        blocksToGoElement.textContent = '0';
        timeEstElement.textContent = '';
        currentWinner = await gameContract.methods.currentWinner().call();
        

    } else {
        //getBlockInterval(startBlock, currentBlock);
        blocksToGoElement.textContent = blockTimer;
        timeEstElement.textContent = "(~" + String(formatTime(blockTimer)) + ")";
        
    }
    
    //Show Progress Bar
    targetProgressElement.style.width = `${Math.max(0, Math.min(100, targetProgress))}%`;
    console.log(targetProgressElement.style.width);

    //Format and Update Pot
    potValue = parseFloat(baseProvider.utils.fromWei(pot, 'ether'));
    potElement.textContent = (potValue.toFixed(0)) + "  DEGEN";


}, 2000);






});






