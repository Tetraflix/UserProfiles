const path = require('path');
const Promise = require('bluebird');
const { Pool } = require('pg');
const chai = require('chai');
const chaiHttp = require('chai-http');
const config = require('../database/config');
const db = require('../database/database');
const setup = require('../database/setup');
const sessionData = require('../data-simulation/sessionData');

const should = chai.should();
chai.use(chaiHttp);

let pool;
let server;
const serverURL = 'http://localhost:3000';
const elasticURL = 'http://localhost:9200';

xdescribe('Database Test', () => {

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

  before((done) => {
    pool = new Pool(config);
    done();
  });

  after((done) => {
    pool.end()
      .then(() => done());
  });

  xdescribe('2) Elasticsearch Setup', () => {
    it('2.1) It should initialize eleasticsearch index', (done) => {
      chai.request(serverURL)
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
      chai.request(serverURL)
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
      chai.request(serverURL)
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

  xdescribe('3) Elasticsearch Data', () => {
    it('3.1) It should have profiles index with correct mappings to types', (done) => {
      chai.request(elasticURL)
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
      chai.request(elasticURL)
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
      chai.request(elasticURL)
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
      chai.request(elasticURL)
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

describe('Live Data Flow Test', () => {
  let pool;

  before((done) => {
    pool = new Pool(config);
    server = require('../server/index');
    done();
  });

  after((done) => {
    server.task.stop();
    pool.end()
      .then(() => done());
  });

  describe('4) Live Data via HTTP Post Request to /sessions', () => {
    it('4.1) It should receive live session data', (done) => {
      const json = {
        userId: 314919,
        groupId: 1,
        events: [{
          movie: {
            id: 36543,
            profile: [0, 0, 50, 20, 0, 0, 0, 0, 0, 0, 0, 0, 15, 15, 0],
          },
          progress: 1,
          startTime: new Date('2017-11-02T20:26:09.378Z'),
        }],
      };
      chai.request(serverURL)
        .post('/sessions')
        .send(json)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(201);
          done();
        });
    });

    it('4.2) It should update user_profiles table', (done) => {
      const json = {
        userId: 314919,
        groupId: 1,
        events: [{
          movie: {
            id: 36543,
            profile: [0, 0, 50, 20, 0, 0, 0, 0, 0, 0, 0, 0, 15, 15, 0],
          },
          progress: 1,
          startTime: new Date('2017-11-02T20:26:09.378Z'),
        }],
      };
      chai.request(serverURL)
        .post('/sessions')
        .send(json)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.body[0].command.should.be.eql('UPDATE');
          done();
        });
    });

    it('4.3) It should not update user genre preference profile of user who belongs to the control group', (done) => {
      let oldProfile;
      let newProfile;
      db.getOneUserProfile(2)
        .then((profile) => {
          oldProfile = profile.rows[0].profile;
          const json = {
            userId: 2,
            groupId: 0,
            events: [{
              movie: {
                id: 36543,
                profile: [0, 0, 50, 20, 0, 0, 0, 0, 0, 0, 0, 0, 15, 15, 0],
              },
              progress: 1,
              startTime: new Date('2017-11-02T20:26:09.378Z'),
            }],
          };
          return chai.request(serverURL)
            .post('/sessions')
            .send(json);
        }).then(() => db.getOneUserProfile(2))
        .then((profile) => {
          newProfile = profile.rows[0].profile;
          newProfile.should.be.eql(oldProfile);
          done();
        });
    });

    it('4.4) It should update user genre preference profile of user who belongs to the experimental group', (done) => {
      let oldProfile;
      let newProfile;
      db.getOneUserProfile(1)
        .then((profile) => {
          oldProfile = profile.rows[0].profile;
          const json = {
            userId: 1,
            groupId: 1,
            events: [{
              movie: {
                id: 36543,
                profile: [0, 0, 50, 20, 0, 0, 0, 0, 0, 0, 0, 0, 15, 15, 0],
              },
              progress: 1,
              startTime: new Date('2017-11-02T20:26:09.378Z'),
            }],
          };
          return chai.request(serverURL)
            .post('/sessions')
            .send(json);
        }).then(() => db.getOneUserProfile(1))
        .then((profile) => {
          newProfile = profile.rows[0].profile;
          newProfile.should.be.not.eql(oldProfile);
          done();
        });
    });
  });

  describe('5) Live Data via AWS SQS', () => {
    it('5.1) It should send simulated live session data to AWS SQS', (done) => {
      sessionData.sendSessionDataSQS()
        .then((response) => {
          response.MessageId.should.be.a('string');
          done();
        })
        .catch(err => done(err));
    });

    it('5.2) It should receive simulated live session data to AWS SQS', (done) => {
      server.receiveSession()
        .then((response) => {
          response.should.be.an('object');
          response.userId.should.be.a('number');
          response.groupId.should.be.a('number');
          response.events.should.be.an('array');
          done();
        })
        .catch(err => done(err));
    });

    it('5.3) It should handle live session data and process user profile', (done) => {
      const json = {
        userId: 314919,
        groupId: 1,
        events: [],
      };
      server.handleSession(json)
        .then((response) => {
          response[0].should.be.an('object');
          response[0].user_id.should.be.a('number');
          response[0].profile.should.be.an('array');
          response[0].events.should.be.an('array');
          done();
        })
        .catch(err => done(err));
    });

    it('5.4) It should send updated user profile data to AWS SQS', (done) => {
      const json = {
        user_id: 954566,
        group_id: 0,
        age: 99,
        gender: 'male',
        events: [],
        profile: [60, 0, 0, 0, 19, 0, 0, 0, 0, 0, 0, 0, 21, 0, 0],
      };
      server.sendUserProfile(json)
        .then((response) => {
          response.MessageId.should.be.a('string');
          done();
        })
        .catch(err => done(err));
    });
  });
});

