'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/note');

const router = express.Router();

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const {searchTerm, folderId, tagId} = req.query;
  let filter = {};
  filter.$and = [{}, {}];
  const re = new RegExp (searchTerm, 'gi');
  if (folderId){
    filter.$and.push({'folderId': folderId});

  }
  if (searchTerm) {
    filter.$and.push({$or: [{'title': re}, {'content': re}]});
  }
  if (tagId){
    filter.$and.push({'tags': tagId});
  }
  Note
    .find(filter)
    .populate('tags', 'name')
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
    .populate('tags', 'name')
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
  const {title, folderId, content, tags} = req.body;
  if(folderId){
    if(!mongoose.Types.ObjectId.isValid(folderId)){
      const message = 'Invalid folderId';
      console.error(message);
      return res.status(400).send(message);
    } 
  }
  if(tags){
    for(let tagId of tags){
      if(tagId){
        if(!mongoose.Types.ObjectId.isValid(tagId)){
          const message = 'Invalid tagId';
          console.error(message);
          return res.status(400).send(message);
        }
      }
    }
  }

  const testNote = {title, content, folderId, tags};
  const newNote = {};
  // this allows us to add notes without folders, tags, etc
  for(let field in testNote){
    if(testNote[field]){
      newNote[field] = testNote[field];
    }
  }
  Note
    .create(newNote)
    .then(note => {
      res.location(`${req.originalUrl}/${note.id}`)
        .status(201)
        .json(note);
    })
    .catch(err => next(err));
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const {id} = req.params;
  if(!mongoose.Types.ObjectId.isValid(id)){
    const message = 'Invalid id';
    console.error(message);
    return res.status(400).send(message);
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

  const {title, folderId, tags, content} = req.body;
  if(folderId){
    if(!mongoose.Types.ObjectId.isValid(folderId)){
      const message = 'Invalid folderId';
      console.error(message);
      return res.status(400).send(message);
    }
  }

  if(tags){
    for(let tagId of tags){  
      if(tagId){
        if(!mongoose.Types.ObjectId.isValid(tagId)){
          const message = 'Invalid tagId';
          console.error(message);
          return res.status(400).send(message);
        }
      }
    }
  }

  const testNote = {title, content, folderId, tags};
  const toUpdate = {};

  for(let field in testNote){
    if(testNote[field]){
      toUpdate[field] = testNote[field];
    }
  }

  Note
    .findOneAndUpdate(
      {_id: id},
      {$set: toUpdate},
      {new: true}
    )
    .then(result => {
      if(result){
        res.sendStatus(204); 
      } else {
        next();
      }
    })
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