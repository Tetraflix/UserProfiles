const fs = require('fs');

const userDataPath = './database/userData.txt';

class User {
  constructor(userId) {
    this.userId = userId; // id is between 1 to 1M
    this.groupId = userId % 2; // use modulo to randomize
    this.age = 18 + Math.floor(Math.random() * 83); // age between 18 to 100
    this.gender = (Math.random() < 0.5) ? 'female' : 'male';
    this.events = []; // oldest first, most recent last
    this.profile = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.generateRandomUserProfile();
  }
  generateRandomUserProfile() {
    // generateRandomUserProfile
    // Returns user profile with values/scores for a random number of genres
    // A person will typically like 3-4 genres
    // For this simulation, a user can initially start liking 1-5 genres
    // Sum of values/scores will add up to 100 for each user
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

// For generating user data that are seeded into the database during setup
// (time permitting) Add live add/delete user feature
const generateUsers = (userCount, userMovie) => {
  // Generates users and write it into userData.txt file in CSV format
  // Returns a promise with userCount created
  const wstream = fs.createWriteStream(userDataPath);
  wstream.write('user_id|group_id|age|gender|events|profile\n');
  for (let i = 1; i <= userCount; i += 1) {
    const user = new User(i);
    if (userMovie[user.userId]) {
      user.events = userMovie[user.userId];
    }
    wstream.write(`${user.userId}|${user.groupId}|${user.age}|${user.gender}|{${user.events}}|{${user.profile}}\n`);
  }
  return new Promise((resolve, reject) => {
    wstream.end((err) => {
      if (err) {
        reject(err);
      } else {
        resolve(userCount);
      }
    });
  });
};

module.exports = { generateUsers };
