import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Game State
let scene, camera, renderer, controls, raycaster, mouse;
let board = [];
let pieces = [];
let selectedPiece = null;
let validMoves = [];
let currentTurn = 'white';
let capturedPieces = { white: [], black: [] };
let isGameOver = false;

// Constants
const BOARD_SIZE = 8;
const SQUARE_SIZE = 1;
const BOARD_OFFSET = (BOARD_SIZE * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2;

// Colors
const COLORS = {
    whiteSquare: 0xE8D5B7,
    blackSquare: 0x8B4513,
    whitePiece: 0xF0F0F0,
    blackPiece: 0x2C2C2C,
    highlight: 0x00FF00,
    selected: 0xFFFF00,
    validMove: 0x00AA00,
    check: 0xFF0000
};

// Piece types
const PIECES = {
    KING: 'king',
    QUEEN: 'queen',
    ROOK: 'rook',
    BISHOP: 'bishop',
    KNIGHT: 'knight',
    PAWN: 'pawn'
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 14, 10);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('board-container').appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 5;
    controls.maxDistance = 25;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    createBoard();
    setupPieces();

    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onMouseClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    document.getElementById('reset-btn').addEventListener('click', resetGame);

    updateTurnIndicator();
    animate();
}

function createBoard() {
    const geometry = new THREE.BoxGeometry(SQUARE_SIZE, 0.2, SQUARE_SIZE);
    for (let row = 0; row < BOARD_SIZE; row++) {
        board[row] = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            const isWhite = (row + col) % 2 === 0;
            const material = new THREE.MeshStandardMaterial({
                color: isWhite ? COLORS.whiteSquare : COLORS.blackSquare,
                roughness: 0.8
            });
            const square = new THREE.Mesh(geometry, material);
            square.position.set(col * SQUARE_SIZE - BOARD_OFFSET, 0, row * SQUARE_SIZE - BOARD_OFFSET);
            square.receiveShadow = true;
            square.userData = { row, col, isSquare: true };
            scene.add(square);
            board[row][col] = { mesh: square, piece: null };
        }
    }

    const borderGeo = new THREE.BoxGeometry(BOARD_SIZE * SQUARE_SIZE + 0.5, 0.1, BOARD_SIZE * SQUARE_SIZE + 0.5);
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.y = -0.15;
    scene.add(border);
}

function createPiece(type, color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
        color: color === 'white' ? COLORS.whitePiece : COLORS.blackPiece,
        roughness: 0.4,
        metalness: 0.3
    });

    switch (type) {
        case PIECES.PAWN: {
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.5, 8), mat);
            body.position.y = 0.25;
            body.castShadow = true;
            group.add(body);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mat);
            head.position.y = 0.6;
            head.castShadow = true;
            group.add(head);
            break;
        }
        case PIECES.ROOK: {
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.8, 8), mat);
            body.position.y = 0.4;
            body.castShadow = true;
            group.add(body);
            for (let i = 0; i < 4; i++) {
                const cren = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), mat);
                const angle = (i / 4) * Math.PI * 2;
                cren.position.set(Math.cos(angle) * 0.25, 0.9, Math.sin(angle) * 0.25);
                cren.castShadow = true;
                group.add(cren);
            }
            break;
        }
        case PIECES.KNIGHT: {
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.4, 8), mat);
            base.position.y = 0.2;
            base.castShadow = true;
            group.add(base);
            const neck = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.3), mat);
            neck.position.set(0.1, 0.6, 0);
            neck.rotation.z = -0.3;
            neck.castShadow = true;
            group.add(neck);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.2), mat);
            head.position.set(0.15, 0.9, 0);
            head.castShadow = true;
            group.add(head);
            break;
        }
        case PIECES.BISHOP: {
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.7, 8), mat);
            body.position.y = 0.35;
            body.castShadow = true;
            group.add(body);
            const hat = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.3, 8), mat);
            hat.position.y = 0.85;
            hat.castShadow = true;
            group.add(hat);
            const top = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), mat);
            top.position.y = 1.05;
            top.castShadow = true;
            group.add(top);
            break;
        }
        case PIECES.QUEEN: {
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.9, 8), mat);
            body.position.y = 0.45;
            body.castShadow = true;
            group.add(body);
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.2, 8), mat);
            crown.position.y = 1.0;
            crown.castShadow = true;
            group.add(crown);
            for (let i = 0; i < 5; i++) {
                const pt = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), mat);
                const angle = (i / 5) * Math.PI * 2;
                pt.position.set(Math.cos(angle) * 0.25, 1.15, Math.sin(angle) * 0.25);
                pt.castShadow = true;
                group.add(pt);
            }
            const top = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8),
                new THREE.MeshStandardMaterial({ color: color === 'white' ? 0xFFD700 : 0x8B6914, roughness: 0.3, metalness: 0.8 }));
            top.position.y = 1.2;
            top.castShadow = true;
            group.add(top);
            break;
        }
        case PIECES.KING: {
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 1.0, 8), mat);
            body.position.y = 0.5;
            body.castShadow = true;
            group.add(body);
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.28, 0.2, 8), mat);
            crown.position.y = 1.1;
            crown.castShadow = true;
            group.add(crown);
            const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08),
                new THREE.MeshStandardMaterial({ color: color === 'white' ? 0xFFD700 : 0x8B6914, roughness: 0.3, metalness: 0.8 }));
            crossV.position.y = 1.35;
            crossV.castShadow = true;
            group.add(crossV);
            const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.08),
                new THREE.MeshStandardMaterial({ color: color === 'white' ? 0xFFD700 : 0x8B6914, roughness: 0.3, metalness: 0.8 }));
            crossH.position.y = 1.4;
            crossH.castShadow = true;
            group.add(crossH);
            break;
        }
    }

    group.userData = { type, color };
    return group;
}

function setupPieces() {
    const initialSetup = [
        ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'],
        ['pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn']
    ];

    for (let col = 0; col < 8; col++) {
        addPiece(initialSetup[0][col], 'black', 0, col);
        addPiece(initialSetup[1][col], 'black', 1, col);
        addPiece(initialSetup[1][col], 'white', 6, col);
        addPiece(initialSetup[0][col], 'white', 7, col);
    }
}

function addPiece(type, color, row, col) {
    const piece = createPiece(type, color);
    piece.position.set(col * SQUARE_SIZE - BOARD_OFFSET, 0, row * SQUARE_SIZE - BOARD_OFFSET);
    piece.userData = { type, color, row, col };
    scene.add(piece);
    board[row][col].piece = piece;
    pieces.push(piece);
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    renderer.domElement.style.cursor = 'default';
    for (const hit of intersects) {
        const obj = hit.object;
        if (obj.userData && obj.userData.isSquare) {
            renderer.domElement.style.cursor = 'pointer';
            break;
        }
        let parent = obj.parent;
        while (parent) {
            if (parent.userData && parent.userData.type) {
                renderer.domElement.style.cursor = 'pointer';
                break;
            }
            parent = parent.parent;
        }
    }
}

function onMouseClick(event) {
    if (isGameOver) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length === 0) return;

    const clickedObj = intersects[0].object;
    let squareData = null;
    let clickedPiece = null;

    if (clickedObj.userData && clickedObj.userData.isSquare) {
        squareData = clickedObj.userData;
    } else {
        let parent = clickedObj.parent;
        while (parent) {
            if (parent.userData && parent.userData.type) {
                clickedPiece = parent;
                squareData = { row: parent.userData.row, col: parent.userData.col };
                break;
            }
            if (parent.userData && parent.userData.isSquare) {
                squareData = parent.userData;
                break;
            }
            parent = parent.parent;
        }
    }

    if (!squareData) return;

    if (selectedPiece) {
        if (isValidMove(selectedPiece, squareData.row, squareData.col)) {
            movePiece(selectedPiece, squareData.row, squareData.col);
            clearHighlights();
            selectedPiece = null;
            switchTurn();
        } else if (clickedPiece && clickedPiece.userData.color === currentTurn) {
            clearHighlights();
            selectedPiece = clickedPiece;
            highlightValidMoves(selectedPiece);
            highlightSquare(squareData.row, squareData.col, COLORS.selected);
        } else {
            clearHighlights();
            selectedPiece = null;
        }
    } else {
        if (clickedPiece && clickedPiece.userData.color === currentTurn) {
            selectedPiece = clickedPiece;
            highlightValidMoves(selectedPiece);
            highlightSquare(squareData.row, squareData.col, COLORS.selected);
        }
    }
}

function getPieceAt(row, col) {
    if (row < 0 || row >= 8 || col < 0 || col >= 8) return null;
    return board[row][col].piece;
}

function isValidMove(piece, targetRow, targetCol) {
    const { type, color, row, col } = piece.userData;
    const dr = targetRow - row;
    const dc = targetCol - col;

    if (targetRow < 0 || targetRow >= 8 || targetCol < 0 || targetCol >= 8) return false;

    const targetPiece = getPieceAt(targetRow, targetCol);
    if (targetPiece && targetPiece.userData.color === color) return false;

    const dir = color === 'white' ? -1 : 1;

    switch (type) {
        case PIECES.PAWN:
            if (dc === 0 && !targetPiece) {
                if (dr === dir) return true;
                if (dr === 2 * dir && row === (color === 'white' ? 6 : 1) && !getPieceAt(row + dir, col)) return true;
            }
            if (Math.abs(dc) === 1 && dr === dir && targetPiece) return true;
            return false;

        case PIECES.ROOK:
            if (dr === 0 || dc === 0) return isPathClear(row, col, targetRow, targetCol);
            return false;

        case PIECES.BISHOP:
            if (Math.abs(dr) === Math.abs(dc)) return isPathClear(row, col, targetRow, targetCol);
            return false;

        case PIECES.QUEEN:
            if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))
                return isPathClear(row, col, targetRow, targetCol);
            return false;

        case PIECES.KNIGHT:
            return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);

        case PIECES.KING:
            return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
    }
    return false;
}

function isPathClear(r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    let r = r1 + dr;
    let c = c1 + dc;
    while (r !== r2 || c !== c2) {
        if (getPieceAt(r, c)) return false;
        r += dr;
        c += dc;
    }
    return true;
}

function highlightValidMoves(piece) {
    validMoves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (isValidMove(piece, row, col)) {
                highlightSquare(row, col, COLORS.validMove);
                validMoves.push({ row, col });
            }
        }
    }
}

function highlightSquare(row, col, color) {
    const square = board[row][col].mesh;
    square.material = square.material.clone();
    square.material.emissive = new THREE.Color(color);
    square.material.emissiveIntensity = 0.5;
}

function clearHighlights() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = board[row][col].mesh;
            const isWhite = (row + col) % 2 === 0;
            square.material.emissive = new THREE.Color(0x000000);
            square.material.emissiveIntensity = 0;
        }
    }
}

function movePiece(piece, newRow, newCol) {
    const oldRow = piece.userData.row;
    const oldCol = piece.userData.col;

    const targetPiece = getPieceAt(newRow, newCol);
    if (targetPiece) {
        capturePiece(targetPiece);
    }

    board[oldRow][oldCol].piece = null;
    board[newRow][newCol].piece = piece;

    piece.userData.row = newRow;
    piece.userData.col = newCol;

    const targetX = newCol * SQUARE_SIZE - BOARD_OFFSET;
    const targetZ = newRow * SQUARE_SIZE - BOARD_OFFSET;

    animatePieceMovement(piece, targetX, targetZ);
}

function animatePieceMovement(piece, targetX, targetZ) {
    const startX = piece.position.x;
    const startZ = piece.position.z;
    const duration = 300;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);

        piece.position.x = startX + (targetX - startX) * ease;
        piece.position.z = startZ + (targetZ - startZ) * ease;
        piece.position.y = Math.sin(progress * Math.PI) * 0.5;

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            piece.position.y = 0;
        }
    }
    animate();
}

function capturePiece(piece) {
    const color = piece.userData.color;
    const oppositeColor = color === 'white' ? 'black' : 'white';
    capturedPieces[oppositeColor].push(piece.userData.type);

    scene.remove(piece);
    board[piece.userData.row][piece.userData.col].piece = null;

    const index = pieces.indexOf(piece);
    if (index > -1) pieces.splice(index, 1);

    updateCapturedPiecesUI();

    if (piece.userData.type === PIECES.KING) {
        endGame(oppositeColor);
    }
}

function updateCapturedPiecesUI() {
    const whiteContainer = document.getElementById('captured-white');
    const blackContainer = document.getElementById('captured-black');

    whiteContainer.innerHTML = capturedPieces.white.map(p => getPieceSymbol(p, 'black')).join('');
    blackContainer.innerHTML = capturedPieces.black.map(p => getPieceSymbol(p, 'white')).join('');
}

function getPieceSymbol(type, color) {
    const symbols = {
        king: color === 'white' ? '♔' : '♚',
        queen: color === 'white' ? '♕' : '♛',
        rook: color === 'white' ? '♖' : '♜',
        bishop: color === 'white' ? '♗' : '♝',
        knight: color === 'white' ? '♘' : '♞',
        pawn: color === 'white' ? '♙' : '♟'
    };
    return `<span class="captured-piece">${symbols[type]}</span>`;
}

function switchTurn() {
    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    updateTurnIndicator();
}

function updateTurnIndicator() {
    const indicator = document.getElementById('turn-indicator');
    indicator.textContent = `${currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)}'s Turn`;
    indicator.className = currentTurn === 'white' ? 'white-turn' : 'black-turn';
}

function endGame(winner) {
    isGameOver = true;
    const overlay = document.createElement('div');
    overlay.id = 'message-overlay';
    overlay.className = 'show';
    overlay.innerHTML = `
        <h2>${winner.charAt(0).toUpperCase() + winner.slice(1)} Wins!</h2>
        <button onclick="location.reload()">Play Again</button>
    `;
    document.body.appendChild(overlay);
}

function resetGame() {
    location.reload();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

init();

