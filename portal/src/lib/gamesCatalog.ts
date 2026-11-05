export type CatalogGame = {
  id?: string;
  slug: string;
  name: string;
  icon: string;
  genre: string;
  description: string;
  controls?: string;
  isIncluded?: boolean;
};

export const ARCADE_GAMES_CATALOG: CatalogGame[] = [
  {
    slug: 'arkanoid',
    name: 'Arkanoid Clon',
    icon: '🧱',
    genre: 'Breakout / Arcade',
    description: 'Clásico rompe-bloques con paleta deflectora, física de rebote balístico y potenciadores.',
    controls: 'Deslizador táctil horizontal / Flechas y teclas A-D',
  },
  {
    slug: 'circus',
    name: 'Circus Charlie',
    icon: '🎪',
    genre: 'Arcade / Platformer',
    description: 'El inolvidable clásico de circo: monta al león saltando aros de fuego y salta camas elásticas.',
    controls: 'Joystick virtual analógico y Botón de Salto ★ / Flechas o WASD, Espacio',
  },
  {
    slug: 'cybercanyon',
    name: 'Cyber Canyon',
    icon: '🚀',
    genre: 'Simulador / Vuelo 3D',
    description: 'Vuelo supersónico en primera persona a través de un cañón cibernético de vectores CRT.',
    controls: 'Joystick virtual 360° / Flechas de cursor y WASD',
  },
  {
    slug: 'duckhunt',
    name: 'Duck Hunt',
    icon: '🦆',
    genre: 'Shooter / Arcade NES',
    description: 'El mítico clásico de cacería de patos con la Light Gun Zapper, el perro cazador y rondas progresivas.',
    controls: 'Trackpad de mira Zapper + Gatillo / Ratón o Flechas y Espacio',
  },
  {
    slug: 'galaga',
    name: 'Galaga Clon',
    icon: '🚀',
    genre: 'Space Shooter',
    description: 'Shooter espacial clásico contra escuadrones de insectoides alienígenas en formación dinámica.',
    controls: 'Deslizador horizontal y botón de disparo táctil / Flechas y Espacio',
  },
  {
    slug: 'invaders',
    name: 'Space Invaders Clon',
    icon: '👾',
    genre: 'Fixed Shooter',
    description: 'Defensa de la Tierra contra oleadas alienígenas descendentes con búnkeres de protección destructibles.',
    controls: 'Botones de dirección y disparo láser táctil / Flechas y Espacio',
  },
  {
    slug: 'megaman',
    name: 'Mega Man Arcade',
    icon: '🤖',
    genre: 'Action / Run & Gun',
    description: 'El clásico bombardero azul de Capcom: corre, salta, dispara el Mega Buster cargable y derrota a los jefes.',
    controls: 'D-Pad direccional / Botones Salto, Mega Buster cargable y Deslizamiento (Slide)',
  },
  {
    slug: 'outrun',
    name: 'OutRun Clon',
    icon: '🏎️',
    genre: 'Arcade Racing',
    description: 'Carrera retro a alta velocidad con bifurcaciones de ruta hacia 5 metas distintas y reloj contrarreloj.',
    controls: 'Volante digital, acelerador y freno táctil / Flechas o WASD',
  },
  {
    slug: 'pacman',
    name: 'Pacman Clon',
    icon: '🟡',
    genre: 'Maze / Arcade',
    description: 'Laberinto retro donde Pacman recolecta puntos y frutas huyendo de los 4 fantasmas.',
    controls: 'D-Pad táctil / Teclas de flecha',
  },
  {
    slug: 'pinball',
    name: 'Pinball Arcade',
    icon: '⚡',
    genre: 'Arcade / Physics Pinball',
    description: 'Mesa arcade de pinball retro con bumpers luminosos, flippers de alta respuesta, rampas y multibola.',
    controls: 'Flippers izquierdo/derecho y resorte de lanzamiento / Teclas Z, X y Espacio',
  },
  {
    slug: 'skyroads',
    name: 'Skyroads Clon',
    icon: '🛸',
    genre: 'Space Platformer / Racing',
    description: 'Nave espacial recorriendo túneles y plataformas en gravedad cero con saltos y turbo.',
    controls: 'Joystick analógico virtual + Botones Salto, Turbo y Freno / Teclas de flecha + Espacio',
  },
  {
    slug: 'snake',
    name: 'Snake Clon',
    icon: '🐍',
    genre: 'Arcade Retro',
    description: 'La serpiente retro clásica que crece al devorar píldoras, evitando colisiones con bordes y su propio cuerpo.',
    controls: 'D-Pad direccional y gestos táctiles de deslizamiento (Swipe) / Flechas del teclado',
  },
  {
    slug: 'starwars',
    name: 'Star Wars: Falcon',
    icon: '🛸',
    genre: 'Shooter Espacial 3D',
    description: 'Pilota el legendario Halcón Milenario esquivando asteroides y combatiendo cazas imperiales en 3D.',
    controls: 'Joystick virtual 360° y Cañón Láser / Flechas de cursor y Espacio',
  },
];

export function getGameUrl(slug: string, screenId: string = 'DEMO'): string {
  if (typeof window === 'undefined') {
    return `https://games.myplayad.com/${slug}/?screenId=${screenId}`;
  }
  const hostname = window.location.hostname;
  const isDev =
    hostname.includes('dev') ||
    hostname.includes('staging') ||
    hostname.includes('localhost') ||
    hostname === '127.0.0.1';
  // En dev/staging/localhost se usa dev.myplayad.com; en producción el host oficial es games.myplayad.com
  const base = isDev ? 'https://dev.myplayad.com' : 'https://games.myplayad.com';
  return `${base}/${slug}/?screenId=${screenId}`;
}

export function getControllerUrl(slug: string, roomId?: string): string {
  if (typeof window === 'undefined') {
    return `https://controllers.myplayad.com/${slug}/`;
  }
  const hostname = window.location.hostname;
  const isDev =
    hostname.includes('dev') ||
    hostname.includes('staging') ||
    hostname.includes('localhost') ||
    hostname === '127.0.0.1';
  const base = isDev ? 'https://dev-controllers.myplayad.com' : 'https://controllers.myplayad.com';
  return roomId ? `${base}/${slug}/?room=${roomId}` : `${base}/${slug}/`;
}

