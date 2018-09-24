const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/user');

const router = express.Router();

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const newUser = {};
  const userFields = ['fullname', 'username', 'password'];

  for (let field in userFields){
    if(req.body[field]){
      newUser[field] = req.body[field];
    }
  }
  User
    .create(newUser)
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      if(err.code === 11000){
        err = new Error('username already exists');
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;