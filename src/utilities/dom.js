import logger from '../logger';

const document = window.document,
	timeouts = [],
	requestAnimationFrame = (function () {
		let lastTime = 0;
		return window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function (callback) {
				function timeoutCallback() {
					callback(currTime + timeToCall);
				}

				const currTime = new Date().getTime(),
					timeToCall = Math.max(0, 16 - (currTime - lastTime)),
					id = window.setTimeout(timeoutCallback, timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};
	}()),

	cancelAnimFrame = (function () {
		return window.cancelAnimationFrame ||
			window.webkitCancelAnimationFrame ||
			window.mozCancelAnimationFrame ||
			window.oCancelAnimationFrame ||
			window.msCancelAnimationFrame ||
			function (id) {
				window.cancelTimeout(id);
			};
	}());

let testContext;

function getElement(input, tags) {
	let element,
		tag;

	if (typeof input === 'string') {
		//element = document.getElementById(input) || document.getElementsByTagName(input)[0];
		element = document.querySelector(input);
	} else if (!input) {
		return false;
	}

	if (input.tagName) {
		element = input;
	}

	if (!element) {
		return input;
	}

	tag = element.tagName.toLowerCase();
	if (tags && tags.indexOf(tag) < 0) {
		return input;
	}

	return element;
}

/*
 * Like instanceof, but it will work on elements that come from different windows (e.g. iframes).
 * We do not use this for constructors defined in this script.
 */
function isInstance(obj, proto) {
	if (!proto) {
		proto = 'HTMLElement';
	}

	if (obj instanceof window[proto]) {
		return true;
	}

	if (!obj || typeof obj !== 'object') {
		return false;
	}

	while (obj) {
		obj = Object.getPrototypeOf(obj);
		if (obj && obj.constructor.name === proto) {
			return true;
		}
	}

	return false;
}

/*
 * faster than setTimeout(fn, 0);
 * http://dbaron.org/log/20100309-faster-timeouts
 */
function setTimeoutZero(fn) {
	/*
     * Workaround for postMessage bug in Firefox if the page is loaded from the file system
     * https://bugzilla.mozilla.org/show_bug.cgi?id=740576
     * Should run fine, but maybe a few milliseconds slower per frame.
     */
	function timeoutFunction() {
		if (timeouts.length) {
			(timeouts.shift())();
		}
	}

	if (typeof fn !== 'function') {
		throw new Error('setTimeoutZero argument is not a function');
	}

	timeouts.push(fn);

	if (window.location.protocol === 'file:') {
		setTimeout(timeoutFunction, 0);
		return;
	}

	window.postMessage('seriously-timeout-message', window.location);
}

window.addEventListener('message', function (event) {
	if (event.source === window && event.data === 'seriously-timeout-message') {
		event.stopPropagation();
		if (timeouts.length > 0) {
			(timeouts.shift())();
		}
	}
}, true);

function getWebGlContext(canvas, options) {
	let context;
	try {
		if (window.WebGLDebugUtils && options && options.debugContext) {
			context = window.WebGLDebugUtils.makeDebugContext(canvas.getContext('webgl', options));
		} else {
			context = canvas.getContext('webgl', options);
		}
	} catch (expError) {
	}

	if (!context) {
		try {
			context = canvas.getContext('experimental-webgl', options);
		} catch (error) {
		}
	}
	return context;
}

function getTestContext(incompatibility) {
	let canvas;

	if (testContext && testContext.getError() === testContext.CONTEXT_LOST_WEBGL) {
		/*
        Test context was lost already, and the webglcontextlost event maybe hasn't fired yet
        so try making a new context
        */
		testContext = undefined;
	}

	if (testContext || !window.WebGLRenderingContext || incompatibility) {
		return testContext;
	}

	canvas = document.createElement('canvas');
	testContext = getWebGlContext(canvas);

	if (testContext) {
		canvas.addEventListener('webglcontextlost', function contextLost(event) {
			/*
            If/When context is lost, just clear testContext and create
            a new one the next time it's needed
            */
			event.preventDefault();
			if (testContext && testContext.canvas === this) {
				testContext = undefined;
				canvas.removeEventListener('webglcontextlost', contextLost, false);
			}
		}, false);
	} else {
		logger.warn('Unable to access WebGL.');
	}

	return testContext;
}

export {
	requestAnimationFrame,
	cancelAnimFrame,
	getElement,
	setTimeoutZero,
	getWebGlContext,
	getTestContext,
	isInstance
};
