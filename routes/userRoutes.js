const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/orf'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Only JPG/PNG allowed'));
    cb(null, true);
  }
});

router.post('/request-uniform', upload.single('orfImage'), userController.requestUniform);
router.post('/cancel', userController.cancelUniformRequest);
router.get('/notifications', userController.getNotifications);

module.exports = router;
