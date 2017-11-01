const express = require('express');
const db = require('../database/database');
const sessionData = require('../data-simulation/sessionData');
const elastic = require('../dashboard/elastic');

const app = express();

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
    .catch(e => console.error(e.stack));
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
        });
    } else {
      result = result.then(() => {
        const totalTime = new Date() - start;
        console.log(`Indexing ${count} user data to elasticsearch took ${totalTime / 1000} seconds`);
      })
        .catch(e => console.error(e.stack));
    }
  };
  indexSequentially(0);
  res.sendStatus(201);
  return result;
});

// POST request send bulk historical movie watching events data to ES
app.post('/eventsToES', (req, res) => {
  const start = new Date();
  let count = 0;
  let result = Promise.resolve();
  const indexSequentially = (i) => {
    if (i < 30) {
      result = result.then(() => db.getSubsetEvents(i))
        .then((eventsData) => {
          count += eventsData.rows.length;
          return elastic.bulkIndexEvents(eventsData.rows);
        })
        .then(() => {
          console.log(`Sent ${count} events data to elasticsearch`);
          return indexSequentially(i + 1);
        });
    } else {
      result = result.then(() => {
        const totalTime = new Date() - start;
        console.log(`Indexing ${count} events data to elasticsearch took ${totalTime / 1000} seconds`);
      })
        .catch(e => console.error(e.stack));
    }
  };
  indexSequentially(0);
  res.sendStatus(201);
  return result;
});

// TO BE MODIFIED
// GET request to get total movie_history row count
// generates sessions data then write into db
// app.get('/movieHistory', (req, res) => {
//   const sessions = sessionData.simulateData();
//   const start = new Date();
//   Promise.all(sessions.map((session) => {
//     const { userId } = session;
//     return Promise.all(session.events.map((event) => {
//       const { id } = event.movie;
//       const profile = JSON.stringify(event.movie.profile);
//       const startTime = event.startTime.toLocaleString();
//       return db.addMovieEvents({
//         userId,
//         id,
//         profile,
//         startTime,
//       });
//     }));
//   }))
//     .then(() => {
//       const totalTime = new Date() - start;
//       console.log(`${totalTime / 1000} seconds`);
//       return db.countMovieHistoryRows();
//     })
//     .then((data) => {
//       const { count } = data.rows[0];
//       res.send(`Total movie events in the database: ${count}`);
//     })
//     .catch(e => console.error(e.stack));
// });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}!`));

module.exports = app;
