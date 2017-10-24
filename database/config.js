// For Development
const config = {
  user: 'user',
  host: 'localhost',
  database: 'profiles',
  password: null,
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000,
};

// For Deployment
// const config = {
//   connectionString: process.env.DATABASE_URL,
//   ssl: true,
// };

module.exports = config;
