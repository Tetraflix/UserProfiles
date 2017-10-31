const fs = require('fs');

const sessionDataPath = './database/sessionData.txt';

class Movie {
  constructor() {
    this.id = Math.ceil(Math.random() * 300000); // id is between 1 to 300,000
    this.profile = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.generateRandomMovieProfile();
  }
  generateRandomMovieProfile() {
    // generateRandomMovieProfile
    // Returns movie profile with values/scores for a random number of genres
    // A movie will typically have values/scores for 2-3 genres
    // For this simulation, a movie can have 1-5 genres
    // Sum of values/scores will add up to 100 for each movie
    const numGenres = Math.ceil(Math.random() * 5); // 1-5 genres
    const totalGenres = this.profile.length;
    let score = 100; // sum of all values/scores
    for (let i = 0; i < numGenres; i += 1) {
      const genreId = Math.floor(Math.random() * totalGenres);
      if (i === numGenres - 1) {
        this.profile[genreId] += score;
      } else {
        const pickScore = Math.ceil(Math.random() * score);
        this.profile[genreId] += pickScore;
        score -= pickScore;
      }
    }
  }
}

class Event {
  constructor(time) {
    this.movie = new Movie();
    this.generateProgress();
    this.generateStartTime(time);
  }
  generateProgress() {
    // generateProgress
    // Sets progress value for a movie watching event
    // 80% of the times it will be 1 (finished watching)
    // 20% of the times it will be 0.5 (midway through watching)
    if (Math.random() < 0.8) {
      this.progress = 1;
    } else {
      this.progress = 0.5;
    }
  }
  generateStartTime(time) {
    // generateStartTime
    // Sets start time for an event
    // Assumes that a movie will have a duration of 1-3 hours
    // 5 minute for 'browsing' movies
    const duration = (60 + (Math.random() * 120)) * 60000; // in milliseconds
    this.startTime = new Date(time - (this.progress * duration) - 300000);
  }
}

class Session {
  constructor(endTime) {
    this.userId = Math.ceil(Math.random() * 1000000); // userId between 0 to 1M
    this.groupId = this.userId % 2; // use modulo to randomize
    this.createEventSeries(endTime);
  }
  createEventSeries(endTime) {
    // createEventSeries
    // Sets events array of movie watching events in chronological order [oldest, ... , recent]
    // Assume events are in serialized manner, i.e. events don't overlap each other
    // Assume that there will be 0-4 events per session, events can be 0 if user logged in
    // but engaged in no movie watching activity (may be filtered by Events service)
    this.events = [];
    const eventCount = Math.floor(Math.random() * 5); // eventCount is between 0 to 4
    let eventEndTime = endTime;
    for (let i = 0; i < eventCount; i += 1) {
      const event = new Event(eventEndTime);
      eventEndTime = event.startTime;
      this.events.push(event);
    }
    this.events.reverse(); // reverse the array so events are chronological
  }
}

// Placeholder for simulating live feed data
const simulateData = () => {
  const result = [];
  const sampleSize = 86400 * 1; // 1 days
  const endTime = new Date();
  for (let i = 0; i < sampleSize; i += 1) {
    const session = new Session(endTime);
    result.push(session);
    endTime.setSeconds(endTime.getSeconds() + 1); // increment by 1 second
  }
  return result;
};

// For generating historical data that are seeded into the database during setup
// 10M data points over 3 month period
// Equivalent to 1 data point per 777 millisecond
// (for MVP) Generate 50k evenly spaced sessions per day
// (time permitting) Randomize 86,400 data points throughout 24 hour day
const generateSessionsPerDay = (date, days) => {
  // Generates 50k sessions per day and write it into sessionData.txt file in CSV format
  // 50K sessions will roughly translate to 100K movie watching events
  // Returns a promise with sessionCount created (50k per day)
  const sessionCount = 50000 * days;
  let eventCount = 0;
  const endTime = date;
  // create array of [user_id, movie_id] to update seeded user profiles
  const userMovie = {};
  return new Promise((resolve, reject) => {
    const wstream = fs.createWriteStream(sessionDataPath);
    wstream.write('user_id|movie_id|movie_profile|start_time\n');
    for (let i = 1; i <= sessionCount; i += 1) {
      const session = new Session(endTime);
      session.events.forEach((event) => {
        eventCount += 1;
        if (userMovie[session.userId]) {
          userMovie[session.userId].push(eventCount);
        } else {
          userMovie[session.userId] = [eventCount];
        }
        wstream.write(`${session.userId}|${event.movie.id}|{${event.movie.profile}}|${event.startTime.toUTCString()}}\n`);
      });
      endTime.setSeconds(endTime.getSeconds() + (86400 / 50000));
    }
    wstream.end();
    wstream.on('finish', () => resolve({ sessionCount, eventCount, userMovie }));
    // wstream.on("finish", resolve.bind(this, sessionCount, userMovie));
    wstream.on('error', err => reject(err));
  });
};

module.exports = { simulateData, generateSessionsPerDay };
