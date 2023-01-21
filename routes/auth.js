const express = require('express');
const {body,check}= require('express-validator');
const router = express.Router();
const User = require('../models/user')
const authController = require('../controllers/auth');
const isAuth = require('../middleware/is-auth');


router.put('/signup' ,[
    check('email').isEmail().normalizeEmail().withMessage('Please Enter a Valid Email').custom((value , {req})=>{
        return User.findOne({email:value}).then(userDoc=>{
            if(userDoc){
                return Promise.reject('Email Address is Already Exists')
            }
        })
    }),
    check('password').trim().isLength({min:5}),
    check('name').trim().not().isEmpty()
],authController.signup)

router.post('/login',authController.login);

router.get('/status',isAuth,authController.getUserStatus);

router.patch('/status',[
    body('status').trim().not().isEmpty()
],isAuth,authController.updateUserStatus)

module.exports = router