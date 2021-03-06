const elasticsearch = require('elasticsearch');

const elasticClient = new elasticsearch.Client({
  host: 'localhost:9200',
  requestTimeout: 200000, // default 30000 millisecond
  keepAlive: false,
});

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

// Delete an existing index
const deleteIndex = indexName =>
  elasticClient.indices.delete({
    index: indexName,
  });

// Create the index
const initIndex = indexName =>
  elasticClient.indices.create({
    index: indexName,
  });

// Check if the index exists
const indexExists = indexName =>
  elasticClient.indices.exists({
    index: indexName,
  });

// Count number of documents in a type
const typeCount = typeName =>
  elasticClient.count({
    index: 'profiles',
    type: typeName,
  });

// Add movie event into index
const addEvent = (userId, event) => {
  const { startTime } = event;
  const { id, profile } = event.movie;
  const mainId = profile.indexOf(Math.max(...profile));
  return elasticClient.index({
    index: 'profiles',
    type: 'movie_history',
    body: {
      user_id: userId,
      movie_id: id,
      main_genre: movieGenres[mainId],
      start_time: startTime,
    },
  });
};

// Update user profile on index
const updateUser = (userData) => {
  const id = userData.user_id;
  const { profile, events } = userData;
  const favId = profile.indexOf(Math.max(...profile));
  return elasticClient.update({
    index: 'profiles',
    type: 'user_profiles',
    id: `${id}`,
    body: {
      doc: {
        events_length: events.length,
        fav_genre: favId,
      },
    },
  });
};

// Add bulk users to index
const bulkIndexUsers = (userData) => {
  const bulk = userData.map((user) => {
    const favId = user.profile.indexOf(Math.max(...user.profile));
    return `{ "index" : { "_index" : "profiles", "_type" : "user_profiles", "_id": ${user.user_id} } }
    { "group_id": ${user.group_id}, "age": ${user.age}, "gender": "${user.gender}", "events_length": ${user.events.length}, "fav_genre": "${movieGenres[favId]}" }`;
  });
  elasticClient.bulk({
    index: 'profiles',
    type: 'user_profiles',
    body: bulk,
  });
};

// Add bulk events to index
const bulkIndexEvents = (eventsData) => {
  const bulk = eventsData.map((event) => {
    const mainId = event.movie_profile.indexOf(Math.max(...event.movie_profile));
    const time = event.start_time.toISOString();
    return `{ "index" : { "_index" : "profiles", "_type" : "movie_history", "_id": ${event.event_id} } }
    { "user_id": ${event.user_id}, "movie_id": ${event.movie_id}, "main_genre": "${movieGenres[mainId]}", "start_time": "${time}" }`;
  });
  elasticClient.bulk({
    index: 'profiles',
    type: 'movie_history',
    body: bulk,
  });
};

module.exports = {
  deleteIndex,
  initIndex,
  indexExists,
  typeCount,
  addEvent,
  updateUser,
  bulkIndexUsers,
  bulkIndexEvents,
};
