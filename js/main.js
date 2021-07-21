'use strict'

const LEVEL_BEGINNER = 4;
const LEVEL_MEDIUM = 8;
const LEVEL_EXPERT = 12;
const MINES_BEGINNER = 2;
const MINES_MEDIUM = 12;
const MINES_EXPERT = 30;

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

var gLevel = {
    SIZE: LEVEL_BEGINNER,
    MINES: MINES_BEGINNER
}
var gGame = {
    board: [],
    isOn: false,
    shownCount: 0,
    markedCount: 0,
    secsPassed: 0,
    startTime: 0,
    timeIntervalId: null,
    isFirstMove: true,
    lives: 3,
    hints: 3,
    hintMode: false,
    safeClicks: SAFE_CLICKS,
    steps: []
}

var gHintsElLoc = [];

function initGame() {
    if (gGame.timeIntervalId) {
        clearInterval(gGame.timeIntervalId);
        gGame.timeIntervalId = null;
    }
    setGameLevel()
    gGame.board = getMat(gLevel.SIZE);
    // placeMines(gGame.board);
    gGame.isOn = false;
    gGame.shownCount = 0;
    gGame.markedCount = 0;
    gGame.secsPassed = 0;
    gGame.isFirstMove = true;
    gGame.lives = 3;
    gGame.hints = 3;
    gGame.hintMode = false;
    gGame.safeClicks = SAFE_CLICKS;
    gGame.steps = [];
    gHintsElLoc = [];
    // setMinesNegsCount(gGame.board);
    rederLives();
    renderHints();
    renderBoard(gGame.board, '.board');
    updateScoreBoard();
    document.querySelector('.modal').style.display = 'none';
    document.querySelector('.smiley').innerText = SMILEY_NORMAL;
}

function setGameLevel() {
    var optStr = getSelectedRadioBtn();
    switch (optStr) {
        case 'beginner':
            gLevel.SIZE = LEVEL_BEGINNER;
            gLevel.MINES = MINES_BEGINNER;
            break;
        case 'medium':
            gLevel.SIZE = LEVEL_MEDIUM;
            gLevel.MINES = MINES_MEDIUM;
            break;
        case 'expert':
            gLevel.SIZE = LEVEL_EXPERT;
            gLevel.MINES = MINES_EXPERT;
            break;
        default:
            gLevel.SIZE = LEVEL_BEGINNER;
            gLevel.MINES = MINES_BEGINNER;
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
    if (!gGame.isOn && !gGame.timeIntervalId) {
        gGame.isOn = true;
        gGame.startTime = Date.now();
        gGame.timeIntervalId = setInterval(updateTimer, 1);
    }
    var currCell = gGame.board[cellI][cellJ];
    // if cell allredy shown or is marked - return
    if (!gGame.isOn || currCell.isShown || currCell.isMarked) return;
    var loc = { i: cellI, j: cellJ };
    // if its the first move
    if (gGame.isFirstMove) {
        gGame.isFirstMove = false;
        currCell.isShown = true;
        elCell.classList.add('shown');
        gGame.shownCount++;
        placeMines(gGame.board);
        setMinesNegsCount(gGame.board);
        renderCell(loc, currCell.minesAroundCount);
        if (currCell.minesAroundCount === 0) expendShown(gGame.board, cellI, cellJ);
        var content = (currCell.minesAroundCount) > 0 ? currCell.minesAroundCount : EMPTY;
        renderCell(loc, content);
        // push first steps to steps (for the undo)
        gGame.steps.push({
            board: JSON.parse(JSON.stringify(gGame.board)),
            shownCount: gGame.shownCount,
            markedCount: gGame.markedCount,
            lives: gGame.lives
        });
        return;
    }
    // if in hint mode
    if (gGame.hintMode && gGame.hints !== 0) {
        var negs = getNeighborsHint(gGame.board, cellI, cellJ);
        gGame.hintMode = false;
        gGame.hints--;
        gHintsElLoc = [loc, ...negs];
        renderHints();
        reveal();
        setTimeout(unReveal, HINT_TIME);
        return;
    }
    currCell.isShown = true;
    elCell.classList.add('shown');
    if (currCell.isMine) {
        gGame.lives--;
        gGame.shownCount++;
        rederLives();
        renderCell(loc, MINE);
        if (gGame.lives === 0) showGameOver();
    } else if (currCell.minesAroundCount > 0) {
        renderCell(loc, currCell.minesAroundCount);
        gGame.shownCount++;
        console.log(gGame.shownCount, gLevel.SIZE * gLevel.SIZE);
    } else {
        // count current cell
        gGame.shownCount++;
        console.log(gGame.shownCount, gLevel.SIZE * gLevel.SIZE);
        // reveal negs and count
        expendShown(gGame.board, cellI, cellJ);
    }
    // push current steps to steps (for the undo)
    gGame.steps.push({
        board: JSON.parse(JSON.stringify(gGame.board)),
        shownCount: gGame.shownCount,
        markedCount: gGame.markedCount,
        lives: gGame.lives
    });
    checkGameOver();
}

function cellMarked(ev, cellI, cellJ) {
    ev.preventDefault();
    var cellMarked = gGame.board[cellI][cellJ];
    if (!gGame.isOn || cellMarked.isShown) return;
    var loc = { i: cellI, j: cellJ };
    if (cellMarked.isMarked) {
        cellMarked.isMarked = false;
        gGame.markedCount--;
        renderCell(loc, EMPTY);
    } else {
        gGame.markedCount++;
        cellMarked.isMarked = true;
        renderCell(loc, MARK)
    }
    // push current step (for the undo)
    gGame.steps.push({
        board: JSON.parse(JSON.stringify(gGame.board)),
        shownCount: gGame.shownCount,
        markedCount: gGame.markedCount,
        lives: gGame.lives
    });
    checkGameOver();
}

function checkGameOver() {
    if (gGame.shownCount + gGame.markedCount === gLevel.SIZE * gLevel.SIZE) {
        showGameOver(true);
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
    for (var i = 0; i < gHintsElLoc.length; i++) {
        var currLoc = { i: gHintsElLoc[i].i, j: gHintsElLoc[i].j };
        var currCell = gGame.board[currLoc.i][currLoc.j];
        var currElCell = document.querySelector(`.cell-${currLoc.i}-${currLoc.j}`);
        currElCell.classList.add('shown');
        if (currCell.isMine) {
            renderCell(currLoc, MINE);
        } else if (currCell.minesAroundCount > 0) {
            renderCell(currLoc, currCell.minesAroundCount);
        } else {
            renderCell(currLoc, EMPTY);
        }
    }
}

// hide revealed hints
function unReveal() {
    for (var i = 0; i < gHintsElLoc.length; i++) {
        var currLoc = gHintsElLoc[i];
        var currElCell = document.querySelector(`.cell-${currLoc.i}-${currLoc.j}`);
        currElCell.classList.remove('shown');
        renderCell(gHintsElLoc[i], EMPTY)
    }
    gHintsElLoc = [];
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
    if (gGame.isOn && gGame.steps.length > 1) {
        gGame.steps.pop();
        var lastStep = gGame.steps[gGame.steps.length - 1];
        gGame.shownCount = lastStep.shownCount;
        gGame.markedCount = lastStep.markedCount;
        gGame.lives = lastStep.lives;
        gGame.board = JSON.parse(JSON.stringify(lastStep.board));
        rederLives();
        renderBoard(gGame.board, '.board');
    }
}

function expendShown(board, cellI, cellJ) {
    // get negs
    var currCellNegsLoc = getNeighbors(cellI, cellJ);
    // loop over all negs
    for (var i = 0; i < currCellNegsLoc.length; i++) {
        var currCellLoc = currCellNegsLoc[i];
        var currCell = gGame.board[currCellLoc.i][currCellLoc.j];
        var content = currCell.minesAroundCount ? currCell.minesAroundCount : EMPTY;
        // skip shown, marked & mines
        if (currCell.isShown || currCell.isMarked || currCell.isMine) continue;
        currCell.isShown = true;
        gGame.shownCount++;
        console.log(gGame.shownCount, gLevel.SIZE * gLevel.SIZE);
        document.querySelector(`.cell-${currCellLoc.i}-${currCellLoc.j}`).classList.add('shown');
        renderCell(currCellLoc, content);
        if(currCell.minesAroundCount === 0) expendShown(gGame.board, currCellLoc.i, currCellLoc.j);
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
    for (var i = 0; i < 3 - gGame.lives; i++) {
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