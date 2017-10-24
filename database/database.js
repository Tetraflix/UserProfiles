const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config);

const addUser = user =>
  pool.query(`
    INSERT INTO user_profiles (
    group_id,
    age,
    gender,
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

const addMovie = movieEvent =>
  pool.query(`
    INSERT INTO movie_history (
    user_id,
    movie_id,
    movie_profile,
    start_time
    ) values(
    ${movieEvent.user_id},
    ${movieEvent.movie_id},
    '${movieEvent.movie_profile}',
    '${movieEvent.start_time}' 
    )
  `);

module.exports = {
  addUser,
  addMovie,
};
