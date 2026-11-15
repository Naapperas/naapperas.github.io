import type { APIRoute } from 'astro';
import { blogFeed } from '../../lib/blog';

export const GET: APIRoute = (context) => blogFeed(context);
