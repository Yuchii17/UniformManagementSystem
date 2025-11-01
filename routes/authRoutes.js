const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/', authController.landingPage);

router.get('/register', authController.showRegister);
router.post('/register', authController.register);

router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendRegisterOTP);

router.get('/login', authController.showLogin);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.get('/user/index', authController.showDashboard);

router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-forgot-otp', authController.verifyForgotOTP);
router.post('/reset-password', authController.resetPassword);

router.get("/user/request", authController.showRequestPage);
router.get("/user/profile", authController.showProfilePage);
router.post('/user/profile/update', authController.updateProfile);

router.get('/user/requests', authController.viewRequests);

router.post("/logout", authController.logout);

module.exports = router;
