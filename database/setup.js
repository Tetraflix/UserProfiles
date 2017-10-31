const { Pool } = require('pg');
const config = require('./config');
const db = require('./database');
const userData = require('../data-simulation/userData');
const sessionData = require('../data-simulation/sessionData');

const userDataPath = `${__dirname}/userData.txt`;
const sessionDataPath = `${__dirname}/sessionData.txt`;

const pool = new Pool(config);

const createUserProfiles = `
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER NOT NULL PRIMARY KEY,
    group_id INTEGER,
    age INTEGER,
    gender VARCHAR(10),
    events INTEGER[],
    profile INTEGER[]
)`;

const createMovieHistory = `CREATE TABLE IF NOT EXISTS movie_history (
  event_id SERIAL NOT NULL PRIMARY KEY,
  user_id INTEGER,
  movie_id INTEGER,
  movie_profile INTEGER[],
  start_time TIMESTAMP
)`;

const populateUserProfiles = `COPY user_profiles
  FROM '${userDataPath}'
  DELIMITER '|'
  CSV HEADER
`;

const populateMovieHistory = `COPY movie_history(user_id, movie_id, movie_profile, start_time)
  FROM '${sessionDataPath}'
  DELIMITER '|'
  CSV HEADER
`;

const seedDatabase = (days = 30, users = 1000000) => {
  let start;
  let totalTime;
  let userMovie;
  return pool.query(createUserProfiles)
    .then(() => pool.query(createMovieHistory))
    // Populate database with ~3M historical movie watching events
    .then(() => {
      start = new Date();
      return sessionData.generateSessionsPerDay(new Date('2017-08-01T12:00:00'), days);
    })
    .then((results) => {
      totalTime = new Date() - start;
      console.log(`Generating ${results.sessionCount} sessions and ${results.eventCount} events took ${totalTime / 1000} seconds`);
      userMovie = results.userMovie;
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
    // Populate database with 1M users
    .then(() => {
      start = new Date();
      return userData.generateUsers(users, userMovie);
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
    .then(() => pool.end())
    .catch(e => console.error(e.stack));
};

module.exports = { seedDatabase };
