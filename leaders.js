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
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "blockHeldDuration",
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
      "name": "blockReset",
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
          "name": "",
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
        },
        {
          "internalType": "bool[]",
          "name": "",
          "type": "bool[]"
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
      "name": "getBlock",
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

const gameContractAddress = '0xEEbD89daFA4Cb57ED0342A5405b84D2f7a059e96';
const degenProvider = new Web3('https://rpc.degen.tips');
const ethProvider = new ethers.providers.JsonRpcProvider('https://eth-mainnet.public.blastapi.io');
gameContract = new degenProvider.eth.Contract(gameAbi, gameContractAddress);


async function displayTopPlayers() {
  try {
      const pokemonList = await getPokemonList(); // Load Pokémon names
      const result = await gameContract.methods.getAllPlayerStats().call();
      const winner = await gameContract.methods.currentWinner().call();
      const addresses = result[0];
      const counts = result[1].map(Number);
      const freeStatus = result[2];
      const durations = result[3].map(Number); // Assuming duration data is the fourth item in the array
      //const ensNames = await getEnsBatch(addresses); // Use batch ENS lookup
      
      console.log("check 1");
      let players = addresses.map((address, index) => ({
          address: address,
          plays: counts[index],
          duration: durations[index]/69, // Include duration data
          //ensName: ensNames[index],
          freePlay: freeStatus[index] // Include resolved ENS names
      }));

      // Sort players by the number of plays in descending order
      players.sort((a, b) => b.duration - a.duration);
      console.log("check 2");
      const tbody = document.getElementById('leaderboard').getElementsByTagName('tbody')[0];
      tbody.innerHTML = ''; // Clear existing entries
      console.log("clearing html");
      console.log(players);
      players.forEach((player, index) => {
          const row = tbody.insertRow();
          const cell1 = row.insertCell(0);
          const cell2 = row.insertCell(1);
          const cell3 = row.insertCell(2);
          const cell4 = row.insertCell(3);

          cell1.innerHTML = index + 1;

          let badges = "";
          let badgeDescriptions = "";

          //Badge for Winner
          if (player.address === winner) {
              badges += '<span title="Last Degen">🎩</span>';
              badgeDescriptions += "Last Degen; ";
          }

          // Badge for the top player
          if (index === 0) {
              badges += '<span title="Top Player">👑</span>';
              badgeDescriptions += "Top Player; ";
          } else if (index < 10) {
              badges += '<span title="Top 10 Player">🏅</span>';
              badgeDescriptions += "Top 10 Player; ";
          }

          //Badge for FREE player
          if (player.freePlay == true) {
              badges += '<span title="FREE /69">🆓</span>';
              badgeDescriptions += "FREE /69; ";
          }

          // Additional badges based on number of plays
          if (player.plays >= 777) {
              badges += '<span title="777+ Plays">🎰</span>';
              badgeDescriptions += "777+ Plays; ";
          } else if (player.plays >= 100) {
              badges += '<span title="100+ Plays">💯</span>';
              badgeDescriptions += "100+ Plays; ";
          } else if (player.plays >= 10) {
              badges += '<span title="10+ Plays">🔟</span>';
              badgeDescriptions += "10+ Plays; ";
          }

          // Pokémon name badge
          const ensBaseName = player.ensName.split('.eth')[0]; // Get the part before ".eth"
          const pokemonBadge = pokemonList.some(pokemon => pokemon.toLowerCase() === ensBaseName.toLowerCase());
          if (pokemonBadge) {
              badges += '<span title="Pokémon Trainer">🎴</span>';
              badgeDescriptions += "Pokémon Trainer; ";
          }

          // Badge for ENS registered names
          if (player.ensName.includes('.eth')) {
              badges += '<span title="ENS Registered">🟣</span>';
              badgeDescriptions += "ENS Registered; ";
          }

          cell2.innerHTML = player.ensName;
          cell3.innerHTML = badges;
          cell3.title = badgeDescriptions.trim();
          cell4.innerHTML = Math.floor(player.duration);
      });

      document.getElementById('loadingMessage').style.display = 'none';
      document.getElementById('leaderboard').style.display = 'table';
  } catch (error) {
      console.error("Failed to fetch or process player data:", error);
      document.getElementById('loadingMessage').innerHTML = 'Failed to load data.';
  }
}
async function getPokemonList() {
    try {
        const response = await fetch('/pokemon.txt');
        const data = await response.text();
        return data.split('\n').map(line => line.trim());
    } catch (error) {
        console.error("Failed to fetch Pokémon data:", error);
        return [];
    }
}

function limitConcurrency(tasks, limit) {
  let active = 0; // Number of active tasks
  let index = 0; // Current index in the tasks array
  let results = new Array(tasks.length); // Pre-allocate array to store results

  return new Promise(resolve => {
      const executor = () => {
          while (active < limit && index < tasks.length) {
              active++; // Increment active count
              const currentIndex = index;
              const task = tasks[index++];
              task().then(result => {
                  results[currentIndex] = result; // Store result in corresponding position
                  active--; // Decrement active count
                  if (results.filter(r => r !== undefined).length === tasks.length) {
                      resolve(results); // Resolve the promise if all tasks are complete
                  } else {
                      executor(); // Continue executing tasks
                  }
              }).catch(error => {
                  results[currentIndex] = { error }; // Store error in results
                  active--; // Decrement active count
                  executor(); // Continue executing tasks
              });
          }
      };
      executor(); // Start executing tasks
  });
}

const ensCache = {}; // Simple in-memory cache

async function getEns(address) {
    if (ensCache[address]) {
        return ensCache[address]; // Return cached value if available
    }
    try {
        const ensName = await ethProvider.lookupAddress(address);
        ensCache[address] = ensName || address; // Cache the result, default to address if no ENS name
        return ensCache[address];
    } catch (error) {
        console.error("ENS lookup failed for address:", address, error);
        return address; // Default to address on failure
    }
}

async function getEnsBatch(addresses) {
  // Wraps getEns function calls into a task array
  const tasks = addresses.map(address => () => getEns(address));
  // Use the manual concurrency limit function
  return await limitConcurrency(tasks, 5);
}

// You might want to call this function when the window loads
window.onload = function() {
    displayTopPlayers();
};