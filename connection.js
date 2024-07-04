require("dotenv").config();
const debug = require("debug")("http");
const mysql = require("mysql");
const options = {
	host: process.env.DB_HOSTNAME,
	port: process.env.DB_PORT,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE,
	timezone: "+00:00",
	multipleStatements: true
};
let connection;
function connectDatabase() {
	if (!connection) {
		connection = mysql.createConnection(options);

		connection.connect(function (err) {
			if (!err) {
				debug(
					"info",
					"Database is connected!",
					process.env.DB_DATABASE
				);
			} else {
				debug("error", "Error connecting database!");
			}
		});
		connection.query(
			`SET SESSION time_zone = '+00:00'`,
			function (error, results, fields) {
				if (error) throw error;
			}
		);
	}
	return connection;
}

module.exports = connectDatabase();
