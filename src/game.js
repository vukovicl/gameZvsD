// --- Get DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const score1Element = document.getElementById('score1');
const score2Element = document.getElementById('score2');
const p2ScoreDisplay = document.getElementById('p2ScoreDisplay');
const menuDiv = document.getElementById('menu');
const gameAreaDiv = document.getElementById('gameArea');
const singlePlayerBtn = document.getElementById('singlePlayerBtn');
const vs1Btn = document.getElementById('1v1Btn');
const controlsInfo = document.getElementById('controlsInfo');

// --- Game State & Constants ---
let score1 = 0;
let score2 = 0;
let gameMode = 'menu'; // 'menu', 'single', '1v1'
let gameState = 'waiting'; // 'waiting', 'playing', 'exploding', 'gameOver', 'winner'
let winner = null; // Stores the winning player object in 1v1
let explosionParticles = [];

const ROTTEN_TIME_LIMIT = 10000; // 10 seconds
const SICKNESS_DURATION = 3000; // 3 seconds
const WIN_SCORE = 10; // Score needed to win in 1v1 or explode in single

// --- Player Objects ---
const player1 = {
    name: "Željko Kovačević",
    x: canvas.width / 4, // Start on left
    y: canvas.height / 2 - 40,
    width: 50,
    height: 50,
    bellyRadius: 35,
    speed: 5,
    color: 'blue',
    bellyColor: 'lightblue',
    visible: true,
    isSick: false,
    sicknessStartTime: 0,
    // ***** FIX: Use lowercase keys to match listener *****
    keys: { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' }
};
const SICK_COLOR_P1 = 'darkolivegreen';
const SICK_BELLY_COLOR_P1 = 'lightgreen';

const player2 = {
    name: "Davor Cafuta",
    x: (canvas.width / 4) * 3 - 40, // Start on right
    y: canvas.height / 2 - 20, // Adjusted start y
    width: 40,
    height: 60,
    speed: 5,
    color: 'red',
    visible: true,
    isSick: false,
    sicknessStartTime: 0,
    keys: { up: 'w', down: 's', left: 'a', right: 'd' } // WASD keys (already lowercase)
};
const SICK_COLOR_P2 = 'darkseagreen';


// Item (Ćevap) properties - shared
const cevap = {
    x: Math.random() * (canvas.width - 20),
    y: Math.random() * (canvas.height - 10),
    width: 20,
    height: 10,
    color: '#8B4513',
    visible: true,
    isRotten: false,
    spawnTime: Date.now()
};
const ROTTEN_COLOR = '#556B2F';

// --- Input Handling ---
// ***** FIX: Declare keysPressed with let *****
let keysPressed = {};

window.addEventListener('keydown', (e) => {
    // Ignore case for key storage
    const key = e.key.toLowerCase();
    if (gameState === 'playing') {
        keysPressed[key] = true;
    }
     // Allow refresh on game over screens
     if ((gameState === 'gameOver' || gameState === 'winner') && key === 'f5') {
         window.location.reload();
     }
});

window.addEventListener('keyup', (e) => {
    // Ignore case for key storage
    const key = e.key.toLowerCase();
    keysPressed[key] = false;
});

// --- Mode Selection Logic ---
singlePlayerBtn.addEventListener('click', () => {
    gameMode = 'single';
    startGame();
});

vs1Btn.addEventListener('click', () => {
    gameMode = '1v1';
    p2ScoreDisplay.style.display = 'inline'; // Show P2 score
    controlsInfo.textContent = "Željko: Strelice | Davor: WASD";
    startGame();
});

function startGame() {
    menuDiv.style.display = 'none';
    gameAreaDiv.style.display = 'flex'; // Show game area using flex
    gameState = 'playing';
    score1 = 0;
    score2 = 0;
    score1Element.textContent = score1;
    score2Element.textContent = score2;
    player1.visible = true;
    player1.isSick = false;
    player1.x = canvas.width / 4;
    player1.y = canvas.height / 2 - 40;
    keysPressed = {}; // Reset keys at start

    if (gameMode === '1v1') {
        player2.visible = true;
        player2.isSick = false;
        player2.x = (canvas.width / 4) * 3 - player2.width; // Reset pos
        player2.y = canvas.height / 2 - (player2.height / 2); // Reset pos
    } else {
         // Ensure Player 2 score display is hidden if switching back from 1v1
         p2ScoreDisplay.style.display = 'none';
         controlsInfo.textContent = "Koristi strelice (Arrow Keys) za kretanje.";
    }

    resetCevap();
    gameLoop(); // Start the actual game animation loop
}


// --- Drawing Functions ---

function drawPlayer(p) {
    if (!p.visible) return;

    let currentBodyColor = p.color;
    let currentBellyColor = p.bellyColor; // Only used if p has bellyRadius
    let currentFaceColor = 'black';
    let sickColor = (p === player1) ? SICK_COLOR_P1 : SICK_COLOR_P2;
    let sickBellyColor = (p === player1) ? SICK_BELLY_COLOR_P1 : SICK_BELLY_COLOR_P1; // Use P1 belly sick color for consistency or make specific for P2 if needed

    if (p.isSick) {
        currentBodyColor = sickColor;
        if (p.bellyRadius) currentBellyColor = sickBellyColor;
        currentFaceColor = 'darkgreen';
    }

    ctx.fillStyle = currentBodyColor;
    ctx.fillRect(p.x, p.y, p.width, p.height);

    if (p.bellyRadius) { // Draw Željko's belly
        ctx.beginPath();
        const bellyCenterX = p.x + p.width / 2;
        const bellyCenterY = p.y + p.height / 1.5;
        ctx.arc(bellyCenterX, bellyCenterY, p.bellyRadius, 0, Math.PI * 2);
        ctx.fillStyle = currentBellyColor;
        ctx.fill();
        ctx.closePath();
    }

    // Draw face
    ctx.fillStyle = currentFaceColor;
    ctx.fillRect(p.x + p.width * 0.3, p.y + p.height * 0.2, 5, 5); // Eye 1
    ctx.fillRect(p.x + p.width * 0.6, p.y + p.height * 0.2, 5, 5); // Eye 2

    ctx.beginPath();
    const mouthX = p.x + p.width / 2;
    const mouthY = p.y + p.height * 0.6;
    const mouthRadius = p.width * 0.2;
    if (p.isSick) { // Frown
        ctx.arc(mouthX, mouthY + mouthRadius * 0.5, mouthRadius, Math.PI, Math.PI * 2);
    } else { // Smile
        ctx.arc(mouthX, mouthY, mouthRadius, 0, Math.PI);
    }
    ctx.strokeStyle = currentFaceColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
}


function drawCevap() {
    if (cevap.visible) {
        ctx.fillStyle = cevap.isRotten ? ROTTEN_COLOR : cevap.color;
        ctx.fillRect(cevap.x, cevap.y, cevap.width, cevap.height);

        if (!cevap.isRotten && gameState === 'playing') {
             const timeElapsed = Date.now() - cevap.spawnTime;
             const timeRemainingRatio = Math.max(0, 1 - (timeElapsed / ROTTEN_TIME_LIMIT));
             if (timeRemainingRatio > 0) {
                 ctx.fillStyle = 'lightcoral';
                 ctx.fillRect(cevap.x, cevap.y - 5, cevap.width, 3);
                 ctx.fillStyle = 'mediumseagreen';
                 ctx.fillRect(cevap.x, cevap.y - 5, cevap.width * timeRemainingRatio, 3);
             }
        }
    }
}

// --- Game Logic Functions ---

function updatePlayerPosition(p) {
    // Checks lowercase keys defined in player objects against lowercase keys stored in keysPressed
    if (keysPressed[p.keys.up]) p.y -= p.speed;
    if (keysPressed[p.keys.down]) p.y += p.speed;
    if (keysPressed[p.keys.left]) p.x -= p.speed;
    if (keysPressed[p.keys.right]) p.x += p.speed;

    // Boundary detection
    const bottomMargin = p.bellyRadius ? (p.bellyRadius - p.height / 1.5) : 0; // Approx belly offset
    const bottomBoundary = canvas.height - p.height - bottomMargin;

    if (p.x < 0) p.x = 0;
    if (p.x + p.width > canvas.width) p.x = canvas.width - p.width;
    if (p.y < 0) p.y = 0;
    if (p.y > bottomBoundary) p.y = bottomBoundary;
}


function checkCevapRot() {
    if (!cevap.isRotten && cevap.visible) {
        if (Date.now() - cevap.spawnTime >= ROTTEN_TIME_LIMIT) {
            cevap.isRotten = true;
        }
    }
}

function checkSickness(p) {
    if (p.isSick && Date.now() - p.sicknessStartTime >= SICKNESS_DURATION) {
        p.isSick = false;
    }
}

function detectCollision(p) {
    if (!p.visible || !cevap.visible) return false;

    const pLeft = p.x;
    const pRight = p.x + p.width;
    const pTop = p.y;
    const pBottom = p.bellyRadius ? p.y + p.height + p.bellyRadius / 2 : p.y + p.height; // Approx belly collision

    const cLeft = cevap.x;
    const cRight = cevap.x + cevap.width;
    const cTop = cevap.y;
    const cBottom = cevap.y + cevap.height;

    return pLeft < cRight && pRight > cLeft && pTop < cBottom && pBottom > cTop;
}

function resetCevap() {
    cevap.x = Math.random() * (canvas.width - cevap.width);
    cevap.y = Math.random() * (canvas.height - cevap.height);
    cevap.visible = true;
    cevap.isRotten = false;
    cevap.spawnTime = Date.now();
}

function handleCollision(collidingPlayer) {
    if (cevap.isRotten) {
        collidingPlayer.isSick = true;
        collidingPlayer.sicknessStartTime = Date.now();
    } else {
        // Eaten a fresh ćevap
        if (collidingPlayer === player1) {
            score1++;
            score1Element.textContent = score1;
            if (gameMode === 'single' && score1 >= WIN_SCORE) {
                gameState = 'exploding';
                startExplosion(player1);
                return;
            } else if (gameMode === '1v1' && score1 >= WIN_SCORE) {
                gameState = 'winner';
                winner = player1;
                keysPressed = {}; // Stop input on win
                return;
            }
        } else if (collidingPlayer === player2 && gameMode === '1v1') {
            score2++;
            score2Element.textContent = score2;
             if (score2 >= WIN_SCORE) {
                gameState = 'winner';
                winner = player2;
                keysPressed = {}; // Stop input on win
                return;
            }
        }
    }
    // Reset only if no game-ending condition was met
    resetCevap();
}


// --- Explosion Functions ---

function createParticle(x, y, p) {
    const size = Math.random() * 5 + 2;
    const speed = Math.random() * 4 + 1;
    const angle = Math.random() * Math.PI * 2;
    const baseColors = ['red', 'orange', 'yellow', 'darkred', p.color, p.bellyColor].filter(c => c);
    const sickColors = [p === player1 ? SICK_COLOR_P1 : SICK_COLOR_P2, p === player1 ? SICK_BELLY_COLOR_P1 : null].filter(c => c);
    const colors = p.isSick ? [...baseColors, ...sickColors] : baseColors;

    return {
        x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        radius: size, color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0, decay: Math.random() * 0.01 + 0.01
    };
}

function startExplosion(p) {
    p.visible = false;
    cevap.visible = false;
    keysPressed = {}; // Reset keys using the new 'let' declaration

    const centerX = p.x + p.width / 2;
    const centerY = p.bellyRadius ? p.y + p.height / 1.5 : p.y + p.height / 2;
    const numParticles = 100;
    explosionParticles = [];

    for (let i = 0; i < numParticles; i++) {
        explosionParticles.push(createParticle(centerX, centerY, p));
    }
}

function updateAndDrawExplosion() {
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i];
        p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;

        if (p.alpha > 0) {
            ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.closePath();
            ctx.globalAlpha = 1.0;
        } else {
            explosionParticles.splice(i, 1);
        }
    }
    if (explosionParticles.length === 0 && gameState === 'exploding') {
        gameState = 'gameOver';
    }
}

// --- End Screens ---
function drawGameOverScreen() { // Single player
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '48px sans-serif'; ctx.fillStyle = 'white'; ctx.textAlign = 'center';
    ctx.fillText('KABOOM!', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '24px sans-serif';
    ctx.fillText('Željko je pojeo previše ćevapa!', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(`Konačni rezultat: ${score1}`, canvas.width / 2, canvas.height / 2 + 50);
    ctx.font = '18px sans-serif';
    ctx.fillText('Osvježi stranicu (F5) za ponovnu igru.', canvas.width / 2, canvas.height / 2 + 100);
}

function drawWinnerScreen() { // 1v1
    // Background based on winner's base color (not sick color)
    ctx.fillStyle = winner.color;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;

    ctx.font = '48px sans-serif'; ctx.fillStyle = 'white'; ctx.textAlign = 'center';
    ctx.fillText('POBJEDNIK!', canvas.width / 2, canvas.height / 2 - 60);
    ctx.font = '36px sans-serif';
    // Add stroke for better readability on potentially light backgrounds
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeText(`${winner.name}`, canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText(`${winner.name}`, canvas.width / 2, canvas.height / 2 - 10);

    ctx.font = '24px sans-serif';
    ctx.strokeText(`Rezultat: ${score1} - ${score2}`, canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText(`Rezultat: ${score1} - ${score2}`, canvas.width / 2, canvas.height / 2 + 40);

    ctx.font = '18px sans-serif';
    ctx.strokeText('Osvježi stranicu (F5) za ponovnu igru.', canvas.width / 2, canvas.height / 2 + 100);
    ctx.fillText('Osvježi stranicu (F5) za ponovnu igru.', canvas.width / 2, canvas.height / 2 + 100);
     ctx.lineWidth = 1; // Reset line width
}

// --- Main Game Loop ---
let animationFrameId = null; // To potentially stop the loop if needed

function gameLoop() {
    // 1. Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Handle Game States
    if (gameState === 'playing') {
        checkCevapRot();
        checkSickness(player1);
        if (gameMode === '1v1') checkSickness(player2);

        updatePlayerPosition(player1);
        if (gameMode === '1v1') updatePlayerPosition(player2);

        // Check Collisions only if still playing
        if (gameState === 'playing') {
            let p1Collided = detectCollision(player1);
            let p2Collided = (gameMode === '1v1') ? detectCollision(player2) : false;

            if (p1Collided) {
                handleCollision(player1); // This might change gameState
            } else if (p2Collided) {
                 handleCollision(player2); // This might change gameState
            }
        }

        // Draw elements only if state didn't change mid-frame
        if (gameState === 'playing') {
            drawCevap();
            drawPlayer(player1);
            if (gameMode === '1v1') drawPlayer(player2);
        }

    } else if (gameState === 'exploding') {
        updateAndDrawExplosion();
        // Optionally draw static elements underneath if desired

    } else if (gameState === 'gameOver') {
        drawGameOverScreen();
        cancelAnimationFrame(animationFrameId); // Stop the loop
        return; // Exit loop

    } else if (gameState === 'winner') {
        drawWinnerScreen();
        cancelAnimationFrame(animationFrameId); // Stop the loop
        return; // Exit loop
    }

    // 3. Request Next Frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Initial Setup ---
console.log("Odaberi način igre.");
// Event listeners handle starting the game via startGame() -> gameLoop()
