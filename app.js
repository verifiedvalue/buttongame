/* global solanaWeb3 */

/////////////////////////////
// CONFIG
/////////////////////////////
const PROGRAM_ID = "BzRDQGEakfGQJrucuScr77QoQdckmLmNGSdqveea9MyL";
const GAME_MINT  = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const STATE      = "FnCLwBY38p1LUtCs6GaC438EZ3HmanAdAhGB4nfNANAz";
const VAULT      = "CbpG1mzYkbPKAKcVMDsjfPnqJhDdHceHXuuQ9UUeA9K";

let CLUSTER = "devnet"; // set to "mainnet-beta" for production

// ─── RELAY SERVER ──────────────────────────────────────────────────────────────
// HOW TO ENABLE THE RELAY (sub-second updates, scales to any number of players)
// ─────────────────────────────────────────────────────────────────────────────
// 1. Deploy relay-server.js to Railway (see README.md for the full walkthrough):
//      a. Push relay-server.js + package.json to a GitHub repo
//      b. Go to railway.app → New Project → Deploy from GitHub repo
//      c. Set env vars: CLUSTER=devnet  (or mainnet-beta)
//      d. Generate a public domain in Railway's Settings tab
//      e. Confirm it works: https://YOUR-RELAY.up.railway.app/health
//
// 2. Paste the Railway URL below — no trailing slash:
//
//    const RELAY_URL = "https://YOUR-RELAY.up.railway.app";
//
// 3. Save app.js and redeploy your frontend. That's it.
//
// While null, the app polls Solana directly — fine for testing, but every user
// makes their own RPC calls (doesn't scale, higher latency ~2–4 s).
const RELAY_URL = "https://buttongamerelay-production.up.railway.app/"; // ← PASTE YOUR RELAY URL HERE AFTER DEPLOYING

// Testing: pretend vault (and thus pot) is this many times larger for display only.
// Set to 1n for production.
const VAULT_DISPLAY_MULTIPLIER = 10_000_000n;

const STATE_POLL_MS            = 4000;
const UI_TICK_MS               = 100;
const VAULT_TTL_MS             = 30000;
const FAST_SYNC_MS             = 250;
const FAST_SYNC_TRIES          = 12;
const STATE_POLL_JITTER_MS     = 2000;
const STATE_POLL_BACKOFF_MAX_MS = 30000;

/////////////////////////////
// SOLANA SETUP
/////////////////////////////
const { Connection, PublicKey, Transaction, TransactionInstruction } = solanaWeb3;

const TOKEN_PROGRAM_ID            = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYSVAR_CLOCK_PUBKEY         = new PublicKey("SysvarC1ock11111111111111111111111111111111");

const programIdPk = new PublicKey(PROGRAM_ID);
const mintPk      = new PublicKey(GAME_MINT);
const statePk     = new PublicKey(STATE);
const vaultPk     = new PublicKey(VAULT);

let connection = null;

/////////////////////////////
// DOM REFS
/////////////////////////////
const el = id => document.getElementById(id);

// Top bar
const walletDot     = el("walletDot");
const walletText    = el("walletText");
const connectBtn    = el("connectBtn");
const disconnectBtn = el("disconnectBtn");
const relayStatusEl = el("relayStatus");

// Pot
const potDisplay = el("potDisplay");
const phaseText  = el("phaseText");

// Button
const mainBtn    = el("mainBtn");
const btnLabelEl = el("btnLabelEl");
const btnSpinner = el("btnSpinner");
const btnGlowRing = el("btnGlowRing");

// Timer
const clockLabel   = el("clockLabel");
const clockDisplay = el("clockDisplay");
const barFill      = el("barFill");
const timerHint    = el("timerHint");

// Balance bar
const balanceBar     = el("balanceBar");
const balanceAmount  = el("balanceAmount");
const balanceWarning = el("balanceWarning");

// Onboarding cards
const noWalletCard  = el("noWalletCard");
const noAtaCard     = el("noAtaCard");
const ataPlayCostEl = el("ataPlayCost");
const ataMintLinkEl = el("ataMintLink");

// Share card
const shareCard           = el("shareCard");
const shareTwitterBtn     = el("shareTwitterBtn");
const shareCopyBtn        = el("shareCopyBtn");
const claimShareCard      = el("claimShareCard");
const claimShareTwitterBtn = el("claimShareTwitterBtn");
const claimShareCopyBtn   = el("claimShareCopyBtn");
const claimShareAmount    = el("claimShareAmount");

// Toast
const toastContainer = el("toastContainer");

// Feed
const winnerLogEl = el("winnerNow");

// Sidebar (Pot Unlocks + On-chain Details)
const sidebar           = el("sidebar");
const sidebarToggleBtn  = el("sidebarToggleBtn");
const sidebarCloseBtn   = el("sidebarCloseBtn");

// Details (inside sidebar)
const toggleDetailsBtn = el("toggleDetailsBtn");
const detailsPanel     = el("detailsPanel");
const programLink      = el("programLink");
const stateLink        = el("stateLink");
const vaultLink        = el("vaultLink");
const mintLink         = el("mintLink");
const winnerLink       = el("winnerLink");
const unclaimedText    = el("unclaimedText");
const playCostText     = el("playCostText");
const vaultText        = el("vaultText");

// Threshold panel
const tpProjectedPot = el("tpProjectedPot");
const tpVaultBalance = el("tpVaultBalance");
const tpPlays        = el("tpPlays");
const tpDivisor      = el("tpDivisor"); // optional — null-guarded
const tpBarFill      = el("tpBarFill");
const tpBarLeft      = el("tpBarLeft");
const tpBarRight     = el("tpBarRight");
const tpFoot         = el("tpFoot");
const tier0          = el("tier0");
const tier1          = el("tier1");
const tier2          = el("tier2");
const tier0Reward    = el("tier0Reward");
const tier1Reward    = el("tier1Reward");
const tier2Reward    = el("tier2Reward");

// Audio controls
const musicMuteBtn = el("musicMuteBtn");
const sfxMuteBtn   = el("sfxMuteBtn");

/////////////////////////////
// PARTICLES
/////////////////////////////
const particleCanvas = el("particleCanvas");
let pctx = null;
if (particleCanvas) {
  pctx = particleCanvas.getContext("2d");
  particleCanvas.width  = window.innerWidth;
  particleCanvas.height = window.innerHeight;
  window.addEventListener("resize", () => {
    particleCanvas.width  = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  });
}
let particles = [];

function spawnParticles(x, y, color = "#4285F4") {
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      decay: 0.025 + Math.random() * 0.03,
      size: 2 + Math.random() * 4,
      color,
    });
  }
}

function animateParticles() {
  if (!pctx) return;
  pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  particles = particles.filter(p => p.life > 0);
  for (const p of particles) {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.15;
    p.life -= p.decay;
    pctx.globalAlpha = Math.max(0, p.life);
    pctx.fillStyle   = p.color;
    pctx.beginPath();
    pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    pctx.fill();
  }
  pctx.globalAlpha = 1;
  requestAnimationFrame(animateParticles);
}
animateParticles();

/////////////////////////////
// FRONTEND STATE
/////////////////////////////
let walletPubkey     = null;
let mintDecimals     = 6;
let latestState      = null;
let latestVaultAmount = 0n;

function getDisplayVault() {
  return latestVaultAmount * VAULT_DISPLAY_MULTIPLIER;
}
let mainMode         = "PLAY";   // "PLAY" | "CLAIM"
let claimArmed       = false;
let userTokenBalance = null;     // BigInt | null
let btnPendingActive = false;    // true while tx is in flight
let shareCardVisible      = false;
let claimShareCardVisible = false;
let lastClaimedAmount     = null; // snapshot of pot amount at claim time

// Winner feed
const MAX_WINNER_LOG = 25;
let lastWinnerSeen      = null;
let winnerHistory       = [];
let wasWinnerLastRender = false;

// RPC gating
let lastStateSig          = "";
let lastPlaysSeen         = null;
let lastVaultFetchMs      = 0;
let vaultFetchInFlight    = false;
let statePollInFlight     = false;
let statePollTimer        = null;
let consecutiveStateErrors = 0;

// ATA cache
let cachedAtaOwner58 = null;
let cachedAtaExists  = false;

/////////////////////////////
// TOAST SYSTEM
/////////////////////////////
const TOAST_DURATION = { error: 7000, info: 4000, success: 4000, warn: 5000 };
const TOAST_ICONS    = { error: "✕", info: "ℹ", success: "✓", warn: "⚠" };

/**
 * showToast({ type, title, message, duration })
 * Returns a toast handle with a ._dismiss() method for early removal.
 */
function showToast({ type = "info", title = "", message = "", duration } = {}) {
  if (!toastContainer) return null;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "alert");

  const dur = duration ?? TOAST_DURATION[type] ?? 4000;

  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type]}</span>
    <div class="toast-body">
      ${title   ? `<div class="toast-title">${escapeHtml(title)}</div>`   : ""}
      ${message ? `<div class="toast-msg">${escapeHtml(message)}</div>` : ""}
    </div>
    <button class="toast-close" aria-label="Dismiss">×</button>
  `;

  toastContainer.appendChild(toast);

  function dismiss() {
    if (!toast.parentNode) return;
    toast.classList.add("toast-leaving");
    setTimeout(() => toast.remove(), 260);
  }

  toast.querySelector(".toast-close").addEventListener("click", dismiss);
  const timer = setTimeout(dismiss, dur);
  toast._dismiss = () => { clearTimeout(timer); dismiss(); };

  return toast;
}

const toastError   = (t, m) => showToast({ type: "error",   title: t, message: m });
const toastSuccess = (t, m) => showToast({ type: "success", title: t, message: m });
const toastInfo    = (t, m) => showToast({ type: "info",    title: t, message: m });
const toastWarn    = (t, m) => showToast({ type: "warn",    title: t, message: m });

/////////////////////////////
// AUDIO
/////////////////////////////
let lastTimerEndSeen  = null;
let suppressNextWoosh = false;

const LS_MUSIC_MUTED = "buttonGame_musicMuted";
const LS_SFX_MUTED   = "buttonGame_sfxMuted";

let musicMuted = localStorage.getItem(LS_MUSIC_MUTED) === "1";
let sfxMuted   = localStorage.getItem(LS_SFX_MUTED)   === "1";

const bgMusic = new Audio("winner.wav");
bgMusic.preload = "auto"; bgMusic.loop = true; bgMusic.volume = 0.3;

const sfxDown         = new Audio("clickdown.wav");
const sfxUp           = new Audio("clickup.wav");
const sfxWoosh        = new Audio("woosh.wav");
const sfxPlayComplete = new Audio("play.wav");
const sfxLoading      = new Audio("loading.wav");
const sfxAlarm        = new Audio("alarm.wav");
[sfxDown, sfxUp, sfxWoosh, sfxPlayComplete, sfxLoading, sfxAlarm].forEach(a => a.preload = "auto");
sfxWoosh.volume = 0.6; sfxPlayComplete.volume = 0.8;
sfxLoading.loop = true; sfxLoading.volume = 0.5;
sfxAlarm.loop   = true; sfxAlarm.volume   = 0.6;

let alarmPlaying = false;

function startBgMusicIfAllowed() { if (!musicMuted) try { bgMusic.play().catch(() => {}); } catch {} }
function stopBgMusic()           { try { bgMusic.pause(); } catch {} }
function startLoadingSound() {
  if (sfxMuted || !sfxLoading) return;
  try { sfxLoading.currentTime = 0; sfxLoading.play().catch(() => {}); } catch {}
}
function stopLoadingSound() {
  try { sfxLoading.pause(); sfxLoading.currentTime = 0; } catch {}
}
function startAlarm() {
  if (sfxMuted || !sfxAlarm || alarmPlaying) return;
  try {
    sfxAlarm.currentTime = 0;
    sfxAlarm.play().then(() => { alarmPlaying = true; }).catch(() => {});
  } catch {}
}
function stopAlarm() {
  if (!sfxAlarm || !alarmPlaying) return;
  try { sfxAlarm.pause(); sfxAlarm.currentTime = 0; } catch {}
  alarmPlaying = false;
}
function playSfx(a) {
  if (!a || sfxMuted) return;
  try { a.currentTime = 0; a.play().catch(() => {}); } catch {}
}

function setMusicMuted(v) {
  musicMuted = !!v;
  localStorage.setItem(LS_MUSIC_MUTED, musicMuted ? "1" : "0");
  updateAudioButtons();
  musicMuted ? stopBgMusic() : startBgMusicIfAllowed();
}
function setSfxMuted(v) {
  sfxMuted = !!v;
  localStorage.setItem(LS_SFX_MUTED, sfxMuted ? "1" : "0");
  if (sfxMuted) {
    stopLoadingSound();
    stopAlarm();
  }
  updateAudioButtons();
}
function updateAudioButtons() {
  if (musicMuteBtn) {
    const s = musicMuteBtn.querySelector(".audio-state");
    if (s) s.textContent = musicMuted ? "OFF" : "ON";
    musicMuteBtn.classList.toggle("muted", musicMuted);
  }
  if (sfxMuteBtn) {
    const s = sfxMuteBtn.querySelector(".audio-state");
    if (s) s.textContent = sfxMuted ? "OFF" : "ON";
    sfxMuteBtn.classList.toggle("muted", sfxMuted);
  }
}
if (musicMuteBtn) musicMuteBtn.addEventListener("click", () => setMusicMuted(!musicMuted));
if (sfxMuteBtn)   sfxMuteBtn.addEventListener("click",   () => setSfxMuted(!sfxMuted));
updateAudioButtons();

/////////////////////////////
// HELPERS
/////////////////////////////
function rpcUrl() {
  return CLUSTER === "devnet"
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";
}
function solscanAccountUrl(pk) {
  return CLUSTER === "devnet"
    ? `https://solscan.io/account/${pk}?cluster=devnet`
    : `https://solscan.io/account/${pk}`;
}
function solscanTxUrl(sig) {
  return CLUSTER === "devnet"
    ? `https://solscan.io/tx/${sig}?cluster=devnet`
    : `https://solscan.io/tx/${sig}`;
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
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])
  );
}

// Server-time offset (sec): applied so timer/cooldown match across devices (no buffering; skew was the cause of differences)
let timeOffsetSec = 0;
async function syncTimeOnce() {
  try {
    const r = await fetch("https://worldtimeapi.org/api/ip", { cache: "no-store" });
    const d = await r.json();
    if (typeof d.unixtime === "number") timeOffsetSec = d.unixtime - Math.floor(Date.now() / 1000);
  } catch (_) {}
}
function nowSec() { return Math.floor(Date.now() / 1000) + timeOffsetSec; }

function fmtClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function fmtTokenExact(n) {
  const d = BigInt(10) ** BigInt(mintDecimals);
  const whole = n / d;
  const frac  = n % d;
  const fracStr = frac.toString().padStart(mintDecimals, "0").slice(0, Math.min(6, mintDecimals));
  return mintDecimals === 0 ? `${whole}` : `${whole}.${fracStr}`;
}

function shortPk(pk58) {
  if (!pk58 || pk58.length < 10) return pk58 || "—";
  return `${pk58.slice(0, 4)}…${pk58.slice(-4)}`;
}

async function getMintDecimals() {
  const info     = await connection.getParsedAccountInfo(mintPk, "confirmed");
  const decimals = info?.value?.data?.parsed?.info?.decimals;
  return typeof decimals === "number" ? decimals : mintDecimals;
}

let mintDecimalsLoaded = false;
async function ensureMintDecimals() {
  if (mintDecimalsLoaded) return;
  try { mintDecimals = await getMintDecimals(); mintDecimalsLoaded = true; } catch {}
}

function potDivisorFromPlays(plays) {
  const p = Number(plays || 0);
  if (p < 250)  return 40n;
  if (p < 1000) return 10n;
  return 5n;
}

const tokenIntFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
function fmtRounded(n) { return tokenIntFmt.format(Number(n) / (10 ** mintDecimals)); }

function fmtTierReward(divisor) {
  const extra = divisor == 5n  ? 25000n * 1_000_000_000n
              : divisor == 10n ?  2500n * 1_000_000_000n
              : divisor == 20n ?   250n * 1_000_000_000n : 0n;
  const displayVault = getDisplayVault();
  const displayExtra = extra;
  return divisor > 0n ? fmtRounded((displayVault + displayExtra) / divisor) : "0";
}

/////////////////////////////
// BUTTON PENDING STATE
/////////////////////////////
/**
 * setBtnPending(true, "SIGNING…")  — show spinner, set label, block render()
 * setBtnPending(false)             — hide spinner, hand control back to render()
 */
function setBtnPending(active, label = "") {
  btnPendingActive = active;
  if (active) {
    mainBtn.disabled = true;
    if (btnSpinner) btnSpinner.classList.remove("hidden");
    if (btnLabelEl) btnLabelEl.textContent = label;
  } else {
    mainBtn.disabled = false;
    if (btnSpinner) btnSpinner.classList.add("hidden");
    render(); // let render() put the button back in the right state
  }
}

/////////////////////////////
// SEND TRANSACTION
// Accepts an onStep callback so callers can update labels mid-flight.
// onStep("signing")    — before wallet prompt
// onStep("sending")    — after signing, before broadcast
// onStep("confirming") — after broadcast, before confirmation
/////////////////////////////
async function sendTx(ix, onStep) {
  const provider = getWalletProvider();
  if (!provider?.publicKey) throw new Error("Wallet not connected");

  try {
    onStep?.("signing");
    startLoadingSound();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: provider.publicKey });
    tx.add(ix);
    const signed = await provider.signTransaction(tx);

    onStep?.("sending");
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    addLog("Sent tx", solscanTxUrl(sig));

    onStep?.("confirming");
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    addLog("Confirmed", solscanTxUrl(sig));
    return sig;
  } finally {
    stopLoadingSound();
  }
}

async function fastStateSyncBurst() {
  // Fire an immediate read right away to catch the state change ASAP.
  // Then schedule follow-up reads — stop early once we detect the new state.
  await refreshStateOnly("fast-sync-0");

  if (RELAY_URL) {
    // Relay mode: SSE push normally arrives within ~200 ms of the on-chain tx.
    // Two quick follow-up reads as insurance; the SSE stream handles the rest.
    await new Promise(r => setTimeout(r, 300));
    await refreshStateOnly("fast-sync-1");
    await new Promise(r => setTimeout(r, 600));
    await refreshStateOnly("fast-sync-2");
    return;
  }

  // Direct-RPC mode: poll aggressively but stop as soon as the new state lands.
  const sigBefore = lastStateSig;
  const gaps = [150, 250, 350, 500, 600, 700, 800, 900, 1000];
  for (const gap of gaps) {
    if (lastStateSig !== sigBefore) break; // got the update — stop early
    await new Promise(r => setTimeout(r, gap));
    await refreshStateOnly("fast-sync");
  }
}

/////////////////////////////
// SHARE CARDS
/////////////////////////////
function buildShareUrl() { return window.location.href.split("?")[0]; }

// ── LEADING share (during active round) ──────────────────
function buildLeadingShareText() {
  const pot = potDisplay?.textContent ?? "?";
  return `I'm leading the $BUTTON pot — ${pot} tokens up for grabs. Come knock me off. 👆`;
}

function updateShareCard(isLeading) {
  if (!shareCard) return;
  if (isLeading && !shareCardVisible) {
    shareCard.classList.remove("hidden");
    shareCardVisible = true;
  } else if (!isLeading && shareCardVisible) {
    shareCard.classList.add("hidden");
    shareCardVisible = false;
  }
}

shareTwitterBtn?.addEventListener("click", () => {
  const text = encodeURIComponent(buildLeadingShareText());
  const url  = encodeURIComponent(buildShareUrl());
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener");
});

shareCopyBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(`${buildLeadingShareText()}\n${buildShareUrl()}`);
    shareCopyBtn.textContent = "Copied!";
    shareCopyBtn.classList.add("copied");
    setTimeout(() => {
      shareCopyBtn.textContent = "Copy link";
      shareCopyBtn.classList.remove("copied");
    }, 2200);
  } catch {
    toastError("Copy failed", "Please copy the URL from your address bar manually.");
  }
});

// ── CLAIM share (after winning) ──────────────────────────
function buildClaimShareText(amount) {
  const url = buildShareUrl();
  return `Just claimed ${amount} $BUTTON! 🏆 The pot is reset — next round starts the moment someone presses the button. Could be you. ${url}`;
}

/**
 * showClaimShareCard(claimedAmount)
 * Displays the post-claim share card with the exact amount won.
 * The card auto-hides when the next round goes ACTIVE (someone presses).
 */
function showClaimShareCard(claimedAmount) {
  if (!claimShareCard) return;
  lastClaimedAmount = claimedAmount;
  if (claimShareAmount) claimShareAmount.textContent = claimedAmount;
  claimShareCard.classList.remove("hidden");
  claimShareCardVisible = true;
}

function hideClaimShareCard() {
  if (!claimShareCard) return;
  claimShareCard.classList.add("hidden");
  claimShareCardVisible = false;
}

claimShareTwitterBtn?.addEventListener("click", () => {
  const amount = lastClaimedAmount ?? (potDisplay?.textContent ?? "?");
  const text   = encodeURIComponent(buildClaimShareText(amount));
  window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener");
});

claimShareCopyBtn?.addEventListener("click", async () => {
  const amount = lastClaimedAmount ?? (potDisplay?.textContent ?? "?");
  try {
    await navigator.clipboard.writeText(buildClaimShareText(amount));
    claimShareCopyBtn.textContent = "Copied!";
    claimShareCopyBtn.classList.add("copied");
    setTimeout(() => {
      claimShareCopyBtn.textContent = "Copy link";
      claimShareCopyBtn.classList.remove("copied");
    }, 2200);
  } catch {
    toastError("Copy failed", "Please copy the URL from your address bar manually.");
  }
});

/////////////////////////////
// BALANCE BAR
/////////////////////////////
async function refreshUserBalance() {
  if (!walletPubkey || !connection) return;
  try {
    const ata  = findAta(walletPubkey, mintPk);
    const info = await connection.getTokenAccountBalance(ata, "confirmed");
    userTokenBalance = BigInt(info?.value?.amount ?? "0");
  } catch {
    userTokenBalance = null; // ATA may not exist yet
  }
  renderBalanceBar();
}

function renderBalanceBar() {
  if (!balanceBar) return;
  if (!walletPubkey) { balanceBar.classList.add("hidden"); return; }

  balanceBar.classList.remove("hidden");

  if (userTokenBalance === null) {
    if (balanceAmount) balanceAmount.textContent = "—";
    if (balanceWarning) balanceWarning.classList.add("hidden");
    return;
  }

  if (balanceAmount) balanceAmount.textContent = fmtRounded(userTokenBalance);

  const playCost     = latestState?.playCost ?? 0n;
  const insufficient = playCost > 0n && userTokenBalance < playCost;
  if (balanceWarning) balanceWarning.classList.toggle("hidden", !insufficient);
}

/////////////////////////////
// ONBOARDING CARDS
/////////////////////////////
function showNoWalletCard() {
  noWalletCard?.classList.remove("hidden");
  noAtaCard?.classList.add("hidden");
}

function showNoAtaCard() {
  if (noAtaCard) {
    noAtaCard.classList.remove("hidden");
    if (ataPlayCostEl && latestState) {
      ataPlayCostEl.textContent = `${fmtRounded(latestState.playCost)} $BUTTON`;
    }
    if (ataMintLinkEl) ataMintLinkEl.href = `https://pump.fun/coin/${GAME_MINT}`;
  }
  noWalletCard?.classList.add("hidden");
}

function hideOnboardingCards() {
  noWalletCard?.classList.add("hidden");
  noAtaCard?.classList.add("hidden");
}

/////////////////////////////
// THRESHOLD PANEL
/////////////////////////////
let lastThresholdKey = "";
function updateThresholdPanelIfNeeded() {
  if (!tpProjectedPot || !latestState) return;

  const key = `${latestState.sessionPlays}|${latestVaultAmount}`;
  if (key === lastThresholdKey) return;
  lastThresholdKey = key;

  const plays   = Number(latestState.sessionPlays || 0);
  const divisor = potDivisorFromPlays(plays);
  const pct     = Number(100n / divisor);

  if (tpVaultBalance) tpVaultBalance.textContent = fmtRounded(getDisplayVault());
  if (tpProjectedPot) tpProjectedPot.textContent = `${pct}% of Vault`;
  if (tpPlays)        tpPlays.textContent         = String(plays);
  if (tpDivisor)      tpDivisor.textContent       = String(divisor);

  if (tier0Reward) tier0Reward.textContent = fmtTierReward(20n);
  if (tier1Reward) tier1Reward.textContent = fmtTierReward(10n);
  if (tier2Reward) tier2Reward.textContent = fmtTierReward(5n);

  if (tier0) tier0.classList.toggle("tpTierActive", plays > 249  && plays < 2500);
  if (tier1) tier1.classList.toggle("tpTierActive", plays > 2499 && plays < 25000);
  if (tier2) tier2.classList.toggle("tpTierActive", plays >= 25000);

  let [left, right] = plays < 250  ? [0, 250]
                    : plays < 1000 ? [250, 1000]
                    : plays < 5000 ? [1000, 5000]
                    :                [5000, 5000];

  if (right === left) {
    if (tpBarFill)  tpBarFill.style.width    = "100%";
    if (tpBarLeft)  tpBarLeft.textContent    = `${plays} plays`;
    if (tpBarRight) tpBarRight.textContent   = "Max tier";
    if (tpFoot)     tpFoot.textContent       = "You're in the max tier. Rewards projected from current vault.";
  } else {
    const progress = Math.max(0, Math.min(1, (plays - left) / (right - left)));
    if (tpBarFill)  tpBarFill.style.width  = `${progress * 100}%`;
    if (tpBarLeft)  tpBarLeft.textContent  = `${plays} plays`;
    if (tpBarRight) tpBarRight.textContent = `Next unlock: ${right}`;
    if (tpFoot)     tpFoot.textContent     = "Rewards projected from current vault balance.";
  }
}

/////////////////////////////
// STATE DECODE
/////////////////////////////
function readPubkey(d, o) { return new PublicKey(d.slice(o, o + 32)); }
function readU64(d, o)    { return BigInt(new DataView(d.buffer, d.byteOffset + o, 8).getBigUint64(0, true)); }
function readI64(d, o)    { return Number(new DataView(d.buffer, d.byteOffset + o, 8).getBigInt64(0, true)); }
function readU32(d, o)    { return Number(new DataView(d.buffer, d.byteOffset + o, 4).getUint32(0, true)); }

function decodeState(raw) {
  const d = raw.slice(8); // skip 8-byte discriminator
  let o = 0;
  const owner             = readPubkey(d, o); o += 32;
  const tokenMint         = readPubkey(d, o); o += 32;
  const vault             = readPubkey(d, o); o += 32;
  const playCost          = readU64(d, o);    o += 8;
  const roundDurationSecs = readI64(d, o);    o += 8;
  const currentWinner     = readPubkey(d, o); o += 32;
  const currentWinnerAta  = readPubkey(d, o); o += 32;
  const timerEnd          = readI64(d, o);    o += 8;
  const cooldownEnd       = readI64(d, o);    o += 8;
  const unclaimed         = d[o] === 1;       o += 1;
  const sessionPlays      = readU32(d, o);    o += 4;
  const enabled           = d[o] === 1;       o += 1;
  const bump              = d[o];
  return { owner, tokenMint, vault, playCost, roundDurationSecs,
           currentWinner, currentWinnerAta, timerEnd, cooldownEnd,
           unclaimed, sessionPlays, enabled, bump };
}

/////////////////////////////
// ANCHOR DISCRIMINATORS
/////////////////////////////
async function sha256Bytes(msg) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  return new Uint8Array(hash);
}
async function anchorDisc(name) { return (await sha256Bytes(`global:${name}`)).slice(0, 8); }

let PLAY_DISC = null, CLAIM_DISC = null;
async function getPlayDisc()  { return PLAY_DISC  ??= await anchorDisc("play"); }
async function getClaimDisc() { return CLAIM_DISC ??= await anchorDisc("claim"); }

function findAta(owner, mint) {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return ata;
}

async function buildPlayIx({ playerPk, playerAtaPk, previousWinnerAtaPk }) {
  return new TransactionInstruction({
    programId: programIdPk,
    data: await getPlayDisc(),
    keys: [
      { pubkey: statePk,               isSigner: false, isWritable: true  },
      { pubkey: vaultPk,               isSigner: false, isWritable: true  },
      { pubkey: playerPk,              isSigner: true,  isWritable: true  },
      { pubkey: playerAtaPk,           isSigner: false, isWritable: true  },
      { pubkey: previousWinnerAtaPk,   isSigner: false, isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID,      isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY,   isSigner: false, isWritable: false },
    ],
  });
}

async function buildClaimIx({ winnerPk, winnerAtaPk }) {
  return new TransactionInstruction({
    programId: programIdPk,
    data: await getClaimDisc(),
    keys: [
      { pubkey: statePk,             isSigner: false, isWritable: true  },
      { pubkey: vaultPk,             isSigner: false, isWritable: true  },
      { pubkey: winnerPk,            isSigner: true,  isWritable: true  },
      { pubkey: winnerAtaPk,         isSigner: false, isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID,    isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
  });
}

/////////////////////////////
// PHASE LOGIC
/////////////////////////////
function computePhase(gs, now) {
  if (!gs?.enabled)                                      return "DISABLED";
  if (gs.timerEnd === 0)                                 return "IDLE";
  if (now <= gs.timerEnd)                                return "ACTIVE";
  if (now > gs.timerEnd && now < gs.cooldownEnd)         return "COOLDOWN";
  if (gs.unclaimed)                                      return "POST_COOLDOWN_UNCLAIMED";
  return "IDLE";
}

// Plain-English, action-oriented labels (pass state for COOLDOWN so we can show "Preparing for next round" when claimed)
function phaseLabel(phase, gs) {
  switch (phase) {
    case "DISABLED":                return "Game is paused";
    case "IDLE":                    return "Waiting for the first press — go ahead, start it";
    case "ACTIVE":                  return "Round live — press last to win the pot";
    case "COOLDOWN":                return (gs && gs.unclaimed) ? "Preparing for next round" : "Round over — winner can claim their pot now";
    case "POST_COOLDOWN_UNCLAIMED": return "Pot unclaimed — pressing again starts a new round";
    default:                        return "—";
  }
}

/////////////////////////////
// WINNER FEED
/////////////////////////////
function trackWinnerChanges(gs) {
  if (!gs) return;
  const w58  = gs.currentWinner.toBase58();
  const def  = PublicKey.default.toBase58();
  if (w58 === def) return;

  if (lastWinnerSeen === null) { lastWinnerSeen = w58; pushWinnerEntry(w58, Date.now(), true); return; }
  if (w58 === lastWinnerSeen) return;
  lastWinnerSeen = w58;
  pushWinnerEntry(w58, Date.now(), false);
}

function pushWinnerEntry(w58, tsMs, isInitial) {
  if (winnerHistory[0]?.winner === w58) return;
  winnerHistory.unshift({ winner: w58, tsMs, isInitial });
  if (winnerHistory.length > MAX_WINNER_LOG) winnerHistory.length = MAX_WINNER_LOG;
  renderWinnerLog();
}

function fmtSince(tsMs) {
  const s = Math.max(0, Math.floor((Date.now() - tsMs) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")} ago`;
}

function renderWinnerLog() {
  if (!winnerLogEl) return;
  winnerLogEl.innerHTML = "";
  const you = walletPubkey?.toBase58() ?? null;

  if (!winnerHistory.length) {
    const e = document.createElement("div");
    e.className   = "feedLine";
    e.textContent = "No plays yet this session";
    winnerLogEl.appendChild(e);
    return;
  }

  winnerHistory.forEach((row, idx) => {
    const isTop = idx === 0;
    const isYou = you && row.winner === you;
    const div   = document.createElement("div");
    div.className = isYou && isTop ? "feedLine winner-you-top"
                  : isYou          ? "feedLine winner-you"
                  :                  "feedLine";

    const badge = isTop ? `<span class="feedBadge ${isYou ? "gold" : ""}">LEADING</span>` : "";
    div.innerHTML =
      `${badge}` +
      `<span title="${escapeHtml(row.winner)}" style="flex:1">${escapeHtml(isYou ? "You" : shortPk(row.winner))}</span>` +
      `<span style="opacity:.5;font-size:10px">${escapeHtml(fmtSince(row.tsMs))}</span>` +
      ` <a href="${solscanAccountUrl(row.winner)}" target="_blank" rel="noreferrer" style="opacity:.5;color:inherit;text-decoration:underline;font-size:10px">↗</a>`;
    winnerLogEl.appendChild(div);
  });
}

/////////////////////////////
// WALLET
/////////////////////////////
function getWalletProvider() {
  const w = window.solana;
  return w?.isPhantom ? w : w ?? null;
}

let walletListenersInstalled = false;
function installWalletListeners(provider) {
  if (!provider || walletListenersInstalled) return;
  walletListenersInstalled = true;

  provider.on?.("accountChanged", pubkey => {
    walletPubkey     = pubkey ?? null;
    cachedAtaOwner58 = null; cachedAtaExists = false;
    userTokenBalance = null;
    wasWinnerLastRender = false;

    if (!pubkey) {
      disconnectBtn.style.display = "none";
      connectBtn.style.display    = "inline-block";
    } else {
      disconnectBtn.style.display = "inline-block";
      connectBtn.style.display    = "none";
    }

    addLog(pubkey ? `Account changed: ${pubkey.toBase58()}` : "Account changed: disconnected");
    hideOnboardingCards();
    renderBalanceBar();
    renderWinnerLog();
    render();
    if (pubkey) refreshUserBalance();
  });

  provider.on?.("disconnect", () => {
    walletPubkey     = null;
    cachedAtaOwner58 = null; cachedAtaExists = false;
    userTokenBalance = null;
    wasWinnerLastRender = false;
    disconnectBtn.style.display = "none";
    connectBtn.style.display    = "inline-block";
    addLog("Wallet disconnected");
    hideOnboardingCards();
    renderBalanceBar();
    renderWinnerLog();
    render();
  });
}

async function connectWallet() {
  const provider = getWalletProvider();
  if (!provider) { showNoWalletCard(); return false; }

  startBgMusicIfAllowed();

  let resp;
  try {
    resp = await provider.connect({ onlyIfTrusted: false });
  } catch (e) {
    const msg = e?.message ?? String(e);
    addLog(`Wallet connect failed: ${msg}`);
    const rejected = /rejected|cancelled|cancel/i.test(msg);
    rejected
      ? toastInfo("Connection cancelled", "Tap Connect whenever you're ready.")
      : toastError("Wallet connection failed", msg);
    return false;
  }

  if (!resp?.publicKey) {
    toastError("Wallet connection failed", "No public key returned. Please try again.");
    return false;
  }

  walletPubkey = resp.publicKey;
  installWalletListeners(provider);
  addLog(`Wallet connected: ${walletPubkey.toBase58()}`);

  disconnectBtn.style.display = "inline-block";
  connectBtn.style.display    = "none";
  cachedAtaOwner58 = null; cachedAtaExists = false;
  userTokenBalance = null;

  hideOnboardingCards();
  renderWinnerLog();
  render();

  toastSuccess("Wallet connected", `${shortPk(walletPubkey.toBase58())} — ready to play.`);

  refreshStateOnly("wallet-connect");
  refreshUserBalance();
  return true;
}

async function disconnectWallet() {
  try { await getWalletProvider()?.disconnect?.(); } catch {}
  walletPubkey     = null;
  cachedAtaOwner58 = null; cachedAtaExists = false;
  userTokenBalance = null;
  wasWinnerLastRender = false;
  disconnectBtn.style.display = "none";
  connectBtn.style.display    = "inline-block";
  addLog("Wallet disconnected");
  hideOnboardingCards();
  renderBalanceBar();
  renderWinnerLog();
  render();
}

function renderWalletPill() {
  if (walletPubkey) {
    walletDot?.classList.add("on");
    if (walletText) walletText.textContent = shortPk(walletPubkey.toBase58());
  } else {
    walletDot?.classList.remove("on");
    if (walletText) walletText.textContent = "Not connected";
  }
}

/////////////////////////////
// VAULT FETCH
/////////////////////////////
async function maybeRefreshVaultAmount(reason = "") {
  const now          = Date.now();
  const plays        = latestState ? Number(latestState.sessionPlays || 0) : null;
  const playsChanged = plays !== null && lastPlaysSeen !== null && plays !== lastPlaysSeen;
  const ttlExpired   = (now - lastVaultFetchMs) >= VAULT_TTL_MS;
  const neverFetched = lastVaultFetchMs === 0;

  if (!neverFetched && !playsChanged && !ttlExpired) return;
  if (vaultFetchInFlight) return;

  vaultFetchInFlight = true;
  try {
    const bal = await connection.getTokenAccountBalance(vaultPk, "confirmed");
    latestVaultAmount = BigInt(bal?.value?.amount || "0");
    lastVaultFetchMs  = Date.now();
    if (vaultText) vaultText.textContent = `${fmtTokenExact(getDisplayVault())} tokens`;
    updateThresholdPanelIfNeeded();
    renderPotIfNeeded();
  } catch (e) {
    console.warn("Vault refresh failed", reason, e);
  } finally {
    vaultFetchInFlight = false;
  }
}

/////////////////////////////
// STATE POLLING
/////////////////////////////
function stateSignature(gs) {
  if (!gs) return "";
  return [gs.enabled ? 1 : 0, gs.timerEnd, gs.cooldownEnd,
          gs.unclaimed ? 1 : 0, gs.sessionPlays,
          gs.currentWinner.toBase58(), gs.playCost.toString()].join("|");
}

function handleWooshOnTimerReset(gs) {
  const newEnd = Number(gs?.timerEnd || 0);
  if (lastTimerEndSeen === null) { lastTimerEndSeen = newEnd; return; }
  if (newEnd > lastTimerEndSeen) {
    suppressNextWoosh ? (suppressNextWoosh = false) : playSfx(sfxWoosh);
  }
  lastTimerEndSeen = newEnd;
}

async function refreshStateOnly(source = "manual") {
  if (statePollInFlight) return;
  statePollInFlight = true;
  let hadError = false;

  try {
    const prevState       = latestState;
    const prevUnclaimed   = prevState?.unclaimed ?? null;
    const prevWinner58    = prevState ? prevState.currentWinner.toBase58() : null;
    const prevVaultAmount = latestVaultAmount;

    const acc = await connection.getAccountInfo(statePk, "confirmed");
    if (!acc?.data) {
      latestState = null;
      if (phaseText) phaseText.textContent = "Could not load game state";
      mainBtn.classList.add("disabled");
      mainBtn.disabled = true;
      setLabel("ERROR");
      return;
    }

    const decoded = decodeState(acc.data);
    const sig     = stateSignature(decoded);
    const changed = sig !== lastStateSig;

    latestState = decoded;
    const plays = Number(decoded.sessionPlays || 0);
    if (lastPlaysSeen === null) lastPlaysSeen = plays;

    if (changed) {
      lastStateSig = sig;
      handleWooshOnTimerReset(decoded);
      trackWinnerChanges(decoded);

      const w = decoded.currentWinner.toBase58();
      winnerLink.textContent = w === PublicKey.default.toBase58() ? "—" : w;
      winnerLink.href        = w === PublicKey.default.toBase58() ? "#" : solscanAccountUrl(w);
      unclaimedText.textContent = decoded.unclaimed ? "NO" : "YES";
      playCostText.textContent  = `${fmtTokenExact(decoded.playCost)} tokens`;

      const prevPlays = lastPlaysSeen;
      if (plays !== prevPlays) {
        lastPlaysSeen = plays;
        maybeRefreshVaultAmount("plays changed");
        if (walletPubkey) refreshUserBalance();
      } else {
        maybeRefreshVaultAmount("ttl");
      }

      const now = nowSec();
      const prevPhase = prevState ? computePhase(prevState, now) : null;
      const currentPhase = computePhase(decoded, now);
      const isWinnerClient = walletPubkey && decoded.currentWinner.toBase58() === walletPubkey.toBase58();

      // Claim was just made: clear "next round" override and use real vault from now on
      if (prevUnclaimed === true && decoded.unclaimed === false) {
        potDisplayNextRoundOverride = null;
        try {
          const vaultBal = await connection.getTokenAccountBalance(vaultPk, "confirmed");
          latestVaultAmount = BigInt(vaultBal?.value?.amount || "0");
        } catch (e) {
          console.warn("Vault refresh after claim failed", e);
        }
      }

      // Transition into COOLDOWN (round just ended): non-winners see pot → 0 → next round pot (modified vault)
      // Winner keeps seeing current pot until they claim
      if (prevState && prevPhase !== "COOLDOWN" && currentPhase === "COOLDOWN" && !isWinnerClient && !potAnimActive) {
        const currentPot = computePotFromStateAndVault(decoded, prevVaultAmount);
        if (currentPot > 0n) {
          const modifiedVault = prevVaultAmount - currentPot;
          const nextRoundPot = computePotFromStateAndVault(decoded, modifiedVault);
          const currentPotDisplay = currentPot * VAULT_DISPLAY_MULTIPLIER;
          const nextRoundPotDisplay = nextRoundPot * VAULT_DISPLAY_MULTIPLIER;
          if (nextRoundPotDisplay >= 0n) {
            runPotResetAnimation(currentPotDisplay, nextRoundPotDisplay, nextRoundPotDisplay);
          }
        }
      }

      render();
    } else {
      maybeRefreshVaultAmount("ttl");
    }
  } catch (e) {
    hadError = true;
    console.error(e);
    addLog(`Read error: ${e.message || e}`);
  } finally {
    statePollInFlight = false;
    if (source === "poll") scheduleNextStatePoll(hadError);
  }
}

function scheduleNextStatePoll(hadError) {
  if (statePollTimer) { clearTimeout(statePollTimer); statePollTimer = null; }
  consecutiveStateErrors = hadError
    ? Math.min(consecutiveStateErrors + 1, 5) : 0;
  const delay = Math.min(
    STATE_POLL_MS * (hadError ? (1 << consecutiveStateErrors) : 1) + Math.random() * STATE_POLL_JITTER_MS,
    STATE_POLL_BACKOFF_MAX_MS
  );
  statePollTimer = setTimeout(() => refreshStateOnly("poll"), delay);
}

/////////////////////////////
// RENDER  (no RPC)
/////////////////////////////
let lastPotKey      = "";
let potAnimActive   = false;
let potAnimFrameId  = null;
// When set, non-winners see this "next round" pot during COOLDOWN until claim is made
let potDisplayNextRoundOverride = null;

function computePotFromStateAndVault(gs, vaultAmount) {
  if (!gs) return 0n;
  const divisor = potDivisorFromPlays(gs.sessionPlays);
  return divisor > 0n ? (vaultAmount / divisor) : 0n;
}

function renderPotIfNeeded() {
  if (!latestState || !potDisplay) return;
  if (potAnimActive) return; // animation is controlling the pot text

  const now   = nowSec();
  const phase = computePhase(latestState, now);
  const isWinner = walletPubkey && latestState.currentWinner.toBase58() === walletPubkey.toBase58();

  // During COOLDOWN with pot unclaimed, non-winners see the "next round" pot (modified vault) until claim
  if (potDisplayNextRoundOverride !== null && phase === "COOLDOWN" && latestState.unclaimed && !isWinner) {
    potDisplay.textContent = fmtRounded(potDisplayNextRoundOverride);
    return;
  }

  const k = `${latestState.sessionPlays}|${latestVaultAmount}|${mintDecimals}`;
  if (k === lastPotKey) return;
  const wasEmpty = lastPotKey === "";
  lastPotKey = k;

  const pot  = computePotFromStateAndVault(latestState, getDisplayVault());
  const text = fmtRounded(pot);

  if (!wasEmpty && potDisplay.textContent !== text && potDisplay.textContent !== "—") {
    potDisplay.classList.remove("pot-updated");
    void potDisplay.offsetWidth;
    potDisplay.classList.add("pot-updated");
    setTimeout(() => potDisplay.classList.remove("pot-updated"), 1500);
  }
  potDisplay.textContent = text;
}

/**
 * @param {bigint} prevPotBig - current pot (drains to zero)
 * @param {bigint} nextPotBig - next round pot (fills from zero)
 * @param {bigint} [nextPotOverride] - if set, after animation we show this value until claim (don't call renderPotIfNeeded)
 */
function runPotResetAnimation(prevPotBig, nextPotBig, nextPotOverride = null) {
  if (!potDisplay) return;
  if (potAnimFrameId) cancelAnimationFrame(potAnimFrameId);

  potAnimActive = true;
  const zeroBig = 0n;

  const animateSegment = (fromBig, toBig, durationMs, done) => {
    const fromNum = Number(fromBig);
    const toNum   = Number(toBig);
    const start   = performance.now();

    const step = (now) => {
      const t   = Math.min(1, (now - start) / durationMs);
      const cur = fromNum + (toNum - fromNum) * t;
      const approxUnits = BigInt(Math.max(0, Math.round(cur)));
      potDisplay.textContent = fmtRounded(approxUnits);
      if (t < 1) {
        potAnimFrameId = requestAnimationFrame(step);
      } else if (done) {
        done();
      }
    };

    potAnimFrameId = requestAnimationFrame(step);
  };

  animateSegment(prevPotBig, zeroBig, 600, () => {
    setTimeout(() => {
      animateSegment(zeroBig, nextPotBig, 900, () => {
        potAnimActive = false;
        if (nextPotOverride !== null) {
          potDisplayNextRoundOverride = nextPotOverride;
          potDisplay.textContent = fmtRounded(nextPotOverride);
        } else {
          renderPotIfNeeded();
        }
      });
    }, 200);
  });
}

const URGENT_SECS = 10;

function setLabel(text) {
  if (btnLabelEl) btnLabelEl.textContent = text;
  else if (mainBtn) mainBtn.textContent = text;
}

function render() {
  renderWalletPill();
  renderBalanceBar();
  if (!latestState) return;

  const now   = nowSec();
  const phase = computePhase(latestState, now);

  renderPotIfNeeded();
  updateThresholdPanelIfNeeded();
  if (phaseText) phaseText.textContent = phaseLabel(phase, latestState);

  const winner58          = latestState.currentWinner.toBase58();
  const isWinnerConnected = !!walletPubkey && walletPubkey.toBase58() === winner58;

  // Leading share card: show only while we're the leader in an active round
  updateShareCard(isWinnerConnected && phase === "ACTIVE");

  // Claim share card: hide once a new round goes ACTIVE (someone pressed after our claim)
  if (claimShareCardVisible && phase === "ACTIVE") {
    hideClaimShareCard();
  }

  // ── CLOCK + PROGRESS BAR ──────────────────────────────
  let secondsLeft = 0, pct = 0;
  if (phase === "ACTIVE") {
    secondsLeft = latestState.timerEnd - now;
    if (clockLabel) clockLabel.textContent = "Time Remaining";
    const dur = Math.max(1, latestState.roundDurationSecs || 1);
    pct = Math.max(0, Math.min(1, (dur - secondsLeft) / dur));
  } else if (phase === "COOLDOWN") {
    secondsLeft = latestState.cooldownEnd - now;
    if (clockLabel) clockLabel.textContent = "Cooldown";
    const total = Math.max(1, (latestState.cooldownEnd - latestState.timerEnd) || 1);
    pct = Math.max(0, Math.min(1, (total - secondsLeft) / total));
  } else if (phase === "POST_COOLDOWN_UNCLAIMED") {
    if (clockLabel) clockLabel.textContent = "Waiting";
    secondsLeft = 0; pct = 1;
  } else {
    if (clockLabel) clockLabel.textContent = "Waiting";
    secondsLeft = 0; pct = 0;
  }

  if (clockDisplay) clockDisplay.textContent = fmtClock(secondsLeft);
  if (barFill) barFill.style.width = `${pct * 100}%`;

  // ── URGENCY ───────────────────────────────────────────
  const isUrgent = phase === "ACTIVE" && secondsLeft > 0 && secondsLeft <= URGENT_SECS;
  clockDisplay?.classList.toggle("urgent", isUrgent);
  barFill?.classList.toggle("urgent", isUrgent);
  if (isUrgent) startAlarm();
  else          stopAlarm();

  // ── TIMER HINT ────────────────────────────────────────
  if (timerHint) {
    timerHint.classList.toggle("hidden-hint", phase !== "ACTIVE" && phase !== "IDLE");
  }

  // While a transaction is in-flight, we keep ticking the timer/UI,
  // but we don't let render() override the button label/spinner/state.
  if (btnPendingActive) return;

  // ── BUTTON STATE ──────────────────────────────────────
  const connected  = !!walletPubkey;
  const timerEnded = latestState.timerEnd > 0 && now > latestState.timerEnd;
  const canClaim   = connected && isWinnerConnected && latestState.unclaimed
                  && latestState.enabled && timerEnded;

  claimArmed = canClaim;
  mainMode   = canClaim ? "CLAIM" : "PLAY";

  mainBtn.classList.remove("disabled", "claimLocked", "claimArmed", "urgent", "cooldown");
  btnGlowRing?.classList.remove("active", "urgent", "claim-glow");

  if (mainMode === "CLAIM") {
    setLabel("CLAIM");
    mainBtn.disabled = false;
    mainBtn.classList.add("claimArmed");
    btnGlowRing?.classList.add("claim-glow");
    return;
  }

  const canPlay = connected && latestState.enabled &&
    (phase === "ACTIVE" || phase === "IDLE" || phase === "POST_COOLDOWN_UNCLAIMED");

  if (canPlay) {
    setLabel("PLAY");
    mainBtn.disabled = false;
    if (isUrgent) {
      mainBtn.classList.add("urgent");
      btnGlowRing?.classList.add("urgent");
    } else if (phase === "ACTIVE") {
      btnGlowRing?.classList.add("active");
    }
  } else if (!connected) {
    setLabel("CONNECT");
    mainBtn.disabled = false;
  } else if (phase === "COOLDOWN") {
    setLabel("COOLDOWN");
    // Let users "practice" presses during cooldown — clickable but no-op in logic
    mainBtn.disabled = false;
    mainBtn.classList.add("cooldown");
  } else {
    setLabel("WAIT");
    mainBtn.disabled = true;
    mainBtn.classList.add("disabled");
  }
}

/////////////////////////////
// ATA CHECK
/////////////////////////////
async function ensureAtaExistsForWallet() {
  if (!walletPubkey) return false;
  const owner58 = walletPubkey.toBase58();
  if (cachedAtaOwner58 === owner58 && cachedAtaExists) return true;
  const info = await connection.getAccountInfo(findAta(walletPubkey, mintPk), "confirmed");
  cachedAtaOwner58 = owner58;
  cachedAtaExists  = !!info;
  return cachedAtaExists;
}

/////////////////////////////
// MAIN BUTTON ACTION
/////////////////////////////
async function onMain() {
  if (!latestState) return;

  // No wallet → connect first, then retry
  if (!walletPubkey) {
    if (!getWalletProvider()) { showNoWalletCard(); return; }
    const ok = await connectWallet();
    if (!ok || !walletPubkey) return;
    return onMain();
  }

  const now        = nowSec();
  const isWinner   = walletPubkey.toBase58() === latestState.currentWinner.toBase58();
  const timerEnded = latestState.timerEnd > 0 && now > latestState.timerEnd;
  const phase      = computePhase(latestState, now);

  // During COOLDOWN, ONLY the winning wallet with an unclaimed pot can do anything (claim).
  // Everyone else can still press for sound/animation, but we bail out before any on-chain logic.
  if (phase === "COOLDOWN" && !(isWinner && latestState.unclaimed && latestState.enabled && timerEnded)) {
    return;
  }

  // ── CLAIM ──────────────────────────────────────────────
  if (isWinner && latestState.unclaimed && latestState.enabled && timerEnded) {
    const ix = await buildClaimIx({
      winnerPk:    walletPubkey,
      winnerAtaPk: latestState.currentWinnerAta,
    });

    // Snapshot the pot amount NOW — before fastStateSyncBurst updates
    // latestVaultAmount to the post-claim value.
    const divisorAtClaim   = potDivisorFromPlays(latestState.sessionPlays);
    const potAtClaim       = divisorAtClaim > 0n ? (latestVaultAmount / divisorAtClaim) : 0n;
    const claimedAmountFmt = fmtRounded(potAtClaim * VAULT_DISPLAY_MULTIPLIER);

    const pending = showToast({
      type: "info", title: "Approve in your wallet",
      message: "Check your wallet extension to sign the claim.", duration: 90_000,
    });

    try {
      await sendTx(ix, step => {
        if (step === "signing")    { setBtnPending(true, "SIGNING…");    addLog("Claim: signing…"); }
        if (step === "sending")    { setBtnPending(true, "CLAIMING…");   }
        if (step === "confirming") { setBtnPending(true, "CONFIRMING…"); }
      });

      // Tx is fully confirmed at this point — clear the
      // pending state and play the same pot reset animation
      // the rest of the network saw, using the predicted
      // post-claim vault (vault - potAtClaim).
      setBtnPending(false);

      const nextVaultAfterClaim = latestVaultAmount - potAtClaim;
      const nextPotAfterClaim   =
        divisorAtClaim > 0n ? (nextVaultAfterClaim / divisorAtClaim) : 0n;
      potDisplayNextRoundOverride = null; // winner just claimed; use real vault from here
      if (potAtClaim > 0n && nextPotAfterClaim >= 0n && !potAnimActive) {
        const displayPrev = potAtClaim * VAULT_DISPLAY_MULTIPLIER;
        const displayNext = nextPotAfterClaim * VAULT_DISPLAY_MULTIPLIER;
        latestVaultAmount = nextVaultAfterClaim; // so when animation ends, renderPotIfNeeded shows next round pot
        runPotResetAnimation(displayPrev, displayNext);
      }

      pending._dismiss();
      toastSuccess("Claimed! 🎉", `${claimedAmountFmt} $BUTTON sent to your wallet.`);
      addLog("Claim complete");

      // Show the post-claim share card with the exact amount won
      showClaimShareCard(claimedAmountFmt);

      await fastStateSyncBurst();
      refreshUserBalance();
    } catch (e) {
      // Any failure should immediately give control of the button
      // back to render() before we surface error toasts.
      setBtnPending(false);

      pending._dismiss();
      const msg = e?.message ?? String(e);
      addLog(`Claim failed: ${msg}`);
      /rejected|cancel/i.test(msg)
        ? toastInfo("Claim cancelled", "You still hold the winning position — try again any time.")
        : toastError("Claim failed", msg);
      await refreshStateOnly();
    }
    return;
  }

  // ── PLAY ───────────────────────────────────────────────
  // ATA check before any loading UI (avoids flashing spinner for a local cache hit)
  const ataOk = await ensureAtaExistsForWallet();
  if (!ataOk) { showNoAtaCard(); return; }

  const playerAta = findAta(walletPubkey, mintPk);
  const DEFAULT_PK = "11111111111111111111111111111111";
  const prevWinnerAta = latestState.currentWinnerAta.toBase58() === DEFAULT_PK
    ? playerAta : latestState.currentWinnerAta;

  const ix = await buildPlayIx({
    playerPk: walletPubkey,
    playerAtaPk: playerAta,
    previousWinnerAtaPk: prevWinnerAta,
  });

  const pending = showToast({
    type: "info", title: "Approve in your wallet",
    message: "Check your wallet extension to sign the play.", duration: 90_000,
  });

  try {
    await sendTx(ix, step => {
      if (step === "signing") {
        // Set suppress flag here — only after user has committed to signing.
        // If they cancel before this point, the flag never gets set.
        suppressNextWoosh = true;
        setBtnPending(true, "SIGNING…");
        addLog("Play: signing…");
      }
      if (step === "sending")    { setBtnPending(true, "SENDING…");    }
      if (step === "confirming") { setBtnPending(true, "CONFIRMING…"); }
    });

    // Tx is fully confirmed here; clear the pending state so
    // the button label snaps back in sync with the new round
    // before we show success toasts/animations.
    setBtnPending(false);

    // Local feedback that our play landed, even if we suppress the global woosh.
    playSfx(sfxPlayComplete);

    pending._dismiss();
    toastSuccess("Button pressed! ✅", "You're leading. Hold tight — don't let the clock run out.");
    addLog("Play complete");
    await fastStateSyncBurst();
    refreshUserBalance();
  } catch (e) {
    // Clear suppress flag on any failure so the next legitimate press
    // from another player correctly plays the woosh sound.
    suppressNextWoosh = false;

    pending._dismiss();
    const msg = e?.message ?? String(e);
    addLog(`Play failed: ${msg}`);

    if (/rejected|cancel/i.test(msg)) {
      toastInfo("Transaction cancelled", "No tokens spent — press the button again when ready.");
    } else if (/insufficient|balance/i.test(msg)) {
      const cost = latestState ? fmtRounded(latestState.playCost) : "1,000";
      toastError("Not enough tokens", `You need ${cost} $BUTTON to play. Get some at pump.fun`);
    } else {
      toastError("Transaction failed", msg);
    }

    // On error, also immediately hand control of the button back
    // before we refresh state so the UI doesn't feel stuck on
    // a stale CONFIRMING… label.
    setBtnPending(false);
    await refreshStateOnly();
  }
}

/////////////////////////////
// SIDEBAR (open/close)
/////////////////////////////
function openSidebar() {
  sidebar?.classList.add("open");
  sidebarCloseBtn?.focus();
}
function closeSidebar() {
  sidebar?.classList.remove("open");
}

sidebarToggleBtn?.addEventListener("click", () => {
  if (sidebar?.classList.contains("open")) closeSidebar();
  else openSidebar();
});
sidebarCloseBtn?.addEventListener("click", closeSidebar);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sidebar?.classList.contains("open")) closeSidebar();
});

/////////////////////////////
// DETAILS TOGGLE (inside sidebar)
/////////////////////////////
toggleDetailsBtn?.addEventListener("click", () => {
  detailsPanel.classList.toggle("hidden");
  const arrow = el("toggleArrow");
  arrow?.classList.toggle("open", !detailsPanel.classList.contains("hidden"));
});

/////////////////////////////
// BUTTON EVENTS
/////////////////////////////
connectBtn?.addEventListener("click",    connectWallet);
disconnectBtn?.addEventListener("click", disconnectWallet);

let isPressing = false;

mainBtn.addEventListener("pointerdown", e => {
  if (mainBtn.disabled) return;
  isPressing = true;
  try { mainBtn.setPointerCapture(e.pointerId); } catch {}
  playSfx(sfxDown);

  const { left, top, width, height } = mainBtn.getBoundingClientRect();
  let color;
  if (mainBtn.classList.contains("claimArmed"))       color = "#F9AB00";  // golden
  else if (mainBtn.classList.contains("urgent"))      color = "#E8392C";  // red
  else if (mainBtn.classList.contains("cooldown"))    color = "#6366F1";  // indigo to match cooldown
  else                                                color = "#1E8E3E";  // default green
  spawnParticles(left + width / 2, top + height / 2, color);
});

function onRelease(e) {
  if (!isPressing) return;
  isPressing = false;
  if (typeof e?.pointerId === "number") try { mainBtn.releasePointerCapture(e.pointerId); } catch {}
  playSfx(sfxUp);
}

mainBtn.addEventListener("pointerup",          onRelease);
mainBtn.addEventListener("pointercancel",       onRelease);
mainBtn.addEventListener("lostpointercapture",  onRelease);
mainBtn.addEventListener("click",               onMain);

/////////////////////////////
// RELAY / SSE
/////////////////////////////
let relayEventSource = null;

function applyRelayState(payload) {
  if (payload.type === "error") { console.warn("[Relay]", payload.message); return; }
  if (payload.type !== "state") return;

  const gs      = payload.state;
  const decoded = {
    owner:             new PublicKey(gs.owner),
    tokenMint:         new PublicKey(gs.tokenMint),
    vault:             new PublicKey(gs.vault),
    playCost:          BigInt(gs.playCost),
    roundDurationSecs: gs.roundDurationSecs,
    currentWinner:     new PublicKey(gs.currentWinner),
    currentWinnerAta:  new PublicKey(gs.currentWinnerAta),
    timerEnd:          gs.timerEnd,
    cooldownEnd:       gs.cooldownEnd,
    unclaimed:         gs.unclaimed,
    sessionPlays:      gs.sessionPlays,
    enabled:           gs.enabled,
    bump:              gs.bump,
  };

  const sig     = stateSignature(decoded);
  const changed = sig !== lastStateSig;
  latestState = decoded;

  const plays = decoded.sessionPlays;
  if (lastPlaysSeen === null) lastPlaysSeen = plays;

  if (changed) {
    lastStateSig = sig;
    handleWooshOnTimerReset(decoded);
    trackWinnerChanges(decoded);

    const w = decoded.currentWinner.toBase58();
    winnerLink.textContent = w === PublicKey.default.toBase58() ? "—" : w;
    winnerLink.href        = w === PublicKey.default.toBase58() ? "#" : solscanAccountUrl(w);
    unclaimedText.textContent = decoded.unclaimed ? "NO" : "YES";
    playCostText.textContent  = `${fmtTokenExact(decoded.playCost)} tokens`;

    const prevPlays = lastPlaysSeen;
    if (Number(plays) !== Number(prevPlays) && walletPubkey) refreshUserBalance();

    render();
  }

  if (payload.vaultAmount != null) {
    const nv = BigInt(payload.vaultAmount);
    if (nv !== latestVaultAmount) {
      latestVaultAmount = nv;
      lastVaultFetchMs  = Date.now();
      lastPlaysSeen     = plays;
      if (vaultText) vaultText.textContent = `${fmtTokenExact(getDisplayVault())} tokens`;
      updateThresholdPanelIfNeeded();
      renderPotIfNeeded();
    }
  }
}

function connectRelay() {
  try { relayEventSource?.close(); } catch {}
  const es = new EventSource(RELAY_URL.replace(/\/$/, "") + "/events");
  relayEventSource = es;

  const dot = () => relayStatusEl?.querySelector(".relay-dot");
  es.onopen    = () => dot()?.classList.add("live");
  es.onerror   = () => dot()?.classList.remove("live");
  es.onmessage = e => {
    try { applyRelayState(JSON.parse(e.data)); } catch (err) { console.warn("[Relay] bad msg", err); }
  };
}

/////////////////////////////
// BOOT
/////////////////////////////
(async function boot() {
  connection = new Connection(rpcUrl(), "confirmed");

  if (!RELAY_URL && relayStatusEl) relayStatusEl.style.display = "none";

  // One-time static links
  programLink.textContent = programIdPk.toBase58();
  programLink.href        = solscanAccountUrl(programIdPk.toBase58());
  stateLink.textContent   = statePk.toBase58();
  stateLink.href          = solscanAccountUrl(statePk.toBase58());
  vaultLink.textContent   = vaultPk.toBase58();
  vaultLink.href          = solscanAccountUrl(vaultPk.toBase58());
  mintLink.textContent    = mintPk.toBase58();
  mintLink.href           = solscanAccountUrl(mintPk.toBase58());

  const buyUrl = `https://pump.fun/coin/${GAME_MINT}`;
  const buyTopbar = el("buyButtonTopbar");
  const buyAbovePot = el("buyButtonAbovePot");
  if (buyTopbar) buyTopbar.href = buyUrl;
  if (buyAbovePot) buyAbovePot.href = buyUrl;

  const provider = getWalletProvider();
  if (provider) installWalletListeners(provider);

  // Auto-reconnect if previously trusted
  if (provider?.isPhantom) {
    try {
      const r = await provider.connect({ onlyIfTrusted: true });
      if (r?.publicKey) {
        walletPubkey = r.publicKey;
        disconnectBtn.style.display = "inline-block";
        connectBtn.style.display    = "none";
        cachedAtaOwner58 = null; cachedAtaExists = false;
        wasWinnerLastRender = false;
        addLog(`Auto-connected: ${walletPubkey.toBase58()}`);
      }
    } catch {}
  }

  await ensureMintDecimals();
  if (!musicMuted) startBgMusicIfAllowed();

  if (RELAY_URL) {
    try {
      const snap = await fetch(RELAY_URL.replace(/\/$/, "") + "/state");
      if (snap.ok) applyRelayState(await snap.json());
    } catch (e) { console.warn("[Relay] snapshot failed:", e.message); }

    connectRelay();
    setInterval(render, UI_TICK_MS);
  } else {
    await refreshStateOnly("boot");
    await maybeRefreshVaultAmount("boot");
    scheduleNextStatePoll(false);
    setInterval(render, UI_TICK_MS);
  }

  syncTimeOnce(); // align timer/cooldown with server time so all devices show the same countdown
  if (walletPubkey) refreshUserBalance();
  mainBtn.disabled = false;
})();