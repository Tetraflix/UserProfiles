const fs = require('fs');

const userData = './database/userData.txt';

class User {
  constructor(userId) {
    this.userId = userId; // id is between 1 to 1M
    this.groupId = userId % 2; // use modulo to randomize
    this.age = 18 + Math.floor(Math.random() * 83); // age between 18 to 100
    this.gender = (Math.random() < 0.5) ? 'female' : 'male';
    this.watchedMovies = '{}';
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
    let totalGenres = 15;
    let score = 100; // sum of all values/scores
    for (let i = 0; i < numGenres; i += 1) {
      const genreId = Math.floor(Math.random() * totalGenres);
      totalGenres -= 1;
      if (i === numGenres - 1) {
        this.profile[genreId] = score;
      } else {
        const pickScore = Math.ceil(Math.random() * score);
        this.profile[genreId] = pickScore;
        score -= pickScore;
      }
    }
  }
}

const generateUsers = () => {
  // generates 3M users and write it into userData.txt file in CSV format
  const userCount = 3000000;
  const start = new Date();
  const wstream = fs.createWriteStream(userData);
  wstream.write('user_id|group_id|age|gender|watched_movies|profile\n');
  for (let i = 1; i <= userCount; i += 1) {
    const user = new User(i);
    wstream.write(`${user.userId}|${user.groupId}|${user.age}|${user.gender}|${user.watchedMovies}|{${user.profile}}\n`);
  }
  return new Promise((resolve, reject) => {
    wstream.end((err) => {
      if (err) {
        reject(err);
      } else {
        const end = new Date() - start;
        resolve(`Generating ${userCount} users took ${end / 1000} seconds`);
      }
    });
  });
};

module.exports = { generateUsers };
