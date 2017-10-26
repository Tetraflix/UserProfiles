const { Pool } = require('pg');
const config = require('./config');
const db = require('./database');
const userData = require('../data-simulation/userData');

const pool = new Pool(config);

const userProfiles = `
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER UNIQUE NOT NULL PRIMARY KEY,
    group_id INTEGER,
    age INTEGER,
    gender VARCHAR(10),
    watched_movies INTEGER[],
    action INTEGER,
    animation INTEGER,
    comedy INTEGER,
    documentary INTEGER,
    drama INTEGER,
    family INTEGER,
    fantasy INTEGER,
    horror INTEGER,
    international INTEGER,
    musical INTEGER,
    mystery INTEGER,
    romance INTEGER,
    sci_fi INTEGER,
    thriller INTEGER,
    western INTEGER
)`;

const movieHistory = `CREATE TABLE IF NOT EXISTS movie_history (
  id SERIAL UNIQUE NOT NULL PRIMARY KEY,
  user_id INTEGER,
  movie_id INTEGER,
  movie_profile JSON,
  start_time TIME
)`;

pool.query(userProfiles)
  .then(() => pool.query(movieHistory))
  .then(() => {
    const users = userData.simulateData();
    return Promise.all(users.map(user => db.addUser(user)));
  })
  .then(() => console.log('DB: tables created and seeded with user data'))
  .then(() => pool.end())
  .catch(e => console.error(e.stack));
