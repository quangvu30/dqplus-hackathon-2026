require('dotenv').config();
const { migrate } = require('../scripts/migrate');
const app = require('./app');
const worker = require('./modules/pipeline/worker');
const meetingCron = require('./jobs/cron');

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  await migrate();
  app.listen(PORT, () => {
    console.log(`backendv2 listening on :${PORT} (docs at /docs)`);
  });
  worker.start();
  meetingCron.start();
}

main().catch((err) => {
  console.error('fatal boot error:', err);
  process.exit(1);
});
