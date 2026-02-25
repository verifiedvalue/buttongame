/* global solanaWeb3 */

/////////////////////////////
// CONFIG
/////////////////////////////
const PROGRAM_ID = "BzRDQGEakfGQJrucuScr77QoQdckmLmNGSdqveea9MyL";
const GAME_MINT  = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

const STATE = "FnCLwBY38p1LUtCs6GaC438EZ3HmanAdAhGB4nfNANAz";
const VAULT = "CbpG1mzYkbPKAKcVMDsjfPnqJhDdHceHXuuQ9UUeA9K";

let CLUSTER = "devnet"; // change if needed

// Poll tuning (critical state stays frequent; expensive reads are gated)
const STATE_POLL_MS = 2000;      // keep game state responsive
const UI_TICK_MS    = 100;       // smooth clock/progress UI (no RPC)
const VAULT_TTL_MS  = 30000;     // safety refresh for vault occasionally, even if plays don't change
const FAST_SYNC_MS  = 250;       // post-tx quick state sync burst
const FAST_SYNC_TRIES = 12;      // ~3 seconds

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

// Winner log container
const winnerLogEl = el("winnerNow");

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
let claimArmed = false;

// ---- Session-only winner history ----
const MAX_WINNER_LOG = 25;
let lastWinnerSeen = null; // base58 string
let winnerHistory = [];    // { winner, tsMs, isInitial }

// Winner song transition tracking
let wasWinnerLastRender = false;

/////////////////////////////
// RPC minimization state
/////////////////////////////
let lastStateSig = "";                 // signature of state fields used to detect meaningful changes
let lastPlaysSeen = null;              // used as primary trigger for expensive reads (vault)
let lastVaultFetchMs = 0;              // TTL-based backup refresh
let vaultFetchInFlight = false;
let statePollInFlight = false;

// Wallet ATA existence cache (per wallet session)
let cachedAtaOwner58 = null;
let cachedAtaExists = false;

/////////////////////////////
// AUDIO (Music + SFX toggles)
/////////////////////////////
let lastTimerEndSeen = null; // number | null
let suppressNextWoosh = false;

// UI buttons (add these to your HTML)
const musicMuteBtn = el("musicMuteBtn");
const sfxMuteBtn   = el("sfxMuteBtn");

// Persist user choice
const LS_MUSIC_MUTED = "buttonGame_musicMuted";
const LS_SFX_MUTED   = "buttonGame_sfxMuted";

let musicMuted = localStorage.getItem(LS_MUSIC_MUTED) === "1";
let sfxMuted   = localStorage.getItem(LS_SFX_MUTED) === "1";

// --- Music (global background) ---
const bgMusic = new Audio("winner.wav");
bgMusic.preload = "auto";
bgMusic.loop = true;
bgMusic.volume = 0.3;
let bgMusicPlaying = false;

// --- SFX ---
const sfxDown = new Audio("clickdown.wav");
const sfxUp   = new Audio("clickup.wav");
const sfxWoosh = new Audio("woosh.wav");
const sfxPlayComplete = new Audio("play.wav");

sfxDown.preload = "auto";
sfxUp.preload = "auto";
sfxWoosh.preload = "auto";
sfxPlayComplete.preload = "auto";

sfxWoosh.volume = 0.6;
sfxPlayComplete.volume = 0.8;

let audioUnlocked = false;

/**
 * Unlock audio once on a user gesture.
 * We "prime" SFX by playing muted briefly then pausing.
 */
function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // Load everything
  try { bgMusic.load(); } catch {}
  try { sfxDown.load(); } catch {}
  try { sfxUp.load(); } catch {}
  try { sfxWoosh.load(); } catch {}
  try { sfxPlayComplete.load(); } catch {}

  // Prime ONLY SFX (not bgMusic) to satisfy autoplay policies.
  const primeSfx = (aud) => {
    if (!aud) return;
    try {
      const prevMuted = aud.muted;
      const prevVol = aud.volume;

      aud.muted = true;
      aud.volume = 0;

      const p = aud.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          try { aud.pause(); } catch {}
          try { aud.currentTime = 0; } catch {}
          aud.muted = prevMuted;
          aud.volume = prevVol;
        }).catch(() => {
          aud.muted = prevMuted;
          aud.volume = prevVol;
        });
      } else {
        aud.muted = prevMuted;
        aud.volume = prevVol;
      }
    } catch {}
  };

  primeSfx(sfxDown);
  primeSfx(sfxUp);
  primeSfx(sfxWoosh);
  primeSfx(sfxPlayComplete);

  ensureBgMusicState();
}

function ensureBgMusicState() {
  bgMusic.muted = musicMuted;

  if (musicMuted) {
    stopBgMusic();
    return;
  }

  if (!bgMusicPlaying) {
    try {
      bgMusic.currentTime = 0;
      bgMusic.play().then(() => {
        bgMusicPlaying = true;
      }).catch(() => {
        bgMusicPlaying = false;
      });
    } catch {
      bgMusicPlaying = false;
    }
  }
}

function stopBgMusic() {
  try { bgMusic.pause(); } catch {}
  bgMusicPlaying = false;
}

// Unified SFX play helper (respects sfxMuted)
function playSfx(aud) {
  if (!aud || sfxMuted) return;

  try {
    // Clone so it doesn't fight the bgMusic element
    const a = aud.cloneNode(true);
    a.muted = false;
    a.volume = aud.volume;
    a.play().catch(() => {});
  } catch {}
}

function setMusicMuted(muted) {
  musicMuted = !!muted;
  localStorage.setItem(LS_MUSIC_MUTED, musicMuted ? "1" : "0");
  updateAudioButtons();
  ensureBgMusicState();
}

function setSfxMuted(muted) {
  sfxMuted = !!muted;
  localStorage.setItem(LS_SFX_MUTED, sfxMuted ? "1" : "0");
  updateAudioButtons();
}

function updateAudioButtons() {
  if (musicMuteBtn) musicMuteBtn.textContent = musicMuted ? "Music: OFF" : "Music: ON";
  if (sfxMuteBtn)   sfxMuteBtn.textContent   = sfxMuted ? "SFX: OFF"   : "SFX: ON";
}

if (musicMuteBtn) {
  musicMuteBtn.addEventListener("click", () => {
    unlockAudioOnce();
    setMusicMuted(!musicMuted);
  });
}
if (sfxMuteBtn) {
  sfxMuteBtn.addEventListener("click", () => {
    unlockAudioOnce();
    setSfxMuted(!sfxMuted);
  });
}
updateAudioButtons();

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

async function getMintDecimals() {
  const info = await connection.getParsedAccountInfo(mintPk, "confirmed");
  const parsed = info?.value?.data?.parsed;
  const decimals = parsed?.info?.decimals;
  if (typeof decimals === "number") return decimals;
  return mintDecimals;
}

let mintDecimalsLoaded = false;
async function ensureMintDecimals() {
  if (mintDecimalsLoaded) return;
  try {
    mintDecimals = await getMintDecimals();
    mintDecimalsLoaded = true;
  } catch {}
}

// Matches on-chain pot divisor logic (based on session_plays)
function potDivisorFromPlays(sessionPlays) {
  const p = Number(sessionPlays || 0);
  if (p < 250) return 40n;
  if (p < 1000) return 10n;
  if (p < 5000) return 5n;
  return 5n;
}

const tokenIntFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function fmtTokenRoundedWithCommas(baseUnitsBigInt) {
  const denom = 10 ** mintDecimals;
  const v = Number(baseUnitsBigInt) / denom;
  return tokenIntFormatter.format(v);
}

function fmtTierReward(divisorBigInt) {
  let playAmount = BigInt(0);
  // NOTE: your existing constants use 1e9 base units; keep as-is to match your game token math.
  if (divisorBigInt == 5n) playAmount = 25000n * 1000000000n;
  else if (divisorBigInt == 10n) playAmount = 2500n * 1000000000n;
  else if (divisorBigInt == 20n) playAmount = 250n * 1000000000n;

  const pot = divisorBigInt > 0n ? ((latestVaultAmount + playAmount) / divisorBigInt) : 0n;
  return `${fmtTokenRoundedWithCommas(pot)}`;
}

let lastThresholdKey = "";
function updateThresholdPanelIfNeeded() {
  if (!tpProjectedPot || !latestState) return;

  const key = `${latestState.sessionPlays}|${latestVaultAmount.toString()}`;
  if (key === lastThresholdKey) return;
  lastThresholdKey = key;

  const plays = Number(latestState.sessionPlays || 0);
  const divisor = potDivisorFromPlays(plays);
  const currentTier = Number(100n) / Number(divisor);

  tpVaultBalance.textContent = fmtTokenRoundedWithCommas(latestVaultAmount);
  tpProjectedPot.textContent = currentTier + "% of Vault";
  tpPlays.textContent = String(plays);
  tpDivisor.textContent = String(divisor);

  if (tier0Reward) tier0Reward.textContent = fmtTierReward(20n);
  if (tier1Reward) tier1Reward.textContent = fmtTierReward(10n);
  if (tier2Reward) tier2Reward.textContent = fmtTierReward(5n);

  if (tier0) tier0.classList.toggle("tpTierActive", plays > 249 && plays < 2500);
  if (tier1) tier1.classList.toggle("tpTierActive", plays > 2499 && plays < 25000);
  if (tier2) tier2.classList.toggle("tpTierActive", plays >= 25000);

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
// Anchor discriminators + ix builders (cached)
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

let PLAY_DISC = null;
let CLAIM_DISC = null;

async function getPlayDisc() {
  if (!PLAY_DISC) PLAY_DISC = await anchorDiscriminator("play");
  return PLAY_DISC;
}
async function getClaimDisc() {
  if (!CLAIM_DISC) CLAIM_DISC = await anchorDiscriminator("claim");
  return CLAIM_DISC;
}

function findAta(ownerPk, mintPk2) {
  const [ata] = PublicKey.findProgramAddressSync(
    [ownerPk.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintPk2.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return ata;
}

async function buildPlayIx({ playerPk, playerAtaPk, previousWinnerAtaPk }) {
  const data = await getPlayDisc();

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
  const data = await getClaimDisc();

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
  if (winner58 === default58) return;

  if (lastWinnerSeen === null) {
    lastWinnerSeen = winner58;
    pushWinnerEntry(winner58, Date.now(), true);
    return;
  }
  if (winner58 === lastWinnerSeen) return;

  lastWinnerSeen = winner58;
  pushWinnerEntry(winner58, Date.now(), false);
}

function pushWinnerEntry(winner58, tsMs, isInitial) {
  if (winnerHistory.length > 0 && winnerHistory[0].winner === winner58) return;

  winnerHistory.unshift({ winner: winner58, tsMs, isInitial });
  if (winnerHistory.length > MAX_WINNER_LOG) winnerHistory.length = MAX_WINNER_LOG;

  renderWinnerLog(); // only re-render when log data changes
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

    if (isYou && isTop) {
      div.style.border = "1px solid rgba(255, 215, 0, .55)";
      div.style.background = "rgba(255, 215, 0, .10)";
    } else if (isYou) {
      div.style.border = "1px solid rgba(0, 255, 140, .40)";
      div.style.background = "rgba(0, 255, 140, .08)";
    }

    const displayName = isYou ? "You" : shortPk(row.winner);
    const since = fmtSince(row.tsMs);
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
// Wallet (improved wallet switching)
/////////////////////////////
function getWalletProvider() {
  const any = window.solana;
  if (any && any.isPhantom) return any;
  if (any) return any;
  return null;
}

let walletListenersInstalled = false;

function installWalletListeners(provider) {
  if (!provider || walletListenersInstalled) return;
  walletListenersInstalled = true;

  provider.on?.("accountChanged", (pubkey) => {
    if (!pubkey) {
      walletPubkey = null;
      disconnectBtn.style.display = "none";
      connectBtn.style.display = "inline-block";

      // clear ATA cache
      cachedAtaOwner58 = null;
      cachedAtaExists = false;

      wasWinnerLastRender = false;
      addLog("Wallet account changed: disconnected");
      render();
      return;
    }

    walletPubkey = pubkey;
    disconnectBtn.style.display = "inline-block";
    connectBtn.style.display = "none";

    // reset caches for new wallet
    cachedAtaOwner58 = null;
    cachedAtaExists = false;

    wasWinnerLastRender = false;
    addLog(`Wallet account changed: ${walletPubkey.toBase58()}`);

    renderWinnerLog(); // "You" highlight may change
    render();
  });

  provider.on?.("disconnect", () => {
    walletPubkey = null;
    disconnectBtn.style.display = "none";
    connectBtn.style.display = "inline-block";

    cachedAtaOwner58 = null;
    cachedAtaExists = false;

    wasWinnerLastRender = false;
    addLog("Wallet disconnected (event)");
    renderWinnerLog();
    render();
  });
}

async function connectWallet() {
  const provider = getWalletProvider();
  if (!provider) {
    alert("No Solana wallet found. Install Phantom.");
    return;
  }

  unlockAudioOnce();

  const resp = await provider.connect({ onlyIfTrusted: false });
  walletPubkey = resp.publicKey;

  installWalletListeners(provider);

  addLog(`Wallet connected: ${walletPubkey.toBase58()}`);

  disconnectBtn.style.display = "inline-block";
  connectBtn.style.display = "none";

  // reset caches
  cachedAtaOwner58 = null;
  cachedAtaExists = false;

  renderWinnerLog();
  render();
}

async function disconnectWallet() {
  const provider = getWalletProvider();
  try { await provider?.disconnect?.(); } catch {}

  walletPubkey = null;

  disconnectBtn.style.display = "none";
  connectBtn.style.display = "inline-block";

  cachedAtaOwner58 = null;
  cachedAtaExists = false;

  wasWinnerLastRender = false;

  addLog("Wallet disconnected");
  renderWinnerLog();
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
// RPC gating: vault fetch
/////////////////////////////
async function maybeRefreshVaultAmount(reason = "") {
  const nowMs = Date.now();
  const ttlExpired = (nowMs - lastVaultFetchMs) >= VAULT_TTL_MS;

  // Primary trigger: plays changed
  const plays = latestState ? Number(latestState.sessionPlays || 0) : null;
  const playsChanged = (plays !== null && lastPlaysSeen !== null && plays !== lastPlaysSeen);

  // If we haven't ever fetched vault, do it once.
  const neverFetched = lastVaultFetchMs === 0;

  const should = neverFetched || playsChanged || ttlExpired;

  if (!should) return;
  if (vaultFetchInFlight) return;

  vaultFetchInFlight = true;
  try {
    const vaultBal = await connection.getTokenAccountBalance(vaultPk, "confirmed");
    latestVaultAmount = BigInt(vaultBal?.value?.amount || "0");
    lastVaultFetchMs = Date.now();

    // update dependent UI blocks now
    if (vaultText) vaultText.textContent = `${fmtTokenExact(latestVaultAmount)} tokens`;
    updateThresholdPanelIfNeeded();
    renderPotIfNeeded();
  } catch (e) {
    console.warn("Vault refresh failed", reason, e);
  } finally {
    vaultFetchInFlight = false;
  }
}

/////////////////////////////
// State polling (critical)
/////////////////////////////
function stateSignature(gs) {
  if (!gs) return "";
  // include only critical fields that indicate meaningful gameplay changes
  return [
    gs.enabled ? 1 : 0,
    gs.timerEnd,
    gs.cooldownEnd,
    gs.unclaimed ? 1 : 0,
    gs.sessionPlays,
    gs.currentWinner.toBase58(),
    // include playCost if you ever change it on-chain; safe to include
    gs.playCost.toString(),
  ].join("|");
}

function handleWooshOnTimerReset(gs) {
  const newTimerEnd = Number(gs?.timerEnd || 0);

  if (lastTimerEndSeen === null) {
    lastTimerEndSeen = newTimerEnd;
    return;
  }

  const timerReset = newTimerEnd > lastTimerEndSeen;
  if (timerReset) {
    if (suppressNextWoosh) {
      suppressNextWoosh = false;
    } else {
      playSfx(sfxWoosh);
    }
  }
  lastTimerEndSeen = newTimerEnd;
}

async function refreshStateOnly() {
  if (statePollInFlight) return;
  statePollInFlight = true;

  try {
    const stateAcc = await connection.getAccountInfo(statePk, "confirmed");
    if (!stateAcc?.data) {
      latestState = null;
      if (phaseText) phaseText.textContent = "State not found";
      mainBtn.classList.add("disabled");
      mainBtn.disabled = true;
      mainBtn.textContent = "ERROR";
      return;
    }

    const decoded = decodeState(stateAcc.data);
    const sig = stateSignature(decoded);
    const changed = sig !== lastStateSig;

    latestState = decoded;

    // "plays" trigger base (used for vault gating)
    const plays = Number(decoded.sessionPlays || 0);
    if (lastPlaysSeen === null) lastPlaysSeen = plays;

    if (changed) {
      lastStateSig = sig;

      // Critical: winner/timer/claim status updates
      handleWooshOnTimerReset(decoded);
      trackWinnerChanges(decoded);

      // Winner detail
      const w = decoded.currentWinner.toBase58();
      winnerLink.textContent = (w === PublicKey.default.toBase58()) ? "—" : w;
      winnerLink.href = (w === PublicKey.default.toBase58()) ? "#" : solscanAccountUrl(w);

      // Correct: show YES when unclaimed == true
      unclaimedText.textContent = decoded.unclaimed ? "YES" : "NO";

      // play cost can change rarely; update when state changes
      playCostText.textContent = `${fmtTokenExact(decoded.playCost)} tokens`;

      // Trigger expensive read ONLY when plays changed (or TTL)
      const prevPlays = lastPlaysSeen;
      if (plays !== prevPlays) {
        lastPlaysSeen = plays;
        // plays changed => likely vault changed (play or claim)
        maybeRefreshVaultAmount("plays changed");
      } else {
        // still allow TTL refresh
        maybeRefreshVaultAmount("ttl");
      }

      // render now for immediate UI reaction
      render();
    } else {
      // no state change; still occasionally refresh vault via TTL
      maybeRefreshVaultAmount("ttl-only-no-state-change");
    }
  } catch (e) {
    console.error(e);
    addLog(`Read error: ${e.message || e.toString()}`);
  } finally {
    statePollInFlight = false;
  }
}

/////////////////////////////
// Render (NO RPC)
/////////////////////////////
let lastPotKey = "";
function renderPotIfNeeded() {
  if (!latestState || !potDisplay) return;
  const k = `${latestState.sessionPlays}|${latestVaultAmount.toString()}|${mintDecimals}`;
  if (k === lastPotKey) return;
  lastPotKey = k;

  const divisor = potDivisorFromPlays(latestState.sessionPlays);
  const pot = divisor > 0 ? (latestVaultAmount / divisor) : 0n;
  potDisplay.textContent = fmtTokenRoundedWithCommas(pot);
}

function render() {
  renderWalletPill();
  if (!latestState) return;

  const now = nowSec();
  const phase = computePhase(latestState, now);

  renderPotIfNeeded();
  updateThresholdPanelIfNeeded();
  if (phaseText) phaseText.textContent = phaseLabel(phase);

  // Winner song control placeholder: keep the logic variable, but don't RPC
  const winnerPk58 = latestState.currentWinner.toBase58();
  const isWinnerConnected = !!walletPubkey && walletPubkey.toBase58() === winnerPk58;

  // CLOCK + BAR (smooth UI)
  let secondsLeft = 0;
  let pct = 0;

  if (phase === "ACTIVE") {
    secondsLeft = latestState.timerEnd - now;
    if (clockLabel) clockLabel.textContent = "TIME";
    const duration = Math.max(1, latestState.roundDurationSecs || 1);
    const elapsed = duration - secondsLeft;
    pct = Math.max(0, Math.min(1, elapsed / duration));
  } else if (phase === "COOLDOWN") {
    secondsLeft = latestState.cooldownEnd - now;
    if (clockLabel) clockLabel.textContent = "COOLDOWN";
    const total = Math.max(1, (latestState.cooldownEnd - latestState.timerEnd) || 1);
    const elapsed = total - secondsLeft;
    pct = Math.max(0, Math.min(1, elapsed / total));
  } else if (phase === "POST_COOLDOWN_UNCLAIMED") {
    if (clockLabel) clockLabel.textContent = "READY";
    secondsLeft = 60;
    pct = 1;
  } else {
    if (clockLabel) clockLabel.textContent = "TIME";
    secondsLeft = 60;
    pct = 0;
  }

  if (clockDisplay) clockDisplay.textContent = fmtClock(secondsLeft);
  if (barFill) barFill.style.width = `${pct * 100}%`;

  // MAIN BUTTON LOGIC
  const connected = !!walletPubkey;
  const timerEnded = latestState.timerEnd > 0 && now > latestState.timerEnd;
  const shouldShowClaim = connected && isWinnerConnected && latestState.unclaimed && latestState.enabled && timerEnded;

  claimArmed = shouldShowClaim;
  mainMode = shouldShowClaim ? "CLAIM" : "PLAY";

  if (mainMode === "CLAIM") {
    mainBtn.textContent = "CLAIM";
    mainBtn.classList.remove("disabled", "claimLocked");
    mainBtn.classList.add("claimArmed");
    mainBtn.disabled = false;
    // if (mainHint) mainHint.textContent = "Your win is unclaimed. Claim anytime.";
    return;
  }

  mainBtn.classList.remove("claimLocked", "claimArmed");

  const canPlay = connected && latestState.enabled &&
    (phase === "ACTIVE" || phase === "IDLE" || phase === "POST_COOLDOWN_UNCLAIMED");

  if (canPlay) {
    mainBtn.textContent = "PLAY";
    mainBtn.disabled = false;
    mainBtn.classList.remove("disabled");

    if (phase === "POST_COOLDOWN_UNCLAIMED") {
      // if (mainHint) mainHint.textContent = "First press after cooldown auto-pays previous winner, then starts the next round.";
    } else {
      // if (mainHint) mainHint.textContent = "Each Button press is 1000 $BUTTON.";
    }
  } else {
    if (!connected) {
      mainBtn.textContent = "CONNECT";
      mainBtn.disabled = false;
      mainBtn.classList.remove("disabled");
      // if (mainHint) mainHint.textContent = "Connect to press. Viewing is available without connecting.";
    } else {
      mainBtn.textContent = phase === "COOLDOWN" ? "COOLDOWN" : "WAIT";
      mainBtn.disabled = true;
      mainBtn.classList.add("disabled");

      if (phase === "COOLDOWN") {
        // if (mainHint) mainHint.textContent = "Cooldown active. Winner may claim (if unclaimed).";
      } else if (!latestState.enabled) {
        // if (mainHint) mainHint.textContent = "Game is not enabled.";
      } else {
        // if (mainHint) mainHint.textContent = "Waiting for the next round to start.";
      }
    }
  }
}

/////////////////////////////
// Send transaction helper
/////////////////////////////
async function sendTx(ix) {
  const provider = getWalletProvider();
  if (!provider?.publicKey) throw new Error("Wallet not connected");

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: provider.publicKey });
  tx.add(ix);

  const signed = await provider.signTransaction(tx);

  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  addLog("Sent tx", solscanTxUrl(sig));

  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  addLog("Confirmed", solscanTxUrl(sig));
  return sig;
}

// Quick post-tx sync: poll state a few times fast so UI snaps immediately
async function fastStateSyncBurst() {
  for (let i = 0; i < FAST_SYNC_TRIES; i++) {
    await refreshStateOnly();
    // if state changed, refreshStateOnly already updated UI
    await new Promise((r) => setTimeout(r, FAST_SYNC_MS));
  }
}

/////////////////////////////
// Main button action
/////////////////////////////
async function ensureAtaExistsForWallet() {
  if (!walletPubkey) return false;
  const owner58 = walletPubkey.toBase58();

  if (cachedAtaOwner58 === owner58 && cachedAtaExists) return true;

  const playerAta = findAta(walletPubkey, mintPk);
  const ataInfo = await connection.getAccountInfo(playerAta, "confirmed");

  cachedAtaOwner58 = owner58;
  cachedAtaExists = !!ataInfo;

  return cachedAtaExists;
}

async function onMain() {
  if (!latestState) return;

  if (!walletPubkey) {
    await connectWallet();
    return;
  }

  const now = nowSec();
  const winnerPk58 = latestState.currentWinner.toBase58();
  const isWinnerConnected = walletPubkey && walletPubkey.toBase58() === winnerPk58;

  // CLAIM path
  const timerEnded = latestState.timerEnd > 0 && now > latestState.timerEnd;
  if (isWinnerConnected && latestState.unclaimed && latestState.enabled && timerEnded) {
    const winnerAta = latestState.currentWinnerAta;
    const ix = await buildClaimIx({ winnerPk: walletPubkey, winnerAtaPk: winnerAta });

    try {
      mainBtn.disabled = true;
      addLog("Claim: signing…");
      await sendTx(ix);
      addLog("Claim complete");

      // state + vault likely changed; plays trigger will fetch vault
      await fastStateSyncBurst();
    } catch (e) {
      console.error(e);
      addLog(`Claim failed: ${e.message || e.toString()}`);
      alert(`Claim failed: ${e.message || e.toString()}`);
      await refreshStateOnly();
    } finally {
      mainBtn.disabled = false;
    }
    return;
  }

  // PLAY path
  const ataOk = await ensureAtaExistsForWallet();
  if (!ataOk) {
    alert("Your ATA for this mint does not exist. Receive tokens first (or create the ATA).");
    return;
  }

  const playerAta = findAta(walletPubkey, mintPk);

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

    // You pressed the button; we expect timerEnd to jump => suppress woosh once.
    suppressNextWoosh = true;

    await sendTx(ix);

    // playSfx(sfxPlayComplete);
    addLog("Play complete");

    // State must update quickly; plays will trigger vault refresh
    await fastStateSyncBurst();
  } catch (e) {
    console.error(e);
    addLog(`Play failed: ${e.message || e.toString()}`);
    alert(`Play failed: ${e.message || e.toString()}`);
    await refreshStateOnly();
  } finally {
    mainBtn.disabled = false;
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
  if (!isPressing) return;
  isPressing = false;

  if (e && typeof e.pointerId === "number") {
    try { mainBtn.releasePointerCapture(e.pointerId); } catch {}
  }

  unlockAudioOnce();
  playSfx(sfxUp);
}

mainBtn.addEventListener("pointerup", handleReleaseOnce);
mainBtn.addEventListener("pointercancel", handleReleaseOnce);
mainBtn.addEventListener("lostpointercapture", handleReleaseOnce);

mainBtn.addEventListener("click", onMain);

(async function boot() {
  connection = new Connection(rpcUrl(), "confirmed");

  // One-time details links (no repetitive DOM updates)
  programLink.textContent = programIdPk.toBase58();
  programLink.href = solscanAccountUrl(programIdPk.toBase58());
  stateLink.textContent = statePk.toBase58();
  stateLink.href = solscanAccountUrl(statePk.toBase58());
  vaultLink.textContent = vaultPk.toBase58();
  vaultLink.href = solscanAccountUrl(vaultPk.toBase58());
  mintLink.textContent = mintPk.toBase58();
  mintLink.href = solscanAccountUrl(mintPk.toBase58());

  // Wallet listeners (for swapping accounts)
  const provider = getWalletProvider();
  if (provider) installWalletListeners(provider);

  // Try trusted connect
  if (provider?.isPhantom) {
    try {
      const resp = await provider.connect({ onlyIfTrusted: true });
      if (resp?.publicKey) {
        walletPubkey = resp.publicKey;
        disconnectBtn.style.display = "inline-block";
        connectBtn.style.display = "none";
        addLog(`Wallet auto-connected: ${walletPubkey.toBase58()}`);

        cachedAtaOwner58 = null;
        cachedAtaExists = false;

        wasWinnerLastRender = false;
      }
    } catch {}
  }

  await ensureMintDecimals();

  // Initial state read (critical)
  await refreshStateOnly();

  // Initial vault fetch once so pot UI isn't empty (then plays trigger)
  await maybeRefreshVaultAmount("boot");

  // Apply saved mute state and try to start music if allowed
  ensureBgMusicState();

  // Poll critical state only
  setInterval(refreshStateOnly, STATE_POLL_MS);

  // Smooth UI tick (no RPC)
  setInterval(render, UI_TICK_MS);

  mainBtn.disabled = false;
})();