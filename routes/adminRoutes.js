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

router.get('/admin/index', adminController.dashboard);
router.get('/admin/uniform', adminController.uniformPage);
router.get('/admin/users', adminController.usersPage);
router.get('/admin/request', adminController.requestPage);
router.get('/admin/collection', adminController.collections);
router.get('/admin/history', adminController.getHistory);

router.post('/admin/uniform', upload.single('image'), adminController.createUniform);
router.post('/admin/uniform/edit', upload.single('image'), adminController.editUniform);
router.delete('/admin/delete/:id', adminController.deleteUniform);

router.post('/uniforms/:id/availability', adminController.toggleAvailability);

router.patch('/admin/request/:id/approve', adminController.approveRequest);
router.patch('/admin/request/:id/reject', adminController.rejectRequest);
router.patch('/admin/request/:id/complete', adminController.completeRequest);
router.post('/logout', adminController.logout);

module.exports = router;
