import { remRoute } from '@/server/rem-chat';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return remRoute(request, 'history'); }
