// Game configuration
const gameConfig = {
  timeOptions: [30, 60, 90],
  defaultTime: 30,
};

const gameStates = {
  IDLE: "idle",
  PLAYING: "playing",
  FINISHED: "finished",
};

const scoring = {
  clickValue: 1,
  cpsUpdateInterval: 100,
};

const scaleEffect = {
  activeScale: 0.96,
  transitionDuration: "0.15s",
  easing: "ease-out",
};

// Game state variables
let currentState = gameStates.IDLE;
let selectedTime = gameConfig.defaultTime;
let timeRemaining = selectedTime;
let score = 0;
let gameTimer = null;
let cpsTimer = null;
let clickTimes = [];
let startTime = null;

// DOM elements
const timeButtons = document.querySelectorAll(".time-btn");
const timerDisplay = document.getElementById("timer-display");
const clickButton = document.getElementById("click-button");
const clickCounter = document.getElementById("click-counter");
const gameArea = document.getElementById("game-area");
const startBtn = document.getElementById("start-btn");
const gameStatus = document.getElementById("game-status");
const timeSelector = document.getElementById("time-selector");
const gameStat = document.getElementById("game-stats");
const resultsModal = document.getElementById("results-modal");
const playAgainBtn = document.getElementById("play-again-btn");
const finalScore = document.getElementById("final-score");
const finalTime = document.getElementById("final-time");
const finalCps = document.getElementById("final-cps");
const performanceMessage = document.getElementById("performance-message");

// Initialize game
function initGame() {
  console.log("Initializing game...");
  updateGameState(gameStates.IDLE);
  resetGameData();
  updateDisplay();
  setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
  console.log("Setting up event listeners...");

  // Time selection buttons
  timeButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      console.log("Time button clicked:", btn.dataset.time);
      selectTime(parseInt(btn.dataset.time));
    });
  });

  // Start button
  startBtn.addEventListener("click", (e) => {
    console.log("Start button clicked");
    gameArea.style.display = "flex";
    startBtn.style.display = "none";
    timeSelector.style.display = "none";
    gameStat.style.display = "inline";
    startGame();
  });

  // Click button - main game interaction
  clickButton.addEventListener("click", (e) => {
    console.log("Click button pressed, current state:", currentState);
    handleClick();
  });

  // Prevent context menu for better UX
  clickButton.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  // Play again button
  playAgainBtn.addEventListener("click", (e) => {
    console.log("Play again clicked");
    gameArea.style.display = "none";
    startBtn.style.display = "inline-flex";
    timeSelector.style.display = "flex";
    gameStat.style.display = "none";
    playAgain();
  });

  // Keyboard shortcuts
  //   document.addEventListener("keydown", (e) => {
  //     switch (e.code) {
  //       case "Space":
  //         e.preventDefault();
  //         if (currentState === gameStates.PLAYING) {
  //           handleClick();
  //         } else if (currentState === gameStates.IDLE) {
  //           startGame();
  //         }
  //         break;

  //       case "KeyR":
  //         if (e.ctrlKey || e.metaKey) {
  //           e.preventDefault();
  //           resetGame();
  //         }
  //         break;

  //       case "Digit1":
  //         selectTime(30);
  //         break;

  //       case "Digit2":
  //         selectTime(60);
  //         break;

  //       case "Digit3":
  //         selectTime(90);
  //         break;

  //       case "Escape":
  //         if (!resultsModal.classList.contains("hidden")) {
  //           closeResultsModal();
  //         }
  //         break;
  //     }
  //   });
}

// Select time duration
function selectTime(time) {
  console.log("Selecting time:", time, "Current state:", currentState);
  if (currentState !== gameStates.IDLE) return;

  selectedTime = time;
  timeRemaining = time;

  // Update active button
  timeButtons.forEach((btn) => {
    btn.classList.toggle("active", parseInt(btn.dataset.time) === time);
  });

  updateDisplay();
  console.log("Time selected:", selectedTime, "Time remaining:", timeRemaining);
}

// Start the game
function startGame() {
  console.log("Starting game with time:", selectedTime);
  if (currentState !== gameStates.IDLE) return;

  updateGameState(gameStates.PLAYING);
  startTime = Date.now();
  timeRemaining = selectedTime;
  score = 0;
  clickTimes = [];

  // Start game timer - count down every second
  gameTimer = setInterval(() => {
    timeRemaining--;
    console.log("Timer tick, time remaining:", timeRemaining);
    updateDisplay();

    if (timeRemaining <= 0) {
      console.log("Game ended - time up");
      endGame();
    }
  }, 1000);

  // Start CPS calculation timer
  cpsTimer = setInterval(calculateCPS, scoring.cpsUpdateInterval);

  updateDisplay();
//   updateStatus("Game started! Click as fast as you can!");
  console.log("Game started successfully");
}

// Handle click on main button - optimized for scale/shrink effect
function handleClick() {
  console.log("Handle click called, state:", currentState);
  if (currentState !== gameStates.PLAYING) {
    console.log("Click ignored - game not playing");
    return;
  }

  score += scoring.clickValue;
  clickTimes.push(Date.now());

  console.log("Click registered! Score:", score);

  // Optional subtle bounce effect after the CSS scale transition
  // This enhances the satisfying click feeling
  setTimeout(() => {
    clickButton.classList.add("bounce");
    setTimeout(() => {
      clickButton.classList.remove("bounce");
    }, 100);
  }, 75);

  updateDisplay();
}

// Calculate real-time CPS
function calculateCPS() {
  if (currentState !== gameStates.PLAYING) return;

  const now = Date.now();
  const oneSecondAgo = now - 1000;

  // Filter clicks from the last second for accurate CPS
  clickTimes = clickTimes.filter((time) => time > oneSecondAgo);

  const cps = clickTimes.length;
  //   cpsDisplay.textContent = cps.toFixed(1);
}

// End the game
function endGame() {
  console.log("Ending game...");
  updateGameState(gameStates.FINISHED);

  // Clear timers
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
  if (cpsTimer) {
    clearInterval(cpsTimer);
    cpsTimer = null;
  }

  // Calculate final stats
  const totalTime = selectedTime;
  const averageCps = totalTime > 0 ? (score / totalTime).toFixed(2) : "0.00";

  console.log(
    "Final stats - Score:",
    score,
    "Time:",
    totalTime,
    "Avg CPS:",
    averageCps
  );

  // Show results
  showResults(score, totalTime, averageCps);
//   updateStatus("Game finished! Check your results above.");
}

// Show results modal
function showResults(totalClicks, timePlayed, avgCps) {
  finalScore.textContent = totalClicks;
  finalTime.textContent = `${timePlayed}s`;
  finalCps.textContent = avgCps;

  // Generate performance message
  const message = generatePerformanceMessage(avgCps);
  performanceMessage.textContent = message;

  resultsModal.classList.remove("hidden");
}

// Generate performance message based on CPS
function generatePerformanceMessage(avgCps) {
  const cps = parseFloat(avgCps);

  if (cps >= 8) {
    return "🔥 Incredible! You're a clicking machine!";
  } else if (cps >= 6) {
    return "⚡ Excellent speed! You're getting really good at this!";
  } else if (cps >= 4) {
    return "👏 Great job! Your clicking speed is improving!";
  } else if (cps >= 2) {
    return "👍 Good effort! Keep practicing to get faster!";
  } else {
    return "💪 Nice try! Practice makes perfect!";
  }
}

// Close results modal
function closeResultsModal() {
  resultsModal.classList.add("hidden");
}

// Play again function
function playAgain() {
  closeResultsModal();
  resetGame();
}

// Reset the game
function resetGame() {
  console.log("Resetting game...");
  updateGameState(gameStates.IDLE);

  // Clear timers
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
  if (cpsTimer) {
    clearInterval(cpsTimer);
    cpsTimer = null;
  }

  resetGameData();
  updateDisplay();
//   updateStatus('Select a time limit and click "Start Game" to begin!');
}

// Reset game data
function resetGameData() {
  timeRemaining = selectedTime;
  score = 0;
  clickTimes = [];
  startTime = null;
  console.log("Game data reset - Time:", timeRemaining, "Score:", score);
}

// Update game state
function updateGameState(newState) {
  console.log("Updating game state from", currentState, "to", newState);

  // Remove previous state classes
  document.body.classList.remove("game-idle", "game-playing", "game-finished");

  currentState = newState;

  // Add new state class
  document.body.classList.add(`game-${newState}`);

  // Update button states
  switch (newState) {
    case gameStates.IDLE:
      clickButton.disabled = true;
      startBtn.classList.remove("hidden");

      timeButtons.forEach((btn) => (btn.disabled = false));
      break;

    case gameStates.PLAYING:
      clickButton.disabled = false;
      startBtn.classList.add("hidden");

      timeButtons.forEach((btn) => (btn.disabled = true));
      break;

    case gameStates.FINISHED:
      clickButton.disabled = true;
      startBtn.classList.add("hidden");

      timeButtons.forEach((btn) => (btn.disabled = false));
      break;
  }
}

// Update display elements
function updateDisplay() {
  timerDisplay.textContent = timeRemaining;
  clickCounter.textContent = score;

  console.log("Display updated - Timer:", timeRemaining, "Score:", score);
}


// Optimize for touch devices
clickButton.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault(); // Prevent zoom on double tap
  },
  { passive: false }
);

// Initialize game when page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing game...");
  initGame();
});
