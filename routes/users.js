const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/user');

const router = express.Router();

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const {fullname, username, password} = req.body;

  return User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullname
      };
      return User.create(newUser);
    })
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      if(err.code === 11000){
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;