const pool = require('../../config/db');
const authService = require('../auth/auth.service');
const profilesRepo = require('../profiles/profiles.repo');
const { buildProfileColumns, composeRawText } = require('../profiles/profiles.service');
const jobsRepo = require('../pipeline/jobs.repo');

// One transaction: create user + profile, enqueue the extraction job.
async function submit({ email, password, fullName, role, profile }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await authService.createUser(client, { email, password, fullName, role });
    const cols = buildProfileColumns(role, profile);
    cols.onboarding_raw_text = composeRawText(role, fullName, profile);
    const profileRow = await profilesRepo.insert(client, user.id, role, cols);
    const jobId = await jobsRepo.enqueue(client, { userId: user.id, type: 'profile_extraction' });
    await client.query('COMMIT');
    return {
      user: authService.sanitize(user),
      token: authService.issueToken(user),
      profile: profilesRepo.fromDb(profileRow),
      pipelineJobId: jobId,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function status(userId) {
  const job = await jobsRepo.latestForUser(userId, 'profile_extraction');
  if (!job) return { status: 'none' };
  return {
    status: job.status,
    attempts: job.attempts,
    error: job.status === 'failed' ? job.last_error : null,
    updatedAt: job.updated_at,
  };
}

module.exports = { submit, status };
