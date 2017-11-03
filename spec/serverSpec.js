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
      .then(() => setup.seedDatabase(5, 100000)) // minimal db for test
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

  xdescribe('Elasticsearch Setup', () => {
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

  describe('Elasticsearch Data', () => {
    it('3.1) It should have profiles index with correct mappings to types', (done) => {
      chai.request('http://localhost:9200')
        .get('/profiles')
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          should.exist(res.body.profiles);
          should.exist(res.body.profiles.mappings.movie_history);
          should.exist(res.body.profiles.mappings.user_profiles);
          done();
        });
    });

    it('3.2) It should have data under type movie_history', (done) => {
      chai.request('http://localhost:9200')
        .get('/profiles/movie_history/1')
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body._type.should.be.eql('movie_history');
          done();
        });
    });

    it('3.3) Data stored in movie_history should have start_time field that is date data type', (done) => {
      chai.request('http://localhost:9200')
        .get('/profiles')
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.profiles.mappings.movie_history.properties.start_time.type.should.be.eql('date');
          done();
        });
    });

    it('3.4) It should have data under type user_profiles', (done) => {
      chai.request('http://localhost:9200')
        .get('/profiles/user_profiles/1')
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body._type.should.be.eql('user_profiles');
          done();
        });
    });
  });
});

