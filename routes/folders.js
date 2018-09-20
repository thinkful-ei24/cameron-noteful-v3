'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Folder = require('../models/folder');

const router = express.Router();

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  Folder
    .find()
    .sort({name: 'asc'})
    .then(folders => res.json(folders))
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

  Folder
    .findById(id)
    .then((result) => {
      if (result){
        res.status(200).json(result);
      } else {
        next();
      }
    }
    )
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

  Folder
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
        err = new Error('The folder name already exists');
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
  if(!(req.params.id && req.body.id && req.params.id === req.body.id)){
    const message = (`Request patch id (${req.params.id}) and request body id` +
    `(${req.body.id}) must match`);
    console.error(message);
    return res.status(400).json({message});
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
  Folder
    .findOneAndUpdate(
      {_id: req.params.id},
      {$set: toUpdate},
      {new: true}
    )
    .then(result => res.sendStatus(204))
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The folder name already exists');
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
  return Folder.findById(id)
    .then(function(response){
      if(response){
        Folder
          .findOneAndRemove({_id: id})
          .then(() => res.sendStatus(204))
          .catch(err => next(err));
      } else {
        next();
      }
    });
});




module.exports = router;