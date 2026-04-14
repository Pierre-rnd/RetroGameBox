let ALL_COVERS = [];
let activeConsole = "all";
let searchVal = "";

async function loadCovers() {
  try {
    const res = await fetch("covers.json");
    if (!res.ok) throw new Error("covers.json introuvable");
    ALL_COVERS = await res.json();
    bootstrap();
  } catch (err) {
    document.getElementById("grid").innerHTML = `
      <div class="empty-state">
        <p>▶ ERREUR DE CHARGEMENT ◀</p>
        <small>${err.message}<br>Vérifiez que covers.json existe à la racine du projet</small>
      </div>`;
  }
}

function bootstrap() {
  updateHeaderStats();
  buildFilters();
  render();
}

function updateHeaderStats() {
  document.getElementById("totalCount").textContent = ALL_COVERS.length;
  const consoles = new Set(ALL_COVERS.map((c) => c.console));
  document.getElementById("consoleCount").textContent = consoles.size;
}

function buildFilters() {
  const consoles = ["all", ...new Set(ALL_COVERS.map((c) => c.console).sort())];

  const cfWrap = document.getElementById("consoleFilters");
  const label = cfWrap.querySelector(".filter-label");
  cfWrap.innerHTML = "";
  cfWrap.appendChild(label);

  consoles.forEach((val) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (val === "all" ? " active" : "");
    btn.dataset.filter = val;
    btn.textContent = val === "all" ? "TOUS" : val;
    btn.setAttribute("aria-pressed", val === "all" ? "true" : "false");
    cfWrap.appendChild(btn);
  });
}

function filtered() {
  return ALL_COVERS.filter((c) => {
    const cs = activeConsole === "all" || c.console === activeConsole;
    const ss = !searchVal || c.title.toLowerCase().includes(searchVal.toLowerCase());
    return cs && ss;
  });
}

function render() {
  const list = filtered();
  const grid = document.getElementById("grid");
  document.getElementById("visibleCount").textContent = list.length;

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>▶ AUCUN RÉSULTAT ◀</p>
        <small>Essayez d'autres filtres ou termes de recherche</small>
      </div>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (c, i) => `
        <article class="card" data-id="${c.id}" style="animation-delay:${i * 30}ms" tabindex="0" role="button" aria-label="Voir ${c.title}">
          <div class="card-img-wrap">
            <div class="card-face card-face--front">
              <img src="${c.front}" alt="Face avant — ${c.title}" loading="lazy" onerror="this.style.opacity=0.3" />
            </div>
            <div class="card-face card-face--back">
              <img src="${c.back}" alt="Face arrière — ${c.title}" loading="lazy" onerror="this.style.opacity=0.3" />
            </div>
            <div class="face-badge" aria-hidden="true">BACK</div>
          </div>
          <div class="card-info">
            <div class="card-title" title="${c.title}">${c.title}</div>
            <div class="card-meta">
              <span class="tag-console">${c.console}</span>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn btn-dl"   data-id="${c.id}" aria-label="Télécharger ${c.title}">⬇ TÉLÉCHARGER</button>
            <button class="btn btn-view" data-id="${c.id}" aria-label="Voir ${c.title} en détail">👁</button>
          </div>
        </article>
      `
    )
    .join("");
}

function openModal(id) {
  const c = ALL_COVERS.find((x) => x.id === +id);
  if (!c) return;

  document.getElementById("modalTitle").textContent = c.title;
  document.getElementById("modalFront").innerHTML = `<img src="${c.front}" alt="Face avant — ${c.title}" />`;
  document.getElementById("modalBack").innerHTML  = `<img src="${c.back}"  alt="Face arrière — ${c.title}" />`;

  document.getElementById("modalDetails").innerHTML = `
    <div class="detail-item">
      <div class="detail-label">Console</div>
      <div class="detail-value">${c.console}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Format</div>
      <div class="detail-value">JPG</div>
    </div>
  `;

  // Stocke les infos sur les boutons pour le téléchargement via blob
  const dlFront = document.getElementById("dlFront");
  const dlBack  = document.getElementById("dlBack");
  dlFront.dataset.src      = c.front;
  dlFront.dataset.filename = `${slugify(c.title)}-front.jpg`;
  dlBack.dataset.src       = c.back;
  dlBack.dataset.filename  = `${slugify(c.title)}-back.jpg`;

  document.getElementById("modalOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("modalClose").focus(), 50);
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Téléchargement robuste via fetch + blob (contourne le blocage CORS)
async function downloadFile(url, filename) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch (err) {
    alert("Erreur lors du téléchargement : " + err.message);
  }
}

async function quickDownload(id) {
  const c = ALL_COVERS.find((x) => x.id === +id);
  if (!c) return;
  await downloadFile(c.front, `${slugify(c.title)}-front.jpg`);
  await downloadFile(c.back,  `${slugify(c.title)}-back.jpg`);
}

// ---- Événements ----

document.getElementById("grid").addEventListener("click", (e) => {
  const viewBtn = e.target.closest(".btn-view");
  const dlBtn   = e.target.closest(".btn-dl");
  const card    = e.target.closest(".card");
  if (viewBtn) { openModal(viewBtn.dataset.id); return; }
  if (dlBtn)   { quickDownload(dlBtn.dataset.id); return; }
  if (card && !e.target.closest(".card-actions")) openModal(card.dataset.id);
});

document.getElementById("grid").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    const card = e.target.closest(".card");
    if (card) { e.preventDefault(); openModal(card.dataset.id); }
  }
});

document.getElementById("consoleFilters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  document.querySelectorAll("#consoleFilters .filter-btn").forEach((b) => {
    b.classList.remove("active");
    b.setAttribute("aria-pressed", "false");
  });
  btn.classList.add("active");
  btn.setAttribute("aria-pressed", "true");
  activeConsole = btn.dataset.filter;
  render();
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  searchVal = e.target.value.trim();
  render();
});

document.getElementById("modalClose").addEventListener("click", closeModal);

document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modalOverlay")) closeModal();
});

// Boutons de téléchargement dans la modal
document.getElementById("dlFront").addEventListener("click", (e) => {
  e.preventDefault();
  const btn = e.currentTarget;
  downloadFile(btn.dataset.src, btn.dataset.filename);
});

document.getElementById("dlBack").addEventListener("click", (e) => {
  e.preventDefault();
  const btn = e.currentTarget;
  downloadFile(btn.dataset.src, btn.dataset.filename);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

loadCovers();