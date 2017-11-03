const EMA = (userProfile, movieProfile) => {
  const alpha = 0.3; // fixed value for all users
  // alpha will vary over time and change for each user with ML algorithm
  const newProfile = [];
  let sum = 0;
  let iMax = 0; // index of max rating

  userProfile.forEach((genre, i) => {
    newProfile[i] = Math.round((alpha * movieProfile[i]) + ((1 - alpha) * userProfile[i]));
    sum += newProfile[i];
    iMax = (newProfile[i] > newProfile[iMax]) ? i : iMax;
  });

  // If new profile ratings don't add up to 100, assign the difference to
  // the index of max rating. Max difference is 1 since our precision is 1
  newProfile[iMax] += 100 - sum;

  return newProfile;
};

module.exports = {
  EMA,
};
