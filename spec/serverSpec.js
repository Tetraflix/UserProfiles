const { Pool } = require('pg');
const chai = require('chai');
// const chaiHttp = require('chai-http');
const config = require('../database/config');
const db = require('../database/database');
const setup = require('../database/setup');
// const server = require('../server/index');

const should = chai.should();
// chai.use(chaiHttp);

describe('Database Test', () => {
  let pool;
  before((done) => {
    pool = new Pool(config);
    done();
  });
  after((done) => {
    pool.end()
      .then(() => done());
  });
  describe('1) Seed database with randomly generated data', () => {
    it('1.1) It should seed 1 million user profile data', (done) => {
      db.countUserProfilesRows()
        .then((data) => {
          Number(data.rows[0].count).should.be.eql(1000000);
          done();
        });
    });
    it('1.2) It should seed movie events data', (done) => {
      db.countMovieHistoryRows()
        .then((data) => {
          Number(data.rows[0].count).should.be.not.eql(0);
          done();
        });
    });
  });
});

