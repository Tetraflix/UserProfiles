const elasticsearch = require('elasticsearch');

const elasticClient = new elasticsearch.Client({
  host: 'localhost:9200',
  // log: 'info',
  // log: 'trace',
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

// Add document to index
const addDocument = (indexName, typeName, document) =>
  elasticClient.index({
    index: indexName,
    type: typeName,
    body: document,
  });

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
    return `{ "index" : { "_index" : "profiles", "_type" : "movie_history", "_id": ${event.event_id} } }
    { "user_id": ${event.user_id}, "movie_id": ${event.movie_id}, "main_genre": "${movieGenres[mainId]}", "start_time": "${event.start_time}" }`;
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
  addDocument,
  bulkIndexUsers,
  bulkIndexEvents,
};
