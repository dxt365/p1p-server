var fs = require("fs");
var morgan = require("morgan");
var path = require("path");

const morganMiddleware = morgan("combined", {
	skip: function (req, res) {
		return res.statusCode < 400;
	},
	// stream: fs.createWriteStream(path.join(__dirname, "error.log"), {
	// 	flags: "a"
	// })
});

module.exports = morganMiddleware;
