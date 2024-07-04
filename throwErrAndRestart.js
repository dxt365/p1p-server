function throwErrAndRestart(res) {
	res.status(500).json({ message: "Internal Server Error" });
	process.exit();
}
module.exports = throwErrAndRestart;
