import crypto from 'crypto';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE_NAME = 'myplayad_session';
const SECRET_KEY = process.env.SESSION_SECRET || 'myplayad-session-secret-key-2026';

export type UserRole = 'SUPER_ADMIN' | 'CLIENT';

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  planId?: string | null;
  planName?: string | null;
  exp: number;
}

// Genera un hash seguro con sal para contraseñas
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verifica si la contraseña coincide con el hash almacenado
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  
  // Soporte para contraseñas legacy en texto plano
  if (!storedHash.includes(':')) {
    return password === storedHash;
  }
  
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Crea un token de sesión firmado con HMAC-SHA256
export function createSessionToken(payload: Omit<SessionPayload, 'exp'>, expiresInDays = 7): string {
  const exp = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const data: SessionPayload = { ...payload, exp };
  
  const payloadBase64 = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payloadBase64).digest('base64url');
  
  return `${payloadBase64}.${signature}`;
}

// Verifica la firma y la fecha de expiración del token de sesión
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || !token.includes('.')) return null;

  const [payloadBase64, signature] = token.split('.');
  if (!payloadBase64 || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(payloadBase64).digest('base64url');
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expirado
    }
    return payload;
  } catch {
    return null;
  }
}

// Inicializa el Super Admin por defecto y los planes iniciales si aún no existen en la BD
export async function ensureSuperAdminAndDefaultPlans() {
  try {
    // 1. Verificar si existe algún Super Admin
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    const defaultAdminUser = process.env.ADMIN_USER || 'admin';
    const defaultAdminPass = process.env.ADMIN_PASSWORD || 'myplayad123';

    if (!superAdmin) {
      const existingUser = await prisma.user.findUnique({
        where: { username: defaultAdminUser }
      });

      if (!existingUser) {
        await prisma.user.create({
          data: {
            username: defaultAdminUser,
            password: hashPassword(defaultAdminPass),
            name: 'Super Administrador',
            role: 'SUPER_ADMIN',
          }
        });
      } else {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'SUPER_ADMIN' }
        });
      }
    }

    // 2. Verificar y sembrar planes por defecto si no hay ninguno
    const plansCount = await prisma.plan.count();
    if (plansCount === 0) {
      // Buscar juegos disponibles en la base de datos
      const allGames = await prisma.game.findMany();
      const snakeGame = allGames.find(g => g.slug === 'snake');
      const arkanoidGame = allGames.find(g => g.slug === 'arkanoid');
      const invadersGame = allGames.find(g => g.slug === 'invaders');
      const galagaGame = allGames.find(g => g.slug === 'galaga');
      const outrunGame = allGames.find(g => g.slug === 'outrun');

      // Plan Básico: Snake y Arkanoid
      const basicGames = [snakeGame, arkanoidGame].filter(Boolean) as { id: string }[];
      await prisma.plan.create({
        data: {
          name: 'Plan Básico',
          slug: 'basic',
          description: 'Acceso a juegos arcade esenciales (Snake y Arkanoid).',
          games: {
            connect: basicGames.map(g => ({ id: g.id }))
          }
        }
      });

      // Plan Pro: Básico + Invaders y Galaga
      const proGames = [snakeGame, arkanoidGame, invadersGame, galagaGame].filter(Boolean) as { id: string }[];
      await prisma.plan.create({
        data: {
          name: 'Plan Arcade Pro',
          slug: 'pro',
          description: 'Acceso al catálogo arcade ampliado (Snake, Arkanoid, Invaders, Galaga).',
          games: {
            connect: proGames.map(g => ({ id: g.id }))
          }
        }
      });

      // Plan VIP / Enterprise: Todos los juegos disponibles
      await prisma.plan.create({
        data: {
          name: 'Plan VIP Todo Incluido',
          slug: 'vip',
          description: 'Acceso ilimitado a todos los juegos arcade presentes y futuros de MyPlayAd.',
          games: {
            connect: allGames.map(g => ({ id: g.id }))
          }
        }
      });
    }
  } catch (error) {
    console.warn('Error inicializando Super Admin o planes por defecto:', error);
  }
}

// Obtiene el usuario autenticado actual desde las cookies de Next.js
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    // Verificar token firmado
    const payload = verifySessionToken(token);
    if (!payload) return null;

    // Obtener datos frescos del usuario en base de datos
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        plan: {
          include: {
            games: true
          }
        }
      }
    });

    return user;
  } catch {
    return null;
  }
}
