const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');
const {TEST_MONGODB_URI} = require('../config');

const Note = require('../models/note');
const {notes} = require('../db/seed/notes');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful API resource', function(){
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser:true })
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Note.insertMany(notes);
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('GET api/notes', function(){

    it('should return all existing notes', function(){
      let res;
      let resNote;
      return chai.request(app)
        .get('/api/notes')
        .then(function(results){
          res = results;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.lengthOf.at.least(1);

          res.body.forEach(function(note){
            expect(note).to.be.a('object');
            expect(note).to.include.keys(
              'id', 'title', 'content');
          });
          resNote = res.body[0];
          return Note.findById(resNote.id); 
        })
        .then(function(note){
          expect(resNote.id).to.equal(note.id);
          expect(resNote.title).to.equal(note.title);
          expect(resNote.content).to.equal(note.content);
        });
    });
    
    it('should return correct search results for searchTerm in query', function(){
      const searchTerm = 'government';
      const re = new RegExp(searchTerm, 'i');

      const dbPromise = Note.find({
        $or: [{'title': re}, {'content': re}]
      });

      const apiPromise = chai.request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`);

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(1);
          res.body.forEach(function (item, i) {
            expect(item).to.be.a('object');
            expect(item).to.include.all.keys('id', 'title', 'createdAt', 'updatedAt');
            expect(item.id).to.equal(data[i].id);
            expect(item.title).to.equal(data[i].title);
            expect(item.content).to.equal(data[i].content);
            expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
            expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
          });
        });  
    });

    it('should return an empty array for an incorrect query', function () {
      const searchTerm = 'NotValid';
      // const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note.find({
        title: { $regex: searchTerm, $options: 'i' }
        // $or: [{ 'title': re }, { 'content': re }]
      });
      const apiPromise = chai.request(app).get(`/api/notes?searchTerm=${searchTerm}`);
      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return an empty array for an incorrect query', function () {
      const searchTerm = 'NotValid';
      const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note.find({
        $or: [{ 'title': re }, { 'content': re }]
      });
      const apiPromise = chai.request(app).get(`/api/notes?searchTerm=${searchTerm}`);
      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });
    
    it('should return 404 error for bad path', function(){
      return chai.request(app)
        .get('/api/bad/path')
        .then(function(results){
          expect(results).to.have.status(404);
        });
    });
  });

  describe('GET api/notes/:id', function(){
    it('should return correct data when getting by id', function(){
      let testNote;
      let id;
      return Note
        .findOne()
        .then(function(note){
          testNote = note;
          id = testNote.id;
          return chai.request(app)
            .get(`/api/notes/${id}`);
        })
        .then(function(res){
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id', 'title', 'content'
          );
          expect(res.body.id).to.equal(testNote.id);
          expect(res.body.title).to.equal(testNote.title);
          expect(res.body.content).to.equal(testNote.content);
        });
    });

    it('should return 400 if id is not valid', function(){
      return chai.request(app)
        .get('/api/notes/NOT-A-VALID-ID')
        .then(function(res){
          expect(res).to.have.status(400);
        });
    });

    it('should return 404 if id is not found', function(){
      return chai.request(app)
        .get('/api/notes/100000000000000000000003')
        .then(function(res){
          expect(res).to.have.status(404);
        });
    });
  });

  describe('POST api/notes', function(){

    it('should add a new note', function(){
      const newNote = {
        title: 'New Note',
        content: 'new note content'
      };
      let res;
      return chai.request(app)
        .post('/api/notes')
        .send(newNote)
        .then(function(_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id', 'title', 'content');
          expect(res.body.title).to.equal(newNote.title);
          // cause Mongo should have created id on insertion
          expect(res.body.id).to.not.be.null;
          expect(res.body.content).to.equal(newNote.content);

          return Note.findById(res.body.id);
        })
        .then(function(note){
          expect(note.id).to.equal(res.body.id);
          expect(note.title).to.equal(newNote.title);
          expect(note.content).to.equal(newNote.content);
          expect(new Date(res.body.createdAt)).to.eql(note.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(note.updatedAt);
        });
    });

    it('should send 400 error if title is missing', function(){
      const badNote = {
        content: 'content with no title!'
      };

      return chai.request(app)
        .post('/api/notes')
        .send(badNote)
        .then(function(res){
          expect(res).to.have.status(400);
        });
    });
  });

  describe('PUT api/notes', function(){

    it('should update note in database', function(){
      const updatedNote = {
        title: 'Updated Note',
        content: 'this note has been updated'
      };

      return Note
        .findOne()
        .then(function(note){
          updatedNote.id = note.id;

          return chai.request(app)
            .put(`/api/notes/${note.id}`)
            .send(updatedNote);
        })
        .then(function(res){
          expect(res).to.have.status(204);

          return Note.findById(updatedNote.id);
        })
        .then(function(res){
          expect(res.title).to.equal(updatedNote.title);
          expect(res.content).to.equal(updatedNote.content);
        });
    });

    it('should send 400 error if title is missing', function(){
      const badNote = {
        content: 'content with no title!'
      };

      return Note
        .findOne()
        .then(function(note){
          badNote.id = note.id;

          return chai.request(app)
            .put(`/api/notes/${note.id}`)
            .send(badNote);
        })
        .then(function(res){
          expect(res).to.have.status(400);
        });
    });
  });

  describe('DELETE endpoint', function(){

    it('should delete item if id is found', function(){
      let note;

      return Note
        .findOne()
        .then(function(_note){
          note = _note;
          return chai.request(app).delete(`/api/notes/${note.id}`);
        })
        .then(function(res){
          expect(res).to.have.status(204);
          return Note.findById(note.id);
        })
        .then(function(res){
          expect(res).to.be.null;
        });
    });

    it('should return 404 if id is not found', function(){
      return chai.request(app)
        .delete('/api/notes/100000000000000000000003')
        .then(function(res){
          expect(res).to.have.status(404);
        });
    });
  });
});
