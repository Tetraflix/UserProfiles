const { Pool } = require('pg');
const config = require('./config');

const movieGenres = [
  'action',
  'animation',
  'comedy',
  'documentary',
  'drama',
  'family',
  'fantasy',
  'horror',
  'international',
  'musical',
  'mystery',
  'romance',
  'sci_fi',
  'thriller',
  'western',
];

const pool = new Pool(config);

const deleteRows = table =>
  pool.query(`
    DELETE * FROM ${table}
    `);

const addUser = user =>
  pool.query(`
    INSERT INTO user_profiles (
    user_id,
    group_id,
    age,
    gender,
    watched_movies,
    profile
    ) VALUES (
    ${user.userId},
    ${user.groupId},
    ${user.age},
    '${user.gender}',
    '${user.watchedMovies}',
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

module.exports = {
  deleteRows,
  addUser,
  addMovieEvents,
  countMovieHistoryRows,
  countUserProfilesRows,
};
