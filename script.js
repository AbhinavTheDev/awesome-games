import gameData from "./data.js";

const gridContainer = document.getElementById("grid-container");
const featuredCard = document.getElementById("featured-card");
const featuredSection = document.getElementById("featured-section");
const gameModal = document.getElementById("game-modal");
const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const gameIframe = document.getElementById("game-iframe");
const closeModalBtn = document.getElementById("close-modal");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const searchInput = document.getElementById("search-input");
const filterBtns = document.querySelectorAll(".filter-btn");
const noResults = document.getElementById("no-results");
const gamesSectionTitle = document.getElementById("games-section-title");

let activeFilter = "all";
let searchQuery = "";

// ─── Featured Game ────────────────────────────────────────────────────────────

const featuredGame =
  gameData.find((g) => g.featured) || gameData[gameData.length - 1];

if (featuredGame) {
  featuredCard.innerHTML = `
    <img src="${featuredGame.imageLink}" alt="${featuredGame.name}" />
    <div class="featured-overlay">
      <span class="featured-badge">⭐ Featured</span>
      <h2 class="featured-title">${featuredGame.name}</h2>
      <p class="featured-desc">${featuredGame.description || featuredGame.tagline}</p>
      <button class="featured-play-btn">▶ Play Now</button>
    </div>
  `;
  featuredCard.querySelector(".featured-play-btn").addEventListener("click", () => {
    openGame(featuredGame.link, featuredGame.name);
  });
}

// ─── Render Games ─────────────────────────────────────────────────────────────

function renderGames() {
  const filtered = gameData.filter((game) => {
    const matchesFilter =
      activeFilter === "all" || game.category === activeFilter;
    const q = searchQuery;
    const matchesSearch =
      !q ||
      game.name.toLowerCase().includes(q) ||
      (game.description || "").toLowerCase().includes(q) ||
      game.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  gridContainer.innerHTML = "";

  if (filtered.length === 0) {
    noResults.style.display = "block";
    gamesSectionTitle.textContent = "No Games Found";
    return;
  }

  noResults.style.display = "none";

  filtered.forEach((game) => {
    const card = document.createElement("div");
    card.className = "game-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Play ${game.name}`);

    card.innerHTML = `
      <div class="card-thumbnail">
        <img src="${game.imageLink}" alt="${game.name}" loading="lazy" />
        <div class="play-overlay">
          <div class="play-icon">▶</div>
        </div>
      </div>
      <div class="card-info">
        <div class="card-name">${game.name}</div>
        <div class="card-tags">
          ${game.tags.map((tag) => `<span class="card-tag">${tag}</span>`).join("")}
        </div>
      </div>
    `;

    card.addEventListener("click", () => openGame(game.link, game.name));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openGame(game.link, game.name);
      }
    });

    gridContainer.appendChild(card);
  });

  if (activeFilter === "all" && !searchQuery) {
    gamesSectionTitle.textContent = "All Games";
  } else {
    gamesSectionTitle.textContent = `${filtered.length} Game${filtered.length !== 1 ? "s" : ""} Found`;
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openGame(link, name) {
  gameIframe.src = link;
  modalTitle.textContent = name;
  gameModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeGame() {
  gameModal.classList.remove("open");
  // Delay clearing src so the close animation completes
  setTimeout(() => {
    gameIframe.src = "";
  }, 260);
  document.body.style.overflow = "";
}

closeModalBtn.addEventListener("click", closeGame);
modalOverlay.addEventListener("click", closeGame);

fullscreenBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    gameIframe.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && gameModal.classList.contains("open")) {
    closeGame();
  }
});

// ─── Search ───────────────────────────────────────────────────────────────────

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value.toLowerCase().trim();
  renderGames();
});

// ─── Category Filters ─────────────────────────────────────────────────────────

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderGames();
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

renderGames();
