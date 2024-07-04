const express = require("express");
const debug = require("debug")("http");
const router = express.Router();
const connection = require("./connection");
const { v4: uuidv4 } = require("uuid");
const jwtCheck = require("./jwtCheck");
const throwErrAndRestart = require("./throwErrAndRestart");
const now = new Date();
const auth = require('./auth')
router
    .route('/alerts')
    .get(function (req, res) {
        connection.query(
            `SELECT  *
        FROM alerts 
        ORDER BY lastModified DESC
        LIMIT  1`,
            function (err, result) {
                if (err) {
                    throwErrAndRestart(res)
                } else {
                    res.status(200).json({
                        status: 'success',
                        data: result,
                        message: 'Success'
                    });
                }
            }
        );
    })
    .post(auth, function (req, res) {
        var message = req.body.message;
        connection.query('INSERT INTO alerts SET ?', { message: message }, function (
            err,
            result
        ) {
            if (err) {
                throwErrAndRestart(res)
            } else {
                res.status(200).json({
                    status: 'success',
                    data: { message: message },
                    message: 'Success'
                });
            }
        });
    });

module.exports = router