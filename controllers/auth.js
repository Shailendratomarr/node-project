const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const exValidation = require('express-validator');


const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'rhianna.hansen79@ethereal.email',
        pass: 'Vx5jpa9gcXXJgznTwv'
    }
});


exports.getLogin = (req, res, next) => {

    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    }else{
        message = null;
    }
    
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message
    });

};


exports.getSignup = (req, res, next) => {

    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    }else{
        message = null;
    }

    res.render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: message
    });
};


exports.postLogin = (req,res,next) => {
    const email = req.body.email;
    const password = req.body.password;

    User.findOne({email: email})
    .then(user => {
        if(!user){
            req.flash('error','Invalid email or password')
            return res.redirect('/login');
        }

        bcrypt
        .compare(password,user.password)
        .then(doMatch => {
            if(doMatch){
                req.session.isLoggedIn = true;
                req.session.user = user;
                return req.session.save(err => {
                    console.log(err) 
                    res.redirect('/');
                });
            }

            req.flash('error','Invalid email or password')
            res.redirect('/login');
        })
        .catch(err => {
            console.log(err);
            res.redirect('/login');
        })

    })
    .catch(err => console.log(err));
};


exports.postSignup = (req, res, next) => {

    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const errors = exValidation.validationResult(req);

    if(!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422)
        .render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg
        });
    }

    User.findOne({email: email})
        .then(userDoc => {
            if(userDoc){
                req.flash('error','E-mail exists already, please pick a diferent one.')
                return res.redirect('/signup');
            }
            return bcrypt.hash(password, 12)
                .then(hashedPassword => {
                    const user = new User({
                        email: email,
                        password: hashedPassword,
                        cart: {items: []}
                    });
                    return user.save()
                })
                .then(result => {
                    res.redirect('/login');

                    let message = {
                        from: 'shailendratomar010@gmail.com',
                        to: email,
                        subject: 'Nodemailer is unicode friendly ✔',
                        text: 'mail sent ',
                        html: '<p><b>Signup was Successull with book Waala.com</b><hr> Enjoy our services</p>'
                    };

                    return transporter.sendMail(message, (err, info) => {
                        if (err) {
                            console.log('Error occurred. ' + err.message);
                            return process.exit(1);
                        }
                
                        console.log('Message sent: %s', info.messageId);
                        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
                    });
                })
                .catch(err => {
                    console.log(err);
                });
        })
        .catch(err => console.log(err));
};


exports.postLogout = (req,res,next) => {

    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });

};

exports.getReset = (req,res,next) => {

    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    }else{
        message = null;
    }

    res.render('auth/reset',{
        path:'/reseet',
        pageTitle:'Reset Password',
        errorMessage:message
    })
};


exports.postReset = (req,res,next) => {
    crypto.randomBytes(32, (err,buffer) => {
        if(err){
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');

        User.findOne({email: req.body.email })
        .then(user => {
            if(!user){
                req.flash('error','No account with the email found.');
                return res.redirect('/reset');
            }

            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000;
            return user.save();
        })
        .then(result => {

            res.redirect('/');
            let message = {
                from: 'shailendratomar010@gmail.com',
                to: req.body.email,
                subject: 'Bookwaaale account reset password account token',
                text: 'mail sent ',
                html: `
                    <p><b>Please reset your password here</b><hr>Continue Enjoying our services</p>
                    <p>Reset your password using the link below</p><hr>
                    <a href="http://localhost:3000/reset/${token}">link</a>
                `
            };

            transporter.sendMail(message, (err, info) => {
                if (err) {
                    console.log('Error occurred. ' + err.message);
                    return process.exit(1);
                }
        
                console.log('Message sent: %s', info.messageId);
                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            });
        })
        .catch(err => console.log(err));
    });
};

exports.getNewPassword = (req,res,next) => {

    const token = req.params.token;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
    .then(user => {

        let message = req.flash('error');
        if(message.length > 0){
            message = message[0];
        }else{
            message = null;
        }
    
        res.render('auth/new-password',{
            path:'/new-password',
            pageTitle:'New password',
            errorMessage:message,
            userId: user._id.toString(),
            passwordToken: token
        });
    })
    .catch(err => console.log(err));

};


exports.postNewPassword = (req,res,next) => {

    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;

    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: { $gt: Date.now() },
        _id: userId
    })
    .then(user => {
        resetUser = user;
        return bcrypt.hash(newPassword,12);
    })
    .then(hashedPassword => {
        resetUser.password = hashedPassword;
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiration = undefined;
        return resetUser.save();
    })
    .then(result => {
        res.redirect('/login');
    })
    .catch(err => console.log(err));
};