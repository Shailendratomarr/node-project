const express = require('express');
const exValidation = require('express-validator');
const authController = require('../controllers/auth');

const router = express.Router();


router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login', authController.postLogin);

router.post('/signup',
    [   exValidation.check('email')
        .isEmail()
        .withMessage('Please enter a valid email')
        .custom((value,{req}) => {
            if(value === 'test@gmail.com'){
                throw new Error('This email address is forbidden!!');
            }
            return true;
        }),
    ],    
    authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);



module.exports = router;