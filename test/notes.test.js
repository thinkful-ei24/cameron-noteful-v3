const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');
const {TEST_MONGODB_URI} = require('../config.js');

const Note = require('../models/note');
const {notes} = require('../db/seed/notes');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful API resource', function(){
  before(function(){
    return mongoose.connect(TEST_MONGODB_URI)
      .then(function(){
        mongoose.connection.db.dropDatabase();
      });
  });

  beforeEach(function(){
    return Note.insertMany(notes);
  });

  afterEach(function(){
    return mongoose.connection.db.dropDatabase();
  });

  after(function(){
    return mongoose.disconnect();
  });

});