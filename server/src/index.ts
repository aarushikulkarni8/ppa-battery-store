// Long-running server: local development, Docker and hosts such as Render.
import app from './app.js';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { verifyMailer } from './services/mailer.js';
import { startReminderScheduler } from './services/reminders.js';

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
