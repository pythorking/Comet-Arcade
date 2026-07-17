const openGameButtons = document.querySelectorAll("[data-open-game]");
const chips = document.querySelectorAll(".chip");
const search = document.getElementById("game-search");
const gameCards = document.querySelectorAll(".game-card");
const playTitle = document.getElementById("play-title");
const gameFrame = document.getElementById("game-frame");
const gameFrameWrap = document.getElementById("game-frame-wrap");
const emptyPlayer = document.getElementById("empty-player");
const fullscreenButton = document.getElementById("fullscreen-game");
const backHomeButton = document.getElementById("back-home");

const games = {
  life: {
    title: "Life Simulator",
    url: "life-simulator.html",
  },
  "royal-poker": {
    title: "Royal Flush Poker",
    url: "royal-flush-poker.html",
  },
  "winter-bike": {
    title: "Winter Bike Trials",
    url: "winter-bike-trials.html",
  },
};

let activeFilter = "all";

function openGame(gameId) {
  const game = games[gameId];
  if (!game) {
    alert("That game slot is ready for a future upload.");
    return;
  }

  playTitle.textContent = game.title;
  gameFrame.src = game.url;
  emptyPlayer.hidden = true;
  document.querySelectorAll("[data-open-game]").forEach((button) => {
    button.classList.toggle("is-active-game", button.dataset.openGame === gameId);
  });
  document.getElementById("play").scrollIntoView({ behavior: "smooth", block: "start" });
}

function filterGames() {
  const query = search.value.trim().toLowerCase();
  gameCards.forEach((card) => {
    const tags = card.dataset.tags;
    const text = card.textContent.toLowerCase();
    const matchesFilter = activeFilter === "all" || tags.includes(activeFilter);
    const matchesSearch = !query || tags.includes(query) || text.includes(query);
    card.hidden = !(matchesFilter && matchesSearch);
  });
}

openGameButtons.forEach((button) => {
  button.addEventListener("click", () => openGame(button.dataset.openGame));
});

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    activeFilter = chip.dataset.filter;
    chips.forEach((item) => item.classList.toggle("active", item === chip));
    filterGames();
  });
});

search.addEventListener("input", filterGames);

fullscreenButton.addEventListener("click", () => {
  if (gameFrame.getAttribute("src") === "about:blank") {
    alert("Choose a game first.");
    return;
  }

  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }

  gameFrameWrap.requestFullscreen();
});

backHomeButton.addEventListener("click", () => {
  document.getElementById("home").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.addEventListener("fullscreenchange", () => {
  fullscreenButton.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
});
