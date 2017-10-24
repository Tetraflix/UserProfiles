const { Pool } = require('pg');
const config = require('./config');
const db = require('./database');
const seed = require('./seedData');

const pool = new Pool(config);

const userProfiles = `
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id SERIAL UNIQUE NOT NULL PRIMARY KEY,
    group_id INTEGER,
    age INTEGER,
    gender VARCHAR(10),
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
  .then(() => Promise.all(seed.users.map(user => db.addUser(user))))
  .then(() => Promise.all(seed.movies.map(movieEvent => db.addMovie(movieEvent))))
  .then(() => console.log('DB: tables created and seeded with data'))
  .then(() => pool.end())
  .catch(e => console.error(e.stack));
