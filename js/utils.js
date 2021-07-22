'use strict'

const NUMS_COLOR_MAP = {
  1: 'green',
  2: 'yellow',
  3: 'orange',
  4: 'red',
  5: 'aqua',
  6: 'blue',
  7: 'purple',
  8: 'black'
}

function getMat(size) {
  var mat = [];
  for (var i = 0; i < size; i++) {
    mat[i] = [];
    for (var j = 0; j < size; j++) {
      mat[i][j] = createCell();
    }
  }
  return mat;
}

function renderBoard(mat, selector) {
  var strHTML = '';
  for (var i = 0; i < mat.length; i++) {
    strHTML += '<tr>\n';
    for (var j = 0; j < mat[0].length; j++) {
      var cell = mat[i][j];
      var className = `cell cell-${i}-${j}`;
      className += cell.isShown ? ' shown' : '';
      var content = '';
      if (cell.isMine && cell.isShown) {
        content = MINE;
        className += ' mine';
      } else if (cell.minesAroundCount > 0 && cell.isShown) {
        content = getNumHtml(cell.minesAroundCount);
      }
      strHTML += `\t<td class="${className}" onclick="cellClicked(this, ${i}, ${j})" oncontextmenu="cellMarked(event, ${i}, ${j})">${content}</td>\n`;
    }
    strHTML += '\n</tr>'
  }
  var elContainer = document.querySelector(selector);
  elContainer.innerHTML = strHTML;
}

function getNumHtml(num){
  return `<span style="color: ${NUMS_COLOR_MAP[num]}">${num}</span>`;
}

// location such as: {i: 2, j: 7}
function renderCell(location, value) {
  // Select the elCell and set the value
  var elCell = document.querySelector(`.cell-${location.i}-${location.j}`);
  elCell.innerHTML = value;
}

function createCell(minesAroundCount = 0, isMine = false) {
  return {
    minesAroundCount,
    isShown: false,
    isMine,
    isMarked: false
  }
}

function getNeighbors(cellI, cellJ) {
  var neighbors = [];
  for (var i = cellI - 1; i <= cellI + 1; i++) {
    if (i < 0 || i > gLevel.SIZE - 1) continue;
    for (var j = cellJ - 1; j <= cellJ + 1; j++) {
      if (j < 0 || j > gLevel.SIZE - 1) continue;
      neighbors.push({ i, j });
    }
  }
  return neighbors;
}

function getNeighborsHint(board, cellI, cellJ) {
  var neighbors = [];
  for (var i = cellI - 1; i <= cellI + 1; i++) {
    if (i < 0 || i > gLevel.SIZE - 1) continue;
    for (var j = cellJ - 1; j <= cellJ + 1; j++) {
      if (j < 0 || j > gLevel.SIZE - 1) continue;
      var currCell = board[i][j];
      if (currCell.isShown || currCell.isMarked) continue
      neighbors.push({ i, j });
    }
  }
  return neighbors;
}

function getRandomEmptyCellLoc(board) {
  var emptyCellsLoc = getEmptyCells(board);
  var randIdx = getRandomIntInt(0, emptyCellsLoc.length);
  var randEmptyCellLoc = emptyCellsLoc[randIdx];
  return randEmptyCellLoc;
}

function getEmptyCells(board) {
  var emptyCellsLoc = [];
  for (var i = 0; i < board.length; i++) {
    for (var j = 0; j < board[i].length; j++) {
      if (isEmptyCell(board[i][j])) emptyCellsLoc.push({ i, j })
    }
  }
  return emptyCellsLoc;
}

function isEmptyCell(cell) {
  return !cell.isShown && !cell.isMine;
}

function getRandomSafeCellLoc(board) {
  var safeCellsLoc = getSafeCells(board);
  var randIdx = getRandomIntInt(0, safeCellsLoc.length);
  var randSafeCellLoc = (safeCellsLoc.length > 0) ? safeCellsLoc[randIdx] : null;
  return randSafeCellLoc;
}

function getSafeCells(board) {
  var safeCellsLoc = [];
  for (var i = 0; i < board.length; i++) {
    for (var j = 0; j < board.length; j++) {
      if(isSafe(board[i][j])) safeCellsLoc.push({i,j})
    }
  }
  return safeCellsLoc;
}

function isSafe(cell) {
  return !cell.isShown && !cell.isMine;
}

function getRandomIntInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
