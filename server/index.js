const Promise = require('bluebird');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const AWS = require('aws-sdk');
const cron = require('node-cron');
const winston = require('winston');
const calc = require('./calc');
const db = require('../database/database');
const elastic = require('../dashboard/elastic');

AWS.config.loadFromPath(path.resolve('credentials/config.json'));

const sessionsQueueUrl = 'https://sqs.us-west-2.amazonaws.com/287554401385/tetraflix-sessions.fifo';
const usersQueueUrl = 'https://sqs.us-west-2.amazonaws.com/287554401385/tetraflix-userprofiles.fifo';

const sqs = new AWS.SQS();
sqs.sendMessageAsync = Promise.promisify(sqs.sendMessage);
sqs.receiveMessageAsync = Promise.promisify(sqs.receiveMessage);
sqs.deleteMessageAsync = Promise.promisify(sqs.deleteMessage);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

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
    return elastic.addEvent(userId, event)
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
      logger.log({
        level: 'info',
        message: 'receive session',
      });
      return sqs.deleteMessageAsync({ QueueUrl: sessionsQueueUrl, ReceiptHandle });
    })
    .then(() => session)
    .catch(err => console.error(err));
};

// Updates user profiles according to incoming session data in the db
// For experimental group, update user_profiles using EMA calculation
// Returns user profiles data corresponding to updated user
// Includes functionality to insert events and update user profiles on elasticsearch
const handleSession = (session) => {
  const { userId, groupId } = session;
  return Promise.all(session.events.map((event) => {
    const { startTime } = event;
    const { id, profile } = event.movie;
    return elastic.addEvent(userId, event)
      .then(() => db.addMovieEvents({
        userId,
        id,
        profile,
        startTime,
      }));
  })).then((results) => {
    if (results.length === 0) { // no user event
      return db.getOneUserProfile(userId)
        .then(userData => userData.rows[0]);
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
    }))
      .then(result => result[result.length - 1].rows[0]);
  }).then(userData =>
    elastic.updateUser(userData)
      .then(() => userData))
    .catch(err => console.error(err));
};

// Send updated user profile data to AWS SQS
const sendUserProfile = (userData) => {
  const { user_id, profile, events } = userData;
  const params = {
    QueueUrl: usersQueueUrl,
    MessageBody: JSON.stringify({ userId: user_id, profile, movieHistory: events }),
    MessageGroupId: 'user_profiles',
  };
  logger.log({
    level: 'info',
    message: 'send user profile',
  });
  return sqs.sendMessageAsync(params);
};

// Manage the flow of live input session data from AWS SQS
// to live ouptut user data to AWS SQS
// Schedule to run every 2 second
const manageDataFlow = () =>
  cron.schedule('*/2 * * * * *', () =>
    receiveSession()
      .then(session => handleSession(session))
      .then(userData => sendUserProfile(userData))
      .then(data => console.log('Sent updated user data to SQS', data.MessageId))
      .catch(err => console.log('Error', err)), true);

const task = manageDataFlow();

const port = process.env.PORT || 3000;
const expressServer = app.listen(port, () => console.log(`App listening on port ${port}!`));

module.exports = {
  app,
  receiveSession,
  handleSession,
  sendUserProfile,
  task,
  expressServer,
};
