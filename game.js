const GRID_SIZE = 20;
const MINE_COUNT = 60;
let grid = [];
let mines = new Set();
let points = 0;
let timer = 0;
let timerInterval;
let flagsRemaining = MINE_COUNT;
let gameActive = false;
let doubleClickEnabled = true;
let totalPoints = localStorage.getItem('minesweeperPoints') ? parseInt(localStorage.getItem('minesweeperPoints')) : 0;
let hintsRemaining = 3;
let undoAvailable = true;
let smallBombAvailable = true;
let smallBombUsedThisGame = false;

// First, clear any existing content and create basic HTML structure
document.body.innerHTML = `
    <div id="game-wrapper" style="text-align: center; padding: 20px;">
        <div id="controls" style="margin-bottom: 20px;">
            <button id="toggle-double-click">Disable Double Click</button>
            <button id="new-game">New Game</button>
            <button id="hint">Hint (3)</button>
        </div>
        
        <div id="game-info" style="margin-bottom: 10px;">
            <span id="mine-count">Mines: 60</span>
            <span id="flag-count">Flags: 60</span>
        </div>
        
        <div id="points-info" style="margin-bottom: 20px;">
            <div id="total-points" style="font-size: 18px; margin-bottom: 10px;">Total Points: 0</div>
            <div id="powerups" style="margin-bottom: 10px;">
                <button id="buy-extra-flag" class="power-button" style="margin: 0 5px;">Buy Extra Flag (200 pts)</button>
                <button id="buy-reveal-mine" class="power-button" style="margin: 0 5px;">Reveal Mine (500 pts)</button>
                <button id="undo-mine" class="power-button" style="margin: 0 5px;">Undo Mine (999 points)</button>
            </div>
        </div>
        
        <div id="grid" style="display: inline-block; margin: 0 auto;"></div>
        
        <div id="game-stats" style="margin-top: 20px;">
            <div id="timer">Time: 0s</div>
            <div id="points">Points: 0</div>
        </div>
    </div>
`;

// Add CSS styles
const styles = `
    .cell {
        width: 30px;
        height: 30px;
        background: #ccc;
        border: 1px solid #999;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-weight: bold;
    }
    .cell.revealed {
        background: #eee;
    }
    .cell.mine {
        background: red;
    }
    .cell.triggering-mine {
        background: yellow !important;  /* Yellow background for the mine that was hit */
    }
    .cell.flagged {
        background: #ccc;
    }
    .power-button {
        background: #5cb85c;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
    }
    .power-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Add this function to create mobile controls
function createMobileControls() {
    // Remove ALL existing mobile controls
    const allExistingControls = document.querySelectorAll('#mobile-controls');
    allExistingControls.forEach(control => control.remove());

    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'mobile-controls';
    controlsDiv.style.marginBottom = '10px';  // Add some spacing
    
    // Create ONLY Flag and Reveal buttons
    const flagBtn = document.createElement('button');
    flagBtn.textContent = '🚩 Flag';
    flagBtn.className = 'mobile-control-btn';
    flagBtn.style.padding = '10px 20px';
    flagBtn.style.margin = '0 5px';
    flagBtn.style.backgroundColor = '#4CAF50';
    flagBtn.style.color = 'white';
    flagBtn.style.border = 'none';
    flagBtn.style.borderRadius = '5px';

    const revealBtn = document.createElement('button');
    revealBtn.textContent = '🔍 Reveal';
    revealBtn.className = 'mobile-control-btn';
    revealBtn.style.padding = '10px 20px';
    revealBtn.style.margin = '0 5px';
    revealBtn.style.backgroundColor = '#45a049';
    revealBtn.style.color = 'white';
    revealBtn.style.border = 'none';
    revealBtn.style.borderRadius = '5px';

    const bombBtn = document.createElement('button');
    bombBtn.textContent = '💣 Small Bomb';
    bombBtn.className = 'mobile-control-btn';
    bombBtn.style.padding = '10px 20px';
    bombBtn.style.margin = '0 5px';
    bombBtn.style.backgroundColor = '#4CAF50';
    bombBtn.style.color = 'white';
    bombBtn.style.border = 'none';
    bombBtn.style.borderRadius = '5px';

    let currentMode = 'reveal';

    // Flag button handler
    flagBtn.addEventListener('click', () => {
        currentMode = 'flag';
        flagBtn.style.backgroundColor = '#45a049';
        revealBtn.style.backgroundColor = '#4CAF50';
        bombBtn.style.backgroundColor = '#4CAF50';
        console.log('Mode switched to: flag');
    });

    // Reveal button handler
    revealBtn.addEventListener('click', () => {
        currentMode = 'reveal';
        revealBtn.style.backgroundColor = '#45a049';
        flagBtn.style.backgroundColor = '#4CAF50';
        bombBtn.style.backgroundColor = '#4CAF50';
        console.log('Mode switched to: reveal');
    });

    // Bomb button handler
    bombBtn.addEventListener('click', () => {
        if (smallBombUsedThisGame) {
            alert('Small Bomb has already been used in this game');
            return;
        }
        if (totalPoints < 599) {
            alert('Not enough points! Need 599 points to use Small Bomb');
            return;
        }
        currentMode = 'bomb';
        bombBtn.style.backgroundColor = '#45a049';
        flagBtn.style.backgroundColor = '#4CAF50';
        revealBtn.style.backgroundColor = '#4CAF50';
        console.log('Mode switched to: bomb');
    });

    // Add all three buttons
    controlsDiv.appendChild(flagBtn);
    controlsDiv.appendChild(revealBtn);
    controlsDiv.appendChild(bombBtn);

    // Add controls to the game wrapper at the top
    const gameWrapper = document.getElementById('game-wrapper');
    if (gameWrapper) {
        gameWrapper.insertBefore(controlsDiv, gameWrapper.firstChild);
    }

    return {
        getMode: () => currentMode
    };
}

function createGrid() {
    const gridElement = document.getElementById('grid');
    gridElement.style.display = 'grid';
    gridElement.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 30px)`;
    gridElement.style.gap = '1px';
    gridElement.style.backgroundColor = '#999';
    gridElement.style.padding = '1px';
    gridElement.style.border = '2px solid #666';
    
    gridElement.innerHTML = '';
    grid = [];

    const mobileControls = createMobileControls();

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;

        let pressTimer;
        let isTouching = false;
        let lastTap = 0;

        function handleLongPress(e) {
            if (!doubleClickEnabled) return; // Exit if double click is disabled
            if (cell.classList.contains('revealed')) {
                console.log('Long press on revealed cell, double click enabled:', doubleClickEnabled);
                handleDoubleClick(cell);
            } else {
                handleRightClick(e, cell);
            }
        }

        cell.addEventListener('touchstart', function(e) {
            e.preventDefault();
            isTouching = true;
            
            pressTimer = setTimeout(() => {
                if (isTouching) {
                    handleLongPress(e);
                }
            }, 500);
        });

        cell.addEventListener('touchend', function(e) {
            e.preventDefault();
            isTouching = false;
            clearTimeout(pressTimer);

            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;

            if (tapLength < 300 && tapLength > 0 && doubleClickEnabled) {
                if (cell.classList.contains('revealed')) {
                    console.log('Double tap on revealed cell, double click enabled:', doubleClickEnabled);
                    handleDoubleClick(cell);
                }
            } else {
                const mode = mobileControls.getMode();
                switch(mode) {
                    case 'bomb':
                        if (smallBombUsedThisGame) {
                            alert('Small Bomb has already been used in this game');
                            return;
                        }
                        if (totalPoints < 599) {
                            alert('Not enough points! Need 599 points to use Small Bomb');
                            return;
                        }
                        useSmallBomb(cell);
                        break;
                    case 'flag':
                        handleRightClick(e, cell);
                        break;
                    case 'reveal':
                        handleClick(cell);
                        break;
                }
            }
            lastTap = currentTime;
        });

        cell.addEventListener('touchcancel', function(e) {
            e.preventDefault();
            isTouching = false;
            clearTimeout(pressTimer);
        });

        cell.addEventListener('click', (e) => {
            e.preventDefault();
            const mode = mobileControls.getMode();
            
            switch(mode) {
                case 'bomb':
                    if (smallBombUsedThisGame) {
                        alert('Small Bomb has already been used in this game');
                        return;
                    }
                    if (totalPoints < 599) {
                        alert('Not enough points! Need 599 points to use Small Bomb');
                        return;
                    }
                    useSmallBomb(cell);
                    break;
                case 'flag':
                    handleRightClick(e, cell);
                    break;
                case 'reveal':
                    handleClick(cell);
                    break;
            }
        });

        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            handleRightClick(e, cell);
        });

        gridElement.appendChild(cell);
        grid[i] = cell;
    }
}

// Initialize the game when the page loads
window.onload = () => {
    initializeGame();
    setupPowerupButtons();
    setupDoubleClickToggle();
    setupHintButton();
    setupUndoButton();
    setupSmallBombButton();
    setupInstantLossButton();
};

function setupDoubleClickToggle() {
    const toggleButton = document.getElementById('toggle-double-click');
    toggleButton.addEventListener('click', () => {
        doubleClickEnabled = !doubleClickEnabled;
        toggleButton.textContent = doubleClickEnabled ? 'Disable Double Click' : 'Enable Double Click';
        console.log('Double click is now:', doubleClickEnabled);
    });
}

function initializeGame() {
    gameActive = true;
    mines.clear();
    flagsRemaining = MINE_COUNT;
    points = 0;
    hintsRemaining = 3;
    undoAvailable = true;
    smallBombAvailable = true;  // Reset small bomb availability
    smallBombUsedThisGame = false;  // Reset the per-game usage flag
    
    // Remove any existing controls before creating new ones
    const allExistingControls = document.querySelectorAll('#mobile-controls');
    allExistingControls.forEach(control => control.remove());
    
    createGrid();
    console.log('About to place mines...');
    placeMines();  // Place mines
    console.log(`After placing mines. Mine count: ${mines.size}`);
    updateDisplay();
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    timer = 0;
    timerInterval = setInterval(() => {
        timer++;
        updateDisplay();
    }, 1000);
}

function placeMines() {
    mines.clear(); // Clear existing mines first
    console.log('Placing mines...');
    while (mines.size < MINE_COUNT) {
        const index = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
        mines.add(index);
        console.log(`Added mine at index ${index}. Total mines: ${mines.size}`);
    }
    console.log('Final mine positions:', Array.from(mines));
}

function handleClick(cell) {
    if (!gameActive) return;
    const index = parseInt(cell.dataset.index);
    
    if (cell.classList.contains('flagged')) return;
    
    if (mines.has(index)) {
        if (totalPoints >= 999 && undoAvailable) {
            const useUndo = confirm('You hit a mine! Would you like to use Undo Mine for 999 points to save yourself? (Can only be used once per game)');
            if (useUndo) {
                totalPoints -= 999;
                undoAvailable = false;
                localStorage.setItem('minesweeperPoints', totalPoints);
                alert('Undo power used! You were saved from a mine! 🛡️\n-999 points');
                mines.delete(index);
                revealCell(cell);
                updateDisplay();
                updateUndoButton();
            } else {
                cell.classList.add('mine');
                cell.classList.add('triggering-mine');
                endGame(false);
            }
        } else {
            cell.classList.add('mine');
            cell.classList.add('triggering-mine');
            endGame(false);
        }
    } else {
        revealCell(cell);
    }
}

function revealCell(cell) {
    if (cell.classList.contains('revealed') || cell.classList.contains('flagged')) return;
    
    const index = parseInt(cell.dataset.index);
    cell.classList.add('revealed');
    const adjacentMines = getAdjacentMines(index);
    
    points += 10;
    totalPoints += 10;
    localStorage.setItem('minesweeperPoints', totalPoints);
    
    if (adjacentMines > 0) {
        cell.textContent = adjacentMines;
        cell.classList.add(`number-${adjacentMines}`);
    } else {
        const row = Math.floor(index / GRID_SIZE);
        const col = index % GRID_SIZE;
        
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const newRow = row + i;
                const newCol = col + j;
                if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
                    const newIndex = newRow * GRID_SIZE + newCol;
                    const adjacentCell = grid[newIndex];
                    if (!adjacentCell.classList.contains('revealed')) {
                        revealCell(adjacentCell);
                    }
                }
            }
        }
    }
    updateDisplay();
    checkWin();
}

function handleRightClick(e, cell) {
    e.preventDefault();
    if (!gameActive) return;
    
    if (cell.classList.contains('revealed')) return;
    
    if (cell.classList.contains('flagged')) {
        cell.classList.remove('flagged');
        flagsRemaining++;
    } else {
        if (flagsRemaining > 0) {
            cell.classList.add('flagged');
            flagsRemaining--;
        } else {
            alert('No flags remaining!');
        }
    }
    
    updateDisplay();
}

function getAdjacentMines(index) {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    let count = 0;
    
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const newRow = row + i;
            const newCol = col + j;
            if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
                const newIndex = newRow * GRID_SIZE + newCol;
                if (mines.has(newIndex)) {
                    count++;
                }
            }
        }
    }
    return count;
}

function startTimer() {
    clearInterval(timerInterval);
    timer = 0;
    timerInterval = setInterval(() => {
        timer++;
        updateDisplay();
    }, 1000);
}

function updateDisplay() {
    document.getElementById('timer').textContent = `Time: ${timer}s`;
    document.getElementById('points').textContent = `Points: ${points}`;
    document.getElementById('flag-count').textContent = `Flags: ${flagsRemaining}`;
    document.getElementById('total-points').textContent = `Total Points: ${totalPoints}`;
    document.getElementById('mine-count').textContent = `Mines: ${MINE_COUNT}`;
    updateHintButton();
    updateUndoButton();
    updateSmallBombButton();
}

function setupPowerupButtons() {
    document.getElementById('buy-extra-flag').addEventListener('click', () => {
        if (totalPoints >= 200) {
            totalPoints -= 200;
            localStorage.setItem('minesweeperPoints', totalPoints);
            flagsRemaining++;
            updateDisplay();
        }
    });
    
    document.getElementById('buy-reveal-mine').addEventListener('click', () => {
        if (totalPoints >= 500) {
            totalPoints -= 500;
            localStorage.setItem('minesweeperPoints', totalPoints);
            revealRandomMine();
            updateDisplay();
        }
    });
}

function revealRandomMine() {
    if (totalPoints < 500) return;
    
    const unrevealedMines = Array.from(mines).filter(index => 
        !grid[index].classList.contains('revealed') && 
        !grid[index].classList.contains('flagged')
    );
    
    if (unrevealedMines.length === 0) {
        alert('No unrevealed mines to show!');
        return;
    }
    
    const randomMine = unrevealedMines[Math.floor(Math.random() * unrevealedMines.length)];
    const mineCell = grid[randomMine];
    
    // Add flagged class instead of revealing the mine
    mineCell.classList.add('flagged');
    flagsRemaining--;
    
    totalPoints -= 500;
    localStorage.setItem('minesweeperPoints', totalPoints);
    updateDisplay();
}

function endGame(won) {
    gameActive = false;
    clearInterval(timerInterval);

    // Reveal all cells when game ends
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const cell = grid[i];
        
        if (mines.has(i)) {
            // Show all mines
            cell.classList.add('mine');
            cell.classList.remove('flagged');  // Remove flag if it was flagged
        } else {
            // Reveal all safe cells
            if (!cell.classList.contains('revealed')) {
                cell.classList.add('revealed');
                const adjacentMines = getAdjacentMines(i);
                if (adjacentMines > 0) {
                    cell.textContent = adjacentMines;
                    cell.classList.add(`number-${adjacentMines}`);
                }
            }
        }
    }

    // Show game over message
    if (won) {
        alert('Congratulations! You won! 🎉');
    } else {
        alert('Game Over! 💥');
    }
}

function handleDoubleClick(cell) {
    console.log('Double click/tap function called');  // Debug log
    if (!gameActive || !cell.classList.contains('revealed')) {
        console.log('Cell not eligible for double click');  // Debug log
        return;
    }
    
    const index = parseInt(cell.dataset.index);
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    
    // Count flags around cell
    let flagCount = 0;
    let adjacentCells = [];
    
    // Check all 8 adjacent cells
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const newRow = row + i;
            const newCol = col + j;
            if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
                const newIndex = newRow * GRID_SIZE + newCol;
                const adjacentCell = grid[newIndex];
                
                if (adjacentCell.classList.contains('flagged')) {
                    flagCount++;
                } else if (!adjacentCell.classList.contains('revealed')) {
                    adjacentCells.push(adjacentCell);
                }
            }
        }
    }
    
    console.log(`Flags: ${flagCount}, Adjacent mines: ${getAdjacentMines(index)}`);  // Debug log
    
    // Get the number in the cell
    const adjacentMines = getAdjacentMines(index);
    
    // If flags match the number, reveal all unflagged adjacent cells
    if (flagCount === adjacentMines) {
        console.log('Revealing adjacent cells');  // Debug log
        adjacentCells.forEach(adjacentCell => {
            handleClick(adjacentCell);
        });
    }
}

function setupHintButton() {
    const hintButton = document.getElementById('hint');
    hintButton.addEventListener('click', () => useHint());
    updateHintButton();
}

function useHint() {
    if (!gameActive || hintsRemaining <= 0) return;

    // Find the best cell to reveal
    let bestCell = findBestHintCell();
    if (bestCell) {
        hintsRemaining--;
        revealCell(bestCell);
        updateHintButton();
    }
}

function findBestHintCell() {
    let bestCells = [];
    
    // Look through all cells
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        if (!mines.has(i) && 
            !grid[i].classList.contains('revealed') && 
            !grid[i].classList.contains('flagged')) {
            
            const row = Math.floor(i / GRID_SIZE);
            const col = i % GRID_SIZE;
            const adjacentMines = getAdjacentMines(i);
            
            // Look for cells that would show numbers (preferably 2-3)
            // and have multiple empty spaces around them
            if (adjacentMines > 1 && adjacentMines < 4) {
                let emptyNeighbors = 0;
                let hasRevealedNeighbor = false;
                
                // Count empty neighbors and check for revealed neighbors
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const newRow = row + dx;
                        const newCol = col + dy;
                        if (newRow >= 0 && newRow < GRID_SIZE && 
                            newCol >= 0 && newCol < GRID_SIZE) {
                            const newIndex = newRow * GRID_SIZE + newCol;
                            
                            if (!mines.has(newIndex) && 
                                !grid[newIndex].classList.contains('revealed') && 
                                !grid[newIndex].classList.contains('flagged')) {
                                emptyNeighbors++;
                            }
                            
                            if (grid[newIndex].classList.contains('revealed')) {
                                hasRevealedNeighbor = true;
                            }
                        }
                    }
                }
                
                // Prioritize cells with 2-3 adjacent mines and multiple empty neighbors
                if (emptyNeighbors >= 3 && hasRevealedNeighbor) {
                    bestCells.push({
                        cell: grid[i],
                        score: (adjacentMines === 2 ? 2 : 1) * emptyNeighbors
                    });
                }
            }
        }
    }
    
    // Sort by score (higher is better)
    bestCells.sort((a, b) => b.score - a.score);
    
    // If no good numbered cells found, fall back to any safe cell
    if (bestCells.length === 0) {
        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            if (!mines.has(i) && 
                !grid[i].classList.contains('revealed') && 
                !grid[i].classList.contains('flagged')) {
                return grid[i];
            }
        }
    }
    
    return bestCells.length > 0 ? bestCells[0].cell : null;
}

function updateHintButton() {
    const hintButton = document.getElementById('hint');
    hintButton.textContent = `Hint (${hintsRemaining})`;
    hintButton.disabled = hintsRemaining <= 0 || !gameActive;
}

function checkWin() {
    let unrevealedSafeCells = 0;
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        if (!mines.has(i) && !grid[i].classList.contains('revealed')) {
            unrevealedSafeCells++;
        }
    }
    
    if (unrevealedSafeCells === 0) {
        endGame(true);
    }
}

function setupUndoButton() {
    const undoButton = document.getElementById('undo-mine');
    undoButton.addEventListener('click', () => useUndo());
    updateUndoButton();
}

function updateUndoButton() {
    const undoButton = document.getElementById('undo-mine');
    if (undoAvailable) {
        undoButton.textContent = 'Undo Mine (999 points)';
        undoButton.disabled = totalPoints < 999 || !gameActive;
        undoButton.style.opacity = totalPoints < 999 ? '0.6' : '1';
    } else {
        undoButton.textContent = 'Undo Mine (Used)';
        undoButton.disabled = true;
        undoButton.style.opacity = '0.6';
    }
}

function useUndo() {
    if (!gameActive || totalPoints < 999 || !undoAvailable) return;
    
    const useUndo = confirm('Would you like to use Undo Mine for 999 points? (Can only be used once per game)');
    if (useUndo) {
        totalPoints -= 999;
        undoAvailable = false;
        localStorage.setItem('minesweeperPoints', totalPoints);
        alert('Undo power used! You were saved from a mine! 🛡️\n-999 points');
        mines.forEach(index => {
            if (grid[index].classList.contains('mine')) {
                grid[index].classList.remove('mine');
                mines.delete(index);
            }
        });
        updateDisplay();
    }
}

function setupSmallBombButton() {
    const smallBombButton = document.createElement('button');
    smallBombButton.id = 'small-bomb-button';
    smallBombButton.className = 'power-button';
    smallBombButton.style.backgroundColor = '#5cb85c';
    smallBombButton.style.color = 'white';
    smallBombButton.style.padding = '10px 20px';
    smallBombButton.style.border = 'none';
    smallBombButton.style.borderRadius = '5px';
    smallBombButton.style.cursor = 'pointer';
    smallBombButton.style.margin = '5px';
    
    const controls = document.getElementById('controls');
    controls.appendChild(smallBombButton);
    
    smallBombButton.addEventListener('click', () => {
        // Change mode to 'bomb' when small bomb button is clicked
        const mobileControls = document.querySelector('#mobile-controls');
        if (mobileControls) {
            const mode = mobileControls.getMode();
            if (mode) mode = 'bomb';
        }
    });
    
    updateSmallBombButton();
}

function updateSmallBombButton() {
    const bombBtn = document.querySelector('.mobile-control-btn:nth-child(3)');
    if (!bombBtn) return;
    
    if (!smallBombUsedThisGame) {
        bombBtn.textContent = '💣 Small Bomb';
        bombBtn.disabled = totalPoints < 599 || !gameActive;
        bombBtn.style.opacity = totalPoints < 599 ? '0.6' : '1';
    } else {
        bombBtn.textContent = '💣 Used';
        bombBtn.disabled = true;
        bombBtn.style.opacity = '0.6';
    }
}

function useSmallBomb(cell) {
    if (!gameActive) {
        alert('Game is not active');
        return;
    }
    if (smallBombUsedThisGame) {
        alert('Small Bomb has already been used in this game');
        return;
    }
    if (totalPoints < 599) {
        alert('Not enough points! Need 599 points to use Small Bomb');
        return;
    }

    const index = parseInt(cell.dataset.index);
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;

    // Deduct points and mark as used
    totalPoints -= 599;
    smallBombUsedThisGame = true;  // Mark as used for this game
    localStorage.setItem('minesweeperPoints', totalPoints);

    // Reveal 3x3 area
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const newRow = row + i;
            const newCol = col + j;
            
            if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
                const newIndex = newRow * GRID_SIZE + newCol;
                const targetCell = grid[newIndex];
                
                if (mines.has(newIndex)) {
                    // Flag mines
                    if (!targetCell.classList.contains('flagged')) {
                        targetCell.classList.add('flagged');
                        flagsRemaining--;
                    }
                } else {
                    // Reveal safe cells
                    revealCell(targetCell);
                }
            }
        }
    }

    updateDisplay();
    updateSmallBombButton();
    alert('Small Bomb used! 3x3 area revealed and mines flagged! (-599 points)');
}

function setupInstantLossButton() {
    const instantLossButton = document.createElement('button');
    instantLossButton.id = 'instant-loss-button';
    instantLossButton.textContent = 'Instant Loss';
    instantLossButton.style.backgroundColor = '#dc3545';  // Red color
    instantLossButton.style.color = 'white';
    instantLossButton.style.padding = '10px 20px';
    instantLossButton.style.border = 'none';
    instantLossButton.style.borderRadius = '5px';
    instantLossButton.style.cursor = 'pointer';
    instantLossButton.style.margin = '5px';
    
    const controls = document.getElementById('controls');
    controls.appendChild(instantLossButton);
    
    instantLossButton.addEventListener('click', triggerInstantLoss);
}

function triggerInstantLoss() {
    if (!gameActive) return;
    
    // Find first unrevealed mine
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        if (mines.has(i) && !grid[i].classList.contains('flagged')) {
            const cell = grid[i];
            cell.classList.add('mine');
            cell.classList.add('triggering-mine');  // Add yellow background to triggering mine
            endGame(false);
            break;
        }
    }
}

document.getElementById('new-game').addEventListener('click', initializeGame);
