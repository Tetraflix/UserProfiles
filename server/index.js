const express = require('express');
const db = require('../database/database');
const simData = require('../data-simulation/simulation');

const app = express();

app.get('/', (req, res) => {
  const data = simData.simulateData();
  res.send(data);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}!`));
