const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "atlasPremiumCards_v1";
let cards = loadCards();
let currentPhotoData = "";
let currentCardId = null;

function loadCards() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveCards() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)); }
  catch { alert("O armazenamento do navegador está cheio. Tente usar uma foto menor."); }
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
  // Identidade visual Atlas Premium: roxo vibrante com detalhes lavanda.
  const primary = "#8e24ff", secondary = "#ffffff", accent = "#c15cff";
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
  const art = document.getElementById("cardArt"); if (art) { art.classList.toggle("photo-portrait", card.photoOrientation === "9:16"); art.classList.toggle("photo-landscape", card.photoOrientation !== "9:16"); }
  currentCardId = card.id;
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
    const item = document.createElement("article"); item.className = "album-item";
    const thumb = document.createElement("div"); thumb.className = "album-thumb";
    if (card.photo) { const img = document.createElement("img"); img.src = card.photo; img.alt = card.landmark; thumb.appendChild(img); }
    const info = document.createElement("div"); info.className = "album-info";
    const country = document.createElement("small"); country.textContent = card.country.toLocaleUpperCase("pt-BR");
    const title = document.createElement("h3"); title.textContent = card.landmark;
    const city = document.createElement("p"); city.textContent = `${card.city} · ${formattedDate(card.visitDate)}`;
    const actions = document.createElement("div"); actions.className = "album-actions";
    const view = document.createElement("button"); view.textContent = "VER CARTA"; view.addEventListener("click", () => { renderPreview(card); window.scrollTo({top: 0, behavior:"smooth"}); });
    const del = document.createElement("button"); del.textContent = "EXCLUIR"; del.addEventListener("click", () => {
      if (confirm(`Excluir a carta de ${card.landmark}?`)) {
        cards = cards.filter(c => c.id !== card.id); saveCards(); renderAlbum(); renderStatsOnly();
        if (cards.length) renderPreview(cards[cards.length - 1]);
        else { $("downloadBtn").disabled = $("jpgBtn").disabled = $("printBtn").disabled = $("allPdfBtn").disabled = true; }
      }
    });
    actions.append(view, del); info.append(country, title, city, actions); item.append(thumb, info); grid.appendChild(item);
  });
  $("allPdfBtn").disabled = cards.length === 0;
}
function renderStatsOnly() {
  $("countryCount").textContent = new Set(cards.map(c => normalizePlace(c.country)).filter(Boolean)).size;
  $("cardCount").textContent = cards.length;
  $("cardNumber").textContent = "Nº " + String(cards.length).padStart(3, "0");
  $("allPdfBtn").disabled = cards.length === 0;
}
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const binary = atob(parts[1]); const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], {type:mime});
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
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
  if (!file) return;
  if (!file.type.startsWith("image/")) { alert("Selecione um arquivo de imagem."); event.target.value = ""; return; }
  if (file.size > 1.5 * 1024 * 1024) {
    alert("A foto deve ter até 1,5 MB para caber no armazenamento local. Redimensione e tente novamente.");
    event.target.value = ""; return;
  }
  const reader = new FileReader();
  reader.onload = () => { currentPhotoData = reader.result; $("photoName").textContent = "Foto selecionada: " + file.name; };
  reader.readAsDataURL(file);
});
$("visitDate").addEventListener("input", () => {
  const field = $("visitDate");
  const digits = field.value.replace(/\D/g, "").slice(0, 8);
  const formatted = digits.length <= 2 ? digits : digits.length <= 4 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  field.value = formatted;
});
$("travelForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const card = {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    country: safeText($("country").value), city: safeText($("city").value),
    landmark: safeText($("landmark").value), visitDate: normalizeVisitDate($("visitDate").value),
    traveler: safeText($("traveler").value), memory: safeText($("memory").value),
    photo: currentPhotoData, photoOrientation: $("photoOrientation").value || "16:9"
  };
  if (!card.country || !card.city || !card.landmark) { alert("Preencha país, cidade e ponto turístico."); return; }
  if (card.visitDate === null) { alert("Digite uma data válida no formato DD/MM/AAAA, por exemplo 15/10/2026."); $("visitDate").focus(); return; }
  const duplicate = cards.find(c => placeKey(c) === placeKey(card));
  if (duplicate) {
    alert(`Este local já está registrado no álbum: ${duplicate.landmark} — ${duplicate.city}, ${duplicate.country}. Não é possível cadastrar o mesmo país, cidade e ponto turístico duas vezes.`);
    return;
  }
  cards.push(card); saveCards(); renderPreview(card); renderAlbum(); renderStatsOnly();
  $("travelForm").reset(); currentPhotoData = ""; $("photoName").textContent = "";
});
$("downloadBtn").addEventListener("click", () => {
  const text = [
    "ATLAS PREMIUM — CARTA DE VIAGEM", "================================",
    `País: ${$("previewCountry").textContent}`,
    `Ponto turístico: ${$("previewLandmark").textContent}`,
    `Cidade: ${$("previewCity").textContent}`,
    `Data da visita: ${$("previewDate").textContent}`, "",
    $("previewLetter").textContent, "", "Memórias que atravessam fronteiras."
  ].join("\n");
  downloadBlob(new Blob([text], {type:"text/plain;charset=utf-8"}), "carta-premium-atlas.txt");
});
function flagForCountry(country) {
  const flags = {
    "brasil":"🇧🇷", "brazil":"🇧🇷", "frança":"🇫🇷", "france":"🇫🇷", "italia":"🇮🇹", "itália":"🇮🇹",
    "alemanha":"🇩🇪", "germany":"🇩🇪", "espanha":"🇪🇸", "spain":"🇪🇸", "portugal":"🇵🇹",
    "estados unidos":"🇺🇸", "eua":"🇺🇸", "united states":"🇺🇸", "inglaterra":"🇬🇧", "reino unido":"🇬🇧", "japão":"🇯🇵", "japao":"🇯🇵",
    "china":"🇨🇳", "argentina":"🇦🇷", "chile":"🇨🇱", "uruguai":"🇺🇾", "paraguai":"🇵🇾", "peru":"🇵🇪", "canadá":"🇨🇦", "canada":"🇨🇦",
    "méxico":"🇲🇽", "mexico":"🇲🇽", "grécia":"🇬🇷", "grecia":"🇬🇷", "suíça":"🇨🇭", "suica":"🇨🇭", "holanda":"🇳🇱", "países baixos":"🇳🇱",
    "austrália":"🇦🇺", "australia":"🇦🇺", "índia":"🇮🇳", "india":"🇮🇳", "coreia do sul":"🇰🇷", "tailândia":"🇹🇭", "tailandia":"🇹🇭", "egito":"🇪🇬", "áfrica do sul":"🇿🇦"
  };
  return flags[normalizePlace(country)] || "🌐";
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
  const bg = ctx.createLinearGradient(0,0,1200,canvas.height); bg.addColorStop(0,"#f8edff"); bg.addColorStop(0.55,"#ead0ff"); bg.addColorStop(1,"#d8b2ff");
  ctx.fillStyle=bg; ctx.fillRect(0,0,canvas.width,canvas.height);
  const H=canvas.height;
  // Moldura roxa premium com acabamento instantâneo e fundo lavanda suave.
  ctx.fillStyle="#4b087d"; ctx.globalAlpha=.14; roundedRect(ctx,46,44,1108,H-88,12); ctx.fill(); ctx.globalAlpha=1;
  ctx.fillStyle="#fffaff"; roundedRect(ctx,36,30,1128,H-60,8); ctx.fill();
  ctx.strokeStyle="#8e24ff"; ctx.lineWidth=6; ctx.strokeRect(39,33,1122,H-66);
  ctx.fillStyle="#6410a8"; ctx.font="bold 30px Georgia"; ctx.fillText("ATLAS · DIÁRIO DE VIAGEM",76,88);
  ctx.fillStyle="#8a52b0"; ctx.font="18px Arial"; ctx.fillText("UMA MEMÓRIA PARA GUARDAR",78,120);
  ctx.font="58px Arial"; ctx.textAlign="right"; ctx.fillText(flagForCountry(card.country),1118,102); ctx.textAlign="left";
  const px=portrait?305:76, py=150, pw=portrait?590:1048, ph=portrait?1048:590;
  ctx.fillStyle="#ffffff"; roundedRect(ctx,px-12,py-12,pw+24,ph+24,5); ctx.fill();
  ctx.strokeStyle="#c15cff"; ctx.lineWidth=4; ctx.strokeRect(px-6,py-6,pw+12,ph+12);
  ctx.save(); roundedRect(ctx,px,py,pw,ph,10); ctx.clip();
  if(card.photo){
    try { const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=card.photo;});
      const scale=Math.max(pw/img.width,ph/img.height), iw=img.width*scale, ih=img.height*scale; ctx.drawImage(img,(pw-iw)/2+px,(ph-ih)/2+py,iw,ih);
    } catch { ctx.fillStyle="#d8b2ff"; ctx.fillRect(px,py,pw,ph); }
  } else { ctx.fillStyle="#eedbff"; ctx.fillRect(px,py,pw,ph); ctx.fillStyle="#8e24ff"; ctx.font="70px Georgia"; ctx.textAlign="center"; ctx.fillText("✧",px+pw/2,py+ph/2); ctx.textAlign="left"; }
  const shade=ctx.createLinearGradient(0,py+ph*.45,0,py+ph); shade.addColorStop(0,"rgba(30,10,50,0)"); shade.addColorStop(1,"rgba(30,10,50,.72)"); ctx.fillStyle=shade; ctx.fillRect(px,py,pw,ph); ctx.restore();
  let yy=py+ph+65;
  ctx.fillStyle="#8e24ff"; ctx.font="bold 24px Arial"; ctx.fillText(String(card.country).toLocaleUpperCase("pt-BR"),82,yy); yy+=62;
  ctx.fillStyle="#321047"; ctx.font="bold 58px Georgia"; yy=wrapCanvasText(ctx,card.landmark,82,yy,1030,66,2);
  ctx.fillStyle="#8a52b0"; ctx.font="30px Arial"; yy=wrapCanvasText(ctx,`${card.city} · ${formattedDate(card.visitDate)}`,82,yy+4,1020,40,2);
  if(card.traveler){ yy+=20;ctx.fillStyle="#8e24ff";ctx.font="25px Arial";ctx.fillText("VIAJANTE",80,yy);ctx.fillStyle="#321047";ctx.font="30px Arial";ctx.fillText(card.traveler,80,yy+38);yy+=60; }
  yy+=25; ctx.strokeStyle="#c15cff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(82,yy);ctx.lineTo(1118,yy);ctx.stroke(); yy+=42;
  ctx.fillStyle="#8e24ff";ctx.font="bold 27px Arial";ctx.fillText("MINHA CARTA DE VIAGEM",80,yy); yy+=42;
  ctx.fillStyle="#58336e";ctx.font="27px Georgia";yy=wrapCanvasText(ctx,makeLetter(card),80,yy,1030,39,5);
  if(card.memory){ yy+=12;ctx.fillStyle="#8e24ff";ctx.font="bold 25px Arial";ctx.fillText("LEMBRANÇA ESPECIAL",80,yy);yy+=36;ctx.fillStyle="#58336e";ctx.font="25px Georgia";yy=wrapCanvasText(ctx,card.memory,80,yy,1030,36,Math.max(2,Math.min(5,Math.floor((H-yy-110)/36)))); }
  const footerY=Math.max(yy+35,H-72); ctx.strokeStyle="#c15cff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(82,footerY-35);ctx.lineTo(1118,footerY-35);ctx.stroke();ctx.fillStyle="#8a52b0";ctx.font="bold 20px Arial";ctx.textAlign="center";ctx.fillText("GRANDES VIAGENS, GRANDES HISTÓRIAS",600,footerY);ctx.textAlign="left";
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
      downloadBlob(blob, filename);
    }
  } catch (err) {
    console.error("Falha ao gerar/baixar carta JPG:", err);
    alert("Não foi possível gerar ou salvar a carta JPG. Tente uma foto menor e verifique se há espaço em disco.\nDetalhe: " + (err?.message || err));
  } finally { button.disabled = false; button.textContent = originalLabel; }
});
$("printBtn").addEventListener("click", () => window.print());
$("allPdfBtn").addEventListener("click", async () => {
  if (!cards.length) { alert("Seu álbum ainda não tem cartas."); return; }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("A biblioteca de PDF não carregou. Verifique a conexão com a internet e tente novamente."); return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({orientation:"portrait", unit:"mm", format:"a4"});
  cards.forEach((card, index) => {
    if (index > 0) doc.addPage();
    doc.setFillColor(25, 12, 42); doc.rect(0, 0, 210, 297, "F");
    doc.setDrawColor(197, 160, 255); doc.setLineWidth(.7); doc.roundedRect(12, 12, 186, 273, 4, 4, "S");
    doc.setTextColor(218, 190, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("ATLAS PREMIUM  /  PASSPORT COLLECTION", 20, 24);
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`CARTA Nº ${String(index + 1).padStart(3, "0")}`, 190, 24, {align:"right"});
    let y = 42;
    if (card.photo) {
      try {
        const format = card.photo.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(card.photo, format, 20, y, 170, 75, undefined, "FAST");
        y += 85;
      } catch { /* continue without photo if the image format cannot be embedded */ }
    } else {
      doc.setFillColor(58, 33, 83); doc.roundedRect(20, y, 170, 48, 3, 3, "F");
      doc.setTextColor(218, 190, 255); doc.setFontSize(18); doc.text("✦", 105, y + 27, {align:"center"});
      y += 58;
    }
    doc.setTextColor(218, 190, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(String(card.country).toLocaleUpperCase("pt-BR"), 20, y);
    y += 10; doc.setTextColor(255, 255, 255); doc.setFont("times", "bold"); doc.setFontSize(24);
    const titleLines = doc.splitTextToSize(card.landmark, 165); doc.text(titleLines, 20, y); y += titleLines.length * 9 + 2;
    doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(207, 195, 224);
    doc.text(`${card.city}  ·  ${formattedDate(card.visitDate)}`, 20, y); y += 13;
    doc.setTextColor(245, 239, 255); doc.setFont("times", "italic"); doc.setFontSize(13);
    const letterLines = doc.splitTextToSize(makeLetter(card), 165);
    doc.text(letterLines.slice(0, 9), 20, y); y += Math.min(letterLines.length, 9) * 7 + 12;
    if (card.memory) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(218, 190, 255); doc.text("LEMBRANÇA ESPECIAL", 20, Math.min(y, 258));
      doc.setFont("helvetica", "normal"); doc.setTextColor(245, 239, 255); doc.setFontSize(10);
      doc.text(doc.splitTextToSize(card.memory, 165).slice(0, 3), 20, Math.min(y + 7, 266));
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(197, 160, 255);
    doc.text("MEMÓRIAS QUE ATRAVESSAM FRONTEIRAS", 105, 277, {align:"center"});
  });
  doc.save("Atlas_Premium_Album_Completo.pdf");
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
renderAlbum();
if (cards.length) renderPreview(cards[cards.length - 1]);
else { ["downloadBtn", "jpgBtn", "printBtn", "allPdfBtn"].forEach(id => $(id).disabled = true); }
renderStatsOnly();
