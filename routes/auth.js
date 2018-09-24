const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const router = express.Router();

/* ========== POST/CREATE AN ITEM ========== */

const options = {session: false, failWithError: true};

const localAuth = passport.authenticate('local', options);

router.post('/', localAuth, function(req, res){
  return res.json(req.user);
});

module.exports = router;