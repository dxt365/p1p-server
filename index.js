require("dotenv").config();
const debug = require("debug")("http");
const express = require("express");
const compression = require("compression");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const app = express();
const session = require("express-session");
const cookieParser = require("cookie-parser");
const MySQLStore = require("express-mysql-session")(session);
const options = {
	host: process.env.DB_HOSTNAME,
	port: process.env.DB_PORT,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE,
	timezone: "+00:00",
	multipleStatements: true
};
const sessionStore = new MySQLStore(options);
const cors = require("cors");
const jwtCheck = require("./jwtCheck");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const endpointSecret = process.env.ENDPOINT_SECRET;

const locations = require('./locations')
const types = require('./types')
const trainings = require('./trainings')
const morganMiddleware = require("./morganMiddleware");
app.use(morganMiddleware);


app.use(
	session({
		key: "session_cookie_name",
		secret: "session_cookie_secret",
		store: sessionStore,
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: false, // if true only transmit cookie over https
			httpOnly: true, // if true prevent client side JS from reading the cookie
			maxAge: 1000 * 60 * 10 // session max age in miliseconds
		}
	})
);

app.disable("x-powered-by");
app.use(helmet());
app.use(compression());
app.use(cookieParser()); // set a cookie

app.use(function (req, res, next) {
	// check if client sent cookie
	const sessionId = req.cookies.sessionId;

	if (sessionId === undefined || sessionId !== req.session.id) {
		// no: set a new cookie
		res.cookie("sessionId", req.session.id);
		debug("session created successfully");
	} else {
		// yes, cookie was already present
		req.session.id = sessionId;
		debug("session exists", sessionId);
	}
	next(); // <-- important!
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
	cors({
		origin: true,
		credentials: true
	})
);
function authChecker(req, res, next) {
	if (!req.headers["x-tekathlete-header"]) {
		return res.status(403).send();
	}
	next();
}

app.use(authChecker);

app.get("/", (req, res) => {
	res.status(200).json({
		data: []
	});
});
app.use("/api/locations", locations);
app.use("/api/types", types);
app.use("/api/trainings", trainings)

app.listen(process.env.API_PORT, function () {
	debug("listening on " + process.env.API_PORT);
});
