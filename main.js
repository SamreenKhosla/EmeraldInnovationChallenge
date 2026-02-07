// ================= HELPERS =================
function todayKey(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function storageGet(name, fallback){
  try{
    const raw = localStorage.getItem(name);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}

function storageSet(name, value){
  localStorage.setItem(name, JSON.stringify(value));
}

function labelForScore(score){
  if (score > 50) return "Great";
  if (score > 25) return "Okay";
  return "Needs Work";
}

function lastNDates(n){
  const out = [];
  const d = new Date();
  d.setHours(0,0,0,0);
  for (let i = n-1; i >= 0; i--){
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    const yyyy = x.getFullYear();
    const mm = String(x.getMonth()+1).padStart(2,"0");
    const dd = String(x.getDate()).padStart(2,"0");
    out.push(`${yyyy}-${mm}-${dd}`);
  }
  return out;
}

function sum(arr){ return arr.reduce((a,b)=>a+b,0); }
function fmt(n){ return Number.isFinite(n) ? String(Math.round(n)) : "0"; }

// ================= DATE PILL =================
const pill = document.getElementById("todayPill");
if (pill){
  pill.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

// ================= SIDEBAR =================
const menuBtn = document.getElementById("menuBtn");
const closeBtn = document.getElementById("closeBtn");
const overlay = document.getElementById("overlay");
const sideLinks = document.querySelectorAll(".sideLink");

function openMenu(){ document.body.classList.add("menuOpen"); }
function closeMenu(){ document.body.classList.remove("menuOpen"); }

if (menuBtn) menuBtn.addEventListener("click", openMenu);
if (closeBtn) closeBtn.addEventListener("click", closeMenu);
if (overlay) overlay.addEventListener("click", closeMenu);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

// ================= PAGE ROUTING =================
const pages = {
  home: document.getElementById("page-home"),
  log: document.getElementById("page-log"),
  impact: document.getElementById("page-impact"),
  badges: document.getElementById("page-badges")
};

function setActivePage(key){
  Object.values(pages).forEach(p => p && p.classList.remove("active"));
  if (pages[key]) pages[key].classList.add("active");

  sideLinks.forEach(btn =>
    btn.classList.toggle("active", btn.dataset.target === key)
  );

  window.scrollTo({ top: 0, behavior: "smooth" });
}

sideLinks.forEach(btn => {
  btn.addEventListener("click", () => {
    setActivePage(btn.dataset.target);
    closeMenu();
  });
});

const logTodayBtn = document.getElementById("logTodayBtn");
if (logTodayBtn){
  logTodayBtn.addEventListener("click", () => setActivePage("log"));
}

// ================= UI NODES =================
const scoreRing = document.getElementById("scoreRing");
const scoreNum = document.getElementById("scoreNum");
const scoreWord = document.getElementById("scoreWord");
const scoreChange = document.getElementById("scoreChange");
const streakDaysEl = document.getElementById("streakDays");
const highlightsList = document.getElementById("highlightsList");

// ================= STORAGE KEYS =================
const LOG_KEY = "ecolog";
const META_KEY = "ecometa";

// ================= SCORE CALC (BASE = 0) =================
function computeFromSelections(){
  const chosen = [];

  // Checkboxes
  document.querySelectorAll('#page-log input[type="checkbox"]:checked')
    .forEach(el => {
      chosen.push({
        name: el.dataset.name,
        cat: el.dataset.cat,
        points: Number(el.dataset.points),
        emoji: el.dataset.emoji || "✅"
      });
    });

  // Transport radio
  const r = document.querySelector('#page-log input[name="transport"]:checked');
  if (r){
    chosen.push({
      name: r.dataset.name,
      cat: r.dataset.cat,
      points: Number(r.dataset.points),
      emoji: r.dataset.emoji || "🚲"
    });
  }

  // A/C hours (hours × −5)
  const acHours = Number(document.getElementById("acHours")?.value || 0);
  if (acHours > 0){
    chosen.push({
      name: `Used A/C (${acHours}h)`,
      cat: "Energy",
      points: acHours * -5,
      emoji: "❄️"
    });
  }

  // Base = 0 (can be negative)
  const score = chosen.reduce((sum, a) => sum + a.points, 0);

  return { chosen, score, acHours };
}

// ================= HIGHLIGHTS =================
function renderHighlights(actions){
  if (!highlightsList) return;

  highlightsList.innerHTML = "";

  if (!actions || actions.length === 0){
    highlightsList.innerHTML =
      `<div class="placeholder">No log yet. Tap “Log today”.</div>`;
    return;
  }

  const positives = actions.filter(a => a.points > 0).sort((a,b) => b.points - a.points).slice(0, 2);
  const negatives = actions.filter(a => a.points < 0).sort((a,b) => a.points - b.points).slice(0, 1);

  [...positives, ...negatives].forEach(a => {
    const item = document.createElement("div");
    item.className = "hlItem";
    item.innerHTML = `
      <div class="hlLeft">
        <div class="badge">${a.emoji}</div>
        <div class="hlText">
          <div class="main">${a.name}</div>
          <div class="sub">${a.cat}</div>
        </div>
      </div>
      <div class="delta ${a.points >= 0 ? "good" : "bad"}">
        ${a.points > 0 ? "+" : ""}${a.points}
      </div>
    `;
    highlightsList.appendChild(item);
  });
}

// ================= HOME UI UPDATE (3 COLOR STATES) =================
function updateHomeUI(todayData, meta){
  const score = todayData?.score ?? 0;

  // Ring fill (visual only)
  const fill = Math.min(Math.abs(score), 100);
  if (scoreRing) scoreRing.style.setProperty("--p", fill);

  // Color state
  if (scoreRing){
    scoreRing.classList.remove("low", "mid", "high");
    if (score <= 25) scoreRing.classList.add("low");
    else if (score <= 50) scoreRing.classList.add("mid");
    else scoreRing.classList.add("high");
  }

  if (scoreNum) scoreNum.textContent = score;
  if (scoreWord) scoreWord.textContent = labelForScore(score);

  const prev = meta?.prevScore ?? 0;
  const change = score - prev;
  if (scoreChange) scoreChange.textContent = (change >= 0 ? "+" : "") + change;

  if (streakDaysEl) streakDaysEl.textContent = meta?.streak ?? 0;

  renderHighlights(todayData?.actions ?? []);
}

// ================= STREAK LOGIC =================
function dateToNumber(key){
  const [y,m,d] = key.split("-").map(Number);
  return new Date(y, m-1, d).getTime();
}

function isYesterday(prevKey, newKey){
  return dateToNumber(newKey) - dateToNumber(prevKey) === 86400000;
}

// ================= IMPACT PAGE (SAFE: only runs if IDs exist) =================
function renderImpactPage(){
  const wkTotal = document.getElementById("wkTotal");
  const wkAvg = document.getElementById("wkAvg");
  const wkBest = document.getElementById("wkBest");
  const topPos = document.getElementById("topPos");
  const topNeg = document.getElementById("topNeg");
  const catFood = document.getElementById("catFood");
  const catTransport = document.getElementById("catTransport");
  const catEnergy = document.getElementById("catEnergy");
  const catWaste = document.getElementById("catWaste");
  const svg = document.getElementById("weekChart");

  if (!wkTotal || !svg) return;

  const logs = storageGet(LOG_KEY, {});
  const keys = lastNDates(7);
  // Check if user ever scored 50+
  const scores = keys.map(k => logs[k]?.score ?? 0);

  wkTotal.textContent = fmt(sum(scores));
  wkAvg.textContent = fmt(sum(scores) / 7);
  wkBest.textContent = fmt(Math.max(...scores));

  // collect actions
  const allActions = [];
  keys.forEach(k => (logs[k]?.actions || []).forEach(a => allActions.push(a)));

  const byAction = new Map();
  allActions.forEach(a => {
    const key = `${a.emoji}|${a.name}|${a.cat}`;
    byAction.set(key, (byAction.get(key) || 0) + Number(a.points || 0));
  });

  const actionList = Array.from(byAction.entries()).map(([k, pts]) => {
    const [emoji, name, cat] = k.split("|");
    return { emoji, name, cat, points: pts };
  });

  const positives = actionList.filter(a => a.points > 0).sort((a,b)=>b.points-a.points).slice(0,3);
  const negatives = actionList.filter(a => a.points < 0).sort((a,b)=>a.points-b.points).slice(0,3);

  function row(a){
    const sign = a.points >= 0 ? "+" : "";
    const cls = a.points >= 0 ? "good" : "bad";
    return `
      <div class="impactItem">
        <div class="impactLeft">
          <div class="badge">${a.emoji}</div>
          <div class="impactName">${a.name}</div>
        </div>
        <div class="impactDelta ${cls}">${sign}${Math.round(a.points)}</div>
      </div>
    `;
  }

  if (topPos) topPos.innerHTML = positives.length ? positives.map(row).join("") : `<div class="placeholder">No positives yet.</div>`;
  if (topNeg) topNeg.innerHTML = negatives.length ? negatives.map(row).join("") : `<div class="placeholder">No negatives yet.</div>`;

  const cats = { Food:0, Transport:0, Energy:0, Waste:0 };
  allActions.forEach(a => { if (cats[a.cat] != null) cats[a.cat] += Number(a.points || 0); });

  if (catFood) catFood.textContent = fmt(cats.Food);
  if (catTransport) catTransport.textContent = fmt(cats.Transport);
  if (catEnergy) catEnergy.textContent = fmt(cats.Energy);
  if (catWaste) catWaste.textContent = fmt(cats.Waste);

  drawWeekChart(svg, scores);
}

function drawWeekChart(svg, scores){
  svg.innerHTML = "";

  const W = 320, H = 140;
  const padL = 18, padR = 10, padT = 12, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const minV = Math.min(...scores, 0);
  const maxV = Math.max(...scores, 0);
  const range = (maxV - minV) || 1;
  const xStep = innerW / 6;

  const pts = scores.map((v,i)=>{
    const x = padL + i * xStep;
    const y = padT + (maxV - v) * (innerH / range);
    return {x,y,v};
  });

  const zeroY = padT + (maxV - 0) * (innerH / range);
  if (zeroY >= padT && zeroY <= padT + innerH){
    const zero = document.createElementNS("http://www.w3.org/2000/svg","line");
    zero.setAttribute("x1", padL);
    zero.setAttribute("x2", padL + innerW);
    zero.setAttribute("y1", zeroY);
    zero.setAttribute("y2", zeroY);
    zero.setAttribute("stroke", "#e7efe9");
    zero.setAttribute("stroke-width", "2");
    svg.appendChild(zero);
  }

  const area = document.createElementNS("http://www.w3.org/2000/svg","path");
  const dArea = [
    `M ${pts[0].x} ${padT + innerH}`,
    ...pts.map(p=>`L ${p.x} ${p.y}`),
    `L ${pts[pts.length-1].x} ${padT + innerH}`,
    "Z"
  ].join(" ");
  area.setAttribute("d", dArea);
  area.setAttribute("fill", "rgba(67,163,95,0.15)");
  svg.appendChild(area);

  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  const d = ["M", pts[0].x, pts[0].y, ...pts.slice(1).flatMap(p=>["L", p.x, p.y])].join(" ");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#2f7a48");
  path.setAttribute("stroke-width", "3");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);

  pts.forEach(p=>{
    const c = document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", "5");
    c.setAttribute("fill", "#2f7a48");
    svg.appendChild(c);
  });
}

function saveToday(){
  const key = todayKey();
  const { chosen, score, acHours } = computeFromSelections();

  const logs = storageGet(LOG_KEY, {});
  const meta = storageGet(META_KEY, {
    prevScore: 0,
    lastScore: 0,
    streak: 0,
    lastLoggedDate: null
  });

  // streak update
  if (meta.lastLoggedDate === key){
    // same day
  } else if (meta.lastLoggedDate && isYesterday(meta.lastLoggedDate, key)){
    meta.streak += 1;
  } else {
    meta.streak = 1;
  }

  // save log
  logs[key] = { actions: chosen, score, acHours };
  storageSet(LOG_KEY, logs);

  // update meta
  meta.prevScore = meta.lastScore;
  meta.lastScore = score;
  meta.lastLoggedDate = key;
  storageSet(META_KEY, meta);

  updateHomeUI(logs[key], meta);
  renderImpactPage();
  renderBadgesPage();
}

// ================= RESET =================
function resetLogInputs(){
  document.querySelectorAll('#page-log input[type="checkbox"]').forEach(i => i.checked = false);
  document.querySelectorAll('#page-log input[name="transport"]').forEach(i => i.checked = false);
  const ac = document.getElementById("acHours");
  if (ac) ac.value = "";
}

// ================= LOAD ON START =================
function loadInitial(){
  const key = todayKey();
  const logs = storageGet(LOG_KEY, {});
  const meta = storageGet(META_KEY, {
    prevScore: 0,
    lastScore: 0,
    streak: 0,
    lastLoggedDate: null
  });

  const todayData = logs[key] || null;
  updateHomeUI(todayData, meta);

  // restore today's selections (optional)
  if (todayData?.actions){
    const set = new Set(todayData.actions.map(a => `${a.cat}|${a.name}|${a.points}`));

    document.querySelectorAll('#page-log input[type="checkbox"]').forEach(el => {
      const k = `${el.dataset.cat}|${el.dataset.name}|${el.dataset.points}`;
      el.checked = set.has(k);
    });

    document.querySelectorAll('#page-log input[name="transport"]').forEach(el => {
      const k = `${el.dataset.cat}|${el.dataset.name}|${el.dataset.points}`;
      el.checked = set.has(k);
    });

    const ac = document.getElementById("acHours");
    if (ac && todayData.acHours != null) ac.value = todayData.acHours;
  } else {
    renderHighlights([]);
  }

  renderImpactPage();
  renderBadgesPage();
}
loadInitial();

// ================= BUTTON WIRES =================
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");

if (saveBtn){
  saveBtn.addEventListener("click", () => {
    saveToday();
    setActivePage("home");
  });
}

if (resetBtn){
  resetBtn.addEventListener("click", resetLogInputs);
}

function renderBadgesPage(){
  const sumEarned = document.getElementById("sumEarned");
  const sumLogged = document.getElementById("sumLogged");
  const sumStreak = document.getElementById("sumStreak");
  const grid = document.getElementById("badgeGrid");
  if (!grid || !sumEarned || !sumLogged || !sumStreak) return;

  const logs = storageGet(LOG_KEY, {});
  const meta = storageGet(META_KEY, { streak: 0 });
  const keys = Object.keys(logs).sort();
  const loggedDays = keys.length;

  // ✅ 50 badge logic (ever hit 50+ on ANY day)
  const hit50 = keys.some(k => (logs[k]?.score ?? 0) >= 50);

  const streak = Number(meta.streak || 0);

  const badges = [
    { icon:"🌟", name:"EcoScore 50", desc:"Reach a daily EcoScore of 50 or higher.", need:1, have: hit50 ? 1 : 0 },

    { icon:"✅", name:"First Log", desc:"Log your first day.", need:1, have: loggedDays },
    { icon:"📅", name:"Consistency", desc:"Log 5 days total.", need:5, have: loggedDays },
    { icon:"🏆", name:"Eco Habit Builder", desc:"Log 10 days total.", need:10, have: loggedDays },

    { icon:"🔥", name:"3-Day Streak", desc:"Keep a 3 day streak.", need:3, have: streak },
    { icon:"🔥", name:"7-Day Streak", desc:"Keep a 7 day streak.", need:7, have: streak },
  ].map(b => {
    const unlocked = b.have >= b.need;
    const progress = `${Math.min(b.have, b.need)}/${b.need}`;
    return { ...b, unlocked, progress };
  });

  const earned = badges.filter(b => b.unlocked).length;

  sumEarned.textContent = earned;
  sumLogged.textContent = loggedDays;
  sumStreak.textContent = streak;

  grid.innerHTML = badges.map(b => `
    <div class="badgeCard ${b.unlocked ? "" : "locked"}">
      <div class="badgeIcon">${b.icon}</div>
      <div class="badgeInfo">
        <p class="badgeName">${b.name}</p>
        <p class="badgeDesc">${b.desc}</p>
        <div class="badgeMeta">
          <div class="badgeTag ${b.unlocked ? "" : "locked"}">${b.unlocked ? "Earned" : "Locked"}</div>
          <div class="progressPill">${b.progress}</div>
        </div>
      </div>
    </div>
  `).join("");
}
