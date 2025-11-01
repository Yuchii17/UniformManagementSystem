const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path'); 
const adminController = require('../controllers/adminController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- Pages ---
router.get('/admin/index', adminController.dashboard);
router.get('/admin/uniform', adminController.uniformPage);
router.get('/admin/account', adminController.accountPage);
router.get('/admin/users', adminController.usersPage);
router.get('/admin/request', adminController.requestPage);
router.get('/admin/collection', adminController.collections);

// --- Uniform CRUD ---
router.post('/admin/uniform', upload.single('image'), adminController.createUniform);
router.post('/admin/uniform/edit', upload.single('image'), adminController.editUniform);
router.delete('/admin/delete/:id', adminController.deleteUniform);

// --- Uniform availability toggle ---
router.post('/uniforms/:id/availability', adminController.toggleAvailability);

// --- Uniform request actions with PATCH for RESTful updates ---
router.patch('/admin/request/:id/approve', adminController.approveRequest);
router.patch('/admin/request/:id/reject', adminController.rejectRequest);
router.patch('/admin/request/:id/complete', adminController.completeRequest);

// --- Logout ---
router.post('/logout', adminController.logout);

module.exports = router;
