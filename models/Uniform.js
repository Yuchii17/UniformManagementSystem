const mongoose = require('mongoose');
const { Schema } = mongoose;

const UniformSchema = new Schema({
  category: {
    type: String,
    enum: ['PE', 'Academic', 'Corporate', 'Department Shirt'],
    required: true
  },
  type: {
    type: String,
    enum: ['Top', 'Bottom'],
    required: true
  },
  size: {
    type: String,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: true
  },
  yearLevel: {
    type: String,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    required: function() {
      return this.category === 'Corporate' || this.category === 'Department Shirt';
    },
    default: null
  },
  availability: {
    type: String,
    enum: ['Available', 'Not Available'],
    default: 'Available',
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  image: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

UniformSchema.index(
  { category: 1, type: 1, gender: 1, yearLevel: 1, size: 1 },
  { unique: true }
);

UniformSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('This uniform already exists for the same category, type, gender, year level, and size.'));
  } else {
    next(error);
  }
});

module.exports = mongoose.model('Uniform', UniformSchema);
