import { env } from 'cloudflare:workers';
import { handleApi } from '../../../domain/api.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return handleApi(request, env.DB); }
