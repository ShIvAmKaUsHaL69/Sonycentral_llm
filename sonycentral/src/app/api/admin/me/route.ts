export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: /api/admin/me?email=...
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ message: 'Email is required' }, { status: 400 });
  }
  const [rows] = await db.query('SELECT name, email FROM admin WHERE email = ?', [email]) as [any[], any];
  if ((rows as any[]).length > 0) {
    return NextResponse.json(rows[0]);
  }
  return NextResponse.json({ message: 'Admin not found' }, { status: 404 });
}

// PATCH: update name
export async function PATCH(req: Request) {
  const { name, email } = await req.json();
  if (!name || !email) {
    return NextResponse.json({ message: 'Name and email are required' }, { status: 400 });
  }
  await db.query('UPDATE admin SET name = ? WHERE email = ?', [name, email]);
  return NextResponse.json({ message: 'Name updated' });
}

// POST: change password
export async function POST(req: Request) {
  const { email, currentPassword, newPassword } = await req.json();
  if (!email || !currentPassword || !newPassword) {
    return NextResponse.json({ message: 'Email, current password, and new password are required' }, { status: 400 });
  }
  // Check current password
  const [rows] = await db.query('SELECT password FROM admin WHERE email = ?', [email]);
  if ((rows as any[]).length === 0) {
    return NextResponse.json({ message: 'Admin not found' }, { status: 404 });
  }
  const admin = (rows as any[])[0];
  if (admin.password !== currentPassword) {
    return NextResponse.json({ message: 'Current password is incorrect' }, { status: 401 });
  }
  // Update password
  await db.query('UPDATE admin SET password = ? WHERE email = ?', [newPassword, email]);
  return NextResponse.json({ message: 'Password updated' });
} 