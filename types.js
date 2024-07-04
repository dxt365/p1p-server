const express = require("express");
const debug = require("debug")("http");
const router = express.Router();
const connection = require("./connection");
const { v4: uuidv4 } = require("uuid");
const jwtCheck = require("./jwtCheck");
const throwErrAndRestart = require("./throwErrAndRestart");

router
	.route("/")
	.get((_, res) => {
		connection.query(
			"SELECT * FROM types order by name",
			function (err, result) {
				if (err) {
					throwErrAndRestart(res);
				} else {
					res.status(200).json({
						data: result
					});
				}
			}
		);
	})
	.post(function (req, res) {
		if (!req.body || !Array.isArray(req.body.data)) {
			throwErrAndRestart(res);
			return;
		}
		const { data } = req.body;
		const values = [];
		data
			.filter((item) => item && item.name && item.code)
			.forEach((item) =>
				values.push([
					item.code,
					item.name || null
				])
			);
		connection.query(
			`INSERT INTO types(code, name) VALUES ?`,
			[values],

			function (err, result) {
				if (err) {
					throwErrAndRestart(res);
				} else {
					res.status(200).json({
						data: values
					});
				}
			}
		);
	})
	.put(function (req, res) {
		const { code, name, isDeleted } = req.body;
		connection.query(
			"UPDATE types SET ? WHERE ? ",
			[
				{
					...(isDeleted && { isDeleted }),
					...(!isDeleted && name && { name })
				},
				{ code }
			],
			function (err, result) {
				if (err) {
					throwErrAndRestart(res);
				} else {
					res.status(200).json({
						data: result
					});
				}
			}
		);
	});
module.exports = router;
