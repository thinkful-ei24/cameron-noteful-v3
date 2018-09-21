const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');
const {TEST_MONGODB_URI} = require('../config');

const Tag = require('../models/tags');
const {tags} = require('../db/seed/data');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful API resource', function(){
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser:true })
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Tag.insertMany(tags);
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('GET api/tags', function(){

    it('should return all existing tags', function(){
      let res;
      let resTags;
      return chai.request(app)
        .get('/api/tags')
        .then(function(results){
          res = results;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.lengthOf.at.least(1);
  
          res.body.forEach(function(tag){
            expect(tag).to.be.a('object');
            expect(tag).to.include.keys(
              'id', 'name');
          });
          resTags = res.body[0];
          return Tag.findById(resTags.id); 
        })
        .then(function(tag){
          expect(resTags.id).to.equal(tag.id);
          expect(resTags.name).to.equal(tag.name);
        });
    });
  });
  
  describe('GET api/tags/:id', function(){
    it('should return correct data when getting by id', function(){
      let testTag;
      let id;
      return Tag
        .findOne()
        .then(function(tag){
          testTag = tag;
          id = testTag.id;
          return chai.request(app)
            .get(`/api/tags/${id}`);
        })
        .then(function(res){
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id', 'name'
          );
          expect(res.body.id).to.equal(testTag.id);
          expect(res.body.name).to.equal(testTag.name);
        });
    });

    it('should return 400 if id is not valid', function(){
      return chai.request(app)
        .get('/api/tags/NOT-A-VALID-ID')
        .then(function(res){
          expect(res).to.have.status(400);
        });
    });

    it('should return 404 if id is not found', function(){
      return chai.request(app)
        .get('/api/folders/100000000000000000000003')
        .then(function(res){
          expect(res).to.have.status(404);
        });
    });
  });

  describe('POST api/tags', function(){

    it('should add a new tags', function(){
      const newTag = {
        name: 'New Tag',
      };
      let res;
      return chai.request(app)
        .post('/api/tags')
        .send(newTag)
        .then(function(_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id', 'name');
          expect(res.body.name).to.equal(newTag.name);
          // cause Mongo should have created id on insertion
          expect(res.body.id).to.not.be.null;

          return Tag.findById(res.body.id);
        })
        .then(function(tag){
          expect(tag.id).to.equal(res.body.id);
          expect(tag.name).to.equal(newTag.name);
          expect(new Date(res.body.createdAt)).to.eql(tag.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(tag.updatedAt);
        });
    });

    it('should send 400 error if name is missing', function(){
      const badTag = {};

      return chai.request(app)
        .post('/api/tags')
        .send(badTag)
        .then(function(res){
          expect(res).to.have.status(400);
        });
    });

    it.skip('should return error when given duplicate name', function(){
      return Tag.findOne()
        .then(data => {
          const duplicateTag = {'name': data.name};
          return chai.request(app).post('/api/tags').send(duplicateTag);
        })
        .then(function(res){
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The tag already exists');
        });
    });
  });

  describe('PUT api/tags', function(){

    it('should update tag in database', function(){
      const updatedTag = {
        name: 'Updated Tag'
      };

      return Tag
        .findOne()
        .then(function(tag){
          updatedTag.id = tag.id;

          return chai.request(app)
            .put(`/api/tags/${tag.id}`)
            .send(updatedTag);
        })
        .then(function(res){
          expect(res).to.have.status(204);

          return Tag.findById(updatedTag.id);
        })
        .then(function(res){
          expect(res.name).to.equal(updatedTag.name);
        });
    });

    it('should send 400 error if name is missing', function(){
      const badTag = {};

      return Tag
        .findOne()
        .then(function(tag){
          badTag.id = tag.id;

          return chai.request(app)
            .put(`/api/tags/${tag.id}`)
            .send(badTag);
        })
        .then(function(res){
          expect(res).to.have.status(400);
        });
    });

    it.skip('should return an error when given a duplicate name', function () {
      return Tag.find().limit(2)
        .then(function(results){
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai.request(app)
            .put(`/api/tags/${item1.id}`)
            .send(item1);
        })
        .then(function(res){
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The tag already exists');
        });
    });
  });

  describe('DELETE endpoint', function(){

    it('should delete item if id is found', function(){
      let tag;

      return Tag
        .findOne()
        .then(function(_tag){
          tag = _tag;
          return chai.request(app).delete(`/api/tags/${tag.id}`);
        })
        .then(function(res){
          expect(res).to.have.status(204);
          return Tag.findById(Tag.id);
        })
        .then(function(res){
          expect(res).to.be.null;
        });
    });

    it('should return 404 if id is not found', function(){
      return chai.request(app)
        .delete('/api/tags/100000000000000000000003')
        .then(function(res){
          expect(res).to.have.status(404);
        });
    });
  });
});  

