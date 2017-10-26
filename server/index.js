const express = require('express');
const db = require('../database/database');
const sessionData = require('../data-simulation/sessionData');

const app = express();

app.get('/', (req, res) => {
  res.status(200).send('Tetraflix by Tetragon - User Profiles Service');
});

// GET request to get total movie_history row count
// generates sessions data then write into db
app.get('/movieHistory', (req, res) => {
  const sessions = sessionData.simulateData();
  const start = new Date();
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
    .then(() => {
      const totalTime = new Date() - start;
      console.log(`${totalTime / 1000} seconds`);
      return db.countMovieHistoryRows();
    })
    .then((data) => {
      const { count } = data.rows[0];
      res.send(`Total movie events in the database: ${count}`);
    })
    .catch(e => console.error(e.stack));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}!`));

module.exports = app;
