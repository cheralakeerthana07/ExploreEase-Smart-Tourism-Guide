const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split('$');
    const testHash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash), Buffer.from(hash));
  } catch (err) {
    return false;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detail: 'Method not allowed' }),
    };
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        detail: 'Database not configured. Please add DATABASE_URL in Netlify Environment variables.',
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detail: 'Invalid JSON payload' }),
    };
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  try {
    const cleanUrl = databaseUrl.replace(/[&?]channel_binding=[^&]*/g, '');
    const sql = neon(cleanUrl);

    const rows = await sql`
      SELECT id, name, email, password_hash
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    if (rows.length === 0 || !verifyPassword(password, rows[0].password_hash)) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detail: 'Invalid email or password.' }),
      };
    }

    const user = rows[0];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detail: `Database error: ${error.message}` }),
    };
  }
};
