const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config);

const deleteRows = table =>
  pool.query(`
    TRUNCATE TABLE ${table}
    `);

const addUser = user =>
  pool.query(`
    INSERT INTO user_profiles (
    user_id,
    group_id,
    age,
    gender,
    events,
    profile
    ) VALUES (
    ${user.userId},
    ${user.groupId},
    ${user.age},
    '${user.gender}',
    '${user.events}',
    '{${user.profile}}'
    )
  `);

const addMovieEvents = movieEvent =>
  pool.query(`
    INSERT INTO movie_history (
    user_id,
    movie_id,
    movie_profile,
    start_time
    ) VALUES (
    ${movieEvent.userId},
    ${movieEvent.id},
    '{${movieEvent.profile}}',
    '${movieEvent.startTime}' 
    )
  `);

const countMovieHistoryRows = () =>
  pool.query(`
    SELECT count(*) FROM movie_history
  `);

const countUserProfilesRows = () =>
  pool.query(`
    SELECT count(*) FROM user_profiles
  `);

const getMovieEventsByUserId = userId =>
  pool.query(`
    SELECT * FROM movie_history
    WHERE user_id = ${userId}
    ORDER BY start_time
  `);

const updateUserEvents = (userId, eventId) =>
  pool.query(`
    UPDATE user_profiles
    SET events = events || ${eventId}
    WHERE user_id = ${userId}
  `);

const getSubsetUsers = i =>
  pool.query(`
    SELECT * FROM user_profiles
    WHERE user_id BETWEEN ${(i * 100000) + 1} AND ${(i + 1) * 100000}
  `); // 100,000 at a time

const getSubsetEvents = i =>
  pool.query(`
    SELECT * FROM movie_history
    WHERE event_id BETWEEN ${(i * 100000) + 1} AND ${(i + 1) * 100000} 
  `); // 100,000 at a time


module.exports = {
  deleteRows,
  addUser,
  addMovieEvents,
  countMovieHistoryRows,
  countUserProfilesRows,
  getMovieEventsByUserId,
  updateUserEvents,
  getSubsetUsers,
  getSubsetEvents,
};
