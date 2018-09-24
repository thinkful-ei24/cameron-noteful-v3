const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname: String,
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

userSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (doc, result) => {
    delete result._id;
    delete result.__v;
    delete result.password;
  }
});

userSchema.methods.validatePassword = function(password){
  return password === this.password;
}
module.exports = mongoose.model('User', userSchema);