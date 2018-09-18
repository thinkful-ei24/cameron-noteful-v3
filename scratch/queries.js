const mongoose = require('mongoose');
const {MONGODB_URI} = require('../config');

const Note = require('../models/note');

mongoose.connect(MONGODB_URI, { useNewUrlParser:true })
  .then(() => {
    const searchTerm = 'lorem';
    let filter = {};
    const re = new RegExp (searchTerm, 'gi');

    if (searchTerm) {
      filter.$or = [{title: re}, {content: re}];
    }

    return Note.find(filter).sort({ updatedAt: 'desc' });
  })
  .then(results => {
    console.log(results);
  })
  .then(() => {
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });

// Find note by id
// mongoose.connect(MONGODB_URI, {useNewUrlParser: true})
//   .then(() => {
//     const id = '5ba146212e05e0150bcbdc26';

//     return Note.findById(id);
//   })
//   .then(results => {
//     console.log(results);
//   })
//   .then (() => mongoose.disconnect())
//   .catch(err => {
//     console.error( `ERROR: ${err.message}`);
//     console.error(err);
//   });

// create new note
// mongoose.connect(MONGODB_URI, {useNewUrlParser: true})
//   .then(() => {
//     const newNote = {
//       title: 'newNote',
//       content: 'new content'
//     };
//     return Note.create(newNote);
//   })
//   .then(results => {
//     console.log(results);
//   })
//   .then (() => mongoose.disconnect())
//   .catch(err => {
//     console.error( `ERROR: ${err.message}`);
//     console.error(err);
//   });

// update note by id
// mongoose.connect(MONGODB_URI, {useNewUrlParser: true})
//   .then(() => {
//     const id = '5ba146212e05e0150bcbdc26';
//     const updateNote = {
//       title: 'updated title',
//       content: 'updated content'
//     };
//     return Note.findOneAndUpdate({_id: id}, {$set: updateNote});
//   })
//   .then(results => {
//     console.log(results);
//   })
//   .then (() => mongoose.disconnect())
//   .catch(err => {
//     console.error( `ERROR: ${err.message}`);
//     console.error(err);
//   });

// delete by id
// mongoose.connect(MONGODB_URI, {useNewUrlParser: true})
//   .then(() => {
//     const id = '5ba146212e05e0150bcbdc26';

//     return Note.findOneAndDelete({_id: id});
//   })
//   .then(() => mongoose.disconnect())
//   .catch(err => {
//     console.error( `ERROR: ${err.message}`);
//     console.error(err);
//   });