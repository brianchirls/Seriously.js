const console = window.console;

function nop() {
}

function consoleMethod(name) {
	let method;

	if (!console) {
		return nop;
	}

	if (typeof console[name] === 'function') {
		method = console[name];
	} else if (typeof console.log === 'function') {
		method = console.log;
	} else {
		return nop;
	}

	if (method.bind) {
		return method.bind(console);
	}

	return function () {
		method.apply(console, arguments);
	};
}

const logger = {
	log: consoleMethod('log'),
	info: consoleMethod('info'),
	warn: consoleMethod('warn'),
	error: consoleMethod('error')
};

export default logger;
