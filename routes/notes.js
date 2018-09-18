'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/note');

const router = express.Router();

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const searchTerm = req.body.searchTerm;
  let filter = {};
  const re = new RegExp (searchTerm, 'gi');

  if (searchTerm) {
    filter.$or = [{title: re}, {content: re}];
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
  Note
    .create({
      title: req.body.title,
      content: req.body.content
    })
    .then(note => {
      res.status(201).json(note);
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
  const toUpdate = {};
  const updateableFields = ['title', 'content'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });
  Note
    .findOneAndUpdate(
      {_id: req.params.id},
      {$set: toUpdate}
    )
    .then(result => res.sendStatus(204))
    .catch(err => next(err));

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const {id} = req.params;

  Note
    .findOneAndRemove({_id: id})
    .then(() => res.sendStatus(204))
    .catch(err => next(err));

});

module.exports = router;