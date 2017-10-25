const express = require('express');
const db = require('../database/database');
const sessionData = require('../data-simulation/sessionData');

const app = express();

app.get('/', (req, res) => {
  res.send('Tetraflix by Tetragon - User Profiles Service');
});

// Arbitrary GET request to simulate incoming Session Data
app.get('/sessionData', (req, res) => {
  // sample size 100,000 sessions
  // results in around 200,000 - 300,000 events
  const sampleSize = 100000;
  const sessions = sessionData.simulateData(sampleSize);
  return Promise.all(sessions.map((session) => {
    const { userId } = session;
    return Promise.all(session.events.map((event) => {
      const { id } = event.movie;
      const profile = JSON.stringify(event.movie.profile);
      const startTime = event.startTime.toLocaleString();
      return db.addMovieEvents({
        userId,
        id,
        profile,
        startTime,
      });
    }));
  }))
    .then(() => db.countMovieHistoryRows())
    .then((data) => {
      const { count } = data.rows[0];
      res.send(`total movie event row count: ${count}`);
    })
    .catch(err => console.error(err));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}!`));
