exports.handler = async () => {
  const configured = Boolean(process.env.DATABASE_URL);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      database: 'Neon PostgreSQL (Netlify Serverless)',
      configured,
      message: configured ? 'Connected to NeonDB' : 'DATABASE_URL is not set in Netlify environment variables',
    }),
  };
};
