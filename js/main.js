'use strict'

const LEVEL_BEGINNER = 4;
const LEVEL_MEDIUM = 8;
const LEVEL_EXPERT = 12;
const MINES_BEGINNER = 2;
const MINES_MEDIUM = 12;
const MINES_EXPERT = 30;
const LIVES_BEGINNER = 1;
const LIVES_MEDIUM = 2;
const LIVES_EXPERT = 3;

const EMPTY = ' ';
const MINE = '🎇';
const MARK = '📍';
const LIFE = '💖';
const LIFE_USED = '💔';
const SMILEY_NORMAL = '😀';
const SMILEY_SAD = '😭';
const SMILEY_WIN = '😎';
const HINT = '💡';
const HINT_TIME = 1000;
const SAFE_TIME = 2500;
const SAFE_CLICKS = 3;

var gLevel = {}
var gGame = {}
var gPositionMines = {}
var gHintsCellLoc = [];

function initGame() {
    if (gGame.timeIntervalId) {
        clearInterval(gGame.timeIntervalId);
        gGame.timeIntervalId = null;
    }
    setGameLevel();
    gGame.board = getMat(gLevel.SIZE);
    gGame.isOn = false;
    gGame.shownCount = 0;
    gGame.markedCount = 0;
    gGame.minesStepdcount = 0;
    gGame.secsPassed = 0;
    gGame.isFirstMove = true;
    gGame.hints = 3;
    gGame.hintMode = false;
    gGame.safeClicks = SAFE_CLICKS;
    gGame.undoSteps = [];
    gHintsCellLoc = [];
    gPositionMines.isPositionMines = false;
    gPositionMines.minesLoc = [];
    rederLives();
    renderHints();
    renderBoard(gGame.board, '.board');
    updateScoreBoard();
    document.querySelector('.undo').disabled = true;
    document.querySelector('.safe-click span').innerText = gGame.safeClicks;
    document.querySelector('.place-mines span').innerText = '';
    document.querySelector('.timer span').innerText = '00.000';
    document.querySelector('.modal').style.display = 'none';
    document.querySelector('.smiley').innerText = SMILEY_NORMAL;
}

function setGameLevel() {
    var optStr = getSelectedRadioBtn();
    switch (optStr) {
        case 'beginner':
            gLevel.SIZE = LEVEL_BEGINNER;
            gLevel.MINES = MINES_BEGINNER;
            gGame.lives = LIVES_BEGINNER;
            break;
        case 'medium':
            gLevel.SIZE = LEVEL_MEDIUM;
            gLevel.MINES = MINES_MEDIUM;
            gGame.lives = LIVES_MEDIUM;
            break;
        case 'expert':
            gLevel.SIZE = LEVEL_EXPERT;
            gLevel.MINES = MINES_EXPERT;
            gGame.lives = LIVES_EXPERT;
            break;
        default:
            gLevel.SIZE = LEVEL_BEGINNER;
            gLevel.MINES = MINES_BEGINNER;
            gGame.lives = LIVES_BEGINNER;
    }

}

function getSelectedRadioBtn() {
    const rbs = document.querySelectorAll('input[name="level"]');
    var selectedValue;
    for (const rb of rbs) {
        if (rb.checked) {
            selectedValue = rb.value;
            break;
        }
    }
    return selectedValue;
}

function setMinesNegsCount(board) {
    for (var i = 0; i < gLevel.SIZE; i++) {
        for (var j = 0; j < gLevel.SIZE; j++) {
            if (board[i][j].isMine) continue;
            var minesAroundCount = 0;
            var neighborsLoc = getNeighbors(i, j);
            for (var n = 0; n < neighborsLoc.length; n++) {
                if (board[neighborsLoc[n].i][neighborsLoc[n].j].isMine) minesAroundCount++;
            }
            board[i][j].minesAroundCount = minesAroundCount;
        }
    }
}

function cellClicked(elCell, cellI, cellJ) {
    // if first click - start game
    if (!gGame.isOn && !gGame.timeIntervalId && !gPositionMines.isPositionMines) {
        startGame();
    }
    var currCell = gGame.board[cellI][cellJ];
    var loc = { i: cellI, j: cellJ };
    if (gPositionMines.isPositionMines) {
        if (currCell.isMine) return;
        currCell.isMine = true;
        gPositionMines.minesLoc.push(loc);
        document.querySelector('.place-mines span').innerText = `(${gLevel.MINES - gPositionMines.minesLoc.length} left)`;
        renderCell(loc, MINE);
        if (gPositionMines.minesLoc.length === gLevel.MINES) {
            for (var i = 0; i < gPositionMines.minesLoc.length; i++) {
                renderCell(gPositionMines.minesLoc[i], EMPTY);
            }
            gPositionMines.isPositionMines = false;
            gGame.isFirstMove = false;
            setMinesNegsCount(gGame.board);
            startGame();
            gPositionMines.minesLoc = [];
            document.querySelector('.place-mines span').innerText = '';
            addStepToUndo();
        }
        return;
    }
    // if cell allredy shown or is marked - return
    if (!gGame.isOn || currCell.isShown || currCell.isMarked) return;
    // if its the first move
    if (gGame.isFirstMove) {
        gGame.isFirstMove = false;
        currCell.isShown = true;
        gGame.shownCount++;
        elCell.classList.add('shown');
        placeMines(gGame.board);
        setMinesNegsCount(gGame.board);
        if (currCell.minesAroundCount === 0) expandShown(gGame.board, cellI, cellJ);
        var content = (currCell.minesAroundCount) ? getNumHtml(currCell.minesAroundCount) : EMPTY;
        renderCell(loc, content);
        // push first steps to steps (for the undo)
        addStepToUndo();
        return;
    }
    // if in hint mode
    if (gGame.hintMode && gGame.hints !== 0) {
        var negs = getNeighborsHint(gGame.board, cellI, cellJ);
        gGame.hintMode = false;
        gGame.hints--;
        gHintsCellLoc = [loc, ...negs];
        renderHints();
        reveal();
        setTimeout(unReveal, HINT_TIME);
        return;
    }
    currCell.isShown = true;
    elCell.classList.add('shown');
    if (currCell.isMine) {
        gGame.lives--;
        gGame.minesStepdcount++;
        elCell.classList.add('mine');
        rederLives();
        renderCell(loc, MINE);
        if (gGame.lives === 0) checkGameOver();
    } else if (currCell.minesAroundCount > 0) {
        gGame.shownCount++;
        renderCell(loc, getNumHtml(currCell.minesAroundCount));
    } else {
        // count current cell
        gGame.shownCount++;
        // reveal negs and count
        expandShown(gGame.board, cellI, cellJ);
    }
    // push current steps to steps (for the undo)
    addStepToUndo();
    checkGameOver();
}

function startGame() {
    gGame.isOn = true;
    gGame.startTime = Date.now();
    gGame.timeIntervalId = setInterval(updateTimer, 1);
}

function cellMarked(ev, cellI, cellJ) {
    ev.preventDefault();
    var cellMarked = gGame.board[cellI][cellJ];
    if (!gGame.isOn || cellMarked.isShown) return;
    var loc = { i: cellI, j: cellJ };
    // toggle isMarked
    if (cellMarked.isMarked) {
        cellMarked.isMarked = false;
        gGame.markedCount--;
        renderCell(loc, EMPTY);
    } else if (gGame.markedCount !== gLevel.MINES) {
        gGame.markedCount++;
        cellMarked.isMarked = true;
        renderCell(loc, MARK)
    }
    // push current step (for the undo)
    addStepToUndo()
    checkGameOver();
}

function checkGameOver() {
    if (gGame.shownCount === gLevel.SIZE * gLevel.SIZE - gLevel.MINES &&
        gGame.markedCount + gGame.minesStepdcount === gLevel.MINES && gGame.lives !== 0) {
        showGameOver(true);
    } else if (gGame.lives == 0) {
        showRemainingMines();
        showGameOver();
    }
}

function showGameOver(isWin = false) {
    var str = isWin ? 'Win!' : 'Loose!';
    var smiley = isWin ? SMILEY_WIN : SMILEY_SAD;
    gGame.isOn = false;
    clearInterval(gGame.timeIntervalId);
    document.querySelector('.modal span').innerText = str;
    document.querySelector('.modal').style.display = 'block';
    document.querySelector('.smiley').innerText = smiley;
    if (isWin) updateScoreBoard();
}

function showRemainingMines() {
    var remainingMinesLoc = getAllUnseenMinesLoc(gGame.board);
    for (var i = 0; i < remainingMinesLoc.length; i++) {
        var currMineLoc = remainingMinesLoc[i];
        var currCell = gGame.board[currMineLoc.i][currMineLoc.j];
        currCell.isShown = true;
        document.querySelector(`.cell-${currMineLoc.i}-${currMineLoc.j}`).classList.add('shown');
        renderCell(currMineLoc, MINE);
    }
}

function updateScoreBoard() {
    var scores = JSON.parse(localStorage.getItem('scores'));
    var strLevel = 'beginner';
    if (!scores) scores = {
        beginner: +Infinity,
        medium: +Infinity,
        expert: +Infinity
    };

    var secsPassed = parseFloat(gGame.secsPassed);
    var secsPassed = (secsPassed === 0) ? +Infinity : secsPassed;

    switch (gLevel.SIZE) {
        case LEVEL_BEGINNER:
            scores.beginner = (scores.beginner === null) ? +Infinity : scores.beginner;
            if (scores.beginner > secsPassed) {
                scores.beginner = secsPassed;
                alert(`A new record for: ${strLevel}`);
            }
            break;
        case LEVEL_MEDIUM:
            scores.medium = (scores.medium === null) ? +Infinity : scores.medium;
            strLevel = 'medium';
            if (scores.medium > secsPassed) {
                scores.medium = secsPassed;
                alert(`A new record for: ${strLevel}`);
            }
            break;
        case LEVEL_EXPERT:
            scores.expert = (scores.expert === null) ? +Infinity : scores.expert;
            strLevel = 'expert';
            if (scores.expert > secsPassed) {
                scores.expert = secsPassed;
                alert(`A new record for: ${strLevel}`);
            }
            break;
        default:
    }

    localStorage.setItem('scores', JSON.stringify(scores));
    renderScoreBoard(scores);
}

function addStepToUndo() {
    gGame.undoSteps.push({
        board: JSON.parse(JSON.stringify(gGame.board)),
        shownCount: gGame.shownCount,
        markedCount: gGame.markedCount,
        minesStepdcount: gGame.minesStepdcount,
        lives: gGame.lives
    });
    if (gGame.undoSteps.length > 1) document.querySelector('.undo').disabled = false;
    else document.querySelector('.undo').disabled = true;
}

function renderScoreBoard(scores) {
    var strHtml = '<tr><th colspan="2">SCORE BOARD:</th></tr>';
    for (var level in scores) {
        var currScore = scores[level];
        var strScore = (currScore === '0' || currScore === +Infinity || currScore === null) ? 'no record available' : currScore;
        strHtml += `<tr><td>${level}:</td><td>${strScore}</td></tr>`;
    }
    document.querySelector('.score-board').innerHTML = strHtml;
}

function onHintsClick() {
    gGame.hintMode = true;
}

function renderHints() {
    var str = '';
    for (var i = 0; i < gGame.hints; i++) {
        str += '💡';
    }
    document.querySelector('.hints span').innerText = str;
}

// reveal is for hits - reveal negs
function reveal() {
    for (var i = 0; i < gHintsCellLoc.length; i++) {
        var currLoc = { i: gHintsCellLoc[i].i, j: gHintsCellLoc[i].j };
        var currCell = gGame.board[currLoc.i][currLoc.j];
        var currElCell = document.querySelector(`.cell-${currLoc.i}-${currLoc.j}`);
        currElCell.classList.add('shown');
        if (currCell.isMine) {
            renderCell(currLoc, MINE);
            currElCell.classList.add('mine');
        } else if (currCell.minesAroundCount > 0) {
            renderCell(currLoc, getNumHtml(currCell.minesAroundCount));
        } else {
            renderCell(currLoc, EMPTY);
        }
    }
}

// hide revealed hints
function unReveal() {
    for (var i = 0; i < gHintsCellLoc.length; i++) {
        var currLoc = gHintsCellLoc[i];
        var currElCell = document.querySelector(`.cell-${currLoc.i}-${currLoc.j}`);
        currElCell.classList.remove('shown');
        if (currElCell.classList.contains('mine')) currElCell.classList.remove('mine');
        renderCell(gHintsCellLoc[i], EMPTY)
    }
    gHintsCellLoc = [];
}

function onSafeClick() {
    if (!gGame.isOn || gGame.safeClicks === 0) return;
    var randSafeCellLoc = getRandomSafeCellLoc(gGame.board);
    // if the are no safe places return
    if (!randSafeCellLoc) return;
    var elCell = document.querySelector(`.cell-${randSafeCellLoc.i}-${randSafeCellLoc.j}`);
    elCell.classList.add('safe');
    gGame.safeClicks--;
    document.querySelector('.safe-click span').innerText = gGame.safeClicks;
    setTimeout(function () {
        elCell.classList.remove('safe');
    }, SAFE_TIME);
}

function onUndo() {
    if (gGame.isOn && gGame.undoSteps.length > 1) {
        gGame.undoSteps.pop();
        var lastStep = gGame.undoSteps[gGame.undoSteps.length - 1];
        gGame.shownCount = lastStep.shownCount;
        gGame.markedCount = lastStep.markedCount;
        gGame.lives = lastStep.lives;
        gGame.minesStepdcount = lastStep.minesStepdcount;
        gGame.board = JSON.parse(JSON.stringify(lastStep.board));
        rederLives();
        renderBoard(gGame.board, '.board');
        if (gGame.undoSteps.length <= 1) document.querySelector('.undo').disabled = true;
    }
}

function onPositionMines() {
    if (!gGame.isOn && !gGame.timeIntervalId) {
        gPositionMines.isPositionMines = true;
        document.querySelector('.place-mines span').innerText = `(${gLevel.MINES - gPositionMines.minesLoc.length} left)`
    }
}

function expandShown(board, cellI, cellJ) {
    // get negs
    var currCellNegsLoc = getNeighbors(cellI, cellJ);
    // loop over all negs
    for (var i = 0; i < currCellNegsLoc.length; i++) {
        var currCellLoc = currCellNegsLoc[i];
        var currCell = board[currCellLoc.i][currCellLoc.j];
        var content = currCell.minesAroundCount ? getNumHtml(currCell.minesAroundCount) : EMPTY;
        // skip shown, marked & mines
        if (currCell.isShown || currCell.isMarked || currCell.isMine) continue;
        currCell.isShown = true;
        gGame.shownCount++;
        document.querySelector(`.cell-${currCellLoc.i}-${currCellLoc.j}`).classList.add('shown');
        renderCell(currCellLoc, content);
        // recursive expand show
        if (currCell.minesAroundCount === 0) expandShown(board, currCellLoc.i, currCellLoc.j);
    }
}

function placeMines(board) {
    for (var i = 0; i < gLevel.MINES; i++) {
        var randEmptyCellLoc = getRandomEmptyCellLoc(gGame.board);
        board[randEmptyCellLoc.i][randEmptyCellLoc.j].isMine = true;
    }
}

function rederLives() {
    var str = '';
    for (var i = 0; i < gGame.lives; i++) {
        str += LIFE;
    }
    // fix for easy and medium level
    var lives = LIVES_EXPERT;
    if (gLevel.SIZE === LEVEL_BEGINNER) {
        lives = LIVES_BEGINNER;
    } else if (gLevel.SIZE === LEVEL_MEDIUM) {
        lives = LIVES_MEDIUM
    }
    for (var i = 0; i < lives - gGame.lives; i++) {
        str += LIFE_USED;
    }
    document.querySelector('.lives span').innerText = str;
}

function updateTimer() {
    var timeDiff = Date.now() - gGame.startTime;
    var seconds = parseInt(timeDiff / 1000);
    var timeDiffStr = timeDiff.toString();
    var ms = timeDiffStr.substring(timeDiffStr.length - 3);
    if (ms.length < 2) {
        ms = `00${ms}`;
    } else if (ms.length < 3) {
        ms = `0${ms}`;
    }
    if (seconds < 10) seconds = `0${seconds}`;
    gGame.secsPassed = `${seconds}.${ms}`;
    document.querySelector('.timer .value').innerText = gGame.secsPassed;
}