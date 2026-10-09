import { env } from 'cloudflare:workers';
import { handleApi } from '../../../domain/api.mjs';
export async function POST(request: Request) { return handleApi(request, env.DB); }
