/* global solanaWeb3 */

/////////////////////////////
// CONFIG
/////////////////////////////
const PROGRAM_ID = "BzRDQGEakfGQJrucuScr77QoQdckmLmNGSdqveea9MyL";
const GAME_MINT  = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

const STATE = "FnCLwBY38p1LUtCs6GaC438EZ3HmanAdAhGB4nfNANAz";
const VAULT = "CbpG1mzYkbPKAKcVMDsjfPnqJhDdHceHXuuQ9UUeA9K";

let CLUSTER = "devnet"; // change if needed

/////////////////////////////
// SOLANA
/////////////////////////////
const { Connection, PublicKey, Transaction, TransactionInstruction } = solanaWeb3;

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYSVAR_CLOCK_PUBKEY = new PublicKey("SysvarC1ock11111111111111111111111111111111");

const programIdPk = new PublicKey(PROGRAM_ID);
const mintPk = new PublicKey(GAME_MINT);
const statePk = new PublicKey(STATE);
const vaultPk = new PublicKey(VAULT);

let connection = null;

/////////////////////////////
// UI
/////////////////////////////
const el = (id) => document.getElementById(id);

const walletDot = el("walletDot");
const walletText = el("walletText");
const connectBtn = el("connectBtn");
const disconnectBtn = el("disconnectBtn");

const potDisplay = el("potDisplay");
const phaseText = el("phaseText");
const mainBtn = el("mainBtn");
const mainHint = el("mainHint");

const clockLabel = el("clockLabel");
const clockDisplay = el("clockDisplay");
const barFill = el("barFill");

const toggleDetailsBtn = el("toggleDetailsBtn");
const detailsPanel = el("detailsPanel");

const programLink = el("programLink");
const stateLink = el("stateLink");
const vaultLink = el("vaultLink");
const mintLink = el("mintLink");

const winnerLink = el("winnerLink");
const unclaimedText = el("unclaimedText");
const playCostText = el("playCostText");
const vaultText = el("vaultText");

// Winner log container (add to HTML as described)
const winnerLogEl = el("winnerLog");

// Threshold / progress panel elements

const tpProjectedPot = el("tpProjectedPot");
const tpVaultBalance = el("tpVaultBalance");
const tpPlays = el("tpPlays");
const tpDivisor = el("tpDivisor");
const tpBarFill = el("tpBarFill");
const tpBarLeft = el("tpBarLeft");
const tpBarRight = el("tpBarRight");
const tpFoot = el("tpFoot");

const tier0 = el("tier0");
const tier1 = el("tier1");
const tier2 = el("tier2");
const tier0Reward = el("tier0Reward");
const tier1Reward = el("tier1Reward");
const tier2Reward = el("tier2Reward");

/////////////////////////////
// Frontend state
/////////////////////////////
let walletPubkey = null;
let mintDecimals = 6;

let latestState = null;
let latestVaultAmount = 0n;

let mainMode = "PLAY";   // "PLAY" | "CLAIM"
let claimArmed = false;  // true only when CLAIM should actually submit a tx

// ---- Session-only winner history ----
const MAX_WINNER_LOG = 25;
let lastWinnerSeen = null; // base58 string
let winnerHistory = []; // { winner, tsMs }

/////////////////////////////
// SFX (press / release)
/////////////////////////////
const sfxPlayComplete = new Audio("play.wav");
sfxPlayComplete.preload = "auto";
sfxPlayComplete.volume = 0.8;

// When YOU play successfully, we skip the NEXT woosh-triggered reset once
let suppressNextWoosh = false;

const sfxDown = new Audio("clickdown.wav");
const sfxUp = new Audio("clickup.wav");

// optional: make it feel snappier
sfxDown.preload = "auto";
sfxUp.preload = "auto";

let audioUnlocked = false;
let wasWinnerLastRender = false;

function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // Just force-load the audio; DO NOT play it.
  // Calling .load() is safe and won't loop anything.
  try { sfxDown.load(); } catch {}
  try { sfxUp.load(); } catch {}
  try { winnerSong.load(); } catch {}
  try { sfxWoosh.load(); } catch {}
  try { sfxPlayComplete.load(); } catch {}
}

function playSfx(aud) {
  if (!aud) return;
  try {
    aud.currentTime = 0;
    aud.play().catch(() => {});
  } catch {}
}

/////////////////////////////
// Winner song (plays while YOU are current winner)
/////////////////////////////
const winnerSong = new Audio("winner.wav"); // <-- change filename to your actual song file
winnerSong.preload = "auto";
winnerSong.loop = true;
winnerSong.volume = 0.3; // tweak

let winnerSongPlaying = false;

function startWinnerSong() {
  if (winnerSongPlaying) return;

  // MUST be called from user gesture to guarantee playback.
  // If blocked, we don't keep retrying every render tick (handled by transition gating).
  winnerSong.currentTime = 0;
  winnerSong.play().then(() => {
    winnerSongPlaying = true;
  }).catch(() => {
    winnerSongPlaying = false;
  });
}

function stopWinnerSong() {
  try { winnerSong.pause(); } catch {}
  try { winnerSong.currentTime = 0; } catch {}
  winnerSongPlaying = false;
}

async function initAudioCtxOnce() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Load woosh into a decoded buffer
  const resp = await fetch("woosh.wav");
  const arr = await resp.arrayBuffer();
  wooshBuf = await audioCtx.decodeAudioData(arr);
}

/////////////////////////////
// WOOSH (timer reset SFX) - HTMLAudio version (reliable)
/////////////////////////////
const sfxWoosh = new Audio("woosh.wav");
sfxWoosh.preload = "auto";
sfxWoosh.volume = 0.6;

let lastTimerEndSeen = null; // number | null

function playWoosh() {
  // Must already be unlocked by a user gesture (your pointerdown does that)
  try {
    sfxWoosh.pause();          // stop any current woosh
    sfxWoosh.currentTime = 0;  // rewind
    sfxWoosh.play().catch(() => {});
  } catch {}
}


/////////////////////////////
// Helpers
/////////////////////////////
function rpcUrl() {
  if (CLUSTER === "devnet") return "https://api.devnet.solana.com";
  return "https://api.mainnet-beta.solana.com";
}

function solscanAccountUrl(pubkey) {
  if (CLUSTER === "devnet") return `https://solscan.io/account/${pubkey}?cluster=devnet`;
  return `https://solscan.io/account/${pubkey}`;
}
function solscanTxUrl(sig) {
  if (CLUSTER === "devnet") return `https://solscan.io/tx/${sig}?cluster=devnet`;
  return `https://solscan.io/tx/${sig}`;
}

function addLog(line, linkUrl = null) {
  const log = el("activityLog");
  if (!log) return;

  const div = document.createElement("div");
  div.className = "logLine";
  if (linkUrl) {
    div.innerHTML = `${escapeHtml(line)} — <a href="${linkUrl}" target="_blank" rel="noreferrer" style="text-decoration:underline;">view</a>`;
  } else {
    div.textContent = line;
  }
  log.prepend(div);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function fmtClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function fmtTokenRounded(baseUnitsBigInt) {
  // 1 decimal max, because pot will be huge
  const denom = 10 ** mintDecimals;
  const v = Number(baseUnitsBigInt) / denom;
  return v.toFixed(0);
}

function fmtTokenExact(baseUnitsBigInt) {
  const d = BigInt(10) ** BigInt(mintDecimals);
  const whole = baseUnitsBigInt / d;
  const frac = baseUnitsBigInt % d;
  const fracStr = frac.toString().padStart(mintDecimals, "0").slice(0, Math.min(6, mintDecimals));
  return mintDecimals === 0 ? `${whole}` : `${whole}.${fracStr}`;
}

function shortPk(pk58) {
  if (!pk58 || pk58.length < 10) return pk58 || "—";
  return `${pk58.slice(0, 4)}…${pk58.slice(-4)}`;
}

function fmtLocalTime(tsMs) {
  return new Date(tsMs).toLocaleString();
}

async function getMintDecimals() {
  const info = await connection.getParsedAccountInfo(mintPk, "confirmed");
  const parsed = info?.value?.data?.parsed;
  const decimals = parsed?.info?.decimals;
  if (typeof decimals === "number") return decimals;
  return mintDecimals;
}

// Matches on-chain pot divisor logic (based on session_plays)
function potDivisorFromPlays(sessionPlays) {
  const p = Number(sessionPlays || 0);
  if (p < 250) return 40n;
  if (p < 1000) return 10n;
  if (p < 5000) return 5n;
  return 5n;
}

function fmtTierReward(divisorBigInt) {
    let playAmount = BigInt(0);
    if (divisorBigInt == 5n) playAmount = 25000n * 1000000000n;
    else if (divisorBigInt == 10n) playAmount = 2500n * 1000000000n;
    else if (divisorBigInt == 20n) playAmount = 250n * 1000000000n;
    else playAmount = 0n;



  const pot = divisorBigInt > 0n ? ((latestVaultAmount + playAmount) / divisorBigInt): 0n;

  return `${fmtTokenRoundedWithCommas(pot)}`;
}

function updateThresholdPanel() {
  if (!tpProjectedPot || !latestState) return;

  const plays = Number(latestState.sessionPlays || 0);
  const divisor = potDivisorFromPlays(plays);
  const currentTier = Number(100n)/Number(divisor);


  
  tpVaultBalance.textContent = fmtTokenRoundedWithCommas(latestVaultAmount);
  tpProjectedPot.textContent = currentTier + "% of Vault";
  tpPlays.textContent = String(plays);
  tpDivisor.textContent = String(divisor);

  // Tier rewards
  if (tier0Reward) tier0Reward.textContent = fmtTierReward(20n);
  if (tier1Reward) tier1Reward.textContent = fmtTierReward(10n);
  if (tier2Reward) tier2Reward.textContent = fmtTierReward(5n);

  // Active tier highlight
  if (tier0) tier0.classList.toggle("tpTierActive", plays > 249 && plays < 2500);
  if (tier1) tier1.classList.toggle("tpTierActive", plays >2499 && plays < 25000);
  if (tier2) tier2.classList.toggle("tpTierActive", plays >= 25000);

  // Progress to next unlock
  let left = 0, right = 250;
  if (plays < 250) { left = 0; right = 250; }
  else if (plays < 1000) { left = 250; right = 1000; }
  else if (plays < 5000) { left = 1000; right = 5000; }
  else { left = 5000; right = 5000; }


  if (right === left) {
    if (tpBarFill) tpBarFill.style.width = "100%";
    if (tpBarLeft) tpBarLeft.textContent = `${plays} plays`;
    if (tpBarRight) tpBarRight.textContent = `Max tier`;
    if (tpFoot) tpFoot.textContent = "You’re in the max tier. Rewards are projected from current vault balance.";
  } else {
    const span = Math.max(1, (right - left));
    const pct = Math.max(0, Math.min(1, (plays - left) / span));
    if (tpBarFill) tpBarFill.style.width = `${pct * 100}%`;

    if (tpBarLeft) tpBarLeft.textContent = `${plays} plays`;
    if (tpBarRight) tpBarRight.textContent = `Next unlock: ${right}`;
    if (tpFoot) tpFoot.textContent = "Rewards are projected from current vault balance.";
  }
}

const tokenIntFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const tokenFracFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 });

function fmtTokenRoundedWithCommas(baseUnitsBigInt) {
  // whole tokens (0 decimals shown), with commas
  const denom = 10 ** mintDecimals;
  const v = Number(baseUnitsBigInt) / denom;
  return tokenIntFormatter.format(v);
}

function fmtTokenExactWithCommas(baseUnitsBigInt) {
  // up to 6 decimals shown, with commas
  const denom = 10 ** mintDecimals;
  const v = Number(baseUnitsBigInt) / denom;
  return tokenFracFormatter.format(v);
}

/////////////////////////////
// Manual state decode (no borsh)
/////////////////////////////
function readPubkey(data, offset) {
  return new PublicKey(data.slice(offset, offset + 32));
}
function readU64(data, offset) {
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return BigInt(view.getBigUint64(0, true));
}
function readI64(data, offset) {
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return Number(view.getBigInt64(0, true));
}
function readU32(data, offset) {
  const view = new DataView(data.buffer, data.byteOffset + offset, 4);
  return Number(view.getUint32(0, true));
}
function decodeState(accountData) {
  const data = accountData.slice(8); // skip discriminator
  let o = 0;

  const owner = readPubkey(data, o); o += 32;
  const tokenMint = readPubkey(data, o); o += 32;
  const vault = readPubkey(data, o); o += 32;

  const playCost = readU64(data, o); o += 8;
  const roundDurationSecs = readI64(data, o); o += 8;

  const currentWinner = readPubkey(data, o); o += 32;
  const currentWinnerAta = readPubkey(data, o); o += 32;

  const timerEnd = readI64(data, o); o += 8;
  const cooldownEnd = readI64(data, o); o += 8;

  const unclaimed = data[o] === 1; o += 1;

  // NEW (on-chain): session_plays u32
  const sessionPlays = readU32(data, o); o += 4;

  const enabled = data[o] === 1; o += 1;
  const bump = data[o];

  return {
    owner, tokenMint, vault,
    playCost, roundDurationSecs,
    currentWinner, currentWinnerAta,
    timerEnd, cooldownEnd,
    unclaimed, sessionPlays, enabled, bump
  };
}

/////////////////////////////
// Anchor discriminators + ix builders (no Anchor client)
/////////////////////////////
async function sha256Bytes(message) {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}
async function anchorDiscriminator(ixName) {
  const preimage = `global:${ixName}`;
  const hash = await sha256Bytes(preimage);
  return hash.slice(0, 8);
}

function findAta(ownerPk, mintPk2) {
  const [ata] = PublicKey.findProgramAddressSync(
    [ownerPk.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintPk2.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return ata;
}

async function buildPlayIx({ playerPk, playerAtaPk, previousWinnerAtaPk }) {
  const disc = await anchorDiscriminator("play");
  const data = disc;

  const keys = [
    { pubkey: statePk, isSigner: false, isWritable: true },
    { pubkey: vaultPk, isSigner: false, isWritable: true },
    { pubkey: playerPk, isSigner: true, isWritable: true },
    { pubkey: playerAtaPk, isSigner: false, isWritable: true },
    { pubkey: previousWinnerAtaPk, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({ programId: programIdPk, keys, data });
}

async function buildClaimIx({ winnerPk, winnerAtaPk }) {
  const disc = await anchorDiscriminator("claim");
  const data = disc;

  const keys = [
    { pubkey: statePk, isSigner: false, isWritable: true },
    { pubkey: vaultPk, isSigner: false, isWritable: true },
    { pubkey: winnerPk, isSigner: true, isWritable: true },
    { pubkey: winnerAtaPk, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({ programId: programIdPk, keys, data });
}

/////////////////////////////
// Phase logic
/////////////////////////////
function computePhase(gs, now) {
  if (!gs?.enabled) return "DISABLED";
  if (gs.timerEnd === 0) return "IDLE";
  if (now <= gs.timerEnd) return "ACTIVE";
  if (now > gs.timerEnd && now < gs.cooldownEnd) return "COOLDOWN";
  if (gs.unclaimed) return "POST_COOLDOWN_UNCLAIMED";
  return "IDLE";
}

function phaseLabel(phase) {
  switch (phase) {
    case "DISABLED": return "Game not enabled";
    case "IDLE": return "Waiting for a play";
    case "ACTIVE": return "Round live — last press wins";
    case "COOLDOWN": return "Cooldown — winner may claim";
    case "POST_COOLDOWN_UNCLAIMED": return "Round ended — winner may claim anytime, or first press auto-pays";
    default: return "—";
  }
}

/////////////////////////////
// Winner log (this session)
/////////////////////////////
function trackWinnerChanges(gs) {
  if (!gs) return;
  const winner58 = gs.currentWinner.toBase58();
  const default58 = PublicKey.default.toBase58();

  // Don’t log default (no winner)
  if (winner58 === default58) return;

  // Initialize lastWinnerSeen on first non-default observation:
  if (lastWinnerSeen === null) {
    lastWinnerSeen = winner58;
    pushWinnerEntry(winner58, Date.now(), true);
    return;
  }

  // If unchanged, do nothing
  if (winner58 === lastWinnerSeen) return;

  // Winner changed
  lastWinnerSeen = winner58;
  pushWinnerEntry(winner58, Date.now(), false);
}

function pushWinnerEntry(winner58, tsMs, isInitial) {
  // Dedupe: if the newest entry is same winner, skip
  if (winnerHistory.length > 0 && winnerHistory[0].winner === winner58) return;

  winnerHistory.unshift({ winner: winner58, tsMs, isInitial });
  if (winnerHistory.length > MAX_WINNER_LOG) winnerHistory.length = MAX_WINNER_LOG;

  renderWinnerLog();
}

function fmtSince(tsMs) {
  const deltaSec = Math.max(0, Math.floor((Date.now() - tsMs) / 1000));
  const mm = Math.floor(deltaSec / 60);
  const ss = deltaSec % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")} ago`;
}

function renderWinnerLog() {
  if (!winnerLogEl) return;

  winnerLogEl.innerHTML = "";

  const connected58 = walletPubkey ? walletPubkey.toBase58() : null;

  winnerHistory.forEach((row, idx) => {
    const div = document.createElement("div");
    div.className = "logLine";

    const isTop = idx === 0;
    const isYou = connected58 && row.winner === connected58;

    // Highlight rules
    if (isYou && isTop) {
      div.style.border = "1px solid rgba(255, 215, 0, .55)";
      div.style.background = "rgba(255, 215, 0, .10)";
    } else if (isYou) {
      div.style.border = "1px solid rgba(0, 255, 140, .40)";
      div.style.background = "rgba(0, 255, 140, .08)";
    }

    // Display name
    const displayName = isYou ? "You" : shortPk(row.winner);
    const since = fmtSince(row.tsMs);

    // clickable account link
    const url = solscanAccountUrl(row.winner);

    div.innerHTML =
      `<strong>${isTop ? "Current winner" : ""}</strong>` +
      `${isTop ? " " : ""}` +
      `<span title="${escapeHtml(row.winner)}">${escapeHtml(displayName)}</span>` +
      ` <span style="opacity:.7">(${escapeHtml(since)})</span>` +
      ` — <a href="${url}" target="_blank" rel="noreferrer" style="text-decoration:underline;">solscan</a>`;

    winnerLogEl.appendChild(div);
  });
}

/////////////////////////////
// Wallet
/////////////////////////////
function getWalletProvider() {
  const any = window.solana;
  if (any && any.isPhantom) return any;
  if (any) return any;
  return null;
}

async function connectWallet() {
  const provider = getWalletProvider();
  if (!provider) {
    alert("No Solana wallet found. Install Phantom.");
    return;
  }
  const resp = await provider.connect({ onlyIfTrusted: false });
  walletPubkey = resp.publicKey;
  addLog(`Wallet connected: ${walletPubkey.toBase58()}`);

  disconnectBtn.style.display = "inline-block";
  connectBtn.style.display = "none";
  render(); // update CTA immediately
}

async function disconnectWallet() {
  const provider = getWalletProvider();
  try { await provider?.disconnect?.(); } catch {}
  walletPubkey = null;

  disconnectBtn.style.display = "none";
  connectBtn.style.display = "inline-block";
  stopWinnerSong();
  addLog("Wallet disconnected");
  render();
}

function renderWalletPill() {
  if (walletPubkey) {
    walletDot.classList.add("on");
    walletText.textContent = `Connected: ${walletPubkey.toBase58().slice(0,4)}…${walletPubkey.toBase58().slice(-4)}`;
  } else {
    walletDot.classList.remove("on");
    walletText.textContent = "Not connected";
  }
}

/////////////////////////////
// Read-only refresh
/////////////////////////////
async function refreshReadOnly() {
  try {
    mintDecimals = await getMintDecimals().catch(() => mintDecimals);

    const [stateAcc, vaultBal] = await Promise.all([
      connection.getAccountInfo(statePk, "confirmed"),
      connection.getTokenAccountBalance(vaultPk, "confirmed"),
    ]);

    latestVaultAmount = BigInt(vaultBal?.value?.amount || "0")*10000000n;
    //latestVaultAmount = 100000000000000n;
    if (!stateAcc?.data) {
      latestState = null;
      phaseText.textContent = "State not found";
      mainBtn.classList.add("disabled");
      mainBtn.disabled = true;
      mainBtn.textContent = "ERROR";
      return;
    }

    latestState = decodeState(stateAcc.data);

    // --- Woosh on timer reset (timerEnd jumped forward) ---
    const newTimerEnd = Number(latestState.timerEnd || 0);

    // Initialize on first read (no sound)
    if (lastTimerEndSeen === null) {
    lastTimerEndSeen = newTimerEnd;
    } else {
    const timerReset = newTimerEnd > lastTimerEndSeen;

    if (timerReset) {
        // If YOU just played, you’ll hear play.wav instead of woosh once
        if (suppressNextWoosh) {
        suppressNextWoosh = false;
        } else {
        playWoosh();
        }
    }

    lastTimerEndSeen = newTimerEnd;
    }
    // Track winner changes for session log
    trackWinnerChanges(latestState);

    // Populate details links
    programLink.textContent = programIdPk.toBase58();
    programLink.href = solscanAccountUrl(programIdPk.toBase58());

    stateLink.textContent = statePk.toBase58();
    stateLink.href = solscanAccountUrl(statePk.toBase58());

    vaultLink.textContent = vaultPk.toBase58();
    vaultLink.href = solscanAccountUrl(vaultPk.toBase58());

    mintLink.textContent = mintPk.toBase58();
    mintLink.href = solscanAccountUrl(mintPk.toBase58());

    // Winner detail
    const w = latestState.currentWinner.toBase58();
    winnerLink.textContent = (w === PublicKey.default.toBase58()) ? "—" : w;
    winnerLink.href = (w === PublicKey.default.toBase58()) ? "#" : solscanAccountUrl(w);

    // show YES when unclaimed == true
    unclaimedText.textContent = latestState.unclaimed ? "NO" : "YES";

    playCostText.textContent = `${fmtTokenExact(latestState.playCost)} tokens`;
    vaultText.textContent = `${fmtTokenExact(latestVaultAmount)} tokens`;

    render();
  } catch (e) {
    console.error(e);
    addLog(`Read error: ${e.message || e.toString()}`);
  }
}

/////////////////////////////
// Render main UI
/////////////////////////////
function render() {
  renderWalletPill();

  if (!latestState) return;

  const now = nowSec();
  const phase = computePhase(latestState, now);

  // POT (matches on-chain logic: vault / divisor(session_plays))
  const divisor = potDivisorFromPlays(latestState.sessionPlays);
  const pot = divisor > 0 ? (latestVaultAmount / divisor) : 0n;
  potDisplay.textContent = fmtTokenRoundedWithCommas(pot);

  // Update thresholds/progress panel
  updateThresholdPanel();

  // Phase text
  phaseText.textContent = phaseLabel(phase);

    const winnerPk58 = latestState.currentWinner.toBase58();
    const isWinnerConnected = !!walletPubkey && walletPubkey.toBase58() === winnerPk58;
    const hasWinner = winnerPk58 !== PublicKey.default.toBase58();

    const shouldPlayWinnerSong = isWinnerConnected && hasWinner;

    // Only react on transitions
    if (shouldPlayWinnerSong && !wasWinnerLastRender) {
    startWinnerSong();
    console.log("Started winner song");
    } else if (!shouldPlayWinnerSong && wasWinnerLastRender) {
    stopWinnerSong();
    }

wasWinnerLastRender = shouldPlayWinnerSong;
  // CLOCK + BAR
  let secondsLeft = 0;
  let pct = 0;

  if (phase === "ACTIVE") {
    secondsLeft = latestState.timerEnd - now;
    clockLabel.textContent = "TIME";
    const duration = Math.max(1, latestState.roundDurationSecs || 1);
    const elapsed = duration - secondsLeft;
    pct = Math.max(0, Math.min(1, elapsed / duration));
  } else if (phase === "COOLDOWN") {
    secondsLeft = latestState.cooldownEnd - now;
    clockLabel.textContent = "COOLDOWN";
    const total = Math.max(1, (latestState.cooldownEnd - latestState.timerEnd) || 1);
    const elapsed = total - secondsLeft;
    pct = Math.max(0, Math.min(1, elapsed / total));
  } else if (phase === "POST_COOLDOWN_UNCLAIMED") {
    clockLabel.textContent = "READY";
    secondsLeft = 0;
    pct = 1;
  } else {
    clockLabel.textContent = "TIME";
    secondsLeft = 0;
    pct = 0;
  }

  clockDisplay.textContent = fmtClock(secondsLeft);
  barFill.style.width = `${pct * 100}%`;

  // MAIN BUTTON LOGIC (fixed for claim beyond cooldown):
  // - Winner sees CLAIM once timer has ended and pot is still unclaimed.
  // - CLAIM stays available/green regardless of cooldown end.
  // - PLAY is still available when appropriate (IDLE/ACTIVE/POST_COOLDOWN_UNCLAIMED).
  const connected = !!walletPubkey;

  // Winner can claim as long as:
  // - connected
  // - is current winner
  // - unclaimed
  // - game enabled
  // - timer has ended (now > timerEnd)
  const timerEnded = latestState.timerEnd > 0 && now > latestState.timerEnd;
  const shouldShowClaim = connected && isWinnerConnected && latestState.unclaimed && latestState.enabled && timerEnded;

  // Claim is always armed when shouldShowClaim is true (no cooldown restriction)
  claimArmed = shouldShowClaim;

  mainMode = shouldShowClaim ? "CLAIM" : "PLAY";

  if (mainMode === "CLAIM") {
    mainBtn.textContent = "CLAIM";
    mainBtn.classList.remove("disabled");
    mainBtn.classList.remove("claimLocked");
    mainBtn.classList.add("claimArmed"); // keep it green in your CSS
    mainBtn.disabled = false;
    mainHint.textContent = "Your win is unclaimed. Claim anytime.";
    renderWinnerLog();
    return;
  }

  // Otherwise: PLAY mode
  mainBtn.classList.remove("claimLocked", "claimArmed");

  // Can play only in ACTIVE/IDLE/POST_COOLDOWN_UNCLAIMED
  const canPlay = connected && latestState.enabled &&
    (phase === "ACTIVE" || phase === "IDLE" || phase === "POST_COOLDOWN_UNCLAIMED");

  if (canPlay) {
    mainBtn.textContent = "PLAY";
    mainBtn.disabled = false;
    mainBtn.classList.remove("disabled");

    if (phase === "POST_COOLDOWN_UNCLAIMED") {
      mainHint.textContent = "First press after cooldown auto-pays previous winner, then starts the next round.";
    } else {
      mainHint.textContent = "Each Button press is 1000 $BUTTON.";
    }
  } else {
    if (!connected) {
      mainBtn.textContent = "CONNECT";
      mainBtn.disabled = false; // allow press to connect
      mainBtn.classList.remove("disabled");
      mainHint.textContent = "Connect to press. Viewing is available without connecting.";
    } else {
      mainBtn.textContent = phase === "COOLDOWN" ? "COOLDOWN" : "WAIT";
      mainBtn.disabled = true;
      mainBtn.classList.add("disabled");

      if (phase === "COOLDOWN") {
        mainHint.textContent = "Cooldown active. Winner may claim (if unclaimed).";
      } else if (!latestState.enabled) {
        mainHint.textContent = "Game is not enabled.";
      } else {
        mainHint.textContent = "Waiting for the next round to start.";
      }
    }
  }

  renderWinnerLog();
}

/////////////////////////////
// Send transaction helper
/////////////////////////////
async function sendTx(ix) {
  const provider = getWalletProvider();
  if (!provider?.publicKey) throw new Error("Wallet not connected");

  // Faster wallet popup: don't wait for finalized just to sign
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: provider.publicKey });
  tx.add(ix);

  // Wallet popup happens here
  const signed = await provider.signTransaction(tx);

  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  addLog("Sent tx", solscanTxUrl(sig));

  // Confirm with the blockhash context (more reliable)
  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  addLog("Confirmed", solscanTxUrl(sig));
  return sig;
}

/////////////////////////////
// Main button action
/////////////////////////////
async function onMain() {
  if (!latestState) return;

  if (!walletPubkey) {
    await connectWallet();
    return;
  }

  const now = nowSec();
  const phase = computePhase(latestState, now);

  const winnerPk58 = latestState.currentWinner.toBase58();
  const isWinnerConnected = walletPubkey && walletPubkey.toBase58() === winnerPk58;

  // CLAIM path (fixed): allow claim whenever timer ended + unclaimed + winner
  const timerEnded = latestState.timerEnd > 0 && now > latestState.timerEnd;
  if (isWinnerConnected && latestState.unclaimed && latestState.enabled && timerEnded) {
    const winnerAta = latestState.currentWinnerAta;
    const ix = await buildClaimIx({ winnerPk: walletPubkey, winnerAtaPk: winnerAta });

    try {
      mainBtn.disabled = true;
      addLog("Claim: signing…");
      await sendTx(ix);
      addLog("Claim complete");
    } catch (e) {
      console.error(e);
      addLog(`Claim failed: ${e.message || e.toString()}`);
      alert(`Claim failed: ${e.message || e.toString()}`);
    } finally {
      await refreshReadOnly();
    }
    return;
  }

  // Play path
  const playerAta = findAta(walletPubkey, mintPk);

  const ataInfo = await connection.getAccountInfo(playerAta, "confirmed");
  if (!ataInfo) {
    alert("Your ATA for this mint does not exist. Receive tokens first (or create the ATA).");
    return;
  }

  // previousWinnerAta must always be a valid token account for this mint.
  // If currentWinnerAta is default/uninitialized, pass your own ATA.
  const DEFAULT_PUBKEY = "11111111111111111111111111111111";
  let prevWinnerAta = latestState.currentWinnerAta;
  if (prevWinnerAta.toBase58() === DEFAULT_PUBKEY) prevWinnerAta = playerAta;

  const ix = await buildPlayIx({
    playerPk: walletPubkey,
    playerAtaPk: playerAta,
    previousWinnerAtaPk: prevWinnerAta,
  });

  try {
    mainBtn.disabled = true;
    addLog("Play: signing…");
    await sendTx(ix);                 // confirmed inside sendTx()

    // You completed a play tx successfully:
    playSfx(sfxPlayComplete);

    // Suppress the next woosh since YOU likely caused the timer reset
    suppressNextWoosh = true;

    addLog("Play complete");
    } catch (e) {
    console.error(e);
    addLog(`Play failed: ${e.message || e.toString()}`);
    alert(`Play failed: ${e.message || e.toString()}`);
    } finally {
    await refreshReadOnly();
    }
}

/////////////////////////////
// Details toggle
/////////////////////////////
toggleDetailsBtn.addEventListener("click", () => {
  detailsPanel.classList.toggle("hidden");
  toggleDetailsBtn.textContent = detailsPanel.classList.contains("hidden") ? "Details" : "Hide";
});

/////////////////////////////
// INIT
/////////////////////////////
connectBtn.addEventListener("click", connectWallet);
disconnectBtn.addEventListener("click", disconnectWallet);

// Sounds on press/release (deduped)
let isPressing = false;

mainBtn.addEventListener("pointerdown", (e) => {
  unlockAudioOnce();

  isPressing = true;

  try { mainBtn.setPointerCapture(e.pointerId); } catch {}

  playSfx(sfxDown);
});

function handleReleaseOnce(e) {
  if (!isPressing) return;       // <- dedupe
  isPressing = false;

  // Optional: release capture
  if (e && typeof e.pointerId === "number") {
    try { mainBtn.releasePointerCapture(e.pointerId); } catch {}
  }

  unlockAudioOnce();
  playSfx(sfxUp);
}

mainBtn.addEventListener("pointerup", handleReleaseOnce);
mainBtn.addEventListener("pointercancel", handleReleaseOnce);
mainBtn.addEventListener("lostpointercapture", handleReleaseOnce);

// Keep your existing action
mainBtn.addEventListener("click", onMain);

(async function boot() {
  connection = new Connection(rpcUrl(), "confirmed");

  // initial details links
  programLink.textContent = programIdPk.toBase58();
  programLink.href = solscanAccountUrl(programIdPk.toBase58());
  stateLink.textContent = statePk.toBase58();
  stateLink.href = solscanAccountUrl(statePk.toBase58());
  vaultLink.textContent = vaultPk.toBase58();
  vaultLink.href = solscanAccountUrl(vaultPk.toBase58());
  mintLink.textContent = mintPk.toBase58();
  mintLink.href = solscanAccountUrl(mintPk.toBase58());

  // Try trusted connect
  const provider = getWalletProvider();
  if (provider?.isPhantom) {
    try {
      const resp = await provider.connect({ onlyIfTrusted: true });
      if (resp?.publicKey) {
        walletPubkey = resp.publicKey;
        disconnectBtn.style.display = "inline-block";
        connectBtn.style.display = "none";
        addLog(`Wallet auto-connected: ${walletPubkey.toBase58()}`);
      }
    } catch {}
  }

  await refreshReadOnly();
  setInterval(refreshReadOnly, 2000);
  setInterval(render, 500);

  // enable button once loaded
  mainBtn.disabled = false;
})();