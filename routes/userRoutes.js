const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const multer = require('multer');
const path = require('path');

// ===== Multer setup for ORF upload =====
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
    cb(null, 'public/uploads/orf');
    },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // rename with timestamp
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Only JPG and PNG files are allowed'));
    } else {
      cb(null, true);
    }
  }
});

// ===== Routes =====

// Request uniform (with ORF upload)
router.post('/request-uniform', upload.single('orfImage'), userController.requestUniform);

// Cancel uniform request
router.post('/cancel', userController.cancelUniformRequest);

module.exports = router;
