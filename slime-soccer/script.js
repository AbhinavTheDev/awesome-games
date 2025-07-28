// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const GROUND_HEIGHT = 80;
const SLIME_RADIUS = 40;
const BALL_RADIUS = 10;
const GOAL_WIDTH = 80;
const GOAL_HEIGHT = 120;
const GRAVITY = 0.6;
const SLIME_SPEED = 5;
const SLIME_JUMP_POWER = -12;
const BALL_DAMPING = 0.99;
const BALL_BOUNCE_DAMPING = 0.8;
const MAX_BALL_SPEED = 13;
const AI_REACTION_DISTANCE = 300;
const AI_PREDICTION_TIME = 30;

// Game state
let gameMode = null;
let playerMode = null;
let timeLeft = 0;
let score = { left: 0, right: 0 };
let gameStarted = false;
let winner = null;
let animationId = null;
let lastTimestamp = 0;
let timerInterval = null;

// Input state
const keys = {};

// Game objects
const gameState = {
  leftSlime: {
    x: 200,
    y: GAME_HEIGHT - GROUND_HEIGHT,
    vx: 0,
    vy: 0,
    isGrabbing: false,
    hasBall: false,
    goalLineTime: 0,
  },
  rightSlime: {
    x: 600,
    y: GAME_HEIGHT - GROUND_HEIGHT,
    vx: 0,
    vy: 0,
    isGrabbing: false,
    hasBall: false,
    goalLineTime: 0,
  },
  ball: {
    x: GAME_WIDTH / 2,
    y: 150,
    vx: 0,
    vy: 0,
    grabbedBy: null,
    grabAngle: 0,
    grabAngularVelocity: 0,
  },
};

// Get canvas and context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// UI functions
function selectPlayerMode(mode) {
  playerMode = mode;
  document.getElementById("mainMenu").classList.add("hidden");
  document.getElementById("gameModeMenu").classList.remove("hidden");

  const instructions = document.getElementById("instructions");
  if (mode === "multi") {
    instructions.innerHTML = `
                    <p>Left Team: W (jump), A/D (move), S (grab)</p>
                    <p>Right Team: ↑ (jump), ←/→ (move), ↓ (grab)</p>
                `;
  } else {
    instructions.innerHTML = `
                    <p>Use Arrow Keys: ↑ (jump), ←/→ (move), ↓ (grab)</p>
                    <p>Hold ↓ to grab the ball when it's near!</p>
                `;
  }
}

function backToMainMenu() {
  gameMode = null;
  playerMode = null;
  winner = null;
  document.getElementById("mainMenu").classList.remove("hidden");
  document.getElementById("gameModeMenu").classList.add("hidden");
  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("winnerScreen").classList.add("hidden");
  document.getElementById("winnerScreen").style.display = "";
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startGame(mode) {
  const times = {
    "1min": 60,
    "2min": 120,
    "4min": 240,
    "8min": 480,
    worldcup: 300,
  };

  gameMode = mode;
  timeLeft = times[mode];
  resetGame();

  document.getElementById("gameModeMenu").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");
  document.getElementById("winnerScreen").classList.add("hidden");

  gameStarted = true;
  updateTimer();
  startTimer();
  gameLoop();
}

function resetGame() {
  resetPositions();
  score = { left: 0, right: 0 };
  winner = null;
  updateScore();
}

function resetPositions() {
  gameState.leftSlime.x = 200;
  gameState.leftSlime.y = GAME_HEIGHT - GROUND_HEIGHT;
  gameState.leftSlime.vx = 0;
  gameState.leftSlime.vy = 0;
  gameState.leftSlime.isGrabbing = false;
  gameState.leftSlime.hasBall = false;
  gameState.leftSlime.goalLineTime = 0;

  gameState.rightSlime.x = 600;
  gameState.rightSlime.y = GAME_HEIGHT - GROUND_HEIGHT;
  gameState.rightSlime.vx = 0;
  gameState.rightSlime.vy = 0;
  gameState.rightSlime.isGrabbing = false;
  gameState.rightSlime.hasBall = false;
  gameState.rightSlime.goalLineTime = 0;

  gameState.ball.x = GAME_WIDTH / 2;
  gameState.ball.y = 150;
  gameState.ball.vx = 0;
  gameState.ball.vy = 0;
  gameState.ball.grabbedBy = null;
  gameState.ball.grabAngle = 0;
  gameState.ball.grabAngularVelocity = 0;
}

function updateScore() {
  document.getElementById("leftScore").textContent = score.left;
  document.getElementById("rightScore").textContent = score.right;
}

function updateTimer() {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  document.getElementById("timer").textContent = `${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimer();
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  gameStarted = false;
  clearInterval(timerInterval);

  if (score.left > score.right) {
    winner = "Cyan Team";
  } else if (score.right > score.left) {
    winner = "Red Team";
  } else {
    winner = "Draw";
  }

  document.getElementById("winnerText").textContent =
    winner === "Draw" ? "It's a Draw!" : `${winner} Wins!`;
  document.getElementById("winnerScreen").classList.remove("hidden");
  document.getElementById("winnerScreen").style.display = "flex";
}

// Input handling
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  e.preventDefault();
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (e) => {
  if (e.target.tagName === "INPUT") return;
  e.preventDefault();
  keys[e.key.toLowerCase()] = false;
});

// AI logic
function updateAI() {
  if (playerMode !== "single") return;

  const ai = gameState.leftSlime;
  const opponent = gameState.rightSlime;
  const ball = gameState.ball;

  const FIELD_WIDTH = GAME_WIDTH;
  const OPPONENT_GOAL_X = FIELD_WIDTH - GOAL_WIDTH / 2;
  const AI_GOAL_X = GOAL_WIDTH / 2;

  const randomFactor = Math.random();
  const aggressiveness = 0.7 + randomFactor * 0.3;

  // Predict ball trajectory
  let predictions = [];
  let tempX = ball.x;
  let tempY = ball.y;
  let tempVx = ball.vx;
  let tempVy = ball.vy;

  for (let t = 0; t < 100; t++) {
    tempVy += GRAVITY;
    tempVx *= BALL_DAMPING;
    tempX += tempVx;
    tempY += tempVy;

    if (tempX < BALL_RADIUS) {
      tempX = BALL_RADIUS;
      tempVx = -tempVx * BALL_BOUNCE_DAMPING;
    }
    if (tempX > FIELD_WIDTH - BALL_RADIUS) {
      tempX = FIELD_WIDTH - BALL_RADIUS;
      tempVx = -tempVx * BALL_BOUNCE_DAMPING;
    }

    predictions.push({ x: tempX, y: tempY, vx: tempVx, vy: tempVy, time: t });

    if (tempY > GAME_HEIGHT - GROUND_HEIGHT - BALL_RADIUS) {
      tempY = GAME_HEIGHT - GROUND_HEIGHT - BALL_RADIUS;
      tempVy = -tempVy * BALL_BOUNCE_DAMPING;
      break;
    }
  }

  // Game state analysis
  const ballDistanceToOpponentGoal = Math.abs(ball.x - OPPONENT_GOAL_X);
  const ballDistanceToAIGoal = Math.abs(ball.x - AI_GOAL_X);
  const aiDistanceToBall = Math.abs(ai.x - ball.x);
  const ballMovingTowardsAIGoal = ball.vx < -1;
  const ballMovingTowardsOpponentGoal = ball.vx > 1;
  const ballHeight = GAME_HEIGHT - GROUND_HEIGHT - ball.y;

  // Track stuck ball
  if (!ai.lastBallY) ai.lastBallY = ball.y;
  if (!ai.stuckCounter) ai.stuckCounter = 0;

  const ballStuck =
    Math.abs(ball.y - ai.lastBallY) < 5 && Math.abs(ball.vx) < 2;
  if (ballStuck) {
    ai.stuckCounter++;
  } else {
    ai.stuckCounter = 0;
  }
  ai.lastBallY = ball.y;

  // AI decision making
  let targetX = ai.x;
  let shouldJump = false;
  let shouldGrab = false;
  let moveSpeed = SLIME_SPEED;

  // Starting behavior
  if (timeLeft > 58 && gameMode === "1min") {
    const startStrategy = randomFactor;
    if (startStrategy < 0.3) {
      targetX = 150 + randomFactor * 100;
    } else if (startStrategy < 0.7) {
      targetX = FIELD_WIDTH * 0.3 + randomFactor * 100;
    } else {
      targetX = ball.x - 50;
      moveSpeed = SLIME_SPEED * aggressiveness;
    }
  }
  // Offense
  else if (
    ballDistanceToOpponentGoal < ballDistanceToAIGoal * 1.5 ||
    (ball.x > FIELD_WIDTH * 0.35 && !ballMovingTowardsAIGoal)
  ) {
    const directAttackX = ball.x - 30;
    const overheadAttackX = ball.x - 45;
    const underAttackX = ball.x - 20;

    if (ballHeight > 60 && aiDistanceToBall < 150) {
      targetX = overheadAttackX;
    } else if (ballHeight < 30 && aiDistanceToBall < 100) {
      targetX = underAttackX;
    } else {
      targetX = directAttackX + (randomFactor - 0.5) * 20;
    }

    moveSpeed = SLIME_SPEED * 1.2;

    if (aiDistanceToBall < 100) {
      if (ai.stuckCounter > 30) {
        shouldJump = true;
        targetX = ball.x - 40;
      } else if (
        ballHeight < 35 &&
        aiDistanceToBall < 60 &&
        !ai.hasBall &&
        ball.vy > -2
      ) {
        shouldGrab = true;
      } else if (
        (ballHeight > 30 && ballHeight < 90) ||
        (ball.x > FIELD_WIDTH * 0.6 && ballHeight < 120)
      ) {
        if (ai.y >= GAME_HEIGHT - GROUND_HEIGHT - 1) {
          const timeToReachBall = Math.abs(ai.x - ball.x) / SLIME_SPEED;
          const ballHeightWhenReached =
            ball.y +
            ball.vy * timeToReachBall +
            0.5 * GRAVITY * timeToReachBall * timeToReachBall;

          if (
            ballHeightWhenReached > GAME_HEIGHT - GROUND_HEIGHT - 100 &&
            ballHeightWhenReached < GAME_HEIGHT - GROUND_HEIGHT - 20
          ) {
            shouldJump = true;
          }
        }
      }
    }

    if (ai.hasBall) {
      const angleToGoal = Math.atan2(0, OPPONENT_GOAL_X - ai.x);
      if (Math.abs(angleToGoal) < 0.5 || ai.x > FIELD_WIDTH * 0.7) {
        shouldGrab = false;
      }
    }
  }
  // Defense
  else if (ball.x < FIELD_WIDTH * 0.65 || ballMovingTowardsAIGoal) {
    let bestInterceptX = ball.x;

    for (let pred of predictions) {
      if (pred.x < FIELD_WIDTH * 0.4) {
        const timeToReach = Math.abs(ai.x - pred.x) / (SLIME_SPEED * 1.2);
        if (timeToReach <= pred.time + 5) {
          bestInterceptX = pred.x;
          break;
        }
      }
    }

    targetX = bestInterceptX;

    if (ball.x < GOAL_WIDTH * 2.5 && ballMovingTowardsAIGoal) {
      targetX = Math.max(ball.x - 10, SLIME_RADIUS);
      moveSpeed = SLIME_SPEED * 1.3;

      if (aiDistanceToBall < 120 && ballHeight < 100) {
        shouldJump = true;
      }
    }

    if (ai.stuckCounter > 20 && ball.x < FIELD_WIDTH * 0.3) {
      shouldJump = true;
      targetX = ball.x + 30;
    }
  }
  // Midfield
  else {
    const strategies = [
      { x: FIELD_WIDTH * 0.35, weight: 0.3 },
      { x: FIELD_WIDTH * 0.45, weight: 0.4 },
      { x: ball.x - 60, weight: 0.3 },
    ];

    let strategyRoll = randomFactor;
    for (let strategy of strategies) {
      if (strategyRoll < strategy.weight) {
        targetX = strategy.x + (Math.random() - 0.5) * 40;
        break;
      }
      strategyRoll -= strategy.weight;
    }
  }

  // Execute AI actions
  if (shouldGrab && !ai.isGrabbing && ai.y >= GAME_HEIGHT - GROUND_HEIGHT - 1) {
    ai.isGrabbing = true;
  } else if (!shouldGrab) {
    ai.isGrabbing = false;
  }

  const difference = targetX - ai.x;
  const absDistance = Math.abs(difference);

  if (absDistance > 3) {
    const speedMultiplier = Math.min(absDistance / 50, 1.5);
    ai.vx = Math.sign(difference) * moveSpeed * speedMultiplier;
  } else {
    ai.vx = 0;
  }

  if (shouldJump && ai.vy === 0 && !ai.isGrabbing) {
    const jumpVariation = 0.9 + randomFactor * 0.2;
    ai.vy = SLIME_JUMP_POWER * jumpVariation;
  }
}

// Physics update
function updatePhysics() {
  // Update controls
  if (playerMode === "multi") {
    // Multiplayer controls
    if (keys["a"]) gameState.leftSlime.vx = -SLIME_SPEED;
    else if (keys["d"]) gameState.leftSlime.vx = SLIME_SPEED;
    else gameState.leftSlime.vx = 0;

    if (
      keys["w"] &&
      gameState.leftSlime.y >= GAME_HEIGHT - GROUND_HEIGHT - 1 &&
      !gameState.leftSlime.isGrabbing
    ) {
      gameState.leftSlime.vy = SLIME_JUMP_POWER;
    }

    gameState.leftSlime.isGrabbing = keys["s"];

    if (keys["arrowleft"]) gameState.rightSlime.vx = -SLIME_SPEED;
    else if (keys["arrowright"]) gameState.rightSlime.vx = SLIME_SPEED;
    else gameState.rightSlime.vx = 0;

    if (
      keys["arrowup"] &&
      gameState.rightSlime.y >= GAME_HEIGHT - GROUND_HEIGHT - 1 &&
      !gameState.rightSlime.isGrabbing
    ) {
      gameState.rightSlime.vy = SLIME_JUMP_POWER;
    }

    gameState.rightSlime.isGrabbing = keys["arrowdown"];
  } else {
    // Single player controls
    if (keys["arrowleft"]) gameState.rightSlime.vx = -SLIME_SPEED;
    else if (keys["arrowright"]) gameState.rightSlime.vx = SLIME_SPEED;
    else gameState.rightSlime.vx = 0;

    if (
      keys["arrowup"] &&
      gameState.rightSlime.y >= GAME_HEIGHT - GROUND_HEIGHT - 1 &&
      !gameState.rightSlime.isGrabbing
    ) {
      gameState.rightSlime.vy = SLIME_JUMP_POWER;
    }

    gameState.rightSlime.isGrabbing = keys["arrowdown"];

    updateAI();
  }

  // Update slimes
  [gameState.leftSlime, gameState.rightSlime].forEach((slime, index) => {
    slime.vy += GRAVITY;
    slime.x += slime.vx;
    slime.y += slime.vy;

    if (slime.x < SLIME_RADIUS) slime.x = SLIME_RADIUS;
    if (slime.x > GAME_WIDTH - SLIME_RADIUS)
      slime.x = GAME_WIDTH - SLIME_RADIUS;

    if (slime.y > GAME_HEIGHT - GROUND_HEIGHT) {
      slime.y = GAME_HEIGHT - GROUND_HEIGHT;
      slime.vy = 0;
    }

    // Goal line camping check
    const isLeftSlime = index === 0;
    const inOwnGoalArea =
      (isLeftSlime && slime.x < GOAL_WIDTH) ||
      (!isLeftSlime && slime.x > GAME_WIDTH - GOAL_WIDTH);

    if (inOwnGoalArea) {
      slime.goalLineTime += 1 / 60;

      if (slime.goalLineTime >= 1) {
        if (isLeftSlime) {
          score.right++;
        } else {
          score.left++;
        }
        updateScore();
        resetPositions();
      }
    } else {
      slime.goalLineTime = 0;
    }
  });

  // Update ball
  if (gameState.ball.grabbedBy) {
    const grabber =
      gameState.ball.grabbedBy === "left"
        ? gameState.leftSlime
        : gameState.rightSlime;
    const slimeDirection = gameState.ball.grabbedBy === "left" ? 1 : -1;

    gameState.ball.grabAngularVelocity += -grabber.vx * 0.008 * slimeDirection;
    gameState.ball.grabAngularVelocity *= 0.85;
    gameState.ball.grabAngle += gameState.ball.grabAngularVelocity;

    // Constrain angle
    if (gameState.ball.grabbedBy === "left") {
      if (gameState.ball.grabAngle < -Math.PI / 2) {
        gameState.ball.grabAngle = -Math.PI / 2;
        gameState.ball.grabAngularVelocity = 0;
      } else if (gameState.ball.grabAngle > Math.PI / 2) {
        gameState.ball.grabAngle = Math.PI / 2;
        gameState.ball.grabAngularVelocity = 0;
      }
    } else {
      while (gameState.ball.grabAngle < 0)
        gameState.ball.grabAngle += Math.PI * 2;
      while (gameState.ball.grabAngle > Math.PI * 2)
        gameState.ball.grabAngle -= Math.PI * 2;

      if (
        gameState.ball.grabAngle < Math.PI / 2 &&
        gameState.ball.grabAngle >= 0
      ) {
        gameState.ball.grabAngle = Math.PI / 2;
        gameState.ball.grabAngularVelocity = 0;
      } else if (
        gameState.ball.grabAngle > (3 * Math.PI) / 2 ||
        (gameState.ball.grabAngle < Math.PI / 2 && gameState.ball.grabAngle < 0)
      ) {
        gameState.ball.grabAngle = (3 * Math.PI) / 2;
        gameState.ball.grabAngularVelocity = 0;
      }
    }

    const holdDistance = SLIME_RADIUS + BALL_RADIUS - 5;
    gameState.ball.x =
      grabber.x + Math.cos(gameState.ball.grabAngle) * holdDistance;
    gameState.ball.y =
      grabber.y + Math.sin(gameState.ball.grabAngle) * holdDistance;
    gameState.ball.vx = grabber.vx;
    gameState.ball.vy = grabber.vy;

    if (!grabber.isGrabbing) {
      const releaseAngle = gameState.ball.grabAngle;
      const releaseSpeed = Math.abs(gameState.ball.grabAngularVelocity) * 20;
      gameState.ball.vx =
        grabber.vx * 1.5 + Math.cos(releaseAngle) * (3 + releaseSpeed);
      gameState.ball.vy =
        grabber.vy - 2 + Math.sin(releaseAngle) * releaseSpeed * 0.3;
      gameState.ball.grabbedBy = null;
      gameState.ball.grabAngle = 0;
      gameState.ball.grabAngularVelocity = 0;
      grabber.hasBall = false;
    }
  } else {
    gameState.ball.vy += GRAVITY;
    gameState.ball.vx *= BALL_DAMPING;
    gameState.ball.x += gameState.ball.vx;
    gameState.ball.y += gameState.ball.vy;
  }

  // Ball boundaries
  if (gameState.ball.x < BALL_RADIUS) {
    gameState.ball.x = BALL_RADIUS;
    gameState.ball.vx = -gameState.ball.vx * BALL_BOUNCE_DAMPING;
  }
  if (gameState.ball.x > GAME_WIDTH - BALL_RADIUS) {
    gameState.ball.x = GAME_WIDTH - BALL_RADIUS;
    gameState.ball.vx = -gameState.ball.vx * BALL_BOUNCE_DAMPING;
  }

  if (gameState.ball.y > GAME_HEIGHT - GROUND_HEIGHT - BALL_RADIUS) {
    gameState.ball.y = GAME_HEIGHT - GROUND_HEIGHT - BALL_RADIUS;
    gameState.ball.vy = -gameState.ball.vy * BALL_BOUNCE_DAMPING;
  }

  // Goal detection
  if (
    gameState.ball.x <= BALL_RADIUS &&
    gameState.ball.y > GAME_HEIGHT - GROUND_HEIGHT - GOAL_HEIGHT
  ) {
    score.right++;
    updateScore();
    resetPositions();
  } else if (
    gameState.ball.x >= GAME_WIDTH - BALL_RADIUS &&
    gameState.ball.y > GAME_HEIGHT - GROUND_HEIGHT - GOAL_HEIGHT
  ) {
    score.left++;
    updateScore();
    resetPositions();
  }

  if (gameState.ball.y < BALL_RADIUS) {
    gameState.ball.y = BALL_RADIUS;
    gameState.ball.vy = -gameState.ball.vy * BALL_BOUNCE_DAMPING;
  }

  // Ball-slime collision
  [gameState.leftSlime, gameState.rightSlime].forEach((slime, index) => {
    const slimeName = index === 0 ? "left" : "right";
    const otherSlime = index === 0 ? gameState.rightSlime : gameState.leftSlime;
    const dx = gameState.ball.x - slime.x;
    const dy = gameState.ball.y - slime.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < SLIME_RADIUS + BALL_RADIUS) {
      if (gameState.ball.grabbedBy && gameState.ball.grabbedBy !== slimeName) {
        const angle = Math.atan2(dy, dx);
        const speed = Math.sqrt(slime.vx * slime.vx + slime.vy * slime.vy);

        if (speed > 2 || Math.abs(slime.vy) > 5) {
          gameState.ball.grabbedBy = null;
          gameState.ball.grabAngle = 0;
          gameState.ball.grabAngularVelocity = 0;
          otherSlime.hasBall = false;

          gameState.ball.vx = Math.cos(angle) * 8 + slime.vx;
          gameState.ball.vy = Math.sin(angle) * 8 + slime.vy;
        }
      } else if (slime.isGrabbing && !gameState.ball.grabbedBy) {
        gameState.ball.grabbedBy = slimeName;
        gameState.ball.grabAngle = Math.atan2(dy, dx);
        gameState.ball.grabAngularVelocity = 0;
        slime.hasBall = true;
      } else if (!gameState.ball.grabbedBy) {
        const angle = Math.atan2(dy, dx);
        const targetX =
          slime.x + Math.cos(angle) * (SLIME_RADIUS + BALL_RADIUS);
        const targetY =
          slime.y + Math.sin(angle) * (SLIME_RADIUS + BALL_RADIUS);

        if (gameState.ball.y < slime.y || Math.abs(angle) < Math.PI * 0.5) {
          gameState.ball.x = targetX;
          gameState.ball.y = targetY;

          const speed = Math.sqrt(
            gameState.ball.vx * gameState.ball.vx +
              gameState.ball.vy * gameState.ball.vy
          );
          gameState.ball.vx = Math.cos(angle) * speed * 1.5 + slime.vx * 0.5;
          gameState.ball.vy = Math.sin(angle) * speed * 1.5 + slime.vy * 0.5;

          const newSpeed = Math.sqrt(
            gameState.ball.vx * gameState.ball.vx +
              gameState.ball.vy * gameState.ball.vy
          );
          if (newSpeed > MAX_BALL_SPEED) {
            const scale = MAX_BALL_SPEED / newSpeed;
            gameState.ball.vx *= scale;
            gameState.ball.vy *= scale;
          }
        }
      }
    }
  });
}

// Drawing
function draw() {
  // Clear canvas
  ctx.fillStyle = "#0000FF";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Draw ground
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);

  // Draw goals
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 3;

  // Left goal
  ctx.beginPath();
  ctx.moveTo(0, GAME_HEIGHT - GROUND_HEIGHT);
  ctx.lineTo(GOAL_WIDTH, GAME_HEIGHT - GROUND_HEIGHT);
  ctx.moveTo(GOAL_WIDTH / 2, GAME_HEIGHT - GROUND_HEIGHT);
  ctx.lineTo(GOAL_WIDTH / 2, GAME_HEIGHT - GROUND_HEIGHT - GOAL_HEIGHT);
  ctx.stroke();

  // Left goal net
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  for (let i = 0; i < GOAL_WIDTH / 2; i += 10) {
    ctx.beginPath();
    ctx.moveTo(i, GAME_HEIGHT - GROUND_HEIGHT - GOAL_HEIGHT);
    ctx.lineTo(i, GAME_HEIGHT - GROUND_HEIGHT);
    ctx.stroke();
  }
  for (
    let j = GAME_HEIGHT - GROUND_HEIGHT - GOAL_HEIGHT;
    j <= GAME_HEIGHT - GROUND_HEIGHT;
    j += 10
  ) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(GOAL_WIDTH / 2, j);
    ctx.stroke();
  }

  // Right goal
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(GAME_WIDTH - GOAL_WIDTH, GAME_HEIGHT - GROUND_HEIGHT);
  ctx.lineTo(GAME_WIDTH, GAME_HEIGHT - GROUND_HEIGHT);
  ctx.moveTo(GAME_WIDTH - GOAL_WIDTH / 2, GAME_HEIGHT - GROUND_HEIGHT);
  ctx.lineTo(
    GAME_WIDTH - GOAL_WIDTH / 2,
    GAME_HEIGHT - GROUND_HEIGHT - GOAL_HEIGHT
  );
  ctx.stroke();

  // Right goal net
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  for (let i = GAME_WIDTH - GOAL_WIDTH / 2; i <= GAME_WIDTH; i += 10) {
    ctx.beginPath();
    ctx.moveTo(i, GAME_HEIGHT - GROUND_HEIGHT - GOAL_HEIGHT);
    ctx.lineTo(i, GAME_HEIGHT - GROUND_HEIGHT);
    ctx.stroke();
  }
  for (
    let j = GAME_HEIGHT - GROUND_HEIGHT - GOAL_HEIGHT;
    j <= GAME_HEIGHT - GROUND_HEIGHT;
    j += 10
  ) {
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH - GOAL_WIDTH / 2, j);
    ctx.lineTo(GAME_WIDTH, j);
    ctx.stroke();
  }

  // Draw goal line timers
  const drawGoalLineTimer = (slime, goalX, goalWidth) => {
    if (slime.goalLineTime > 0) {
      const percentage = 1 - slime.goalLineTime / 1;
      const timerWidth = goalWidth * percentage;

      ctx.strokeStyle = percentage > 0.3 ? "#FFFF00" : "#FF0000";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(goalX, GAME_HEIGHT - GROUND_HEIGHT + 10);
      ctx.lineTo(goalX + timerWidth, GAME_HEIGHT - GROUND_HEIGHT + 10);
      ctx.stroke();
    }
  };

  if (gameState.leftSlime.x < GOAL_WIDTH) {
    drawGoalLineTimer(gameState.leftSlime, 0, GOAL_WIDTH);
  }
  if (gameState.rightSlime.x > GAME_WIDTH - GOAL_WIDTH) {
    drawGoalLineTimer(
      gameState.rightSlime,
      GAME_WIDTH - GOAL_WIDTH,
      GOAL_WIDTH
    );
  }

  // Draw slimes
  const drawSlime = (slime, isRightSlime, color, accentColor) => {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(slime.x, slime.y, SLIME_RADIUS, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // Accent stripe
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(slime.x, slime.y, SLIME_RADIUS - 5, Math.PI + 0.3, Math.PI + 0.7);
    ctx.arc(
      slime.x,
      slime.y,
      SLIME_RADIUS - 15,
      Math.PI + 0.7,
      Math.PI + 0.3,
      true
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Draw eye
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    const eyeXOffset = isRightSlime ? -SLIME_RADIUS * 0.3 : SLIME_RADIUS * 0.3;
    ctx.arc(
      slime.x + eyeXOffset,
      slime.y - SLIME_RADIUS * 0.3,
      5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    const pupilXOffset = isRightSlime
      ? -SLIME_RADIUS * 0.35
      : SLIME_RADIUS * 0.35;
    ctx.arc(
      slime.x + pupilXOffset,
      slime.y - SLIME_RADIUS * 0.3,
      2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  };

  drawSlime(gameState.leftSlime, false, "#00CED1", "#008B8B");
  drawSlime(gameState.rightSlime, true, "#DC143C", "#8B0000");

  // Draw ball
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.arc(gameState.ball.x, gameState.ball.y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

// Game loop
function gameLoop(timestamp) {
  if (!gameStarted) return;

  if (!lastTimestamp) lastTimestamp = timestamp;
  const deltaTime = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  updatePhysics();
  draw();

  animationId = requestAnimationFrame(gameLoop);
}
