const Promise = require('bluebird');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const AWS = require('aws-sdk');
const db = require('../database/database');
const elastic = require('../dashboard/elastic');
const calc = require('./calc');
const cron = require('node-cron');

AWS.config.loadFromPath(path.resolve('credentials/config.json'));

const sessionsQueueUrl = 'https://sqs.us-west-1.amazonaws.com/287554401385/tetraflix-sessions-fifo';
const usersQueueUrl = 'https://sqs.us-west-1.amazonaws.com/287554401385/tetraflix-userprofiles-fifo';

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

const sqs = new AWS.SQS();
sqs.sendMessageAsync = Promise.promisify(sqs.sendMessage);
sqs.receiveMessageAsync = Promise.promisify(sqs.receiveMessage);
sqs.deleteMessageAsync = Promise.promisify(sqs.deleteMessage);

const app = express();

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.status(200).send('Tetraflix by Tetragon - User Profiles Service');
});

// POST request to initialize ES index 'profiles'
app.post('/profilesES', (req, res) => {
  elastic.indexExists('profiles')
    .then((exists) => {
      if (exists) {
        return elastic.deleteIndex('profiles');
      }
      return null;
    }).then(elastic.initIndex('profiles'))
    .then(() => {
      res.sendStatus(201);
    })
    .catch(err => console.error(err));
});

// POST request to send bulk historical user profiles data to ES
app.post('/usersToES', (req, res) => {
  const start = new Date();
  let count = 0;
  let result = Promise.resolve();
  const indexSequentially = (i) => {
    if (i < 10) {
      result = result.then(() => db.getSubsetUsers(i))
        .then((userData) => {
          count += userData.rows.length;
          return elastic.bulkIndexUsers(userData.rows);
        })
        .then(() => {
          console.log(`Sent ${count} user data to elasticsearch`);
          return indexSequentially(i + 1);
        })
        .catch(err => console.error(err));
    } else {
      result = result.then(() => {
        const totalTime = new Date() - start;
        console.log(`Indexing ${count} user data to elasticsearch took ${totalTime / 1000} seconds`);
      })
        .catch(err => console.error(err));
    }
  };
  indexSequentially(0);
  res.sendStatus(201);
  result();
});

// POST request to send bulk historical movie watching events data to ES
app.post('/eventsToES', (req, res) => {
  const start = new Date();
  let count = 0;
  let result = Promise.resolve();
  const indexSequentially = (i) => {
    if (i < 100) {
      result = result.then(() => db.getSubsetEvents(i))
        .then((eventsData) => {
          count += eventsData.rows.length;
          return elastic.bulkIndexEvents(eventsData.rows);
        })
        .then(() => {
          console.log(`Sent ${count} events data to elasticsearch`);
          return indexSequentially(i + 1);
        })
        .catch(err => console.error(err));
    } else {
      result = result.then(() => {
        const totalTime = new Date() - start;
        console.log(`Indexing ${count} events data to elasticsearch took ${totalTime / 1000} seconds`);
      })
        .catch(err => console.error(err));
    }
  };
  indexSequentially(0);
  res.sendStatus(201);
  result();
});

// DEPRECATED, use AWS SQS instead
// POST request to process live sesion data
// TODO: Implement insert/update live data to elasticsearch
app.post('/sessions', (req, res) => {
  const session = req.body;
  const { userId, groupId } = session;
  return Promise.all(session.events.map((event) => {
    const { startTime } = event;
    const { id, profile } = event.movie;
    const mainId = profile.indexOf(Math.max(...profile));
    return elastic.addDocument('movie_history', {
      user_id: userId,
      movie_id: id,
      main_genre: movieGenres[mainId],
      start_time: startTime,
    })
      .then(() => db.addMovieEvents({
        userId,
        id,
        profile,
        startTime,
      }));
  })).then(results =>
    Promise.all(results.map((result) => {
      const { event_id, movie_profile } = result.rows[0];
      if (groupId === 0) {
        return db.updateUserEvents(userId, event_id);
      }
      return db.getOneUserProfile(userId)
        .then((userData) => {
          const { profile } = userData.rows[0];
          const newProfile = calc.EMA(profile, movie_profile);
          return db.updateUserProfileEvents(userId, newProfile, event_id);
        });
    })))
    .then(results => res.status(201).send(results))
    .catch(err => console.error(err));
});

// Receive one session data from AWS SQS
const receiveSession = () => {
  let session;
  return sqs.receiveMessageAsync({ QueueUrl: sessionsQueueUrl })
    .then((result) => {
      session = JSON.parse(result.Messages[0].Body);
      const { ReceiptHandle } = result.Messages[0];
      return sqs.deleteMessageAsync({ QueueUrl: sessionsQueueUrl, ReceiptHandle });
    })
    .then(() => session);
};

// Updates user profiles according to incoming session data in the db
// For experimental group, update user_profiles using EMA calculation
// Returns user profiles data corresponding to updated user
// TODO: add/update in elasticsearch
const handleSession = (session) => {
  const { userId, groupId } = session;
  return Promise.all(session.events.map((event) => {
    const { startTime } = event;
    const { id, profile } = event.movie;
    const mainId = profile.indexOf(Math.max(...profile));
    return elastic.addDocument('movie_history', {
      user_id: userId,
      movie_id: id,
      main_genre: movieGenres[mainId],
      start_time: startTime,
    })
      .then(() => db.addMovieEvents({
        userId,
        id,
        profile,
        startTime,
      }));
  })).then((results) => {
    if (results.length === 0) { // no user event
      return db.getOneUserProfile(userId)
        .then(userData => [userData]);
    }
    return Promise.all(results.map((result) => {
      const { event_id, movie_profile } = result.rows[0];
      if (groupId === 0) {
        return db.updateUserEvents(userId, event_id);
      }
      return db.getOneUserProfile(userId)
        .then((userData) => {
          const { profile } = userData.rows[0];
          const newProfile = calc.EMA(profile, movie_profile);
          return db.updateUserProfileEvents(userId, newProfile, event_id);
        });
    }));
  }).then(result => result[result.length - 1].rows); // only send one user data
};

// Send updated user profile data to AWS SQS
const sendUserProfile = (userData) => {
  const { user_id, profile, events } = userData;
  const params = {
    QueueUrl: usersQueueUrl,
    MessageBody: JSON.stringify({ userId: user_id, profile, movieHistory: events }),
  };
  return sqs.sendMessageAsync(params);
};

// Manage the flow of live input session data from AWS SQS
// to ouptut user profile to AWS SQS
// Schedule to run every 1 second
const manageDataFlow = () =>
  cron.schedule('*/1 * * * * *', () =>
    receiveSession()
      .then(session => handleSession(session))
      .then(userData => sendUserProfile(userData))
      .then(data => console.log('Sent updated user data to SQS', data.MessageId))
      .catch(err => console.log('Error', err)), true);

const task = manageDataFlow();

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}!`));

module.exports = {
  app,
  receiveSession,
  handleSession,
  sendUserProfile,
  task,
};
