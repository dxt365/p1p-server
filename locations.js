const express = require("express");
const debug = require("debug")("http");
const router = express.Router();
const connection = require("./connection");
const { v4: uuidv4 } = require("uuid");
const jwtCheck = require("./jwtCheck");
const throwErrAndRestart = require("./throwErrAndRestart");
const fnstz = require('date-fns-tz')
const localTimeZone = 'America/Los_Angeles'
const now = fnstz.formatInTimeZone(new Date(), localTimeZone, 'yyyy-MM-dd HH:mm:ss'); 
router
	.route("/")
	.get((_, res) => {
		connection.query(
			"SELECT * FROM locations order by name",
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
					item.name || null,
					item.address || null,
					item.description || null,
					now
				])
			);
		connection.query(
			`INSERT INTO locations (code, name, address, description, lastModified) VALUES ?`,
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
		const { code, description, address, isDeleted } = req.body;
		connection.query(
			"UPDATE locations SET ? WHERE ? ",
			[
				{
					now,
					...(isDeleted && { isDeleted }),
					...(!isDeleted && name && { name }),
					...(!isDeleted && description && { description }),
					...(!isDeleted && address && { address })
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
