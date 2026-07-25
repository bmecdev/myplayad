import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Disable Next.js built-in body parser so formidable can handle the stream directly
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const uploadDir = '/srv/videos/tmp';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    maxFileSize: 500 * 1024 * 1024, // 500MB
    uploadDir,
    keepExtensions: true,
  });

  try {
    const [fields, files] = await form.parse(req);

    const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
    const screenId = Array.isArray(fields.screenId) ? fields.screenId[0] : fields.screenId;
    const fileArray = Array.isArray(files.file) ? files.file : [files.file];
    const file = fileArray[0];

    if (!file || !title || !screenId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const filename = `${Date.now()}-${file.originalFilename?.replace(/\s+/g, '-') || 'video.mp4'}`;
    const screenDir = path.join('/srv/videos', screenId);
    if (!fs.existsSync(screenDir)) {
      fs.mkdirSync(screenDir, { recursive: true });
    }

    const finalPath = path.join(screenDir, filename);
    
    // Move file to final location
    fs.renameSync(file.filepath, finalPath);

    const video = await prisma.video.create({
      data: {
        title,
        filename: `${screenId}/${filename}`,
      },
    });

    await prisma.schedule.create({
      data: {
        screenId,
        videoId: video.id,
        startDate: new Date(),
      }
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error in upload API:', err);
    return res.status(500).json({ error: 'Error uploading video' });
  }
}
