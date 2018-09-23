const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const express = require('express');
const sinon = require('sinon');

const app = require('../server');
const {TEST_MONGODB_URI} = require('../config');

const Folder = require('../models/folder');
const {folders} = require('../db/seed/data');

const expect = chai.expect;
const sandbox = sinon.createSandbox();
chai.use(chaiHttp);

describe('Noteful API resource', function(){
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser:true })
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Promise.all([Folder.insertMany(folders), Folder.createIndexes()]);
  });

  afterEach(function () {
    sandbox.restore();
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('GET api/folders', function(){

    it('should return all existing folders', function(){
      let res;
      let resFolder;
      return chai.request(app)
        .get('/api/folders')
        .then(function(results){
          res = results;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.lengthOf.at.least(1);

          res.body.forEach(function(folder){
            expect(folder).to.be.a('object');
            expect(folder).to.include.keys(
              'id', 'name');
          });
          resFolder = res.body[0];
          return Folder.findById(resFolder.id); 
        })
        .then(function(folder){
          expect(resFolder.id).to.equal(folder.id);
          expect(resFolder.name).to.equal(folder.name);
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Folder.schema.options.toObject, 'transform').throws('FakeError');
      return chai.request(app).get('/api/folders')
        .then(res => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });
  });  

  describe('GET api/folders/:id', function(){
    it('should return correct data when getting by id', function(){
      let testFolder;
      let id;
      return Folder
        .findOne()
        .then(function(folder){
          testFolder = folder;
          id = testFolder.id;
          return chai.request(app)
            .get(`/api/folders/${id}`);
        })
        .then(function(res){
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id', 'name'
          );
          expect(res.body.id).to.equal(testFolder.id);
          expect(res.body.name).to.equal(testFolder.name);
        });
    });

    it('should return 400 if id is not valid', function(){
      return chai.request(app)
        .get('/api/folders/NOT-A-VALID-ID')
        .then(function(res){
          expect(res).to.have.status(400);
        });
    });

    it('should return 404 if id is not found', function(){
      return chai.request(app)
        .get('/api/folders/DOESNOTEXIST')
        .then(function(res){
          expect(res).to.have.status(404);
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Folder.schema.options.toObject, 'transform').throws('FakeError');

      let data;
      return Folder.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app).get(`/api/folders/${data.id}`);
        })
        .then(res => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });
  });

  describe('POST api/folders', function(){

    it('should add a new folders', function(){
      const newFolder = {
        name: 'New Folder',
      };
      let res;
      return chai.request(app)
        .post('/api/folders')
        .send(newFolder)
        .then(function(_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id', 'name');
          expect(res.body.name).to.equal(newFolder.name);
          // cause Mongo should have created id on insertion
          expect(res.body.id).to.not.be.null;

          return Folder.findById(res.body.id);
        })
        .then(function(folder){
          expect(folder.id).to.equal(res.body.id);
          expect(folder.name).to.equal(newFolder.name);
          expect(new Date(res.body.createdAt)).to.eql(folder.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(folder.updatedAt);
        });
    });

    it('should send 400 error if name is missing', function(){
      const badFolder = {};

      return chai.request(app)
        .post('/api/folders')
        .send(badFolder)
        .then(function(res){
          expect(res).to.have.status(400);
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Folder.findOne()
        .then(data => {
          const newItem = { 'name': data.name };
          return chai.request(app).post('/api/folders').send(newItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Folder name already exists');
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(Folder.schema.options.toObject, 'transform').throws('FakeError');

      const newItem = { name: 'newFolder' };
      return chai.request(app)
        .post('/api/folders')
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });
  });

  describe('PUT api/folders', function(){

    it('should update folder in database', function(){
      const updatedFolder = {
        name: 'Updated Folder'
      };

      return Folder
        .findOne()
        .then(function(folder){
          updatedFolder.id = folder.id;

          return chai.request(app)
            .put(`/api/folders/${folder.id}`)
            .send(updatedFolder);
        })
        .then(function(res){
          expect(res).to.have.status(204);

          return Folder.findById(updatedFolder.id);
        })
        .then(function(res){
          expect(res.name).to.equal(updatedFolder.name);
        });
    });

    it('should send 400 error if name is missing', function(){
      const badFolder = {};

      return Folder
        .findOne()
        .then(function(folder){
          badFolder.id = folder.id;

          return chai.request(app)
            .put(`/api/folders/${folder.id}`)
            .send(badFolder);
        })
        .then(function(res){
          expect(res).to.have.status(400);
        });
    });
    it('should return an error when given a duplicate name', function () {
      return Folder.find().limit(2)
        .then(results => {
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai.request(app)
            .put(`/api/folders/${item1.id}`)
            .send(item1);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Folder name already exists');
        });
    });

    // it('should catch errors and respond properly', function () {
    //   sandbox.stub(Folder.schema.options.toObject, 'transform').throws('FakeError');

    //   const updateItem = { name: 'Updated Name' };
    //   let data;
    //   return Folder.findOne()
    //     .then(_data => {
    //       data = _data;
    //       return chai.request(app).put(`/api/folders/${data.id}`).send(updateItem);
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
      let folder;

      return Folder
        .findOne()
        .then(function(_folder){
          folder = _folder;
          return chai.request(app).delete(`/api/folders/${folder.id}`);
        })
        .then(function(res){
          expect(res).to.have.status(204);
          return Folder.findById(folder.id);
        })
        .then(function(res){
          expect(res).to.be.null;
        });
    });

    it('should return 404 if id is not found', function(){
      return chai.request(app)
        .delete('/api/folders/DOESNOTEXIST')
        .then(function(res){
          expect(res).to.have.status(404);
        });
    });

    it('should catch errors and respond properly', function () {
      sandbox.stub(express.response, 'sendStatus').throws('FakeError');
      return Folder.findOne()
        .then(data => {
          return chai.request(app).delete(`/api/folders/${data.id}`);
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