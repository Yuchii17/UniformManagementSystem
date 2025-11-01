const mongoose = require('mongoose');

const UniformSchema = new mongoose.Schema({
  category: String,
  type: String,
  size: String,
  gender: String,
  yearLevel: String,
  availability: String,
  status: String,
  image: String,
  createdAt: { type: Date, default: Date.now }
});

const Uniform = mongoose.model('Uniform', UniformSchema);

const MONGO_URI = 'mongodb+srv://aguilarcyruzjaeg:qwaswex12@cluster0.0onfw.mongodb.net/UMS'; 

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    try {
      await Uniform.collection.dropIndex('unique_uniform_except_size');
      console.log('Old index dropped successfully');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('Old index not found, skipping drop');
      } else {
        console.error('Error dropping index:', err);
      }
    }

    try {
      await Uniform.collection.createIndex(
        { category: 1, type: 1, gender: 1, yearLevel: 1, size: 1 },
        { unique: true }
      );
      console.log('New index created successfully');
    } catch (err) {
      console.error('Error creating new index:', err);
    }

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
