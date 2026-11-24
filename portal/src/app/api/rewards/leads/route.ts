import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/rewards/leads -> Obtener la lista de leads (Multi-tenant)
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const status = searchParams.get('status')?.trim() || ''; // PENDING, REDEEMED, EXPIRED

    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
    const filterClientId = searchParams.get('clientId');

    // Condición Multi-tenant estricta:
    // Si es CLIENT, userId DEBE ser su id. Si es SUPER_ADMIN, puede ver todos o filtrar por cliente.
    const userIdFilter = isSuperAdmin 
      ? (filterClientId && filterClientId !== 'all' ? filterClientId : undefined)
      : currentUser.id;

    // Actualizar automáticamente los códigos expirados
    const now = new Date();
    await prisma.rewardLead.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    const whereCondition: any = {
      ...(userIdFilter ? { userId: userIdFilter } : {}),
      ...(status && status !== 'all' ? { status } : {}),
    };

    if (search) {
      whereCondition.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { whatsapp: { contains: search, mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.rewardLead.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      include: {
        screen: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error('Error fetching reward leads:', error);
    return NextResponse.json({ error: 'Error obteniendo los leads' }, { status: 500 });
  }
}
