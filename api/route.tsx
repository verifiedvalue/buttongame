/** @jsxImportSource frog/jsx */
import { Button, Frog, parseEther } from 'frog';
import { devtools } from 'frog/dev'
import { handle } from 'frog/next';
import abi from './abi.json';
import { serveStatic } from 'frog/serve-static'
import { base, degen, mainnet } from "viem/chains";
import { createWalletClient, http, createPublicClient, formatEther } from "viem";


const CONTRACT = "0x4d9Ef8693C276d98D1B13894d65688856Cc0DC13";

const publicClient = createPublicClient({
  chain: degen,
  transport: http()
});

const ethClient = createPublicClient({
  chain: mainnet,
  transport: http()
});

const baseClient = createPublicClient({
  chain: base,
  transport: http()
});

const client = createWalletClient({
  chain: mainnet,
  transport: http()
});


const app = new Frog({
  assetsPath: '/',
  basePath: '/api',
});

app.frame('/', async (c) => {
//const gameStats = await getGame() as String;
 
async function getGameStats(){
  console.log("Getting Stats")
  //const chainId = await publicClient.getChainId()
  const blockNumber = await baseClient.getBlockNumber() 
  console.log("Block: ", blockNumber);
  try {
    //Winner Getter
    const currentWinner = await publicClient.readContract({
      address: CONTRACT,
      abi: abi.abi,
      functionName: "currentWinner",
    }) as string;
    console.log("Winner:", currentWinner);

    //Pot Getter
    const potAmt = await publicClient.readContract({
      address: CONTRACT,
      abi: abi.abi,
      functionName: "pot",
    });
    const potDegen = formatEther(potAmt as bigint);
    console.log("Pot Amount: ", potDegen);

    //Blocks Getter
    const endBlock = await publicClient.readContract({
      address: CONTRACT,
      abi: abi.abi,
      functionName: "blockTarget",
    });
    var blocksToGo = ((endBlock as bigint)-blockNumber);

    console.log("Blocks To Go: ", blocksToGo);
    // return [currentWinner, potDegen, blocksToGo]
    if (blocksToGo < 0) {
      return {
        currentWinner: currentWinner.toString().substring(0,6),
        potDegen: potDegen.toString(),
        blocksToGo: 'Game Over'
    };
    } else {
      return {
        currentWinner: currentWinner.toString().substring(0,6),
        potDegen: potDegen.toString(),
        blocksToGo: blocksToGo.toString()
    };
    }

  } catch (error) {
    console.log("Could not fetch game stats");
    return error;
  }
}

const { currentWinner, potDegen, blocksToGo } = await getGameStats() as String;

return c.res({

  image: (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center', // Centers children vertically within the container
      alignItems: 'center', // Centers children horizontally within the container
      fontSize: 60,
      textAlign: 'center',
      width: '100vw', // Viewport width to ensure full coverage horizontally
      height: '100vh', // Viewport height to ensure full coverage vertically
      position: 'absolute',
      top: 0,
      left: 0,
      backgroundColor: 'black'
    }}>
      <div style={{
        color: 'purple',
        fontSize: 60,
      }}>BUTTON GAME</div>

      
      <div id="pot" style={{ //POT LOGIC
        display: 'flex',
        color: 'white',
        fontSize: 40,
      }}>
        <div style={{
        color: 'white',
        fontSize: 40,
      }}>POT  | 🎩</div>
      <div style={{
        color: 'green',
        fontSize: 40,
      }}>{potDegen}</div>
      </div>


      <div id="winner" style={{ //WINNER LOGIC
        display: 'flex',
        color: 'white',
        fontSize: 40,
      }}>
        <div style={{
        color: 'white',
        fontSize: 40,
      }}>WINNER  |</div>
      <div style={{
        color: 'white',
        fontSize: 40,
      }}>{currentWinner}</div>
      </div>



      <div id="blocks" style={{ //BLOCKS LOGIC
        display: 'flex',
        color: 'white',
        fontSize: 40,
      }}>
        <div style={{
        color: 'white',
        fontSize: 40,
      }}>BLOCKS TO GO  |</div>
      <div style={{
        color: 'white',
        fontSize: 40,
      }}>{blocksToGo}</div>
      </div>



      <div style={{ //FOOTER
        color: 'purple',
        fontSize: 60,
      }}>degens only</div>
    </div>
    
  
    

    
    
    


  ),
  intents: [
    <Button action="/">stats ⟳</Button>, 
    <Button.Link href="https://explorer.degen.tips/address/0x4d9Ef8693C276d98D1B13894d65688856Cc0DC13">contract</Button.Link>, 
    <Button.Link href="https://buttongame.xyz">play</Button.Link> 
  ]
})
});




devtools(app, { serveStatic });
export const GET = handle(app);
export const POST = handle(app);