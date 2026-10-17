const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "atlasPremiumCards_v1";
let cards = loadCards();
let currentPhotoData = "";
let currentCardId = null;
let currentLocation = null;
let photoProcessing = false;
let editingCardId = null;
let currentPreviewCard = null;
let pendingAchievementCelebrations = [];

function loadCards() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveCards() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)); return true; }
  catch {
    alert("O armazenamento local está cheio. Exclua algumas cartas ou fotos e tente novamente. Faça uma cópia de segurança antes de limpar dados.");
    return false;
  }
}
function safeText(value) { return String(value || "").trim(); }
function normalizePlace(value) {
  return safeText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}
function placeKey(card) {
  return [card.country, card.city, card.landmark].map(normalizePlace).join("|");
}
function normalizeVisitDate(value) {
  const raw = safeText(value);
  if (!raw) return "";
  // Aceita DD/MM/AAAA (mais fácil de digitar no celular) e AAAA-MM-DD.
  let match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) return null;
    return raw;
  }
  return null;
}

function formattedDate(value) {
  if (!value) return "A definir";
  const d = new Date(value + "T12:00:00");
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("pt-BR", {day:"2-digit", month:"long", year:"numeric"});
}
function makeLetter(card) {
  const traveler = card.traveler ? `, ${card.traveler}` : "";
  const memory = card.memory ? ` A lembrança que fica: ${card.memory}` : "";
  return `Esta carta celebra minha passagem por ${card.landmark}, em ${card.city}, ${card.country}${traveler}. Este lugar agora faz parte da minha história e do meu álbum de viagens.${memory}`;
}
function countryPalette(country) {
  // Cores principais da bandeira do país, usadas na moldura da carta.
  const palettes = {
    "brasil": ["#169B62", "#FFDF00", "#002776"], "brazil": ["#169B62", "#FFDF00", "#002776"],
    "franca": ["#0055A4", "#FFFFFF", "#EF4135"], "france": ["#0055A4", "#FFFFFF", "#EF4135"],
    "alemanha": ["#111111", "#DD0000", "#FFCE00"], "germany": ["#111111", "#DD0000", "#FFCE00"],
    "italia": ["#009246", "#FFFFFF", "#CE2B37"], "italy": ["#009246", "#FFFFFF", "#CE2B37"],
    "portugal": ["#006600", "#FF0000", "#F7D046"],
    "espanha": ["#AA151B", "#F1BF00", "#AA151B"], "spain": ["#AA151B", "#F1BF00", "#AA151B"],
    "estados unidos": ["#3C3B6E", "#FFFFFF", "#B22234"], "eua": ["#3C3B6E", "#FFFFFF", "#B22234"], "united states": ["#3C3B6E", "#FFFFFF", "#B22234"],
    "inglaterra": ["#012169", "#FFFFFF", "#C8102E"], "reino unido": ["#012169", "#FFFFFF", "#C8102E"], "united kingdom": ["#012169", "#FFFFFF", "#C8102E"],
    "japao": ["#FFFFFF", "#BC002D", "#BC002D"], "japan": ["#FFFFFF", "#BC002D", "#BC002D"],
    "china": ["#DE2910", "#FFDE00", "#DE2910"], "argentina": ["#74ACDF", "#FFFFFF", "#F6B40E"],
    "chile": ["#0039A6", "#FFFFFF", "#D52B1E"], "uruguai": ["#FFFFFF", "#5CB8E6", "#FCD116"],
    "paraguai": ["#D52B1E", "#FFFFFF", "#0038A8"], "peru": ["#D91023", "#FFFFFF", "#D91023"],
    "canada": ["#D80621", "#FFFFFF", "#D80621"], "mexico": ["#006847", "#FFFFFF", "#CE1126"],
    "grecia": ["#0D5EAF", "#FFFFFF", "#0D5EAF"], "suica": ["#FF0000", "#FFFFFF", "#FF0000"],
    "holanda": ["#AE1C28", "#FFFFFF", "#21468B"], "paises baixos": ["#AE1C28", "#FFFFFF", "#21468B"],
    "australia": ["#012169", "#FFFFFF", "#E4002B"], "india": ["#FF9933", "#FFFFFF", "#138808"],
    "coreia do sul": ["#FFFFFF", "#CD2E3A", "#0047A0"], "tailandia": ["#A51931", "#FFFFFF", "#2D2A4A"],
    "egito": ["#CE1126", "#FFFFFF", "#000000"], "africa do sul": ["#007749", "#FFB81C", "#DE3831"]
  };
  return palettes[normalizePlace(country)] || ["#8B52B6", "#E7C77E", "#BD8CFF"];
}
function applyPreviewPalette(card) {
  // A moldura recebe detalhes com as cores da bandeira do país visitado,
  // preservando o estilo roxo premium do Atlas.
  const [primary, secondary, accent] = countryPalette(card.country);
  const travelCard = document.querySelector(".travel-card");
  const art = document.querySelector(".card-art");
  if (travelCard) {
    travelCard.style.setProperty("--flag-primary", primary);
    travelCard.style.setProperty("--flag-secondary", secondary);
    travelCard.style.setProperty("--flag-accent", accent);
    travelCard.style.border = `4px solid ${primary}`;
    travelCard.style.boxShadow = "0 22px 50px #8e24ff30, inset 0 0 0 2px #ffffff";
  }
  if (art) art.style.border = `4px solid ${accent}`;
}
function renderPreview(card) {
  currentPreviewCard = card;
  const art = document.getElementById("cardArt"); if (art) { art.classList.toggle("photo-portrait", card.photoOrientation === "9:16"); art.classList.toggle("photo-landscape", card.photoOrientation !== "9:16"); }
  currentCardId = card.id;
  const previewCardElement = document.getElementById("travelCard");
  if (previewCardElement) previewCardElement.classList.toggle("travel-card-portrait", card.photoOrientation === "9:16");
  applyPreviewPalette(card);
  const flag = document.getElementById("previewFlag"); if (flag) { flag.textContent = flagForCountry(card.country); flag.title = "Bandeira: " + card.country; }
  $("previewCountry").textContent = safeText(card.country).toLocaleUpperCase("pt-BR") || "PAÍS A DESCOBRIR";
  $("previewLandmark").textContent = safeText(card.landmark) || "Seu próximo destino";
  $("previewCity").textContent = safeText(card.city) || "A sua história começa aqui";
  $("previewDate").textContent = formattedDate(card.visitDate);
  $("previewLetter").textContent = makeLetter(card);
  const index = cards.findIndex(c => c.id === card.id);
  $("cardNumber").textContent = "Nº " + String(index >= 0 ? index + 1 : cards.length + 1).padStart(3, "0");
  const img = $("previewPhoto");
  const placeholder = document.querySelector(".art-placeholder");
  if (card.photo) {
    img.src = card.photo; img.hidden = false; placeholder.style.display = "none";
  } else {
    img.removeAttribute("src"); img.hidden = true; placeholder.style.display = "flex";
  }
  ["downloadBtn", "jpgBtn", "printBtn"].forEach(id => $(id).disabled = false);
  $("allPdfBtn").disabled = cards.length === 0;
}
function renderAlbum() {
  $("countryCount").textContent = new Set(cards.map(c => normalizePlace(c.country)).filter(Boolean)).size;
  $("cardCount").textContent = cards.length;
  const grid = $("albumGrid");
  if (!cards.length) {
    grid.innerHTML = '<div class="empty-state"><span>✧</span><b>Sua jornada começa agora</b><p>Gere sua primeira carta para vê-la aparecer aqui.</p></div>';
    return;
  }
  grid.innerHTML = "";
  [...cards].reverse().forEach(card => {
    const item = document.createElement("article");
    item.className = "album-item";
    item.classList.toggle("album-item-portrait", card.photoOrientation === "9:16");
    const thumb = document.createElement("button"); thumb.type = "button"; thumb.className = "album-thumb";
    thumb.classList.toggle("album-thumb-portrait", card.photoOrientation === "9:16");
    thumb.setAttribute("aria-label", `Ver carta de ${card.landmark}`);
    if (card.photo) { const img = document.createElement("img"); img.src = card.photo; img.alt = ""; thumb.appendChild(img); }
    const overlay = document.createElement("span"); overlay.className = "mini-card-shade";
    const miniFlag = document.createElement("span"); miniFlag.className = "mini-card-flag"; miniFlag.textContent = flagForCountry(card.country);
    const miniLabel = document.createElement("small"); miniLabel.textContent = safeText(card.country).toLocaleUpperCase("pt-BR");
    const miniTitle = document.createElement("b"); miniTitle.textContent = safeText(card.landmark) || "Carta de viagem";
    const miniCity = document.createElement("em"); miniCity.textContent = safeText(card.city);
    overlay.append(miniFlag, miniLabel, miniTitle, miniCity); thumb.appendChild(overlay);
    thumb.addEventListener("click", () => openLargeCard(card));
    const info = document.createElement("div"); info.className = "album-info";
    const country = document.createElement("small"); country.textContent = safeText(card.country).toLocaleUpperCase("pt-BR");
    const title = document.createElement("h3"); title.textContent = safeText(card.landmark);
    const city = document.createElement("p"); city.textContent = `${safeText(card.city)} · ${formattedDate(card.visitDate)}`;
    const actions = document.createElement("div"); actions.className = "album-actions";
    const view = document.createElement("button"); view.textContent = "VER CARTA"; view.addEventListener("click", () => openLargeCard(card));
    const edit = document.createElement("button"); edit.textContent = "EDITAR"; edit.addEventListener("click", () => beginEdit(card));
    const del = document.createElement("button"); del.textContent = "EXCLUIR"; del.addEventListener("click", () => {
      if (confirm(`Excluir a carta de ${card.landmark}?`)) {
        cards = cards.filter(c => c.id !== card.id); saveCards(); renderAlbum(); renderStatsOnly();
        if (cards.length) renderPreview(cards[cards.length - 1]);
        else { currentPreviewCard = null; $("downloadBtn").disabled = $("jpgBtn").disabled = $("printBtn").disabled = $("allPdfBtn").disabled = true; }
      }
    });
    actions.append(view, edit, del); info.append(country, title, city, actions); item.append(thumb, info); grid.appendChild(item); enableInteractive3DCard(item);
  });
  $("allPdfBtn").disabled = cards.length === 0;
}

function openLargeCard(card) {
  const modal = $("largeCardModal"), holder = $("largeCardHolder");
  if (!modal || !holder) { renderPreview(card); window.scrollTo({top:0,behavior:"smooth"}); return; }
  const previous = currentPreviewCard;
  renderPreview(card);
  const large = $("travelCard").cloneNode(true);
  large.removeAttribute("style");
  large.classList.add("large-card-enter");
  large.removeAttribute("data-three-d-ready");
  large.querySelectorAll("button").forEach(button => button.remove());
  holder.replaceChildren(large);
  enableInteractive3DCard(large);
  large.addEventListener("animationend", () => large.classList.remove("large-card-enter"), { once: true });
  if (previous && previous.id !== card.id) renderPreview(previous);
  modal.hidden = false;
  document.body.classList.add("large-card-open");
  $("closeLargeCardBtn").focus();
}
function closeLargeCard() {
  const modal = $("largeCardModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("large-card-open");
  $("largeCardHolder").replaceChildren();
}
function beginEdit(card) {
  editingCardId = card.id;
  $("country").value = card.country || "";
  $("city").value = card.city || "";
  $("state").value = card.state || "";
  $("landmark").value = card.landmark || "";
  $("visitDate").value = card.visitDate ? card.visitDate.split("-").reverse().join("/") : "";
  $("traveler").value = card.traveler || "";
  $("memory").value = card.memory || "";
  $("photoOrientation").value = card.photoOrientation || "16:9";
  currentPhotoData = card.photo || "";
  currentLocation = card.location || null;
  $("photo").value = "";
  $("photoName").textContent = card.photo ? "Foto atual mantida. Escolha outra apenas se quiser substituí-la." : "Esta carta não possui foto.";
  $("submitCardBtn").innerHTML = "✦ &nbsp; SALVAR ALTERAÇÕES <span>✓</span>";
  $("cancelEditBtn").hidden = false;
  document.querySelector(".form-panel .section-heading h2").textContent = "Editar carta de viagem";
  document.querySelector(".form-panel .tiny-label").textContent = "EDITANDO CARTA";
  $("travelForm").classList.add("editing-card");
  closeLargeCard();
  window.scrollTo({top:0,behavior:"smooth"});
  $("country").focus({preventScroll:true});
}
function cancelEdit() {
  editingCardId = null; currentPhotoData = ""; currentLocation = null;
  $("travelForm").reset(); $("photo").value = ""; $("photoName").textContent = "";
  $("submitCardBtn").innerHTML = "✦ &nbsp; GERAR CARTA PREMIUM <span>↗</span>";
  $("cancelEditBtn").hidden = true;
  document.querySelector(".form-panel .section-heading h2").textContent = "Registrar uma viagem";
  document.querySelector(".form-panel .tiny-label").textContent = "NOVA CARTA";
  $("travelForm").classList.remove("editing-card");
  $("locationStatus").textContent = "Permita o acesso à localização para registrar as coordenadas do local visitado.";
}
$("cancelEditBtn").addEventListener("click", cancelEdit);
$("closeLargeCardBtn").addEventListener("click", closeLargeCard);
$("largeCardBackdrop").addEventListener("click", closeLargeCard);
document.addEventListener("keydown", event => { if (event.key === "Escape") closeLargeCard(); });

const ACHIEVEMENT_MILESTONES = [
  { count: 1, icon: "📸", name: "Primeira lembrança" },
  { count: 3, icon: "🗺️", name: "Rota iniciada" },
  { count: 5, icon: "🧭", name: "Explorador" },
  { count: 10, icon: "🏅", name: "Viajante dedicado" },
  { count: 15, icon: "🎒", name: "Mochileiro" },
  { count: 20, icon: "📍", name: "Caçador de lugares" },
  { count: 25, icon: "🌍", name: "Especialista local" },
  { count: 30, icon: "🏞️", name: "Colecionador de paisagens" },
  { count: 40, icon: "🧳", name: "Viajante experiente" },
  { count: 50, icon: "👑", name: "Mestre das viagens" },
  { count: 75, icon: "🦅", name: "Explorador lendário" },
  { count: 100, icon: "💎", name: "Lenda do Atlas" },
  { count: 150, icon: "🏰", name: "Cronista de destinos" },
  { count: 200, icon: "🌐", name: "Embaixador do mundo" },
  { count: 300, icon: "🚀", name: "Grande aventureiro" },
  { count: 500, icon: "🥇", name: "Ícone das viagens" },
  { count: 750, icon: "🌟", name: "Mestre explorador" },
  { count: 1000, icon: "🏆", name: "Imortal do Atlas" }
];

function countPhotosForCountry(country) {
  const key = normalizePlace(country);
  return cards.filter(card => card.photo && normalizePlace(card.country) === key).length;
}

function playAchievementSound() {
  // Efeito sonoro sintetizado no navegador: não precisa baixar nenhum arquivo.
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.12);
      gain.gain.setValueAtTime(0.0001, now + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.16, now + index * 0.12 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.32);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(now + index * 0.12);
      oscillator.stop(now + index * 0.12 + 0.34);
    });
    window.setTimeout(() => context.close().catch(() => {}), 1100);
  } catch (error) { /* Áudio indisponível: a animação continua normalmente. */ }
}

// Cada conquista recebe uma identidade visual própria: cor, ornamento e brilho da moldura.
function achievementFrame(milestone, category = "country") {
  const categoryOffset = category === "state" ? 41 : category === "exploration" ? 83 : 0;
  const hue = (Number(milestone?.count || 1) * 43 + categoryOffset) % 360;
  const count = Number(milestone?.count || 1);
  const frame = count >= 500 ? "legendary" : count >= 100 ? "diamond" : count >= 30 ? "royal" : count >= 10 ? "gold" : count >= 5 ? "silver" : count >= 3 ? "bronze" : "starter";
  return { hue, frame };
}

function applyAchievementFrame(element, milestone, category = "country") {
  if (!element) return;
  const config = achievementFrame(milestone, category);
  element.style.setProperty("--frame-hue", String(config.hue));
  element.dataset.frame = config.frame;
  element.dataset.achievement = safeText(milestone?.name);
}

function celebrateAchievement(milestone, country, count, description, detail, category = "country") {
  const modal = $("achievementCelebration");
  if (!modal) return;
  $("celebrationIcon").textContent = milestone.icon;
  $("celebrationTitle").textContent = milestone.name;
  $("celebrationDescription").textContent = description || `Você desbloqueou a marca de ${milestone.count} ${milestone.count === 1 ? "foto" : "fotos"} deste país!`;
  $("celebrationCountry").textContent = detail || `${flagForCountry(country)} ${country} · ${count} ${count === 1 ? "foto registrada" : "fotos registradas"}`;
  modal.hidden = false;
  document.body.classList.add("celebration-open");
  const panel = modal.querySelector(".celebration-panel");
  applyAchievementFrame(panel, milestone, category);
  applyAchievementFrame($("celebrationIcon"), milestone, category);
  modal.dataset.achievementCategory = category;
  panel.classList.remove("celebration-enter");
  void panel.offsetWidth;
  panel.classList.add("celebration-enter");
  const confetti = modal.querySelector(".celebration-confetti");
  confetti.innerHTML = "";
  for (let i = 0; i < 36; i++) {
    const piece = document.createElement("i");
    piece.style.setProperty("--confetti-x", `${Math.round(Math.random() * 100)}%`);
    piece.style.setProperty("--confetti-delay", `${(Math.random() * 0.7).toFixed(2)}s`);
    piece.style.setProperty("--confetti-rotation", `${Math.round(Math.random() * 720 - 360)}deg`);
    piece.className = "confetti-piece";
    confetti.appendChild(piece);
  }
  playAchievementSound();
  $("celebrationOk").focus();
}

function showNextAchievementCelebration() {
  if (!pendingAchievementCelebrations.length) return;
  const next = pendingAchievementCelebrations.shift();
  celebrateAchievement(next.milestone, next.subject, next.count, next.description, next.detail, next.type);
}
function closeAchievementCelebration() {
  const modal = $("achievementCelebration");
  if (modal) modal.hidden = true;
  document.body.classList.remove("celebration-open");
  // Se uma única carta desbloquear várias insígnias, mostra cada animação
  // individualmente, sem sobrepor uma celebração à outra.
  if (pendingAchievementCelebrations.length) window.setTimeout(showNextAchievementCelebration, 180);
}

function getUnlockedAchievementRecords(cardList) {
  const records = [];
  const withPhotos = cardList.filter(card => card.photo && safeText(card.country));
  const addMilestones = (type, subject, total, milestones, unit) => {
    milestones.forEach(m => {
      if (total >= m.count) records.push({
        key: `${type}|${normalizePlace(subject)}|${m.count}`,
        milestone: m, subject, count: total, type, unit,
        description: `Você desbloqueou “${m.name}” no desafio ${type === "country" ? "de fotos do país" : type === "state" ? "dos estados brasileiros" : "de exploração"}!`,
        detail: `${type === "country" ? flagForCountry(subject) : type === "state" ? "🇧🇷" : "🧭"} ${subject} · ${total} ${unit}`
      });
    });
  };

  const byCountry = new Map();
  withPhotos.forEach(card => {
    const key = normalizePlace(card.country);
    if (!byCountry.has(key)) byCountry.set(key, {name: safeText(card.country), count: 0});
    byCountry.get(key).count++;
  });
  byCountry.forEach(country => addMilestones("country", country.name, country.count, ACHIEVEMENT_MILESTONES, "fotos"));

  const byState = new Map();
  withPhotos.filter(card => /^(brasil|brazil)$/.test(normalizePlace(card.country)) && safeText(card.state)).forEach(card => {
    const key = normalizePlace(card.state);
    if (!byState.has(key)) byState.set(key, {name: safeText(card.state), count: 0});
    byState.get(key).count++;
  });
  byState.forEach(state => addMilestones("state", state.name, state.count, STATE_MILESTONES, "fotos"));

  const uniqueCount = values => new Set(values.filter(Boolean)).size;
  const cities = uniqueCount(withPhotos.map(c => `${normalizePlace(c.country)}|${normalizePlace(c.city)}`));
  const landmarks = uniqueCount(withPhotos.map(c => `${normalizePlace(c.country)}|${normalizePlace(c.city)}|${normalizePlace(c.landmark)}`));
  const countries = uniqueCount(withPhotos.map(c => normalizePlace(c.country)));
  const states = uniqueCount(withPhotos.filter(c => /^(brasil|brazil)$/.test(normalizePlace(c.country))).map(c => normalizePlace(c.state)));
  const gpsTrips = withPhotos.filter(c => c.location && Number.isFinite(Number(c.location.latitude)) && Number.isFinite(Number(c.location.longitude))).length;
  const months = uniqueCount(withPhotos.map(c => /^\d{4}-\d{2}-\d{2}$/.test(c.visitDate || "") ? c.visitDate.slice(0, 7) : ""));
  const challenges = [
    {name:"Desbravador de cidades", count:cities, unit:"cidades", milestones:[{count:1,icon:"🏙️",name:"Primeira cidade"},{count:3,icon:"🚏",name:"Rota urbana"},{count:5,icon:"🗺️",name:"Explorador de cidades"},{count:10,icon:"🌆",name:"Viajante metropolitano"},{count:20,icon:"🌇",name:"Mestre das cidades"}]},
    {name:"Caçador de pontos turísticos", count:landmarks, unit:"pontos turísticos", milestones:[{count:1,icon:"📍",name:"Primeiro ponto"},{count:5,icon:"🔎",name:"Caçador de atrações"},{count:10,icon:"📸",name:"Colecionador de atrações"},{count:25,icon:"🏛️",name:"Especialista em destinos"},{count:50,icon:"💎",name:"Lenda dos pontos turísticos"}]},
    {name:"Passaporte mundial", count:countries, unit:"países", milestones:[{count:1,icon:"🛫",name:"Primeira fronteira"},{count:2,icon:"🌎",name:"Viajante internacional"},{count:3,icon:"🧭",name:"Explorador global"},{count:5,icon:"🌐",name:"Cidadão do mundo"},{count:10,icon:"👑",name:"Lenda internacional"}]},
    {name:"Desafio dos estados brasileiros", count:states, unit:"estados", milestones:[{count:1,icon:"🇧🇷",name:"Primeiro estado"},{count:3,icon:"🧭",name:"Explorador regional"},{count:5,icon:"🛣️",name:"Viajante brasileiro"},{count:10,icon:"🏅",name:"Grande explorador do Brasil"},{count:20,icon:"👑",name:"Lenda brasileira"}]},
    {name:"Rastreador GPS", count:gpsTrips, unit:"viagens com GPS", milestones:[{count:1,icon:"🛰️",name:"Primeira localização"},{count:3,icon:"📡",name:"Rastreador ativo"},{count:5,icon:"🧭",name:"Navegador preciso"},{count:10,icon:"🌐",name:"Explorador geolocalizado"}]},
    {name:"Viajante de todas as estações", count:months, unit:"meses diferentes", milestones:[{count:1,icon:"🗓️",name:"Diário de viagem"},{count:3,icon:"🌤️",name:"Viajante frequente"},{count:6,icon:"🍂",name:"Meio ano explorando"},{count:12,icon:"🌟",name:"Ano inteiro na estrada"}]}
  ];
  challenges.forEach(challenge => {
    challenge.milestones.forEach(m => {
      if (challenge.count >= m.count) records.push({
        key: `exploration|${normalizePlace(challenge.name)}|${m.count}`,
        milestone: m, subject: challenge.name, count: challenge.count, type: "exploration", unit: challenge.unit,
        description: `Você desbloqueou “${m.name}” no desafio ${challenge.name}!`,
        detail: `${challenge.icon || "🧭"} ${challenge.name} · ${challenge.count} ${challenge.unit}`
      });
    });
  });
  return records;
}

function queueNewAchievements(previousRecords, currentRecords) {
  const previousKeys = new Set(previousRecords.map(record => record.key));
  const newlyUnlocked = currentRecords.filter(record => !previousKeys.has(record.key));
  if (!newlyUnlocked.length) return;
  pendingAchievementCelebrations.push(...newlyUnlocked);
  if ($("achievementCelebration")?.hidden) showNextAchievementCelebration();
}

function renderAchievements() {
  const grid = $("achievementsGrid");
  if (!grid) return;
  // Níveis de conquista calculados separadamente para cada país.
  const milestones = ACHIEVEMENT_MILESTONES;
  const countryPhotos = new Map();
  cards.filter(card => card.photo && safeText(card.country)).forEach(card => {
    const key = normalizePlace(card.country);
    if (!countryPhotos.has(key)) countryPhotos.set(key, { name: safeText(card.country), count: 0 });
    countryPhotos.get(key).count++;
  });
  if (!countryPhotos.size) {
    grid.innerHTML = '<div class="achievement-empty">Adicione fotos às suas cartas para começar a conquistar insígnias.</div>';
    return;
  }
  grid.innerHTML = "";
  [...countryPhotos.values()].sort((a,b) => b.count-a.count || a.name.localeCompare(b.name, "pt-BR")).forEach(country => {
    const panel = document.createElement("article"); panel.className = "country-achievement";
    const heading = document.createElement("div"); heading.className = "country-achievement-heading";
    const name = document.createElement("h3"); name.textContent = flagForCountry(country.name) + " " + country.name;
    const total = document.createElement("span"); total.className = "photo-total"; total.textContent = `${country.count} ${country.count === 1 ? "foto" : "fotos"}`;
    heading.append(name, total);
    const badges = document.createElement("div"); badges.className = "badge-list";
    milestones.forEach(milestone => {
      const unlocked = country.count >= milestone.count;
      const badge = document.createElement("div"); badge.className = "achievement-badge" + (unlocked ? " unlocked" : " locked");
      applyAchievementFrame(badge, milestone, "country");
      badge.title = `${milestone.name}: ${milestone.count} foto(s) de ${country.name}`;
      const icon = document.createElement("span"); icon.className = "achievement-icon"; icon.textContent = milestone.icon;
      const label = document.createElement("b"); label.textContent = milestone.count + "+ fotos";
      const caption = document.createElement("small"); caption.textContent = unlocked ? milestone.name : `${milestone.count - country.count} para desbloquear`;
      badge.append(icon, label, caption); badges.appendChild(badge);
    });
    const next = milestones.find(m => country.count < m.count);
    const progressText = document.createElement("p"); progressText.className = "achievement-progress";
    if (next) {
      const previous = milestones.filter(m => m.count < next.count).slice(-1)[0]?.count || 0;
      const percent = Math.min(100, Math.round(((country.count - previous) / (next.count - previous)) * 100));
      progressText.textContent = `Próxima conquista: ${next.count} fotos · ${country.count}/${next.count}`;
      const bar = document.createElement("div"); bar.className = "achievement-progress-track";
      const fill = document.createElement("span"); fill.style.width = percent + "%"; bar.appendChild(fill);
      panel.append(heading, badges, progressText, bar);
    } else {
      progressText.textContent = "Todas as insígnias deste país foram desbloqueadas!";
      panel.append(heading, badges, progressText);
    }
    grid.appendChild(panel);
  });
}

const STATE_MILESTONES = [
  { count: 1, icon: "📍", name: "Primeira parada" },
  { count: 2, icon: "🧭", name: "Explorador estadual" },
  { count: 5, icon: "📸", name: "Colecionador regional" },
  { count: 10, icon: "🏞️", name: "Conhecedor do estado" },
  { count: 20, icon: "🏅", name: "Embaixador estadual" },
  { count: 30, icon: "👑", name: "Lenda do estado" }
];
function renderStateAchievements() {
  const grid = $("stateAchievementsGrid");
  if (!grid) return;
  const byState = new Map();
  cards.filter(card => card.photo && safeText(card.state) && normalizePlace(card.country).match(/^(brasil|brazil)$/)).forEach(card => {
    const key = normalizePlace(card.state);
    if (!byState.has(key)) byState.set(key, { name: safeText(card.state), count: 0 });
    byState.get(key).count++;
  });
  if (!byState.size) {
    grid.innerHTML = '<div class="achievement-empty">Registre cartas com foto, país “Brasil” e selecione o estado visitado para desbloquear conquistas.</div>';
    return;
  }
  grid.innerHTML = "";
  [...byState.values()].sort((a,b) => b.count-a.count || a.name.localeCompare(b.name, "pt-BR")).forEach(state => {
    const panel = document.createElement("article"); panel.className = "country-achievement state-achievement";
    const heading = document.createElement("div"); heading.className = "country-achievement-heading";
    const name = document.createElement("h3"); name.textContent = "🇧🇷 " + state.name;
    const total = document.createElement("span"); total.className = "photo-total"; total.textContent = `${state.count} ${state.count === 1 ? "foto" : "fotos"}`;
    heading.append(name, total);
    const badges = document.createElement("div"); badges.className = "badge-list";
    STATE_MILESTONES.forEach(m => {
      const unlocked = state.count >= m.count;
      const badge = document.createElement("div"); badge.className = "achievement-badge" + (unlocked ? " unlocked" : " locked");
      applyAchievementFrame(badge, m, "state");
      badge.title = `${m.name}: ${m.count} foto(s) em ${state.name}`;
      const icon = document.createElement("span"); icon.className = "achievement-icon"; icon.textContent = m.icon;
      const label = document.createElement("b"); label.textContent = `${m.count}+ fotos`;
      const caption = document.createElement("small"); caption.textContent = unlocked ? m.name : `${m.count-state.count} para desbloquear`;
      badge.append(icon, label, caption); badges.appendChild(badge);
    });
    const next = STATE_MILESTONES.find(m => state.count < m.count);
    const progress = document.createElement("p"); progress.className = "achievement-progress";
    progress.textContent = next ? `Próxima conquista: ${next.count} fotos · ${state.count}/${next.count}` : "Todas as conquistas deste estado foram desbloqueadas!";
    panel.append(heading, badges, progress); grid.appendChild(panel);
  });
}

function renderExplorationAchievements() {
  const grid = $("explorationAchievementsGrid");
  if (!grid) return;
  const withPhotos = cards.filter(card => card.photo && safeText(card.country));
  const uniqueCount = values => new Set(values.filter(Boolean)).size;
  const cities = uniqueCount(withPhotos.map(c => `${normalizePlace(c.country)}|${normalizePlace(c.city)}`));
  const landmarks = uniqueCount(withPhotos.map(c => `${normalizePlace(c.country)}|${normalizePlace(c.city)}|${normalizePlace(c.landmark)}`));
  const countries = uniqueCount(withPhotos.map(c => normalizePlace(c.country)));
  const states = uniqueCount(withPhotos.filter(c => /^(brasil|brazil)$/.test(normalizePlace(c.country))).map(c => normalizePlace(c.state)));
  const gpsTrips = withPhotos.filter(c => c.location && Number.isFinite(Number(c.location.latitude)) && Number.isFinite(Number(c.location.longitude))).length;
  const months = uniqueCount(withPhotos.map(c => /^\d{4}-\d{2}-\d{2}$/.test(c.visitDate || "") ? c.visitDate.slice(0, 7) : ""));
  const challenges = [
    {name:"Desbravador de cidades", icon:"🏙️", count:cities, unit:"cidades", milestones:[{count:1,icon:"🏙️",name:"Primeira cidade"},{count:3,icon:"🚏",name:"Rota urbana"},{count:5,icon:"🗺️",name:"Explorador de cidades"},{count:10,icon:"🌆",name:"Viajante metropolitano"},{count:20,icon:"🌇",name:"Mestre das cidades"}]},
    {name:"Caçador de pontos turísticos", icon:"📍", count:landmarks, unit:"pontos turísticos", milestones:[{count:1,icon:"📍",name:"Primeiro ponto"},{count:5,icon:"🔎",name:"Caçador de atrações"},{count:10,icon:"📸",name:"Colecionador de atrações"},{count:25,icon:"🏛️",name:"Especialista em destinos"},{count:50,icon:"💎",name:"Lenda dos pontos turísticos"}]},
    {name:"Passaporte mundial", icon:"🌎", count:countries, unit:"países", milestones:[{count:1,icon:"🛫",name:"Primeira fronteira"},{count:2,icon:"🌎",name:"Viajante internacional"},{count:3,icon:"🧭",name:"Explorador global"},{count:5,icon:"🌐",name:"Cidadão do mundo"},{count:10,icon:"👑",name:"Lenda internacional"}]},
    {name:"Desafio dos estados brasileiros", icon:"🇧🇷", count:states, unit:"estados", milestones:[{count:1,icon:"🇧🇷",name:"Primeiro estado"},{count:3,icon:"🧭",name:"Explorador regional"},{count:5,icon:"🛣️",name:"Viajante brasileiro"},{count:10,icon:"🏅",name:"Grande explorador do Brasil"},{count:20,icon:"👑",name:"Lenda brasileira"}]},
    {name:"Rastreador GPS", icon:"🛰️", count:gpsTrips, unit:"viagens com GPS", milestones:[{count:1,icon:"🛰️",name:"Primeira localização"},{count:3,icon:"📡",name:"Rastreador ativo"},{count:5,icon:"🧭",name:"Navegador preciso"},{count:10,icon:"🌐",name:"Explorador geolocalizado"}]},
    {name:"Viajante de todas as estações", icon:"🗓️", count:months, unit:"meses diferentes", milestones:[{count:1,icon:"🗓️",name:"Diário de viagem"},{count:3,icon:"🌤️",name:"Viajante frequente"},{count:6,icon:"🍂",name:"Meio ano explorando"},{count:12,icon:"🌟",name:"Ano inteiro na estrada"}]}
  ];
  if (!withPhotos.length) {
    grid.innerHTML = '<div class="achievement-empty">Adicione fotos às cartas para começar os desafios de exploração.</div>';
    return;
  }
  grid.replaceChildren();
  challenges.forEach(challenge => {
    const panel = document.createElement("article"); panel.className = "country-achievement exploration-achievement";
    const heading = document.createElement("div"); heading.className = "country-achievement-heading";
    const name = document.createElement("h3"); name.textContent = `${challenge.icon} ${challenge.name}`;
    const total = document.createElement("span"); total.className = "photo-total"; total.textContent = `${challenge.count} ${challenge.unit}`;
    heading.append(name, total);
    const badges = document.createElement("div"); badges.className = "badge-list";
    challenge.milestones.forEach(m => {
      const unlocked = challenge.count >= m.count;
      const badge = document.createElement("div"); badge.className = "achievement-badge" + (unlocked ? " unlocked" : " locked");
      applyAchievementFrame(badge, m, "exploration");
      badge.title = `${m.name}: ${m.count} ${challenge.unit}`;
      const icon = document.createElement("span"); icon.className = "achievement-icon"; icon.textContent = m.icon;
      const label = document.createElement("b"); label.textContent = `${m.count}+`;
      const caption = document.createElement("small"); caption.textContent = unlocked ? m.name : `${Math.max(0, m.count - challenge.count)} para desbloquear`;
      badge.append(icon, label, caption); badges.appendChild(badge);
    });
    const next = challenge.milestones.find(m => challenge.count < m.count);
    const progress = document.createElement("p"); progress.className = "achievement-progress";
    if (next) {
      progress.textContent = `Próxima: ${next.name} · ${challenge.count}/${next.count} ${challenge.unit}`;
      const bar = document.createElement("div"); bar.className = "achievement-progress-track";
      const previous = challenge.milestones.filter(m => m.count < next.count).slice(-1)[0]?.count || 0;
      const fill = document.createElement("span"); fill.style.width = `${Math.min(100, Math.round(((challenge.count - previous) / (next.count - previous)) * 100))}%`;
      bar.appendChild(fill); panel.append(heading, badges, progress, bar);
    } else {
      progress.textContent = "Desafio completo! Todas as insígnias foram conquistadas.";
      panel.append(heading, badges, progress);
    }
    grid.appendChild(panel);
  });
}

function renderStatsOnly() {
  $("countryCount").textContent = new Set(cards.map(c => normalizePlace(c.country)).filter(Boolean)).size;
  $("cardCount").textContent = cards.length;
  $("cardNumber").textContent = "Nº " + String(cards.length).padStart(3, "0");
  $("allPdfBtn").disabled = cards.length === 0;
  renderAchievements();
  renderStateAchievements();
  renderExplorationAchievements();
}
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const binary = atob(parts[1]); const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], {type:mime});
}
async function downloadBlob(blob, filename) {
  if (!(blob instanceof Blob) || blob.size === 0) throw new Error("O arquivo gerado está vazio.");
  const safeName = filename || "atlas-premium-download";
  // Android WebViews podem bloquear downloads iniciados por links blob:.
  // Quando disponível, oferece o arquivo pela folha nativa de compartilhamento.
  const ua = navigator.userAgent || "";
  const isAndroidWebView = /Android/i.test(ua) && (/;\s*wv\)/i.test(ua) || !!window.Android || !!window.atlasAndroid);
  if (isAndroidWebView && typeof navigator.share === "function" && typeof File === "function") {
    try {
      const file = new File([blob], safeName, {type: blob.type || "application/octet-stream"});
      if (!navigator.canShare || navigator.canShare({files:[file]})) {
        await navigator.share({files:[file], title:safeName, text:"Arquivo exportado pelo Atlas Premium"});
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
      console.warn("Compartilhamento nativo indisponível; tentando download pelo navegador.", err);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  a.style.position = "fixed";
  a.style.left = "-10000px";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  // Mantém o URL vivo por mais tempo para navegadores móveis e WebViews lentos.
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 120000);
}
function canvasFromImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth || 1200; canvas.height = img.naturalHeight || 800;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = reject; img.src = dataUrl;
  });
}
$("photo").addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  currentPhotoData = ""; $("photoName").textContent = "";
  photoProcessing = false;
  if (!file) {
    if (editingCardId) { const existing = cards.find(item => item.id === editingCardId); currentPhotoData = existing?.photo || ""; }
    return;
  }
  if (!file.type.startsWith("image/")) { alert("Selecione um arquivo de imagem."); event.target.value = ""; return; }
  if (file.size > 10 * 1024 * 1024) {
    alert("A foto deve ter no máximo 10 MB.");
    event.target.value = ""; return;
  }
  // Redimensiona e comprime a imagem para reduzir o uso do armazenamento local,
  // sem impedir a seleção de fotos originais de até 10 MB.
  photoProcessing = true;
  $("photoName").textContent = "Processando foto… aguarde antes de gerar a carta.";
  const reader = new FileReader();
  reader.onerror = () => { photoProcessing = false; alert("Não foi possível ler esta foto. Tente outra imagem."); event.target.value = ""; $("photoName").textContent = ""; };
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => { photoProcessing = false; alert("O arquivo selecionado não pôde ser aberto como imagem."); event.target.value = ""; $("photoName").textContent = ""; };
    img.onload = () => {
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { photoProcessing = false; alert("Não foi possível processar esta foto neste dispositivo."); event.target.value = ""; $("photoName").textContent = ""; return; }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      currentPhotoData = canvas.toDataURL("image/jpeg", 0.82);
      photoProcessing = false;
      $("photoName").textContent = `Foto selecionada: ${file.name} (processada para economizar espaço)`;
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});
$("locationBtn").addEventListener("click", () => {
  const status = $("locationStatus");
  if (!navigator.geolocation) {
    status.textContent = "Este dispositivo ou ambiente não oferece geolocalização.";
    return;
  }
  status.textContent = "Obtendo localização GPS… permita o acesso quando solicitado.";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = {
        latitude: Number(position.coords.latitude.toFixed(6)),
        longitude: Number(position.coords.longitude.toFixed(6)),
        accuracy: Math.round(position.coords.accuracy),
        capturedAt: new Date().toISOString()
      };
      status.textContent = `Localização registrada: ${currentLocation.latitude}, ${currentLocation.longitude} (precisão aproximada: ${currentLocation.accuracy} m).`;
      let link = $("locationMapLink");
      if (!link) {
        link = document.createElement("a");
        link.id = "locationMapLink";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        status.insertAdjacentElement("afterend", link);
      }
      link.href = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
      link.textContent = "Abrir posição no Google Maps";
    },
    (error) => {
      const messages = {
        1: "Permissão de localização negada. Autorize nas configurações do navegador/dispositivo.",
        2: "Não foi possível determinar a posição. Verifique o GPS e tente novamente.",
        3: "Tempo esgotado ao obter a posição. Tente novamente em local aberto."
      };
      status.textContent = messages[error.code] || "Não foi possível obter a localização.";
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
});

$("visitDate").addEventListener("input", () => {
  const field = $("visitDate");
  const digits = field.value.replace(/\D/g, "").slice(0, 8);
  const formatted = digits.length <= 2 ? digits : digits.length <= 4 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  field.value = formatted;
});
$("travelForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (photoProcessing) { alert("Aguarde o processamento da foto terminar."); return; }
  const existing = editingCardId ? cards.find(item => item.id === editingCardId) : null;
  const card = {
    id: existing ? existing.id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    country: safeText($("country").value), city: safeText($("city").value), state: safeText($("state")?.value),
    landmark: safeText($("landmark").value), visitDate: normalizeVisitDate($("visitDate").value),
    traveler: safeText($("traveler").value), memory: safeText($("memory").value),
    photo: currentPhotoData || (existing ? existing.photo : ""), photoOrientation: $("photoOrientation").value || "16:9",
    location: currentLocation || (existing ? existing.location : null)
  };
  if (!card.country || !card.city || !card.landmark) { alert("Preencha país, cidade e ponto turístico."); return; }
  if (card.visitDate === null) { alert("Digite uma data válida no formato DD/MM/AAAA, por exemplo 15/10/2026."); $("visitDate").focus(); return; }
  const duplicate = cards.find(c => c.id !== card.id && placeKey(c) === placeKey(card));
  if (duplicate) { alert(`Este local já está registrado no álbum: ${duplicate.landmark} — ${duplicate.city}, ${duplicate.country}.`); return; }
  const wasEditing = Boolean(existing);
  const achievementsBeforeSave = !wasEditing && card.photo ? getUnlockedAchievementRecords(cards) : [];
  const previousCountryPhotoCount = card.photo ? countPhotosForCountry(card.country) : 0;
  if (wasEditing) {
    const index = cards.findIndex(item => item.id === card.id);
    if (index >= 0) cards[index] = card;
  } else cards.push(card);
  if (!saveCards()) {
    if (wasEditing && existing) { const index = cards.findIndex(item => item.id === card.id); if (index >= 0) cards[index] = existing; }
    else cards = cards.filter(item => item.id !== card.id);
    return;
  }
  renderPreview(card); renderAlbum(); renderStatsOnly();
  if (!wasEditing && card.photo) {
    const achievementsAfterSave = getUnlockedAchievementRecords(cards);
    queueNewAchievements(achievementsBeforeSave, achievementsAfterSave);
  }
  cancelEdit();
  renderPreview(card); renderAlbum();
  const travelCard = $("travelCard"); travelCard.classList.remove("card-created"); void travelCard.offsetWidth; travelCard.classList.add("card-created");
  if ($("soundToggle")?.checked && !wasEditing) playAchievementSound();
});
$("downloadBtn").addEventListener("click", async () => {
  const text = [
    "ATLAS PREMIUM — CARTA DE VIAGEM", "================================",
    `País: ${$("previewCountry").textContent}`,
    `Ponto turístico: ${$("previewLandmark").textContent}`,
    `Cidade: ${$("previewCity").textContent}`,
    `Data da visita: ${$("previewDate").textContent}`, "",
    $("previewLetter").textContent, "", "Memórias que atravessam fronteiras."
  ].join("\n");
  try { await downloadBlob(new Blob([text], {type:"text/plain;charset=utf-8"}), "carta-premium-atlas.txt"); } catch (err) { alert("Não foi possível baixar a carta. " + (err?.message || err)); }
});
function flagForCountry(country) {
  const flags = {
    "brasil":"🇧🇷", "brazil":"🇧🇷", "frança":"🇫🇷", "france":"🇫🇷", "italia":"🇮🇹", "itália":"🇮🇹",
    "alemanha":"🇩🇪", "germany":"🇩🇪", "espanha":"🇪🇸", "spain":"🇪🇸", "portugal":"🇵🇹",
    "estados unidos":"🇺🇸", "eua":"🇺🇸", "united states":"🇺🇸", "inglaterra":"🇬🇧", "reino unido":"🇬🇧", "japão":"🇯🇵", "japao":"🇯🇵",
    "china":"🇨🇳", "argentina":"🇦🇷", "chile":"🇨🇱", "uruguai":"🇺🇾", "paraguai":"🇵🇾", "peru":"🇵🇪", "canadá":"🇨🇦", "canada":"🇨🇦",
    "méxico":"🇲🇽", "mexico":"🇲🇽", "grécia":"🇬🇷", "grecia":"🇬🇷", "suíça":"🇨🇭", "suica":"🇨🇭", "holanda":"🇳🇱", "países baixos":"🇳🇱",
    "austrália":"🇦🇺", "australia":"🇦🇺", "índia":"🇮🇳", "india":"🇮🇳", "coreia do sul":"🇰🇷", "tailândia":"🇹🇭", "tailandia":"🇹🇭", "egito":"🇪🇬", "áfrica do sul":"🇿🇦",
    "nova zelândia":"🇳🇿", "nova zelandia":"🇳🇿", "irlanda":"🇮🇪", "áustria":"🇦🇹", "austria":"🇦🇹", "bélgica":"🇧🇪", "belgica":"🇧🇪", "colômbia":"🇨🇴", "colombia":"🇨🇴", "bolívia":"🇧🇴", "bolivia":"🇧🇴", "equador":"🇪🇨", "venezuela":"🇻🇪", "costa rica":"🇨🇷", "cuba":"🇨🇺", "israel":"🇮🇱", "turquia":"🇹🇷", "turquia":"🇹🇷", "rússia":"🇷🇺", "russia":"🇷🇺", "coreia do norte":"🇰🇵", "indonésia":"🇮🇩", "indonesia":"🇮🇩", "vietnã":"🇻🇳", "vietna":"🇻🇳", "singapura":"🇸🇬", "malásia":"🇲🇾", "malasia":"🇲🇾", "marrocos":"🇲🇦", "quênia":"🇰🇪", "kenia":"🇰🇪", "nigéria":"🇳🇬", "nigeria":"🇳🇬", "emirados árabes unidos":"🇦🇪", "emirados arabes unidos":"🇦🇪", "catar":"🇶🇦", "arábia saudita":"🇸🇦", "arabia saudita":"🇸🇦"
  };
  return flags[normalizePlace(country)] || "🌐";
}
function drawCountryFlag(ctx, country, x, y, w, h) {
  // Desenha a bandeira diretamente no canvas para que apareça também no JPG exportado,
  // mesmo em computadores sem fonte de emojis coloridos.
  const c = normalizePlace(country);
  ctx.save(); roundedRect(ctx, x, y, w, h, 5); ctx.clip();
  const fill = (color, rx=x, ry=y, rw=w, rh=h) => { ctx.fillStyle=color; ctx.fillRect(rx,ry,rw,rh); };
  const stripeH = h/3, stripeW = w/3;
  const horizontal = (a,b,d) => { fill(a,y,w,stripeH); fill(b,y+stripeH,w,stripeH); fill(d,y+2*stripeH,w,stripeH); };
  const vertical = (a,b,d) => { fill(a,x,y===undefined?y:y,w/3,h); fill(b,x+w/3,y,w/3,h); fill(d,x+2*w/3,y,w/3,h); };
  if (['franca','france','italia','italy','irlanda','ireland','romenia','romania','belgica','belgium','nigeria'].includes(c)) {
    const colors = ({franca:['#0055A4','#fff','#EF4135'],france:['#0055A4','#fff','#EF4135'],italia:['#009246','#fff','#CE2B37'],italy:['#009246','#fff','#CE2B37'],irlanda:['#169B62','#fff','#FF883E'],ireland:['#169B62','#fff','#FF883E'],romenia:['#002B7F','#FCD116','#CE1126'],romania:['#002B7F','#FCD116','#CE1126'],belgica:['#000','#F5D000','#EF3340'],belgium:['#000','#F5D000','#EF3340'],nigeria:['#008751','#fff','#008751']})[c]; vertical(...colors);
  } else if (['alemanha','germany','holanda','paises baixos','netherlands','russia','russia federation','austria','austria','hungria','hungary','tailandia','thailand'].includes(c)) {
    const colors = ({alemanha:['#000','#DD0000','#FFCE00'],germany:['#000','#DD0000','#FFCE00'],holanda:['#AE1C28','#fff','#21468B'],'paises baixos':['#AE1C28','#fff','#21468B'],netherlands:['#AE1C28','#fff','#21468B'],russia:['#fff','#0039A6','#D52B1E'],'russia federation':['#fff','#0039A6','#D52B1E'],austria:['#ED2939','#fff','#ED2939'],hungria:['#CE2939','#fff','#477050'],hungary:['#CE2939','#fff','#477050'],tailandia:['#A51931','#fff','#2D2A4A'],thailand:['#A51931','#fff','#2D2A4A']})[c]; horizontal(...colors);
  } else if (['brasil','brazil'].includes(c)) { fill('#169B62'); ctx.fillStyle='#FFDF00'; ctx.beginPath();ctx.moveTo(x+w/2,y+h*.15);ctx.lineTo(x+w*.88,y+h/2);ctx.lineTo(x+w/2,y+h*.85);ctx.lineTo(x+w*.12,y+h/2);ctx.closePath();ctx.fill();ctx.fillStyle='#002776';ctx.beginPath();ctx.arc(x+w/2,y+h/2,w*.18,0,Math.PI*2);ctx.fill(); }
  else if (['japao','japan'].includes(c)) { fill('#fff');ctx.fillStyle='#BC002D';ctx.beginPath();ctx.arc(x+w/2,y+h/2,Math.min(w,h)*.23,0,Math.PI*2);ctx.fill(); }
  else if (['china'].includes(c)) { fill('#DE2910');ctx.fillStyle='#FFDE00';ctx.font=`bold ${h*.42}px Arial`;ctx.fillText('★',x+w*.12,y+h*.48); }
  else if (['argentina'].includes(c)) { horizontal('#74ACDF','#fff','#74ACDF');ctx.fillStyle='#F6B40E';ctx.font=`bold ${h*.3}px Arial`;ctx.fillText('☀',x+w*.42,y+h*.58); }
  else if (['espanha','spain'].includes(c)) { fill('#AA151B');fill('#F1BF00',x,y+h*.25,w,h*.5); }
  else if (['portugal'].includes(c)) { fill('#006600');fill('#FF0000',x+w*.4,y,w*.6,h); }
  else if (['estados unidos','eua','united states','usa'].includes(c)) { for(let i=0;i<7;i++) fill(i%2?'#fff':'#B22234',x,y+i*h/7,w,h/7);fill('#3C3B6E',x,y,w*.45,h*.54); }
  else if (['canada','canadá'].includes(c)) { fill('#fff');fill('#D80621',x,y,w*.25,h);fill('#D80621',x+w*.75,y,w*.25,h);ctx.fillStyle='#D80621';ctx.font=`bold ${h*.52}px Arial`;ctx.textAlign='center';ctx.fillText('✦',x+w/2,y+h*.68); }
  else if (['mexico','méxico'].includes(c)) { vertical('#006847','#fff','#CE1126'); }
  else if (['chile'].includes(c)) { fill('#fff');fill('#D52B1E',x,y+h/2,w,h/2);fill('#0039A6',x,y,w/3,h/2); }
  else if (['uruguai'].includes(c)) { fill('#fff');for(let i=0;i<4;i++)fill('#5CB8E6',x,y+i*h/4,w,h/10); }
  else if (['paraguai'].includes(c)) horizontal('#D52B1E','#fff','#0038A8');
  else if (['peru'].includes(c)) vertical('#D91023','#fff','#D91023');
  else if (['suica','switzerland'].includes(c)) { fill('#D52B1E');fill('#fff',x+w*.42,y+h*.18,w*.16,h*.64);fill('#fff',x+w*.22,y+h*.4,w*.56,h*.2); }
  else if (['grecia','greece'].includes(c)) { fill('#fff');for(let i=0;i<5;i++)fill('#0D5EAF',x,y+i*h/5,w,h/10);fill('#0D5EAF',x,y,w*.4,h*.55);fill('#fff',x+w*.16,y,w*.08,h*.55);fill('#fff',x,y+h*.22,w*.4,h*.11); }
  else { fill('#fff');ctx.fillStyle=countryPalette(country)[0];ctx.fillRect(x,y,w,h/3);ctx.fillStyle=countryPalette(country)[2];ctx.fillRect(x,y+2*h/3,w,h/3); }
  ctx.restore();
}
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.closePath();
}
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines=20) {
  const words = String(text || "").split(/\s+/); let line = "", lines = 0;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y); y += lineHeight; lines++; line = word;
      if (lines >= maxLines - 1) { if (words.length) ctx.fillText((line + "…").slice(0, 120), x, y); return y + lineHeight; }
    } else line = test;
  }
  if (line && lines < maxLines) { ctx.fillText(line, x, y); y += lineHeight; }
  return y;
}
async function makeTravelCardJpg(card) {
  const portrait = card.photoOrientation === "9:16";
  const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = portrait ? 2180 : 1600;
  const ctx = canvas.getContext("2d");
  const H=canvas.height;
  // Fundo PREMIUM ROXO FORTE: violeta intenso, luz magenta e moldura roxa metálica.
  const bg = ctx.createLinearGradient(0,0,1200,H);
  bg.addColorStop(0,"#26004d"); bg.addColorStop(.22,"#6500c9"); bg.addColorStop(.52,"#3b006f"); bg.addColorStop(.78,"#7800df"); bg.addColorStop(1,"#19002f");
  ctx.fillStyle=bg; ctx.fillRect(0,0,canvas.width,H);
  const glow = ctx.createRadialGradient(600,150,10,600,150,900);
  glow.addColorStop(0,"rgba(255,130,255,.62)"); glow.addColorStop(.35,"rgba(181,45,255,.38)"); glow.addColorStop(1,"rgba(25,0,47,.08)");
  ctx.fillStyle=glow; ctx.fillRect(0,0,1200,H);
  // Pontos de luz decorativos fixos para uma aparência de coleção rara.
  for (let i=0;i<95;i++) { const x=(i*197+53)%1200, y=(i*311+71)%H; const r=(i%4===0)?2.2:1;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=i%5===0?"rgba(255,225,255,.95)":"rgba(235,190,255,.78)"; ctx.fill(); }
  // Moldura roxa metálica com brilho neon, filetes internos e profundidade.
  ctx.save(); ctx.shadowColor="rgba(218,91,255,.95)"; ctx.shadowBlur=34;
  ctx.strokeStyle="#4b087c"; ctx.lineWidth=22; roundedRect(ctx,34,30,1132,H-60,18); ctx.stroke(); ctx.restore();
  const purpleMetal=ctx.createLinearGradient(34,30,1166,H-30); purpleMetal.addColorStop(0,"#f8d8ff"); purpleMetal.addColorStop(.18,"#b52cff"); purpleMetal.addColorStop(.38,"#6d00d5"); purpleMetal.addColorStop(.55,"#f0a4ff"); purpleMetal.addColorStop(.76,"#7900d9"); purpleMetal.addColorStop(1,"#e8b4ff");
  ctx.strokeStyle=purpleMetal; ctx.lineWidth=9; roundedRect(ctx,38,34,1124,H-68,14); ctx.stroke();
  ctx.strokeStyle="rgba(255,225,255,.88)"; ctx.lineWidth=2; roundedRect(ctx,53,49,1094,H-98,9); ctx.stroke();
  ctx.fillStyle="#fff0ff"; ctx.font="bold 30px Georgia"; ctx.fillText("ATLAS · DIÁRIO DE VIAGEM",76,88);
  ctx.fillStyle="#edbaff"; ctx.font="18px Arial"; ctx.fillText("EDIÇÃO DE COLECIONADOR · PREMIUM",78,120);
  // Selo de bandeira dentro da moldura, com fundo branco para destacar o emoji.
  ctx.save();
  ctx.fillStyle = "#ffffff";
  roundedRect(ctx, 1010, 48, 108, 76, 12); ctx.fill();
  ctx.strokeStyle = countryPalette(card.country)[0]; ctx.lineWidth = 3;
  roundedRect(ctx, 1010, 48, 108, 76, 12); ctx.stroke();
  drawCountryFlag(ctx, card.country, 1024, 58, 80, 56);
  ctx.restore(); ctx.textAlign="left"; ctx.textBaseline="alphabetic";
  const px=portrait?305:76, py=150, pw=portrait?590:1048, ph=portrait?1048:590;
  ctx.save(); ctx.shadowColor="rgba(0,0,0,.65)"; ctx.shadowBlur=28; ctx.fillStyle="#050510"; roundedRect(ctx,px-13,py-13,pw+26,ph+26,10); ctx.fill(); ctx.restore();
  const photoPurple=ctx.createLinearGradient(px,py,px+pw,py+ph); photoPurple.addColorStop(0,"#ffe0ff"); photoPurple.addColorStop(.35,"#bd43ff"); photoPurple.addColorStop(.7,"#7100d8"); photoPurple.addColorStop(1,"#f2b5ff");
  ctx.save(); ctx.shadowColor="rgba(208,75,255,.82)"; ctx.shadowBlur=22; ctx.strokeStyle=photoPurple; ctx.lineWidth=10; roundedRect(ctx,px-7,py-7,pw+14,ph+14,8); ctx.stroke(); ctx.restore();
  ctx.save(); roundedRect(ctx,px,py,pw,ph,10); ctx.clip();
  if(card.photo){
    try { const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=card.photo;});
      const scale=Math.max(pw/img.width,ph/img.height), iw=img.width*scale, ih=img.height*scale; ctx.drawImage(img,(pw-iw)/2+px,(ph-ih)/2+py,iw,ih);
    } catch { ctx.fillStyle="#201333"; ctx.fillRect(px,py,pw,ph); }
  } else { ctx.fillStyle="#17102d"; ctx.fillRect(px,py,pw,ph); ctx.fillStyle="#f2d48c"; ctx.font="70px Georgia"; ctx.textAlign="center"; ctx.fillText("✧",px+pw/2,py+ph/2); ctx.textAlign="left"; }
  const shade=ctx.createLinearGradient(0,py+ph*.45,0,py+ph); shade.addColorStop(0,"rgba(30,10,50,0)"); shade.addColorStop(1,"rgba(30,10,50,.72)"); ctx.fillStyle=shade; ctx.fillRect(px,py,pw,ph); ctx.restore();
  let yy=py+ph+65;
  ctx.fillStyle="#f0b8ff"; ctx.font="bold 24px Arial"; ctx.fillText(String(card.country).toLocaleUpperCase("pt-BR"),82,yy); yy+=62;
  ctx.fillStyle="#fff4ff"; ctx.font="bold 58px Georgia"; yy=wrapCanvasText(ctx,card.landmark,82,yy,1030,66,2);
  ctx.fillStyle="#edcaff"; ctx.font="30px Arial"; yy=wrapCanvasText(ctx,`${card.city} · ${formattedDate(card.visitDate)}`,82,yy+4,1020,40,2);
  if(card.traveler){ yy+=20;ctx.fillStyle="#f0b8ff";ctx.font="25px Arial";ctx.fillText("VIAJANTE",80,yy);ctx.fillStyle="#fff6dc";ctx.font="30px Arial";ctx.fillText(card.traveler,80,yy+38);yy+=60; }
  yy+=25; ctx.strokeStyle="#d05cff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(82,yy);ctx.lineTo(1118,yy);ctx.stroke(); yy+=42;
  ctx.fillStyle="#f0b8ff";ctx.font="bold 27px Arial";ctx.fillText("MINHA CARTA DE VIAGEM",80,yy); yy+=42;
  ctx.fillStyle="#fff0ff";ctx.font="27px Georgia";yy=wrapCanvasText(ctx,makeLetter(card),80,yy,1030,39,5);
  if(card.memory){ yy+=12;ctx.fillStyle="#f0b8ff";ctx.font="bold 25px Arial";ctx.fillText("LEMBRANÇA ESPECIAL",80,yy);yy+=36;ctx.fillStyle="#fff0ff";ctx.font="25px Georgia";yy=wrapCanvasText(ctx,card.memory,80,yy,1030,36,Math.max(2,Math.min(5,Math.floor((H-yy-110)/36)))); }
  const footerY=Math.max(yy+35,H-72); ctx.strokeStyle="#d05cff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(82,footerY-35);ctx.lineTo(1118,footerY-35);ctx.stroke();ctx.fillStyle="#edbaff";ctx.font="bold 20px Arial";ctx.textAlign="center";ctx.fillText("GRANDES VIAGENS, GRANDES HISTÓRIAS",600,footerY);ctx.textAlign="left";
  if (typeof canvas.toDataURL !== "function") throw new Error("Este ambiente não permite exportar imagens.");
  const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
  if (!dataUrl || !dataUrl.startsWith("data:image/jpeg;base64,")) throw new Error("O navegador não conseguiu codificar a carta em JPG.");
  return dataUrl;
}

$("jpgBtn").addEventListener("click", async () => {
  const index = cards.findIndex(c => c.id === currentCardId);
  const card = index >= 0 ? cards[index] : cards[cards.length - 1];
  if (!card) { alert("Gere ou selecione uma carta antes de baixar."); return; }
  const button = $("jpgBtn");
  const originalLabel = button.textContent;
  button.disabled = true; button.textContent = "GERANDO JPG...";
  try {
    const dataUrl = await makeTravelCardJpg(card);
    const filename = `atlas-${normalizePlace(card.country).replace(/[^a-z0-9]+/g,"-")}-${normalizePlace(card.landmark).replace(/[^a-z0-9]+/g,"-")}.jpg`;
    if (window.atlasDesktop && typeof window.atlasDesktop.saveJpg === "function") {
      const result = await window.atlasDesktop.saveJpg(dataUrl, filename);
      if (result && !result.canceled) alert("Carta JPG salva com sucesso!\n" + result.filePath);
    } else {
      const blob = dataUrlToBlob(dataUrl);
      await downloadBlob(blob, filename);
    }
  } catch (err) {
    console.error("Falha ao gerar/baixar carta JPG:", err);
    alert("Não foi possível gerar ou salvar a carta JPG. Tente uma foto menor e verifique se há espaço em disco.\nDetalhe: " + (err?.message || err));
  } finally { button.disabled = false; button.textContent = originalLabel; }
});
$("printBtn").addEventListener("click", () => window.print());
$("allPdfBtn").addEventListener("click", async () => {
  if (!cards.length) { alert("Seu álbum ainda não tem cartas."); return; }
  const button = $("allPdfBtn");
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "MONTANDO ÁLBUM PDF...";
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("A biblioteca de PDF não carregou. Confira a conexão com a internet, atualize a página e tente novamente.");
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({orientation:"portrait", unit:"mm", format:"a4", compress:true});
    const pageW = 210, pageH = 297;
    const orderedCards = [...cards].slice().reverse();
    // Capa editorial
    doc.setFillColor(17, 8, 31); doc.rect(0, 0, pageW, pageH, "F");
    doc.setFillColor(42, 15, 69); doc.circle(105, 92, 65, "F");
    doc.setDrawColor(218, 177, 91); doc.setLineWidth(1.1); doc.roundedRect(13, 13, 184, 271, 5, 5, "S");
    doc.setDrawColor(153, 72, 220); doc.setLineWidth(.5); doc.roundedRect(18, 18, 174, 261, 4, 4, "S");
    doc.setTextColor(232, 197, 111); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("ATLAS PREMIUM", 105, 47, {align:"center"});
    doc.setTextColor(255, 248, 229); doc.setFont("times", "bold"); doc.setFontSize(31);
    doc.text("Meu Álbum de Viagens", 105, 70, {align:"center"});
    doc.setTextColor(210, 184, 234); doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text("Lugares, histórias e lembranças para guardar", 105, 81, {align:"center"});
    // Faixa de miniaturas na capa
    const coverCards = orderedCards.slice(0, 3), coverW = 45, coverH = 75, coverGap = 7;
    const coverStart = (pageW - (coverCards.length * coverW + (coverCards.length - 1) * coverGap)) / 2;
    coverCards.forEach((card, i) => {
      const x = coverStart + i * (coverW + coverGap), y = 111;
      doc.setFillColor(35, 20, 53); doc.roundedRect(x, y, coverW, coverH, 2, 2, "F");
      doc.setDrawColor(218, 177, 91); doc.setLineWidth(.6); doc.roundedRect(x, y, coverW, coverH, 2, 2, "S");
      if (card.photo) { try { doc.addImage(card.photo, card.photo.startsWith("data:image/png") ? "PNG" : "JPEG", x+2, y+2, coverW-4, 48, undefined, "FAST"); } catch {} }
      doc.setTextColor(235, 205, 130); doc.setFont("helvetica", "bold"); doc.setFontSize(5.5);
      doc.text(String(card.country || "DESTINO").toLocaleUpperCase("pt-BR").slice(0, 25), x+3, y+55);
      doc.setTextColor(255, 255, 255); doc.setFont("times", "bold"); doc.setFontSize(7);
      doc.text(doc.splitTextToSize(String(card.landmark || "Minha viagem"), coverW-6).slice(0,2), x+3, y+62);
    });
    doc.setTextColor(255, 248, 229); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(`${orderedCards.length} ${orderedCards.length === 1 ? "carta de viagem" : "cartas de viagem"}`, 105, 218, {align:"center"});
    doc.setTextColor(207, 183, 227); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`${new Set(orderedCards.map(c => normalizePlace(c.country)).filter(Boolean)).size} países registrados`, 105, 229, {align:"center"});
    doc.setDrawColor(218, 177, 91); doc.line(45, 246, 165, 246);
    doc.setTextColor(218, 177, 91); doc.setFontSize(8); doc.text("GRANDES VIAGENS, GRANDES HISTÓRIAS", 105, 258, {align:"center"});

    // Páginas-galeria: seis miniaturas elegantes por página, com imagem e legenda.
    const cols = 2, rows = 3, marginX = 15, topY = 31, gapX = 8, gapY = 8;
    const tileW = (pageW - marginX*2 - gapX) / cols, tileH = 78;
    for (let base = 0; base < orderedCards.length; base += cols*rows) {
      doc.addPage();
      doc.setFillColor(17, 8, 31); doc.rect(0, 0, pageW, pageH, "F");
      doc.setDrawColor(218, 177, 91); doc.setLineWidth(.6); doc.roundedRect(10, 10, 190, 277, 4, 4, "S");
      doc.setTextColor(232, 197, 111); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text("ATLAS PREMIUM  /  GALERIA DE VIAGENS", 16, 21);
      doc.setTextColor(210, 184, 234); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.text(`CARTAS ${base+1}–${Math.min(base+cols*rows, orderedCards.length)}`, 194, 21, {align:"right"});
      orderedCards.slice(base, base+cols*rows).forEach((card, localIndex) => {
        const col = localIndex % cols, row = Math.floor(localIndex / cols);
        const x = marginX + col*(tileW+gapX), y = topY + row*(tileH+gapY);
        doc.setFillColor(32, 18, 49); doc.roundedRect(x, y, tileW, tileH, 3, 3, "F");
        doc.setDrawColor(137, 72, 173); doc.setLineWidth(.45); doc.roundedRect(x, y, tileW, tileH, 3, 3, "S");
        // Miniatura de carta à esquerda
        const imgX=x+3, imgY=y+3, imgW=tileW*.43, imgH=tileH-6;
        doc.setFillColor(48, 28, 69); doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, "F");
        if (card.photo) { try { doc.addImage(card.photo, card.photo.startsWith("data:image/png") ? "PNG" : "JPEG", imgX+1, imgY+1, imgW-2, imgH-2, undefined, "FAST"); } catch {} }
        doc.setDrawColor(218, 177, 91); doc.setLineWidth(.45); doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, "S");
        const textX = imgX+imgW+4, textW = tileW-(textX-x)-4;
        doc.setTextColor(232, 197, 111); doc.setFont("helvetica", "bold"); doc.setFontSize(6.5);
        doc.text(String(card.country || "DESTINO").toLocaleUpperCase("pt-BR").slice(0, 32), textX, y+11);
        doc.setTextColor(255, 250, 238); doc.setFont("times", "bold"); doc.setFontSize(11);
        const titleLines = doc.splitTextToSize(String(card.landmark || "Carta de viagem"), textW).slice(0,2);
        doc.text(titleLines, textX, y+22);
        let infoY = y+22+titleLines.length*5;
        doc.setTextColor(207, 190, 222); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
        const cityLines = doc.splitTextToSize(String(card.city || ""), textW).slice(0,2);
        if (cityLines.length) { doc.text(cityLines, textX, infoY); infoY += cityLines.length*3.5+2; }
        doc.setTextColor(232, 197, 111); doc.setFontSize(6.5);
        doc.text(formattedDate(card.visitDate), textX, Math.min(y+tileH-8, infoY+3));
        doc.setTextColor(145, 121, 167); doc.setFontSize(6);
        doc.text(`Nº ${String(base+localIndex+1).padStart(3,"0")}`, x+tileW-4, y+tileH-3, {align:"right"});
      });
      doc.setDrawColor(77, 47, 103); doc.line(16, 275, 194, 275);
      doc.setTextColor(180, 157, 204); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.text("MINHAS VIAGENS • MINHAS MEMÓRIAS", 105, 281, {align:"center"});
      doc.text(`PÁGINA ${doc.getNumberOfPages()}`, 194, 281, {align:"right"});
    }
    const pdfBlob = doc.output("blob");
    await downloadBlob(pdfBlob, "Atlas_Premium_Album_Miniaturas.pdf");
  } catch (err) {
    console.error("Falha ao exportar álbum PDF:", err);
    alert("Não foi possível baixar o álbum. Verifique a conexão com a internet e tente novamente.\nDetalhe: " + (err?.message || err));
  } finally {
    button.disabled = cards.length === 0;
    button.textContent = originalLabel;
  }
});
const deleteAlbumBtn = document.getElementById("deleteAlbumBtn");
if (deleteAlbumBtn) deleteAlbumBtn.addEventListener("click", () => {
  if (!cards.length) { alert("O álbum já está vazio."); return; }
  if (!confirm(`Excluir permanentemente todas as ${cards.length} cartas do Atlas Premium neste computador? Esta ação não pode ser desfeita. Recomendamos exportar seu álbum antes.`)) return;
  cards = [];
  saveCards();
  renderAlbum();
  renderStatsOnly();
  ["previewCountry", "previewLandmark", "previewCity", "previewLetter"].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = id === "previewCountry" ? "PAÍS A DESCOBRIR" : id === "previewLandmark" ? "Seu próximo destino" : id === "previewCity" ? "A sua história começa aqui" : "Sua carta de viagem aparecerá aqui."; });
  const photo = document.getElementById("previewPhoto"); if (photo) { photo.removeAttribute("src"); photo.hidden = true; }
  const placeholder = document.querySelector(".art-placeholder"); if (placeholder) placeholder.style.display = "flex";
  ["downloadBtn", "jpgBtn", "printBtn", "allPdfBtn"].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
  const cardNumber = document.getElementById("cardNumber"); if (cardNumber) cardNumber.textContent = "Nº 001";
  alert("Álbum excluído. Todas as cartas locais foram removidas.");
});

$("achievementCelebration")?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-celebration]")) closeAchievementCelebration();
});
$("celebrationOk")?.addEventListener("click", closeAchievementCelebration);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && $("achievementCelebration") && !$("achievementCelebration").hidden) closeAchievementCelebration();
});

renderAlbum();
if (cards.length) renderPreview(cards[cards.length - 1]);
else {
  renderPreview({country:"Itália", city:"Roma", landmark:"Coliseu de Roma", visitDate:"", traveler:"", memory:"", photo:"", photoOrientation:"16:9"});
  ["downloadBtn", "jpgBtn", "printBtn", "allPdfBtn"].forEach(id => $(id).disabled = true);
}
renderStatsOnly();


// Efeito 3D robusto: arraste a carta com mouse ou dedo para girá-la.
function enableInteractive3DCard(card) {
  if (!card || card.dataset.threeDReady === "true") return;
  card.dataset.threeDReady = "true";
  let dragging = false;
  let pointerId = null;
  let resetTimer = null;
  let lastX = 0.5, lastY = 0.5;
  const isLargeCard = !!card.closest(".large-card-holder");

  card.style.transformStyle = "preserve-3d";
  card.style.transformOrigin = "center center";
  card.style.willChange = "transform";
  if (isLargeCard) card.style.touchAction = "none";

  const setTilt = (clientX, clientY, strength = 1) => {
    const rect = card.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(rect.width, 1)));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(rect.height, 1)));
    lastX = x; lastY = y;
    const rotateY = (x - 0.5) * 34 * strength;
    const rotateX = (0.5 - y) * 26 * strength;
    card.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px) scale(1.025)`;
    card.classList.add("card-3d-touch");
  };
  const resetTilt = () => {
    if (dragging) return;
    card.style.transform = "";
    card.classList.remove("card-3d-touch");
  };
  const scheduleReset = (delay = 1800) => {
    clearTimeout(resetTimer);
    resetTimer = setTimeout(resetTilt, delay);
  };

  card.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, a, input, label")) return;
    dragging = true;
    pointerId = event.pointerId;
    clearTimeout(resetTimer);
    card.classList.add("card-3d-touch");
    setTilt(event.clientX, event.clientY, 1);
    try { card.setPointerCapture(event.pointerId); } catch (_) {}
    if (event.pointerType === "touch") event.preventDefault();
  });
  card.addEventListener("pointermove", (event) => {
    if (dragging && (pointerId === null || event.pointerId === pointerId)) {
      if (event.cancelable) event.preventDefault();
      setTilt(event.clientX, event.clientY, 1);
      return;
    }
    if (event.pointerType === "mouse" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const rect = card.getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
        setTilt(event.clientX, event.clientY, 0.75);
      } else if (!dragging) resetTilt();
    }
  }, { passive: false });
  const release = (event) => {
    if (!dragging || (event && pointerId !== null && event.pointerId !== undefined && event.pointerId !== pointerId)) return;
    dragging = false;
    pointerId = null;
    scheduleReset(isLargeCard ? 2400 : 1200);
  };
  card.addEventListener("pointerup", release);
  card.addEventListener("pointercancel", release);
  card.addEventListener("lostpointercapture", () => {
    if (dragging) { dragging = false; pointerId = null; scheduleReset(1800); }
  });
  card.addEventListener("pointerleave", () => {
    if (!dragging) scheduleReset(isLargeCard ? 900 : 300);
  });
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input, label")) return;
    if (!card.classList.contains("card-3d-touch")) {
      const rect = card.getBoundingClientRect();
      setTilt(rect.left + rect.width * 0.72, rect.top + rect.height * 0.32, 1);
    }
    scheduleReset(2200);
  });
  card.addEventListener("contextmenu", (event) => { if (isLargeCard) event.preventDefault(); });
}
enableInteractive3DCard(document.getElementById("travelCard"));
