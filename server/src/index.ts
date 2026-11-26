import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { errorHandler } from './middleware/error.js';
import { verifyMailer } from './services/mailer.js';
import { runServiceReminders, startReminderScheduler } from './services/reminders.js';
import { LOCAL_UPLOAD_DIR } from './services/images.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import shopRoutes from './routes/shop.js';
import pcbRoutes from './routes/pcb.js';
import enquiryRoutes from './routes/enquiries.js';
import adminCoreRoutes from './routes/admin/core.js';
import adminCatalogRoutes from './routes/admin/catalog.js';
import adminImportRoutes from './routes/admin/import.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '6mb' })); // room for bulk imports
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/enquiries', enquiryRoutes);
// Optional: an external scheduler (e.g. cron-job.org) can call this so reminders go out even if the
// server sleeps between visits. Only active when CRON_SECRET is set in .env.
app.all('/api/cron/service-reminders', async (req, res) => {
  if (!env.CRON_SECRET || req.query.key !== env.CRON_SECRET) return void res.status(404).json({ message: 'Not found' });
  res.json(await runServiceReminders());
});

app.use('/api/admin', adminCoreRoutes);
app.use('/api/admin', adminCatalogRoutes);
app.use('/api/admin', adminImportRoutes);
app.use('/api', catalogRoutes);
app.use('/api', pcbRoutes);
app.use('/api', shopRoutes);
app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));

// Serve the built React app in production (npm run build at the repo root).
const here = path.dirname(fileURLToPath(import.meta.url));
// photos saved locally when Cloudinary isn't set up (your own computer only)
app.use('/uploads', express.static(LOCAL_UPLOAD_DIR, { maxAge: '7d', fallthrough: false }));

const clientDist = path.resolve(here, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

connectDb()
  .then(() => {
    app.listen(env.PORT, () => console.log(`[api] listening on http://localhost:${env.PORT}`));
    verifyMailer();
    startReminderScheduler();
  })
  .catch((e) => {
    console.error('[db] connection failed:', e.message);
    process.exit(1);
  });
