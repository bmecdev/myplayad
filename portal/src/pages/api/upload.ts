import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { title, screenId, filename } = req.body;

    if (!title || !filename) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const video = await prisma.video.create({
      data: {
        title,
        filename,
      },
    });

    if (screenId && screenId !== 'none') {
      await prisma.schedule.create({
        data: {
          screenId,
          videoId: video.id,
          startDate: new Date(),
        }
      });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error in upload API:', err);
    return res.status(500).json({ error: 'Error registering video in database' });
  }
}
