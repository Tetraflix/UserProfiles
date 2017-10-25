const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config);

const addUser = user =>
  pool.query(`
    INSERT INTO user_profiles (
    group_id,
    age,
    gender,
    watched_movies,
    action,
    animation,
    comedy,
    documentary,
    drama,
    family,
    fantasy,
    horror,
    international,
    musical,
    mystery,
    romance,
    sci_fi,
    thriller,
    western
    ) values(
    ${user.group_id},
    ${user.age},
    '${user.gender}',
    '${user.watched_movies}',
    ${user.action},
    ${user.animation},
    ${user.comedy},
    ${user.documentary},
    ${user.drama},
    ${user.family},
    ${user.fantasy},
    ${user.horror},
    ${user.international},
    ${user.musical},
    ${user.mystery},
    ${user.romance},
    ${user.sci_fi},
    ${user.thriller},
    ${user.western}   
    )
  `);

const addMovieEvents = movieEvent =>
  pool.query(`
    INSERT INTO movie_history (
    user_id,
    movie_id,
    movie_profile,
    start_time
    ) values(
    ${movieEvent.userId},
    ${movieEvent.id},
    '${movieEvent.profile}',
    '${movieEvent.startTime}' 
    )
  `);

const countMovieHistoryRows = () =>
  pool.query(`
    SELECT count(*) FROM movie_history
  `);

module.exports = {
  addUser,
  addMovieEvents,
  countMovieHistoryRows,
};
