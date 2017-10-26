const { Pool } = require('pg');
const config = require('./config');
const db = require('./database');
const userData = require('../data-simulation/userData');

const userDataPath = __dirname + '/userData.txt';

const pool = new Pool(config);

const userProfiles = `
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER,
    group_id INTEGER,
    age INTEGER,
    gender VARCHAR(10),
    watched_movies INTEGER[],
    profile INTEGER[]
)`;

const movieHistory = `CREATE TABLE IF NOT EXISTS movie_history (
  id SERIAL UNIQUE NOT NULL PRIMARY KEY,
  user_id INTEGER,
  movie_id INTEGER,
  movie_profile JSON,
  start_time TIME
)`;

const populateUserProfiles = `COPY user_profiles
  FROM '${userDataPath}'
  DELIMITER '|'
  CSV HEADER
`;

const start = new Date();
pool.query(userProfiles)
  .then(() => pool.query(movieHistory))
  .then(() => userData.generateUsers())
  .then((output) => {
    console.log(output);
    return pool.query(populateUserProfiles);
  })
  .then(() => {
    const totalTime = new Date() - start;
    console.log(`Seeding user profiles to db took ${totalTime / 1000} seconds`);
    return db.countUserProfilesRows();
  })
  .then((data) => {
    const { count } = data.rows[0];
    console.log(`Total user profiles in the database: ${count}`);
  })
  .then(() => pool.end())
  .catch(e => console.error(e.stack));
