// Vercel entry point: no server stays running, so connect to the database when a request arrives
// and reuse that connection for later requests handled by the same instance.
import type { IncomingMessage, ServerResponse } from 'node:http';
import app from './app.js';
import { connectDb } from './config/db.js';

let connection: Promise<void> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    connection ??= connectDb();
    await connection;
  } catch (e) {
    connection = null; // try again on the next request
    console.error('[db] connection failed:', (e as Error).message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'The database is not reachable right now. Please try again shortly.' }));
    return;
  }
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
