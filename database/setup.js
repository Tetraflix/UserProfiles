const { Pool } = require('pg');
const config = require('./config');
const db = require('./database');
const userData = require('../data-simulation/userData');
const sessionData = require('../data-simulation/sessionData');

const userDataPath = __dirname + '/userData.txt';
const sessionDataPath = __dirname + '/sessionData.txt';

const pool = new Pool(config);

const createUserProfiles = `
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER,
    group_id INTEGER,
    age INTEGER,
    gender VARCHAR(10),
    watched_movies INTEGER[],
    profile INTEGER[]
)`;

const createMovieHistory = `CREATE TABLE IF NOT EXISTS movie_history (
  user_id INTEGER,
  movie_id INTEGER,
  movie_profile INTEGER[],
  start_time TIME
)`;

const populateUserProfiles = `COPY user_profiles
  FROM '${userDataPath}'
  DELIMITER '|'
  CSV HEADER
`;

const populateMovieHistory = `COPY movie_history
  FROM '${sessionDataPath}'
  DELIMITER '|'
  CSV HEADER
`;

const seedDatabase = () => {
  let start;
  let totalTime;
  return pool.query(createUserProfiles)
    .then(() => pool.query(createMovieHistory))
    // Populate database with 1M users
    .then(() => {
      start = new Date();
      return userData.generateUsers();
    })
    .then((userCount) => {
      totalTime = new Date() - start;
      console.log(`Generating ${userCount} users took ${totalTime / 1000} seconds`);
      start = new Date();
      return pool.query(populateUserProfiles);
    })
    .then(() => {
      totalTime = new Date() - start;
      console.log(`Seeding user profiles to db took ${totalTime / 1000} seconds`);
      return db.countUserProfilesRows();
    })
    .then((data) => {
      const { count } = data.rows[0];
      console.log(`Total user profiles in the database: ${count}`);
    })
    // Populate database with ~1M historical movie watching events
    .then(() => {
      start = new Date();
      return sessionData.generateSessionsPerDay(new Date(2017, 8, 1, 0, 0, 0, 0), 1);
    })
    .then((sessionCount) => {
      totalTime = new Date() - start;
      console.log(`Generating ${sessionCount} sessions took ${totalTime / 1000} seconds`);
      start = new Date();
      return pool.query(populateMovieHistory);
    })
    .then(() => {
      totalTime = new Date() - start;
      console.log(`Seeding movie events to db took ${totalTime / 1000} seconds`);
      return db.countMovieHistoryRows();
    })
    .then((data) => {
      const { count } = data.rows[0];
      console.log(`Total movie events in the database: ${count}`);
    })
    .then(() => pool.end())
    .catch(e => console.error(e.stack));
};

module.exports = { seedDatabase };
