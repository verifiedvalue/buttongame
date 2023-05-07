let gameContract;

async function isFreePlayEligible() {
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  const account = accounts[0];
  const freePlayUsed = await gameContract.methods.freePlayUsed(account).call();
  return !freePlayUsed;
}

async function updatePlayButtonText() {
  const isEligible = await isFreePlayEligible();
  const playButton = document.getElementById('playButton');
  playButton.innerText = isEligible ? '1 FREE PLAY' : 'PLAY 0.0069 ETH';
  playButton.color = "#0F9D58";
}

async function updatePlayButtonText(winner, connectedWallet) {
	const isEligible = await isFreePlayEligible();
	const playButton = document.getElementById('playButton');
	playButton.innerText = isEligible ? '1 FREE PLAY' : 'PLAY 0.0069 ETH';
  
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
		winnerElement.textContent = winnerAddress;
		winnerElement.style.color = '#4285F4';
	}
  }


async function playGame() {
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  const account = accounts[0];
  const isEligible = await isFreePlayEligible();
  const playAmount = isEligible ? '0' : web3.utils.toWei('.0069', 'ether');

  await gameContract.methods.play().send({ from: account, value: playAmount });
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
		"name": "firstPlayBlock",
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
		"name": "numPlayers",
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
	}
];
const gameContractAddress = '0x74100d9E49A38dF6c84964c6fd23BFd1b7B70f1e';
gameContract = new web3.eth.Contract(gameAbi, gameContractAddress);

const winnerElement = document.getElementById('winner');
const blockElement = document.getElementById('block');
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
	const firstPlayBlock = await gameContract.methods.firstPlayBlock().call();
	const lastBlockPlayed = await gameContract.methods.lastBlockPlayed().call();
	const lastWin = await gameContract.methods.lastWin().call();
	const lastPot = await gameContract.methods.lastPot().call();
    // Call updatePlayButtonText() when the page loads
	updatePlayButtonText(currentWinner, connectedAddress);
	updateWinnerText(currentWinner, connectedAddress, winnerElement);

	// Add an event listener for account changes
  	ethereum.on('accountsChanged', () => {
	  updatePlayButtonText();
  	});



  const currentInterval = getBlockInterval(currentBlock - firstPlayBlock);
  const blocksToNextInterval = firstPlayBlock + (currentInterval * 10) - currentBlock;
  const blocksToWin = blockTarget - currentBlock;
  const targetProgress = ((121 - blocksToWin) / (120)) * 100;
  console.log(blocksToWin);
  console.log(blockTarget - lastBlockPlayed);
  console.log(currentInterval);
  const thresholdProgress = ((currentBlock - firstPlayBlock) % 1000) / 999 * 100;

  if (lastWin.toLowerCase() === connectedAddress.toLowerCase()) {
	lastWinnerElement.style.color = '#F4B400';
	lastWinnerElement.textContent = 'You';
	} else {
		lastWinnerElement.textContent = lastWin;
		lastWinnerElement.style.color = '#F4B400';
	}

  lastPotElement.textContent = (web3.utils.fromWei(lastPot, 'ether') * 1).toFixed(3);

  blockElement.textContent = currentBlock;
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
    blockElement.style.color = '#4285F4';
  }
}, 500);

function getBlockInterval(blocksSinceStart) {
  if (blocksSinceStart < 1000) return 120;
  if (blocksSinceStart < 2000) return 45;
  if (blocksSinceStart < 3000) return 15;
  if (blocksSinceStart < 4000) return 5;
  return 2;
}
});






