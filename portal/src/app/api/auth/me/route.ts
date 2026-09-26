import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan
          ? {
              id: user.plan.id,
              name: user.plan.name,
              slug: user.plan.slug,
              description: user.plan.description,
              games: user.plan.games.map(g => ({
                id: g.id,
                name: g.name,
                slug: g.slug,
              })),
            }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching session user' }, { status: 500 });
  }
}
