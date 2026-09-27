import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getUserFromApiRequest } from '@/lib/auth';
import { publishSyncEvent } from '@/lib/mqttPublisher';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const currentUser = await getUserFromApiRequest(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { title, screenId, filename, clientId } = req.body;

    if (!title || !filename) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    let ownerUserId: string | null = null;
    let targetScreen = null;

    if (screenId && screenId !== 'none' && screenId !== 'pool') {
      targetScreen = await prisma.screen.findUnique({
        where: { id: screenId },
        include: {
          user: {
            include: { plan: true }
          }
        }
      });

      if (!targetScreen) {
        return res.status(404).json({ error: 'Pantalla no encontrada' });
      }
    }

    if (currentUser.role === 'CLIENT') {
      ownerUserId = currentUser.id;

      if (targetScreen) {
        if (targetScreen.userId !== currentUser.id) {
          return res.status(403).json({ error: 'Acceso denegado a esta pantalla' });
        }

        // Validar límite del plan del cliente
        const maxVideos = currentUser.plan?.maxVideosPerScreen ?? 5;
        const currentVideosCount = await prisma.schedule.count({
          where: {
            screenId: targetScreen.id,
            videoId: { not: null },
            isActive: true,
          }
        });

        if (currentVideosCount >= maxVideos) {
          return res.status(403).json({
            error: `Has alcanzado el límite de ${maxVideos} videos para esta pantalla según tu plan (${currentUser.plan?.name || 'Básico'}). Mejora tu plan o desasigna un video previo.`
          });
        }
      }
    } else {
      // SUPER_ADMIN
      if (clientId && clientId !== 'none') {
        ownerUserId = clientId;
      } else if (targetScreen?.userId) {
        ownerUserId = targetScreen.userId;
      }
    }

    const video = await prisma.video.create({
      data: {
        title: String(title).trim(),
        filename,
        userId: ownerUserId,
      },
    });

    if (targetScreen) {
      await prisma.schedule.create({
        data: {
          screenId: targetScreen.id,
          videoId: video.id,
          startDate: new Date(),
          isActive: true,
        }
      });

      await publishSyncEvent(targetScreen.id);
    }

    return res.status(200).json({ success: true, video });
  } catch (err: any) {
    console.error('Error in upload API:', err);
    return res.status(500).json({ error: 'Error registrando video en base de datos' });
  }
}
