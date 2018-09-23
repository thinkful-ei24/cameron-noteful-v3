const express = require('express');
const mongoose = require('mongoose');
const Tag = require('../models/tags');
const Note = require('../models/note');

const router = express.Router();

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  Tag
    .find()
    .sort({name: 'asc'})
    .then(results => res.json(results))
    .catch(err => next(err));
});


/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const {id} = req.params;

  if(!mongoose.Types.ObjectId.isValid(id)){
    const message = 'Invalid ID';
    console.error(message);
    return res.status(400).send(message);
  }

  Tag
    .findById(id)
    .then(result => {
      if(result){
        res.status(200).json(result);
      } else {
        next();
      }
    })
    .catch(err => next(err));
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const requiredField = ['name'];
  for (let i=0; i<requiredField.length; i++){
    const field = requiredField[i];
    if(!(field in req.body)){
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }

  Tag
    .create({
      name: req.body.name
    })
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err.message = 'Tag name already exists';
        err.status = 400;
      }
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const {id} = req.params;
  if(!mongoose.Types.ObjectId.isValid(id)){
    const message = 'Invalid ID';
    console.error(message);
    return res.status(400).send(message);
  }

  const requiredFields = ['name'];
  for (let i=0; i<requiredFields.length; i++){
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }
  const toUpdate = {};
  const updateableField = ['name'];

  updateableField.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });
  Tag
    .findOneAndUpdate(
      {_id: req.params.id},
      {$set: toUpdate},
      {new: true}
    )
    .then(result => {
      if(result){
        res.sendStatus(204);
      }else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err.message = 'Tag name already exists';
        err.status = 400;
      }
      next(err);
    });

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const {id} = req.params;
  if(!mongoose.Types.ObjectId.isValid(id)){
    const message = 'Invalid ID';
    console.error(message);
    return res.status(400).send(message);
  }
  return Tag.findById(id)
    .then(function(response){
      if(response){
        const tagPromise = Tag.findOneAndRemove({_id: id});
        const notePromise = Note.update({}, {$pull: {tags: id}}, {multi: true}); 
        return Promise.all([tagPromise, notePromise])
          .then(() => res.sendStatus(204))
          .catch(err => next(err));
      } else {
        next();
      }
    });
});


module.exports = router;