import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/rewards/redeem -> El cliente busca por código o correo y redime el premio
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { query, action } = body; // action: 'SEARCH' | 'REDEEM'
    const searchTerm = String(query || '').trim();

    if (!searchTerm) {
      return NextResponse.json({ error: 'Ingresa un código o correo electrónico' }, { status: 400 });
    }

    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

    // MULTI-TENANT: El cliente SOLO puede buscar y redimir premios asignados a su propio negocio
    const whereTenant: any = isSuperAdmin ? {} : { userId: currentUser.id };

    // Buscar si coincide por código o por email
    const lead = await prisma.rewardLead.findFirst({
      where: {
        ...whereTenant,
        OR: [
          { code: searchTerm.toUpperCase() },
          { email: searchTerm.toLowerCase() },
        ],
      },
      include: {
        screen: { select: { name: true, location: true } },
        user: { select: { name: true } },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'No se encontró ningún premio con ese código o correo en tu establecimiento.' },
        { status: 404 }
      );
    }

    const now = new Date();
    const isExpired = lead.status === 'PENDING' && lead.expiresAt < now;

    // Si solo es consulta (búsqueda)
    if (action === 'SEARCH') {
      const displayStatus = isExpired ? 'EXPIRED' : lead.status;
      return NextResponse.json({
        success: true,
        lead: {
          ...lead,
          status: displayStatus,
        },
      });
    }

    // Si es acción de canje (REDEEM)
    if (lead.status === 'REDEEMED') {
      return NextResponse.json(
        { 
          error: `Este premio ya fue canjeado el ${new Date(lead.redeemedAt!).toLocaleString()}` 
        },
        { status: 400 }
      );
    }

    if (isExpired || lead.status === 'EXPIRED') {
      return NextResponse.json(
        { 
          error: `Este código expiró el ${new Date(lead.expiresAt).toLocaleString()}. Solo era válido de forma inmediata.` 
        },
        { status: 400 }
      );
    }

    // Marcar como canjeado
    const updatedLead = await prisma.rewardLead.update({
      where: { id: lead.id },
      data: {
        status: 'REDEEMED',
        redeemedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      message: `¡Premio "${updatedLead.rewardTitle}" validado y entregado con éxito a ${updatedLead.name}!`,
      lead: updatedLead,
    });
  } catch (error) {
    console.error('Error redeeming reward lead:', error);
    return NextResponse.json({ error: 'Error validando el premio' }, { status: 500 });
  }
}
