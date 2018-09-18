const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {type: String, required: true},
  content: String
});

// Add 'createdAt' and 'updatedAt' fields
noteSchema.set('timestamps', true);

noteSchema.set('toObject', {
  virtuals: true,   //incluse built-in virtual 'id'
  transform: (doc, results) => {
    delete results._id; 
    delete results.__v;
  }
});

module.exports = mongoose.model('Note', noteSchema);