const { Pool } = require('pg');
const chai = require('chai');
const chaiHttp = require('chai-http');
const config = require('../database/config');
const db = require('../database/database');
const setup = require('../database/setup');
// const server = require('../server/index');

const should = chai.should();
chai.use(chaiHttp);

xdescribe('Database Test', () => {
  let pool;

  before((done) => {
    pool = new Pool(config);
    db.deleteRows('user_profiles')
      .then(() => db.deleteRows('movie_history'))
      .then(() => setup.seedDatabase(5, 100000)) // mini size for test
      .then(() => done());
  });

  after((done) => {
    pool.end()
      .then(() => done());
  });

  describe('1) Seed database with randomly generated data', () => {
    it('1.1) It should seed 500,000 user profile data', (done) => {
      db.countUserProfilesRows()
        .then((data) => {
          Number(data.rows[0].count).should.be.eql(100000);
          done();
        })
        .catch(err => done(err));
    });

    it('1.2) It should seed movie events data', (done) => {
      db.countMovieHistoryRows()
        .then((data) => {
          Number(data.rows[0].count).should.be.not.eql(0);
          done();
        })
        .catch(err => done(err));
    });
  });
});

describe('Dashboard Test', () => {
  let pool;

  before((done) => {
    pool = new Pool(config);
    done();
  });

  after((done) => {
    pool.end()
      .then(() => done());
  });

  describe('2) Elasticsearch', () => {
    it('2.1) It should initialize eleasticsearch index', (done) => {
      chai.request('http://localhost:3000')
        .post('/profilesES')
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(201);
          done();
        });
    });

    it('2.2) It should send historical user profiles to elasticsearch', (done) => {
      chai.request('http://localhost:3000')
        .post('/usersToES')
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(201);
          done();
        });
    });

    it('2.3) It should send historical movie events to elasticsearch', (done) => {
      chai.request('http://localhost:3000')
        .post('/eventsToES')
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(201);
          done();
        });
    });
  });
});

