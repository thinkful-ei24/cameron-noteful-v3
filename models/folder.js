const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }
});

folderSchema.set('timestamps', true);

folderSchema.set('toObject', {
  virtuals: true,
  transform: (doc, results) => {
    delete results._id; 
    delete results.__v;
  }
});

module.exports = mongoose.model('Folder', folderSchema);