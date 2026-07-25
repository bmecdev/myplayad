'use server';

import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function uploadVideoAction(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const screenId = formData.get('screenId') as string;

    if (!file || !title || !screenId) {
      return { success: false, error: 'Missing required fields' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    
    // Create directory for screen if it doesn't exist
    const screenDir = path.join('/srv/videos', screenId);
    if (!fs.existsSync(screenDir)) {
      fs.mkdirSync(screenDir, { recursive: true });
    }

    const filepath = path.join(screenDir, filename);
    fs.writeFileSync(filepath, buffer);

    const video = await prisma.video.create({
      data: {
        title,
        filename: `${screenId}/${filename}`, // Store relative path
      },
    });

    // Automatically create a schedule assigning this video to the screen
    await prisma.schedule.create({
      data: {
        screenId,
        videoId: video.id,
        startDate: new Date(),
        // isActive: true by default
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error uploading video:', error);
    return { success: false, error: 'Error uploading video' };
  }
}
