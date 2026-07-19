const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const SALT_ROUNDS = 10;

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function sanitize(user) {
  return { id: user.id, email: user.email, role: user.role, fullName: user.full_name };
}

async function createUser(client, { email, password, fullName, role }) {
  const normalized = String(email).trim().toLowerCase();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, full_name`,
      [normalized, hash, role, fullName]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const conflict = new Error('Email already registered');
      conflict.status = 409;
      throw conflict;
    }
    throw err;
  }
}

async function login({ email, password }) {
  const normalized = String(email).trim().toLowerCase();
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, role, full_name FROM users WHERE email = $1',
    [normalized]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  return { user: sanitize(user), token: issueToken(user) };
}

async function getMe(userId) {
  const { rows } = await pool.query(
    'SELECT id, email, role, full_name FROM users WHERE id = $1',
    [userId]
  );
  if (!rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return sanitize(rows[0]);
}

module.exports = { issueToken, sanitize, createUser, login, getMe };
