const express = require('express');
const db = require('../database/database');

const app = express();

app.get('/', (req, res) => res.send('Tetraflix User Profiles Service'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}!`));
