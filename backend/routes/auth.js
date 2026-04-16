const express = require('express');
const { register, login } = require('../controllers/authController');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.post('/register', [
    body('name', 'Name is required').notEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], validate, register);

router.post('/login', [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists()
], validate, login);

module.exports = router;
