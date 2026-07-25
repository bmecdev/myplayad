import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const video = await prisma.video.findUnique({ where: { id } });
    
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Delete physical file
    const filepath = path.join('/srv/videos', video.filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Delete database record (schedules will be cascade-deleted or we must delete them manually if not cascaded)
    // In our schema, Schedule -> Video is not CASCADE onDelete, so let's delete schedules first
    await prisma.schedule.deleteMany({
      where: { videoId: id }
    });

    await prisma.video.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json({ error: 'Error deleting video' }, { status: 500 });
  }
}
