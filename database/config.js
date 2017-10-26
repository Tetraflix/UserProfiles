// For Development
const config = {
  user: 'user',
  host: 'localhost',
  database: 'profiles',
  password: null,
  port: 5432,
  max: 10, // max number of connections
  idleTimeoutMillis: 1000, // timeout in milliseconds
};

// For Deployment
// const config = {
//   connectionString: process.env.DATABASE_URL,
//   ssl: true,
// };

module.exports = config;
