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

class User {
  constructor(userId) {
    this.userId = userId; // id is between 1 to 1M
    this.groupId = userId % 2; // use modulo to randomize
    this.age = 18 + Math.floor(Math.random() * 83); // age between 18 to 100
    this.gender = (Math.random() < 0.5) ? 'female' : 'male';
    this.watchedMovies = '{}';
    this.action = 0;
    this.animation = 0;
    this.comedy = 0;
    this.documentary = 0;
    this.drama = 0;
    this.family = 0;
    this.fantasy = 0;
    this.horror = 0;
    this.international = 0;
    this.musical = 0;
    this.mystery = 0;
    this.romance = 0;
    this.sciFi = 0;
    this.thriller = 0;
    this.western = 0;
    this.generateRandomUserProfile();
  }
  generateRandomUserProfile() {
    // generateRandomUserProfile
    // Returns user profile with values/scores for a random number of genres
    // A person will typically like 3-4 genres
    // For this simulation, a user can initially start liking 1-5 genres
    // Sum of values/scores will add up to 100 for each user
    const numGenres = Math.ceil(Math.random() * 5); // 1-5 genres
    let score = 100; // sum of all values/scores
    const genres = movieGenres.slice();
    for (let i = 0; i < numGenres; i += 1) {
      const genreId = Math.floor(Math.random() * genres.length);
      const pickedGenre = genres.splice(genreId, 1);
      if (i === numGenres - 1) {
        this[pickedGenre] = score;
      } else {
        const pickScore = Math.ceil(Math.random() * score);
        this[pickedGenre] = pickScore;
        score -= pickScore;
      }
    }
  }
}

// 1M users in the database
const simulateData = () => {
  const result = [];
  const sampleSize = 100000;
  for (let i = 1; i <= sampleSize; i += 1) {
    const user = new User(i);
    result.push(user);
  }
  return result;
};

module.exports = { simulateData };
