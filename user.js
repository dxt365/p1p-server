const express = require("express");
const debug = require("debug")("http");
const router = express.Router();
const connection = require("./connection");
const { v4: uuidv4 } = require("uuid");
const jwtCheck = require("./jwtCheck");
const throwErrAndRestart = require("./throwErrAndRestart");
const now = new Date();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');

router.route('/login').post(function (req, res) {
    var body = req.body;
    var [username, password] = Buffer.from(req.headers.authorization.split(" ")[1], 'base64').toString().split(":")

    connection.query(
        'SELECT * FROM users WHERE username= ?',
        [username],
        function (err, result, fields) {
            if (err) {
                res.status(500).json({
                    status: 'error',
                    data: {},
                    message: 'error'
                });
                logger.log('error', err.sqlMessage);
            } else {
                if (result.length === 0) {
                    res.status(400).json({
                        status: 'error',
                        data: {},
                        message: 'Invalid email or password.'
                    });
                    logger.log('error', 'Invalid email or password ' + username);
                } else {
                    var user = result[0];
                    // check if password matches
                    bcrypt.compare(password, user.password, function (err, match) {
                        if (match) {
                            req.session.username = user.username;
                            req.session.isAdmin = user.isAdmin;
                            req.session.isScholar = user.isScholar;
                            req.session.isAuth = true;
                            req.session.token = jwt.sign(
                                {
                                    username: username,
                                    isAdmin: req.session.isAdmin,
                                    isScholar: req.session.isScholar,
                                    isScholar: req.session.isAuth
                                },
                                p1Config.secret,
                                {
                                    expiresIn: 86400 // expires in 24 hours
                                }
                            );
                            req.session.save();

                            res.status(200).json({
                                status: 'success',
                                data: {
                                    token: req.session.token,
                                    username: username,
                                    isAdmin: req.session.isAdmin,
                                    isScholar: req.session.isScholar,
                                    isAuth: req.session.isAuth
                                },
                                message: 'Success'
                            });

                            res.end();
                        } else {
                            res.status(400).json({
                                status: 'error',
                                data: {},
                                message: 'Invalid email or password.'
                            });
                            logger.log('error', '400 - Invalid email or password ' + username);
                        }
                    });
                }
            }
        }
    );
});

router.route('/auth').get(function (req, res) {
    if (req.user) {
        res.status(200).json({
            status: 'success',
            data: {
                username: req.user.username,
                isAuth: req.user.isAuth,
                isAdmin: req.user.isAdmin,
                isScholar: req.user.isScholar,
                token: req.user.token
            },
            message: 'Welcome Player ONE User.'
        });
    } else {
        res.status(200).json({
            status: 'success',
            data: {},
            message: 'Guest access.'
        });
    }
});
// Logout endpoint
router.route('/logout').get(function (req, res) {
    req.session.destroy();
    //sessionStore.close();
    res.status(200).json({
        status: 'success',
        data: { username: '', isAuth: false, isAdmin: false, isScholar: false },
        message: 'Logout successful.'
    });
});

router.route('/create').post(function (req, res) {
    var user = req.body;
    user.date_created = new Date();

    bcrypt.hash(user.password, saltRounds, function (err, hash) {
        connection.query(
            'SELECT * FROM users WHERE username=?',
            [user.username],
            function (err, result, fields) {
                if (err) {
                    res.status(500).json({
                        status: 'error',
                        data: {},
                        message: 'error'
                    });
                    logger.log('error', '/users/create ' + err.sqlMessage);
                } else {
                    if (result.length > 0) {
                        res.status(400).json({
                            status: 'error',
                            data: {},
                            message: 'Username not available.'
                        });
                    } else {
                        user.password = hash;
                        connection.query('INSERT INTO users SET ?', user, function (
                            err,
                            rows
                        ) {
                            if (err) {
                                res.status(500).json({
                                    status: 'error',
                                    data: {},
                                    message: 'error'
                                });
                                logger.log('error', '500 - /users/create ');
                            } else {
                                res.status(200).json({
                                    status: 'success',
                                    data: { username: user.username },
                                    message: 'Your account was successfully created.'
                                });
                            }
                        });
                    }
                }
            }
        );
    });
});
