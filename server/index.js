const express = require('express');
const bodyParser = require('body-parser');
const db = require('../database/database');
const elastic = require('../dashboard/elastic');
const calc = require('./calc');

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

// POST request send bulk historical movie watching events data to ES
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

// POST request to receive live feed data
// Adds movie event to movie_history then updates user_profiles events array
// For experimental group, update user_profiles using EMA calculation
// TODO: add/update in elasticsearch
app.post('/sessions', (req, res) => {
  const session = req.body;
  const { userId, groupId } = session;
  Promise.all(session.events.map((event) => {
    const { startTime } = event;
    const { id, profile } = event.movie;
    return db.addMovieEvents({
      userId,
      id,
      profile,
      startTime,
    });
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}!`));

module.exports = app;
