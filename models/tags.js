const mongoose = require('mongoose');

const tagSchema  = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }
});

tagSchema.set('timestamps', true);

tagSchema.set('toObject', {
  virtuals: true,
  transform: (doc, results) => {
    delete results._id; 
    delete results.__v;
  }
});

module.exports = mongoose.Model('Tag', tagSchema);