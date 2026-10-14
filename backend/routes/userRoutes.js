const express = require('express');
const router = express.Router();
const {
    authUser,
    registerUser,
    requestPasswordReset,
    resetPassword
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/login', authUser);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.route('/').post(protect, admin, registerUser);

module.exports = router;
