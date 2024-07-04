const express = require("express");
const debug = require("debug")("http");
const router = express.Router();
const connection = require("./connection");

router
	.route("/")
	.get((req, res) => {
		const sessionId = req.cookies.sessionId;
		connection.query(
			`SELECT data FROM sessions where session_id = '${sessionId}'`,
			function (err, result) {
				if (err) {
					debug(err);
					res.status(500).json({ message: "Internal Server Error" });
				} else {
					res.status(200).json({
						data: result
					});
				}
			}
		);
	})
	.post(function (req, res) {
		const { cart } = req.body;

		if (Array.isArray(cart)) {
			req.session.cart = cart;
			req.session.save();
		}

		res.status(200).json({
			data: req.session.cart || []
		});
	});
module.exports = router;
