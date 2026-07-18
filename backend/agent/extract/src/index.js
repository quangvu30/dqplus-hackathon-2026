const app = require('./app');
const initSchema = require('./db/init');

const port = process.env.PORT || 3001;

async function start() {
  await initSchema();

  app.listen(port, () => {
    console.log(`Extract agent listening on port ${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start extract agent:', err);
  process.exit(1);
});
