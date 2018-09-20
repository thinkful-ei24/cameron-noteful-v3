'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/note');

const router = express.Router();

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const {searchTerm, folderId} = req.query;
  let filter = {};
  const re = new RegExp (searchTerm, 'gi');
  if (folderId && searchTerm){
    filter.$and = [{$or: [{'title': re}, {'content': re}]}, {'folderId': folderId}];
  }
  else if (searchTerm) {
    filter.$or = [{'title': re}, {'content': re}];
  }
  else if (folderId){
    filter = {'folderId': folderId};
  }
  Note
    .find(filter)
    .sort({ updatedAt: 'desc' })
    .then(notes => res.json(notes))
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const {id} = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)){
    const message = 'Invalid ID';
    console.error(message);
    return res.status(400).send(message);
  } 
  Note
    .findById(id)
    .then(result => {
      if(result){
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const requiredFields = ['title'];
  for (let i=0; i<requiredFields.length; i++){
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }
  const {folderId} = req.body;
  if(folderId){
    if(!mongoose.Types.ObjectId.isValid(folderId)){
      const message = 'Invalid folderId';
      console.error(message);
      return res.status(400).send(message);
    }
  }
  Note
    .create({
      title: req.body.title,
      content: req.body.content,
      folderId: req.body.folderId
    })
    .then(note => {
      res.location(`${req.originalUrl}/${note.id}`)
        .status(201)
        .json(note);
    })
    .catch(err => next(err));
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  if(!(req.params.id && req.body.id && req.params.id === req.body.id)){
    const message = (`Request patch id (${req.params.id}) and request body id` +
    `(${req.body.id}) must match`);
    console.error(message);
    return res.status(400).json({message});
  }
  const requiredFields = ['title'];
  for (let i=0; i<requiredFields.length; i++){
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }

  const {folderId} = req.body;
  if(folderId){
    if(!mongoose.Types.ObjectId.isValid(folderId)){
      const message = 'Invalid folderId';
      console.error(message);
      return res.status(400).send(message);
    }
  }

  const toUpdate = {};
  const updateableFields = ['title', 'content', 'folderId'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });
  Note
    .findOneAndUpdate(
      {_id: req.params.id},
      {$set: toUpdate},
      {new: true}
    )
    .then(result => res.sendStatus(204))
    .catch(err => next(err));

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const {id} = req.params;
  return Note.findById(id)
    .then(function(response){
      if(response){
        Note
          .findOneAndRemove({_id: id})
          .then(() => res.sendStatus(204))
          .catch(err => next(err));
      } else {
        next();
      }
    });
});


module.exports = router;