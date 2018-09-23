const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const express = require('express');
const sinon = require('sinon');

const app = require('../server');
const {TEST_MONGODB_URI} = require('../config');

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tags');
const {notes, folders, tags} = require('../db/seed/data');

const expect = chai.expect;
const sandbox = sinon.createSandbox();
chai.use(chaiHttp);

describe('Noteful API resource', function(){
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser:true })
      .then(() => Promise.all([
        Note.deleteMany(),
        Folder.deleteMany(),
        Tag.deleteMany(),
      ]));
  });

  beforeEach(function () {
    return Promise.all([
      Note.insertMany(notes),
      Folder.insertMany(folders),
      Tag.insertMany(tags)
    ]);
  });

  afterEach(function () {
    sandbox.restore();
    return Promise.all([
      Note.deleteMany(),
      Folder.deleteMany(),
      Tag.deleteMany(),
    ]);
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
          if(note.folderId){
            expect(mongoose.Types.ObjectId(resNote.folderId)).to.deep.equal(note.folderId);
          }
        });
    });
    
    it('should return correct search results for searchTerm query', function(){
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
            expect(item).to.include.all.keys('id', 'title', 'createdAt', 'updatedAt', 'tags');
            expect(item.id).to.equal(data[i].id);
            expect(item.title).to.equal(data[i].title);
            expect(item.content).to.equal(data[i].content);
            expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
            expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
          });
        });  
    });

    it('should return correct search results for folderId query', function(){
      let data;
      return Folder.findOne()
        .then(result => {
          data = result;
          return Promise.all([
            Note.find({folderId: data.id}),
            chai.request(app).get(`/api/notes?folderId=${data.id}`)
          ])
            .then(([data, res]) => {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.a('array');
              expect(res.body).to.have.length(data.length);
            });
        });
    });

    it('should return correct search results for tagId query', function(){
      let data;
      return Tag.findOne()
        .then(result => {
          data = result;
          return Promise.all([
            Note.find({tags: data.id}),
            chai.request(app).get(`/api/notes?tagId=${data.id}`)
          ])
            .then(([data, res]) => {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.a('array');
              expect(res.body).to.have.length(data.length);
            });
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

    it('should catch errors and respond properly', function () {
      sandbox.stub(Note.schema.options.toObject, 'transform').throws('FakeError');

      return chai.request(app).get('/api/notes')
        .then(res => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
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
            'id', 'title', 'content', 'tags', 'createdAt', 'updatedAt'
          );
          expect(res.body.id).to.equal(testNote.id);
          expect(res.body.title).to.equal(testNote.title);
          expect(res.body.content).to.equal(testNote.content);
          if(testNote.folderId){
            expect(mongoose.Types.ObjectId(res.body.folderId)).to.deep.equal(testNote.folderId);
          }
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
        .get('/api/notes/DOESNOTEXIST')
        .then(function(res){
          expect(res).to.have.status(404);
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Note.schema.options.toObject, 'transform').throws('FakeError');
      return Note.findOne()
        .then(data => {
          return chai.request(app).get(`/api/notes/${data.id}`);
        })
        .then(res => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });
  });

  describe('POST api/notes', function(){

    it('should add a new note', function(){
      const newNote = {
        title: 'New Note',
        content: 'new note content',
        folderId: '111111111111111111111100'
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
            'id', 'title', 'content', 'folderId', 'tags', 'createdAt', 'updatedAt');
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
          expect(mongoose.Types.ObjectId(newNote.folderId)).to.deep.equal(note.folderId);
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

    it('should catch errors and respond properly', function () {
      sandbox.stub(Note.schema.options.toObject, 'transform').throws('FakeError');

      const newItem = {
        title: 'The best article about cats ever!',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...'
      };

      return chai.request(app)
        .post('/api/notes')
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });
  });

  describe('PUT api/notes', function(){

    it('should update note in database', function(){
      const updatedNote = {
        title: 'Updated Note',
        content: 'this note has been updated',
        tags: ['222222222222222222222200', '222222222222222222222201']
      };
      let note;
      return Note
        .findOne()
        .then(function(_note){
          note = _note;
          updatedNote.id = note.id;

          return chai.request(app)
            .put(`/api/notes/${note.id}`)
            .send(updatedNote);
        })
        .then(function(res){
          expect(res).to.have.status(204);

          return Note.findById(updatedNote.id);
        })
        .then(function(result){
          expect(result.title).to.equal(updatedNote.title);
          expect(result.content).to.equal(updatedNote.content);
          for (let i=0; i<updatedNote.tags.length; i++){
            expect(result.tags).to.include(mongoose.Types.ObjectId(updatedNote.tags[i]));
          }
          expect(new Date(result.createdAt)).to.deep.equal(note.createdAt);
          expect(new Date(result.updatedAt)).to.greaterThan(note.updatedAt);
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

    it('should send 400 error if folderId is invalid', function(){
      const badNote = {
        title: 'Title',
        content: 'content with bad folderId',
        folderId: 'NOT-A-VALID-ID'
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

    // it('should catch errors and respond properly', function () {
    //   sandbox.stub(Note.schema.options.toObject, 'transform').throws('FakeError');

    //   const updateItem = {
    //     title: 'What about dogs?!',
    //     content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...'
    //   };
    //   return Note.findOne()
    //     .then(data => {
    //       return chai.request(app)
    //         .put(`/api/notes/${data.id}`)
    //         .send(updateItem);
    //     })
    //     .then(res => {
    //       expect(res).to.have.status(500);
    //       expect(res).to.be.json;
    //       expect(res.body).to.be.a('object');
    //       expect(res.body.message).to.equal('Internal Server Error');
    //     });
    // });    
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

    it('should catch errors and respond properly', function () {
      sandbox.stub(express.response, 'sendStatus').throws('FakeError');
      return Note.findOne()
        .then(data => {
          return chai.request(app).delete(`/api/notes/${data.id}`);
        })
        .then(res => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });
  });
});
