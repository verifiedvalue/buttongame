let gameContract;

async function isFreePlayEligible() {
	const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
	const account = accounts[0];
	const freePlayUsed = await gameContract.methods.freePlayUsed(account).call();
	const freePlaysEnabled = await gameContract.methods.freePlaysEnabled().call();
	return !freePlayUsed && freePlaysEnabled;
}

async function updatePlayButtonText() {
  const isEligible = await isFreePlayEligible();
  const playButton = document.getElementById('playButton');
  playButton.innerText = isEligible ? '1 FREE PLAY' : 'PLAY 0.0069 ETH';
  playButton.color = "#0F9D58";
}

async function updatePlayButtonText(winner, connectedWallet, blocksToGo) {
	const isEligible = await isFreePlayEligible();
	const playButton = document.getElementById('playButton');
	if( blocksToGo < 0) {
		playButton.innerText = isEligible ? 'Start Game (Free)' : 'Start Game (.0069)';
	} else {
		playButton.innerText = isEligible ? '1 FREE PLAY' : 'PLAY 0.0069 ETH';
	}	
	
  
	// Change the button color to green if the connected wallet is not the winner
	if (winner.toLowerCase() == connectedWallet.toLowerCase()) {
		playButton.classList.add('winner-button');
	  } else {
		playButton.classList.remove('winner-button');
	  }
  }

function updateWinnerText(winnerAddress, connectedAddress, winnerElement) {
	if (winnerAddress.toLowerCase() === connectedAddress.toLowerCase()) {
		winnerElement.style.color = '#0F9D58';
		winnerElement.textContent = 'You';
	} else {
		winnerElement.textContent = winnerAddress.substring(0, 7);
		winnerElement.style.color = '#DB4437';
	}
  }


async function playGame() {
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  const account = accounts[0];
  const isEligible = await isFreePlayEligible();
  const playAmount = isEligible ? '0' : web3.utils.toWei('0.0069', 'ether');

  if (isEligible) {
    await gameContract.methods.freePlay().send({ from: account });
  } else {
    await gameContract.methods.play().send({ from: account, value: playAmount });
  }
}

window.addEventListener('load', async () => {
  if (window.ethereum) {
    window.web3 = new Web3(ethereum);
    try {
      await ethereum.request({ method: 'eth_requestAccounts' });
    } catch (error) {
      console.error('User denied account access');
    }
  } else if (window.web3) {
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.error('No web3 instance detected');
  }

  const gameAbi = [
	{
		"inputs": [],
		"name": "freePlay",
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
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
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
		"inputs": [
			{
				"internalType": "address",
				"name": "_daoAddress",
				"type": "address"
			}
		],
		"name": "setDaoAddress",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "toggleFreePlays",
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
		"name": "daoAddress",
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
		"name": "freePlaysEnabled",
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
		"name": "lastPot",
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
		"name": "lastWin",
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
	}
];
const gameContractAddress = '0xC4a0962e4978B1E89EC151845401aFDBb43f86Ff';
gameContract = new web3.eth.Contract(gameAbi, gameContractAddress);

const winnerElement = document.getElementById('winner');
const blockElement = document.getElementById('block');
const blocksToGoElement = document.getElementById('blocksToGo');
const currentPeriodElement = document.getElementById('currentPeriod');
const targetElement = document.getElementById('target');
const potElement = document.getElementById('pot');
const targetProgressElement = document.getElementById('target-progress');
const thresholdProgressElement = document.getElementById('threshold-progress');
const lastWinnerElement = document.getElementById('last-win');
const lastPotElement = document.getElementById('last-pot');

	// Add an event listener for account changes
ethereum.on('accountsChanged', () => {
	updatePlayButtonText();
});

setInterval(async () => {
	const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
	const connectedAddress = accounts[0];
	const currentWinner = await gameContract.methods.currentWinner().call();
	const currentBlock = await web3.eth.getBlockNumber();
	const blockTarget = await gameContract.methods.blockTarget().call();
	const pot = await gameContract.methods.pot().call();
	const startBlock = await gameContract.methods.startBlock().call();
	const lastBlockPlayed = await gameContract.methods.lastBlockPlayed().call();
	const lastWin = await gameContract.methods.lastWin().call();
	const lastPot = await gameContract.methods.lastPot().call();
    // Call updatePlayButtonText() when the page loads
	updatePlayButtonText(currentWinner, connectedAddress, blocksToGo);
	updateWinnerText(currentWinner, connectedAddress, winnerElement);

	// Add an event listener for account changes
  	ethereum.on('accountsChanged', () => {
	  updatePlayButtonText();
  	});

	blockElement.textContent = currentBlock;

  const currentInterval = getBlockInterval(currentBlock - startBlock);
  const blocksToNextInterval = startBlock + (currentInterval * 10) - currentBlock;
  const blocksToWin = blockTarget - currentBlock;
  const targetProgress = ((80 - blocksToWin) / (80)) * 100;
  const thresholdProgress = ((currentBlock - startBlock) % 80) / 80 * 100;

  if (lastWin.toLowerCase() === connectedAddress.toLowerCase()) {
	lastWinnerElement.style.color = '#F4B400';
	lastWinnerElement.textContent = 'You';
	} else {
		lastWinnerElement.textContent = lastWin.substring(0, 7);
		lastWinnerElement.style.color = '#F4B400';
	}

  lastPotElement.textContent = (web3.utils.fromWei(lastPot, 'ether') * 1).toFixed(3);

  

  if (blocksToWin < 0){
	blocksToGoElement.textContent = '0';
  } else {
	blocksToGoElement.textContent = blocksToWin;
  }
  
  currentPeriodElement.textContent = (currentBlock - startBlock);
  targetElement.textContent = blockTarget;
  potElement.textContent = (web3.utils.fromWei(pot, 'ether') * 0.777).toFixed(3);

  targetProgressElement.style.width = targetProgress + '%';
  if (currentInterval == 1){
	thresholdProgressElement.style.width = '100%';
  } else {
	thresholdProgressElement.style.width = thresholdProgress + '%';
  }
  

  if (currentBlock >= blockTarget) {
    blockElement.style.color = '#0F9D58';
    winnerElement.style.color = '#0F9D58';
  } else {
    blockElement.style.color = '#fff';
  }
}, 1000);

function getBlockInterval(blocksSinceStart) {
  if (blocksSinceStart < 500) return 80;
  if (blocksSinceStart < 1000) return 40;
  if (blocksSinceStart < 1500) return 20;
  if (blocksSinceStart < 2000) return 10;
  return 5;
}
});






