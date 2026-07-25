const screenElement = document.querySelector("#screen")
const scoreElement = document.querySelector("#score")
const levelElement = document.querySelector("#level")
const livesElement = document.querySelector("#lives")
const highscoreElement = document.querySelector("#highscore")
const statusElement = document.querySelector("#status")
const controlButtons = document.querySelectorAll("[data-control]")

const GAME_WIDTH = 52
const GAME_HEIGHT = 30
const PLAYER_WIDTH = 5
const SHIELD_PATTERN = [
  "  ###  ",
  " ##### ",
  "#######",
  "### ###"
]

const PLAYER_SPRITE = [
  " /^\\ ",
  "/___\\"
]

const ALIEN_TYPES = [
  {
    name: "scout",
    points: 30,
    frames: [
      [" .-. ", "(o o)", "/ O \\"],
      [" .-. ", "(o o)", "\\ O /"]
    ]
  },
  {
    name: "crab",
    points: 20,
    frames: [
      [" /M\\ ", "<|||>", "/ V \\"],
      [" \\M/ ", "<|||>", "\\ V /"]
    ]
  },
  {
    name: "brute",
    points: 10,
    frames: [
      [" /#\\ ", "|###|", "/###\\"],
      [" \\#/ ", "|###|", "\\###/"]
    ]
  }
]

const state = {
  running: true,
  paused: false,
  gameOver: false,
  level: 1,
  score: 0,
  highscore: Number(localStorage.getItem("ascii-marcianitos-highscore") || 0),
  lives: 3,
  keys: {
    left: false,
    right: false,
    fire: false
  },
  stars: createStars(74),
  player: null,
  aliens: [],
  bullets: [],
  alienBullets: [],
  shields: [],
  explosions: [],
  frameFlip: false,
  lastTime: 0,
  alienDirection: 1,
  alienStepTimer: 0,
  alienShotTimer: 0,
  fireCooldown: 0,
  waveCooldown: 0,
  statusMessage: "Defiende la base. No dejes caer a los invasores.",
  statusTimer: 220,
  invulnerableTimer: 0
}

function createStars(total) {
  return Array.from({ length: total }, (_, index) => ({
    x: Math.floor(Math.random() * GAME_WIDTH),
    y: Math.floor(Math.random() * GAME_HEIGHT),
    blink: 40 + (index % 5) * 8 + Math.floor(Math.random() * 18),
    offset: Math.floor(Math.random() * 60)
  }))
}

function createPlayer() {
  return {
    x: Math.floor(GAME_WIDTH / 2) - 2,
    y: GAME_HEIGHT - 3,
    speed: 24
  }
}

function createShields() {
  const bases = [7, 19, 31, 43]

  return bases.map((baseX) => {
    const cells = new Set()

    SHIELD_PATTERN.forEach((row, rowIndex) => {
      row.split("").forEach((char, columnIndex) => {
        if (char === "#") {
          cells.add(`${baseX + columnIndex},${21 + rowIndex}`)
        }
      })
    })

    return { cells }
  })
}

function createWave(level) {
  const aliens = []
  const rowOrder = [0, 0, 1, 1, 2]
  const startX = 5
  const startY = 3
  const horizontalGap = 6
  const verticalGap = 4

  rowOrder.forEach((typeIndex, rowIndex) => {
    for (let columnIndex = 0; columnIndex < 7; columnIndex += 1) {
      aliens.push({
        x: startX + columnIndex * horizontalGap,
        y: startY + rowIndex * verticalGap,
        typeIndex,
        alive: true
      })
    }
  })

  state.aliens = aliens
  state.alienDirection = 1
  state.alienStepTimer = 0
  state.alienShotTimer = 24
  state.waveCooldown = Math.max(24, 72 - level * 6)
  state.statusMessage = `Oleada ${level.toString().padStart(2, "0")} entrando en pantalla.`
  state.statusTimer = 180
}

function resetRoundPositions() {
  state.player = createPlayer()
  state.bullets = []
  state.alienBullets = []
  state.explosions = []
  state.invulnerableTimer = 2
}

function resetGame() {
  state.running = true
  state.paused = false
  state.gameOver = false
  state.level = 1
  state.score = 0
  state.lives = 3
  state.frameFlip = false
  state.fireCooldown = 0
  resetRoundPositions()
  state.shields = createShields()
  createWave(state.level)
  setStatus("Defiende la base. Derriba la oleada completa.", 180)
  updateHud()
}

function updateHud() {
  scoreElement.textContent = state.score.toString().padStart(6, "0")
  levelElement.textContent = state.level.toString().padStart(2, "0")
  livesElement.textContent = state.lives.toString().padStart(2, "0")
  highscoreElement.textContent = state.highscore.toString().padStart(6, "0")
}

function addExplosion(x, y, life = 16) {
  state.explosions.push({ x, y, life })
}

function setStatus(message, duration = 160) {
  state.statusMessage = message
  state.statusTimer = duration
}

function saveHighscore() {
  if (state.score > state.highscore) {
    state.highscore = state.score
    localStorage.setItem("ascii-marcianitos-highscore", String(state.highscore))
  }
}

function handlePlayerInput(dt) {
  if (state.keys.left) {
    state.player.x -= state.player.speed * dt
  }

  if (state.keys.right) {
    state.player.x += state.player.speed * dt
  }

  state.player.x = Math.max(1, Math.min(GAME_WIDTH - PLAYER_WIDTH - 1, state.player.x))

  if (state.fireCooldown > 0) {
    state.fireCooldown -= dt
  }

  if (state.keys.fire && state.fireCooldown <= 0 && state.bullets.length < 2) {
    state.bullets.push({
      x: Math.round(state.player.x) + 2,
      y: state.player.y - 1,
      speed: 24
    })
    state.fireCooldown = 0.34
  }
}

function updateBullets(dt) {
  state.bullets = state.bullets
    .map((bullet) => ({ ...bullet, y: bullet.y - bullet.speed * dt }))
    .filter((bullet) => bullet.y >= 0)

  state.alienBullets = state.alienBullets
    .map((bullet) => ({ ...bullet, y: bullet.y + bullet.speed * dt }))
    .filter((bullet) => bullet.y < GAME_HEIGHT)
}

function getAliveAliens() {
  return state.aliens.filter((alien) => alien.alive)
}

function getAlienSprite(alien) {
  const type = ALIEN_TYPES[alien.typeIndex]
  return type.frames[state.frameFlip ? 1 : 0]
}

function updateAliens(dt) {
  const aliveAliens = getAliveAliens()

  if (aliveAliens.length === 0) {
    state.waveCooldown -= dt * 60

    if (state.waveCooldown <= 0) {
      state.level += 1
      state.shields = createShields()
      resetRoundPositions()
      createWave(state.level)
      updateHud()
    }

    return
  }

  const baseStep = Math.max(0.14, 0.56 - state.level * 0.035)
  const pressure = Math.max(0.26, aliveAliens.length / state.aliens.length)
  const stepInterval = baseStep * pressure

  state.alienStepTimer += dt

  if (state.alienStepTimer >= stepInterval) {
    state.alienStepTimer = 0
    state.frameFlip = !state.frameFlip

    const leftMost = Math.min(...aliveAliens.map((alien) => alien.x))
    const rightMost = Math.max(...aliveAliens.map((alien) => alien.x + 4))
    const nextLeft = leftMost + state.alienDirection
    const nextRight = rightMost + state.alienDirection

    if (nextLeft <= 1 || nextRight >= GAME_WIDTH - 2) {
      state.alienDirection *= -1
      aliveAliens.forEach((alien) => {
        alien.y += 1
      })
    } else {
      aliveAliens.forEach((alien) => {
        alien.x += state.alienDirection
      })
    }
  }

  const invasionLine = state.player.y - 1

  if (aliveAliens.some((alien) => alien.y + 2 >= invasionLine)) {
    endGame("Los marcianitos tocaron la linea de defensa. Enter para reiniciar.")
    return
  }

  state.alienShotTimer -= dt * 60

  const shotDelay = Math.max(16, 48 - state.level * 3)

  if (state.alienShotTimer <= 0 && state.alienBullets.length < 4 + Math.floor(state.level / 2)) {
    fireAlienBullet(aliveAliens)
    state.alienShotTimer = shotDelay
  }
}

function fireAlienBullet(aliveAliens) {
  const columns = new Map()

  aliveAliens.forEach((alien) => {
    const column = alien.x
    const current = columns.get(column)

    if (!current || alien.y > current.y) {
      columns.set(column, alien)
    }
  })

  const shooters = Array.from(columns.values())

  if (shooters.length === 0) {
    return
  }

  const shooter = shooters[Math.floor(Math.random() * shooters.length)]

  state.alienBullets.push({
    x: shooter.x + 2,
    y: shooter.y + 3,
    speed: 10 + state.level * 0.7
  })
}

function damageShieldAt(x, y) {
  const targetX = Math.round(x)
  const targetY = Math.round(y)

  for (const shield of state.shields) {
    const directKey = `${targetX},${targetY}`

    if (shield.cells.has(directKey)) {
      shield.cells.delete(directKey)

      const splash = [
        `${targetX - 1},${targetY}`,
        `${targetX},${targetY + 1}`,
        `${targetX + 1},${targetY}`
      ]

      splash.forEach((key) => {
        if (Math.random() > 0.45) {
          shield.cells.delete(key)
        }
      })

      return true
    }
  }

  return false
}

function bulletHitsAlien(bullet, alien) {
  return (
    bullet.x >= alien.x &&
    bullet.x <= alien.x + 4 &&
    bullet.y >= alien.y &&
    bullet.y <= alien.y + 2
  )
}

function loseLife() {
  state.lives -= 1
  updateHud()

  if (state.lives <= 0) {
    endGame("La base cayo. Enter para una nueva partida.")
    return
  }

  addExplosion(Math.round(state.player.x) + 2, state.player.y, 18)
  resetRoundPositions()
  setStatus(`Impacto recibido. Quedan ${state.lives} vidas.`, 150)
}

function endGame(message) {
  state.running = false
  state.gameOver = true
  state.paused = false
  saveHighscore()
  updateHud()
  setStatus(message, 9999)
}

function resolveCollisions() {
  const remainingPlayerBullets = []

  for (const bullet of state.bullets) {
    let consumed = false

    for (const alien of state.aliens) {
      if (!alien.alive) {
        continue
      }

      if (bulletHitsAlien(bullet, alien)) {
        alien.alive = false
        consumed = true
        const alienType = ALIEN_TYPES[alien.typeIndex]
        state.score += alienType.points
        saveHighscore()
        addExplosion(alien.x + 2, alien.y + 1)
        updateHud()
        break
      }
    }

    if (!consumed && damageShieldAt(bullet.x, bullet.y)) {
      consumed = true
    }

    if (!consumed) {
      for (const alienBullet of state.alienBullets) {
        const sameColumn = Math.abs(alienBullet.x - bullet.x) <= 0.3
        const sameRow = Math.abs(alienBullet.y - bullet.y) <= 0.6

        if (sameColumn && sameRow) {
          alienBullet.hit = true
          consumed = true
          addExplosion(Math.round(bullet.x), Math.round(bullet.y), 8)
          break
        }
      }
    }

    if (!consumed) {
      remainingPlayerBullets.push(bullet)
    }
  }

  state.bullets = remainingPlayerBullets
  const remainingAlienBullets = []

  for (const bullet of state.alienBullets) {
    if (bullet.hit) {
      continue
    }

    let consumed = false

    if (damageShieldAt(bullet.x, bullet.y)) {
      consumed = true
    }

    const canHitPlayer = state.invulnerableTimer <= 0
    const insidePlayerX = bullet.x >= state.player.x && bullet.x <= state.player.x + 4
    const insidePlayerY = bullet.y >= state.player.y && bullet.y <= state.player.y + 1

    if (!consumed && canHitPlayer && insidePlayerX && insidePlayerY) {
      consumed = true
      loseLife()
    }

    if (!consumed) {
      remainingAlienBullets.push(bullet)
    }
  }

  state.alienBullets = remainingAlienBullets
}

function updateExplosions(dt) {
  state.explosions = state.explosions
    .map((explosion) => ({ ...explosion, life: explosion.life - dt * 60 }))
    .filter((explosion) => explosion.life > 0)
}

function updateStatus(dt) {
  if (state.statusTimer > 0) {
    state.statusTimer -= dt * 60
  }

  statusElement.textContent = state.statusMessage
}

function drawTextCentered(buffer, row, text) {
  const startX = Math.max(0, Math.floor((GAME_WIDTH - text.length) / 2))

  text.split("").forEach((char, index) => {
    if (buffer[row] && buffer[row][startX + index] !== undefined) {
      buffer[row][startX + index] = char
    }
  })
}

function buildBuffer() {
  const buffer = Array.from({ length: GAME_HEIGHT }, () =>
    Array.from({ length: GAME_WIDTH }, () => " ")
  )

  state.stars.forEach((star) => {
    const frame = Math.floor((performance.now() / 80 + star.offset) % star.blink)
    buffer[star.y][star.x] = frame < 2 ? "*" : frame < 4 ? "+" : "."
  })

  state.shields.forEach((shield) => {
    shield.cells.forEach((cell) => {
      const [x, y] = cell.split(",").map(Number)

      if (buffer[y] && buffer[y][x] !== undefined) {
        buffer[y][x] = "#"
      }
    })
  })

  state.aliens.forEach((alien) => {
    if (!alien.alive) {
      return
    }

    const sprite = getAlienSprite(alien)

    sprite.forEach((row, rowIndex) => {
      row.split("").forEach((char, columnIndex) => {
        const y = alien.y + rowIndex
        const x = alien.x + columnIndex

        if (char !== " " && buffer[y] && buffer[y][x] !== undefined) {
          buffer[y][x] = char
        }
      })
    })
  })

  state.bullets.forEach((bullet) => {
    const x = Math.round(bullet.x)
    const y = Math.round(bullet.y)

    if (buffer[y] && buffer[y][x] !== undefined) {
      buffer[y][x] = "!"
    }
  })

  state.alienBullets.forEach((bullet) => {
    const x = Math.round(bullet.x)
    const y = Math.round(bullet.y)

    if (buffer[y] && buffer[y][x] !== undefined) {
      buffer[y][x] = "|"
    }
  })

  if (state.invulnerableTimer <= 0 || Math.floor(state.invulnerableTimer * 10) % 2 === 0) {
    PLAYER_SPRITE.forEach((row, rowIndex) => {
      row.split("").forEach((char, columnIndex) => {
        const y = state.player.y + rowIndex
        const x = Math.round(state.player.x) + columnIndex

        if (char !== " " && buffer[y] && buffer[y][x] !== undefined) {
          buffer[y][x] = char
        }
      })
    })
  }

  state.explosions.forEach((explosion) => {
    const symbol = explosion.life > 10 ? "*" : explosion.life > 5 ? "+" : "x"
    const points = [
      [explosion.x, explosion.y],
      [explosion.x - 1, explosion.y],
      [explosion.x + 1, explosion.y],
      [explosion.x, explosion.y - 1],
      [explosion.x, explosion.y + 1]
    ]

    points.forEach(([x, y]) => {
      if (buffer[y] && buffer[y][x] !== undefined) {
        buffer[y][x] = symbol
      }
    })
  })

  if (state.paused) {
    drawTextCentered(buffer, 13, "== PAUSA TACTICA ==")
    drawTextCentered(buffer, 15, "Presiona P para volver")
  }

  if (state.gameOver) {
    drawTextCentered(buffer, 12, "== GAME OVER ==")
    drawTextCentered(buffer, 14, `PUNTAJE ${state.score.toString().padStart(6, "0")}`)
    drawTextCentered(buffer, 16, "Enter reinicia la partida")
  }

  if (!state.gameOver && getAliveAliens().length === 0) {
    drawTextCentered(buffer, 13, "Sector despejado")
    drawTextCentered(buffer, 15, "Preparando siguiente oleada")
  }

  return buffer.map((row) => row.join("")).join("\n")
}

function update(dt) {
  if (state.paused || state.gameOver) {
    updateExplosions(dt)
    updateStatus(dt)
    return
  }

  if (state.invulnerableTimer > 0) {
    state.invulnerableTimer -= dt
  }

  handlePlayerInput(dt)
  updateBullets(dt)
  updateAliens(dt)
  resolveCollisions()
  updateExplosions(dt)
  updateStatus(dt)
}

function render() {
  screenElement.textContent = buildBuffer()
}

function loop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp
  }

  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.05)
  state.lastTime = timestamp

  update(dt)
  render()
  requestAnimationFrame(loop)
}

function setKeyState(control, pressed) {
  if (control === "left") {
    state.keys.left = pressed
  }

  if (control === "right") {
    state.keys.right = pressed
  }

  if (control === "fire") {
    state.keys.fire = pressed
  }
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase()

  if (["arrowleft", "arrowright", " ", "p", "enter", "a", "d"].includes(key)) {
    event.preventDefault()
  }

  if (key === "arrowleft" || key === "a") {
    state.keys.left = true
  }

  if (key === "arrowright" || key === "d") {
    state.keys.right = true
  }

  if (key === " ") {
    state.keys.fire = true
  }

  if (key === "p" && !state.gameOver) {
    state.paused = !state.paused
    setStatus(
      state.paused
        ? "Juego en pausa. Presiona P para seguir."
        : "Regresaste al combate. Buena caceria.",
      140
    )
  }

  if (key === "enter" && state.gameOver) {
    resetGame()
  }
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase()

  if (key === "arrowleft" || key === "a") {
    state.keys.left = false
  }

  if (key === "arrowright" || key === "d") {
    state.keys.right = false
  }

  if (key === " ") {
    state.keys.fire = false
  }
}

function clearKeys() {
  state.keys.left = false
  state.keys.right = false
  state.keys.fire = false
}

function registerTouchControls() {
  controlButtons.forEach((button) => {
    const control = button.dataset.control

    const press = (event) => {
      event.preventDefault()
      setKeyState(control, true)
    }

    const release = (event) => {
      event.preventDefault()
      setKeyState(control, false)
    }

    button.addEventListener("pointerdown", press)
    button.addEventListener("pointerup", release)
    button.addEventListener("pointerleave", release)
    button.addEventListener("pointercancel", release)
  })
}

window.addEventListener("keydown", handleKeyDown)
window.addEventListener("keyup", handleKeyUp)
window.addEventListener("blur", clearKeys)

resetGame()
registerTouchControls()
render()
requestAnimationFrame(loop)
