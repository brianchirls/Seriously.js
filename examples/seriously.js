(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define('seriously', factory) :
	(global.Seriously = factory());
}(this, (function () { 'use strict';

/*
 *   Global reference variables
 */

// http://www.w3.org/TR/css3-color/#svg-color
const colorNames = {
		transparent: [0, 0, 0, 0],
		black: [0, 0, 0, 1],
		red: [1, 0, 0, 1],
		green: [0, 128 / 255, 0, 1],
		blue: [0, 0, 1, 1],
		white: [1, 1, 1, 1],
		silver: [192 / 255, 192 / 255, 192 / 255, 1],
		gray: [128 / 255, 128 / 255, 128 / 255, 1],
		maroon: [128 / 255, 0, 0, 1],
		purple: [128 / 255, 0, 128 / 255, 1],
		fuchsia: [1, 0, 1, 1],
		lime: [0, 1, 0, 1],
		olive: [128 / 255, 128 / 255, 0, 1],
		yellow: [1, 1, 0, 1],
		navy: [0, 0, 128 / 255, 1],
		teal: [0, 128 / 255, 128 / 255, 1],
		aqua: [0, 1, 1, 1],
		orange: [1, 165 / 255, 0, 1]
	};
const colorRegex = /^(rgb|hsl)a?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*(\d+(\.\d*)?)\s*)?\)/i;
const hexColorRegex = /^#(([0-9a-fA-F]{3,8}))/;
const vectorFields = ['x', 'y', 'z', 'w'];
const colorFields = ['r', 'g', 'b', 'a'];
const outputRenderOptions = {
		srcRGB: 0x0302, //SRC_ALPHA
		dstRGB: 0x0303, //ONE_MINUS_SRC_ALPHA
		srcAlpha: 0x01, //ONE
		dstAlpha: 0x0303 //ONE_MINUS_SRC_ALPHA
	};
const shaderDebugConstants = [
		'MAX_COMBINED_TEXTURE_IMAGE_UNITS',
		'MAX_FRAGMENT_UNIFORM_VECTORS',
		'MAX_TEXTURE_IMAGE_UNITS',
		'MAX_VARYING_VECTORS',
		'MAX_VERTEX_ATTRIBS',
		'MAX_VERTEX_TEXTURE_IMAGE_UNITS',
		'MAX_VERTEX_UNIFORM_VECTORS'
	];
const shaderNameRegex = /^[\t ]*#define[\t ]+SHADER_NAME\s+([^$\n\r]+)/i;
const reservedEffectProperties = [
		'alias',
		'destroy',
		'effect',
		'id',
		'initialize',
		'inputs',
		'isDestroyed',
		'isReady',
		'matte',
		'off',
		'on',
		'readPixels',
		'render',
		'title',
		'update'
	];
const reservedTransformProperties = [
		'alias',
		'destroy',
		'id',
		'inputs',
		'isDestroyed',
		'isReady',
		'off',
		'on',
		'source',
		'title',
		'update'
	];
const reservedNames = [
		'aliases',
		'defaults',
		'destroy',
		'effect',
		'draw',
		'go',
		'id',
		'incompatible',
		'isDestroyed',
		'isEffect',
		'isNode',
		'isSource',
		'isTarget',
		'isTransform',
		'initDaemon',
		'addAlias',
		'removeAlias',
		'render',
		'source',
		'stop',
		'addNode',
		'removeNode',
		'target',
		'transform',
		'getNodeId',
		'findInputNode',
		'addSourceNode',
		'removeSourceNode',
		'addEffectNode',
		'removeEffectNode',
		'addTransformNode',
		'removeTransformNode',
		'addTargetNode',
		'removeTargetNode',
		'commonShaders',
		'auto',
		'attachContext'
	];
const baseVertexShader = [
		'precision mediump float;',

		'attribute vec4 position;',
		'attribute vec2 texCoord;',

		'uniform vec2 resolution;',
		'uniform mat4 transform;',

		'varying vec2 vTexCoord;',

		'void main(void) {',
		// first convert to screen space
		'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
		'	screenPosition = transform * screenPosition;',

		// convert back to OpenGL coords
		'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
		'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
		'	gl_Position.w = screenPosition.w;',
		'	vTexCoord = texCoord;',
		'}\n'
	].join('\n');
const baseFragmentShader = [
		'precision mediump float;',

		'varying vec2 vTexCoord;',

		'uniform sampler2D source;',

		'void main(void) {',
		/*
        '	if (any(lessThan(vTexCoord, vec2(0.0))) || any(greaterThanEqual(vTexCoord, vec2(1.0)))) {',
        '		gl_FragColor = vec4(0.0);',
        '	} else {',
        */
		'		gl_FragColor = texture2D(source, vTexCoord);',
		//'	}',
		'}'
	].join('\n');

let identity;

if (window.Float32Array) {
	identity = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);
}

function extend(dest, src) {
	let property,
		descriptor;

	//todo: are we sure this is safe?
	if (dest.prototype && src.prototype && dest.prototype !== src.prototype) {
		extend(dest.prototype, src.prototype);
	}

	for (property in src) {
		if (src.hasOwnProperty(property)) {
			descriptor = Object.getOwnPropertyDescriptor(src, property);

			if (descriptor.get || descriptor.set) {
				Object.defineProperty(dest, property, {
					configurable: true,
					enumerable: true,
					get: descriptor.get,
					set: descriptor.set
				});
			} else {
				dest[property] = src[property];
			}
		}
	}

	return dest;
}

function isArrayLike(obj) {
	return Array.isArray(obj) ||
		(obj && obj.BYTES_PER_ELEMENT && 'length' in obj);
}

/*!
 * mat4 matrix functions borrowed from gl-matrix by toji
 * https://github.com/toji/gl-matrix
 * License: https://github.com/toji/gl-matrix/blob/master/LICENSE.md
 */
let mat4 = {
	/*
     * mat4.frustum
     * Generates a frustum matrix with the given bounds
     *
     * Params:
     * left, right - scalar, left and right bounds of the frustum
     * bottom, top - scalar, bottom and top bounds of the frustum
     * near, far - scalar, near and far bounds of the frustum
     * dest - Optional, mat4 frustum matrix will be written into
     *
     * Returns:
     * dest if specified, a new mat4 otherwise
     */
	frustum: function (left, right, bottom, top, near, far, dest) {
		if (!dest) {
			// todo: check where did this .create() came from since it's definitely undefined
			dest = mat4.create();
		}

		let rl = (right - left),
			tb = (top - bottom),
			fn = (far - near);

		dest[0] = (near * 2) / rl;
		dest[1] = 0;
		dest[2] = 0;
		dest[3] = 0;
		dest[4] = 0;
		dest[5] = (near * 2) / tb;
		dest[6] = 0;
		dest[7] = 0;
		dest[8] = (right + left) / rl;
		dest[9] = (top + bottom) / tb;
		dest[10] = -(far + near) / fn;
		dest[11] = -1;
		dest[12] = 0;
		dest[13] = 0;
		dest[14] = -(far * near * 2) / fn;
		dest[15] = 0;

		return dest;
	},

	perspective: function (fovy, aspect, near, far, dest) {
		var top = near * Math.tan(fovy * Math.PI / 360.0),
			right = top * aspect;
		return mat4.frustum(-right, right, -top, top, near, far, dest);
	},
	multiply: function (dest, mat, mat2) {
		// Cache the matrix values (makes for huge speed increases!)
		let a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
			a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
			a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
			a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

			// Cache only the current line of the second matrix
			b0 = mat2[0], b1 = mat2[1], b2 = mat2[2], b3 = mat2[3];
		dest[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		dest[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		dest[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		dest[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = mat2[4];
		b1 = mat2[5];
		b2 = mat2[6];
		b3 = mat2[7];
		dest[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		dest[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		dest[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		dest[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = mat2[8];
		b1 = mat2[9];
		b2 = mat2[10];
		b3 = mat2[11];
		dest[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		dest[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		dest[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		dest[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = mat2[12];
		b1 = mat2[13];
		b2 = mat2[14];
		b3 = mat2[15];
		dest[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		dest[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		dest[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		dest[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		return dest;
	},
	identity: function (dest) {
		dest[0] = 1;
		dest[1] = 0;
		dest[2] = 0;
		dest[3] = 0;
		dest[4] = 0;
		dest[5] = 1;
		dest[6] = 0;
		dest[7] = 0;
		dest[8] = 0;
		dest[9] = 0;
		dest[10] = 1;
		dest[11] = 0;
		dest[12] = 0;
		dest[13] = 0;
		dest[14] = 0;
		dest[15] = 1;
		return dest;
	},
	copy: function (out, a) {
		out[0] = a[0];
		out[1] = a[1];
		out[2] = a[2];
		out[3] = a[3];
		out[4] = a[4];
		out[5] = a[5];
		out[6] = a[6];
		out[7] = a[7];
		out[8] = a[8];
		out[9] = a[9];
		out[10] = a[10];
		out[11] = a[11];
		out[12] = a[12];
		out[13] = a[13];
		out[14] = a[14];
		out[15] = a[15];
		return out;
	}
};

//http://www.w3.org/TR/css3-color/#hsl-color
function hslToRgb(h, s, l, a, out) {
	function hueToRgb(m1, m2, h) {
		h = h % 1;
		if (h < 0) {
			h += 1;
		}
		if (h < 1 / 6) {
			return m1 + (m2 - m1) * h * 6;
		}
		if (h < 1 / 2) {
			return m2;
		}
		if (h < 2 / 3) {
			return m1 + (m2 - m1) * (2 / 3 - h) * 6;
		}
		return m1;
	}

	let m1, m2;

	if (l < 0.5) {
		m2 = l * (s + 1);
	} else {
		m2 = l + s - l * s;
	}
	m1 = l * 2 - m2;

	if (!out) {
		out = [];
	}

	out[0] = hueToRgb(m1, m2, h + 1 / 3);
	out[1] = hueToRgb(m1, m2, h);
	out[2] = hueToRgb(m1, m2, h - 1 / 3);
	out[3] = a;

	return out;
}

function colorArrayToHex(color) {
	let i,
		val,
		hex,
		s = '#',
		len = color[3] < 1 ? 4 : 3;

	for (i = 0; i < len; i++) {
		val = Math.min(255, Math.round(color[i] * 255 || 0));
		hex = val.toString(16);
		if (val < 16) {
			hex = '0' + hex;
		}
		s += hex;
	}
	return s;
}

const console$1 = window.console;

function nop$1() {
}

function consoleMethod(name) {
	let method;

	if (!console$1) {
		return nop$1;
	}

	if (typeof console$1[name] === 'function') {
		method = console$1[name];
	} else if (typeof console$1.log === 'function') {
		method = console$1.log;
	} else {
		return nop$1;
	}

	if (method.bind) {
		return method.bind(console$1);
	}

	return function () {
		method.apply(console$1, arguments);
	};
}

const logger = {
	log: consoleMethod('log'),
	info: consoleMethod('info'),
	warn: consoleMethod('warn'),
	error: consoleMethod('error')
};

const document$3 = window.document;
const timeouts = [];
const requestAnimationFrame = (function () {
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
	}());
const cancelAnimFrame = (function () {
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
		element = document$3.querySelector(input);
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

	canvas = document$3.createElement('canvas');
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

const SOURCE_TAGS = ['img', 'canvas', 'video'];
const document$2 = window.document;

function checkSource(source, incompatibility) {
	var element, canvas, ctx, texture;

	element = getElement(source, SOURCE_TAGS);
	if (!element) {
		return false;
	}

	canvas = document$2.createElement('canvas');
	if (!canvas) {
		logger.warn('Browser does not support canvas or Seriously.js');
		return false;
	}

	if (element.naturalWidth === 0 && element.tagName === 'IMG') {
		logger.warn('Image not loaded');
		return false;
	}

	if (element.readyState === 0 && element.videoWidth === 0 && element.tagName === 'VIDEO') {
		logger.warn('Video not loaded');
		return false;
	}

	ctx = getTestContext(incompatibility);
	if (ctx) {
		texture = ctx.createTexture();
		if (!texture) {
			logger.error('Test WebGL context has been lost');
		}

		ctx.bindTexture(ctx.TEXTURE_2D, texture);

		try {
			ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, element);
		} catch (textureError) {
			if (textureError.code === window.DOMException.SECURITY_ERR) {
				logger.log('Unable to access cross-domain image');
			} else {
				logger.error('Error storing image to texture: ' + textureError.message);
			}
			ctx.deleteTexture(texture);
			return false;
		}
		ctx.deleteTexture(texture);
	} else {
		ctx = canvas.getContext('2d');
		try {
			ctx.drawImage(element, 0, 0);
			ctx.getImageData(0, 0, 1, 1);
		} catch (drawImageError) {
			if (drawImageError.code === window.DOMException.SECURITY_ERR) {
				logger.log('Unable to access cross-domain image');
			} else {
				logger.error('Error drawing image to canvas: ' + drawImageError.message);
			}
			return false;
		}
	}

	// This method will return a false positive for resources that aren't
	// actually images or haven't loaded yet

	return true;
}

function makeGlModel(shape, gl) {
	let vertex, index, texCoord;

	if (!gl) {
		return false;
	}

	vertex = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
	gl.bufferData(gl.ARRAY_BUFFER, shape.vertices, gl.STATIC_DRAW);
	vertex.size = 3;

	index = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, shape.indices, gl.STATIC_DRAW);

	texCoord = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texCoord);
	gl.bufferData(gl.ARRAY_BUFFER, shape.coords, gl.STATIC_DRAW);
	texCoord.size = 2;

	return {
		vertex: vertex,
		index: index,
		texCoord: texCoord,
		length: shape.indices.length,
		mode: shape.mode || gl.TRIANGLES
	};
}

function buildRectangleModel(gl) {
	let shape = {
		vertices: new Float32Array([
			-1, -1, 0,
			1, -1, 0,
			1, 1, 0,
			-1, 1, 0
		]),
		indices: new Uint16Array([
			0, 1, 2,
			0, 2, 3	// Front face
		]),
		coords: new Float32Array([
			0, 0,
			1, 0,
			1, 1,
			0, 1
		])
	};

	return makeGlModel(shape, gl);
}

function FrameBuffer(gl, width, height, options) {
	let frameBuffer,
		renderBuffer,
		tex,
		status,
		useFloat = options === true ? options : (options && options.useFloat);

	useFloat = false;//useFloat && !!gl.getExtension('OES_texture_float'); //useFloat is not ready!
	if (useFloat) {
		this.type = gl.FLOAT;
	} else {
		this.type = gl.UNSIGNED_BYTE;
	}

	frameBuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

	if (options && options.texture) {
		this.texture = options.texture;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		this.ownTexture = false;
	} else {
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		this.ownTexture = true;
	}

	try {
		if (this.type === gl.FLOAT) {
			tex = new Float32Array(width * height * 4);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, tex);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			this.type = gl.UNSIGNED_BYTE;
		}
	} catch (e) {
		// Null rejected
		this.type = gl.UNSIGNED_BYTE;
		tex = new Uint8Array(width * height * 4);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, tex);
	}

	renderBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

	status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

	if (status === gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT) {
		throw new Error('Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT');
	}

	if (status === gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT) {
		throw new Error('Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT');
	}

	if (status === gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS) {
		throw new Error('Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS');
	}

	if (status === gl.FRAMEBUFFER_UNSUPPORTED) {
		throw new Error('Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED');
	}

	if (status !== gl.FRAMEBUFFER_COMPLETE) {
		throw new Error('Incomplete framebuffer: ' + status);
	}

	//clean up
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	this.gl = gl;
	this.frameBuffer = frameBuffer;
	this.renderBuffer = renderBuffer;
	this.width = width;
	this.height = height;
}

FrameBuffer.prototype.resize = function (width, height) {
	const gl = this.gl;

	if (this.width === width && this.height === height) {
		return;
	}

	this.width = width;
	this.height = height;

	if (!gl) {
		return;
	}

	gl.bindTexture(gl.TEXTURE_2D, this.texture);
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
	gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);

	//todo: handle float
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

FrameBuffer.prototype.destroy = function () {
	const gl = this.gl;

	if (gl) {
		gl.deleteFramebuffer(this.frameBuffer);
		gl.deleteRenderbuffer(this.renderBuffer);
		if (this.ownTexture) {
			gl.deleteTexture(this.texture);
		}
	}

	delete this.frameBuffer;
	delete this.renderBuffer;
	delete this.texture;
	delete this.gl;
};

/**
 *  Utility class for building and accessing WebGL shaders.
 *
 *  @class ShaderProgram
 */

function ShaderProgram(gl, vertexShaderSource, fragmentShaderSource) {
	let program,
		vertexShader,
		fragmentShader,
		programError = '',
		shaderError,
		i, l,
		shaderNameRegexMatch,
		obj;

	function compileShader(source, fragment) {
		let shader;

		if (fragment) {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		} else {
			shader = gl.createShader(gl.VERTEX_SHADER);
		}

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			source = source.split(/[\n\r]/);
			for (let j = 0; j < source.length; j++) {
				source[j] = (j + 1) + ':\t' + source[j];
			}
			source.unshift('Error compiling ' + (fragment ? 'fragment' : 'vertex') + ' shader:');
			logger.error(source.join('\n'));
			throw new Error('Shader error: ' + gl.getShaderInfoLog(shader));
		}

		return shader;
	}

	function makeShaderSetter(info, loc) {
		if (info.type === gl.SAMPLER_2D) {
			return function (value) {
				info.glTexture = gl['TEXTURE' + value];
				gl.uniform1i(loc, value);
			};
		}

		if (info.type === gl.BOOL || info.type === gl.INT) {
			if (info.size > 1) {
				return function (value) {
					gl.uniform1iv(loc, value);
				};
			}

			return function (value) {
				gl.uniform1i(loc, value);
			};
		}

		if (info.type === gl.FLOAT) {
			if (info.size > 1) {
				return function (value) {
					gl.uniform1fv(loc, value);
				};
			}

			return function (value) {
				gl.uniform1f(loc, value);
			};
		}

		if (info.type === gl.FLOAT_VEC2) {
			return function (obj) {
				gl.uniform2f(loc, obj[0], obj[1]);
			};
		}

		if (info.type === gl.FLOAT_VEC3) {
			return function (obj) {
				gl.uniform3f(loc, obj[0], obj[1], obj[2]);
			};
		}

		if (info.type === gl.FLOAT_VEC4) {
			return function (obj) {
				gl.uniform4f(loc, obj[0], obj[1], obj[2], obj[3]);
			};
		}

		if (info.type === gl.FLOAT_MAT3) {
			return function (mat3) {
				gl.uniformMatrix3fv(loc, false, mat3);
			};
		}

		if (info.type === gl.FLOAT_MAT4) {
			return function (mat4) {
				gl.uniformMatrix4fv(loc, false, mat4);
			};
		}

		throw new Error('Unknown shader uniform type: ' + info.type);
	}

	function makeShaderGetter(loc) {
		return function () {
			return gl.getUniform(program, loc);
		};
	}

	vertexShader = compileShader(vertexShaderSource);
	fragmentShader = compileShader(fragmentShaderSource, true);

	program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	shaderError = gl.getShaderInfoLog(vertexShader);
	if (shaderError) {
		programError += 'Vertex shader error: ' + shaderError + '\n';
	}
	gl.attachShader(program, fragmentShader);
	shaderError = gl.getShaderInfoLog(fragmentShader);
	if (shaderError) {
		programError += 'Fragment shader error: ' + shaderError + '\n';
	}
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		programError += gl.getProgramInfoLog(program);
		gl.deleteProgram(program);
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);

		shaderNameRegexMatch = shaderNameRegex.exec(vertexShaderSource) ||
			shaderNameRegex.exec(fragmentShaderSource);

		if (shaderNameRegexMatch) {
			programError = 'Shader = ' + shaderNameRegexMatch[1] + '\n' + programError;
		}

		shaderDebugConstants.forEach(function (c) {
			programError += '\n' + c + ': ' + gl.getParameter(gl[c]);
		});

		throw new Error('Could not initialize shader:\n' + programError);
	}

	gl.useProgram(program);

	this.uniforms = {};

	l = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
	for (i = 0; i < l; ++i) {
		obj = {
			info: gl.getActiveUniform(program, i)
		};

		obj.name = obj.info.name.replace(/\[0\]$/, '');
		obj.loc = gl.getUniformLocation(program, obj.name);
		obj.set = makeShaderSetter(obj.info, obj.loc);
		obj.get = makeShaderGetter(obj.loc);
		this.uniforms[obj.name] = obj;

		if (!this[obj.name]) {
			//for convenience
			this[obj.name] = obj;
		}
	}

	this.attributes = {};
	this.location = {};
	l = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
	for (i = 0; i < l; ++i) {
		obj = {
			info: gl.getActiveAttrib(program, i)
		};

		obj.name = obj.info.name;
		obj.location = gl.getAttribLocation(program, obj.name);
		this.attributes[obj.name] = obj;
		this.location[obj.name] = obj.location;
	}

	this.gl = gl;
	this.program = program;

	this.destroy = function () {
		if (gl) {
			gl.deleteProgram(program);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
		}

		for (let key in this) {
			if (this.hasOwnProperty(key)) {
				delete this[key];
			}
		}

		program = null;
		vertexShader = null;
		fragmentShader = null;
	};
}

ShaderProgram.prototype.use = function () {
	this.gl.useProgram(this.program);
};

function Node (seriously) {
	this.ready = false;
	this.width = 1;
	this.height = 1;

	this.uniforms = {
		resolution: [this.width, this.height],
		transform: null
	};

	this.dirty = true;
	this.isDestroyed = false;

	this.seriously = seriously;
	this.gl = seriously.gl;

	this.listeners = {};

	this.id = seriously.getNodeId();
}

Node.prototype.setReady = function () {
	let i;

	if (!this.ready) {
		this.ready = true;
		this.emit('ready');
		if (this.targets) {
			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].setReady();
			}
		}
	}
};

Node.prototype.setUnready = function () {
	let i;

	if (this.ready) {
		this.ready = false;
		this.emit('unready');
		if (this.targets) {
			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].setUnready();
			}
		}
	}
};

Node.prototype.setDirty = function () {
	//loop through all targets calling setDirty (depth-first)
	let i;

	if (!this.dirty) {
		this.emit('dirty');
		this.dirty = true;
		if (this.targets) {
			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].setDirty();
			}
		}
	}
};

Node.prototype.initFrameBuffer = function (useFloat) {
	if (this.seriously.gl) {
		this.frameBuffer = new FrameBuffer(this.seriously.gl, this.width, this.height, useFloat);
	}
};

Node.prototype.readPixels = function (x, y, width, height, dest) {
	const gl = this.seriously.gl;
	const nodeGl = this.gl || gl;

	if (!gl) {
		//todo: is this the best approach?
		throw new Error('Cannot read pixels until a canvas is connected');
	}

	//todo: check on x, y, width, height

	if (!this.frameBuffer) {
		this.initFrameBuffer();
		this.setDirty();
	}

	//todo: should we render here?
	this.render();

	//todo: figure out formats and types
	if (dest === undefined) {
		dest = new Uint8Array(width * height * 4);
	} else if (!(isInstance(dest, 'Uint8Array'))) {
		throw new Error('Incompatible array type');
	}

	nodeGl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer.frameBuffer);
	nodeGl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, dest);

	return dest;
};

Node.prototype.resize = function () {
	let width,
		height;

	if (this.source) {
		width = this.source.width;
		height = this.source.height;
	} else if (this.sources && this.sources.source) {
		width = this.sources.source.width;
		height = this.sources.source.height;
	} else if (this.inputs && this.inputs.width) {
		width = this.inputs.width;
		height = this.inputs.height || width;
	} else if (this.inputs && this.inputs.height) {
		width = height = this.inputs.height;
	} else {
		//this node will be responsible for calculating its own size
		width = 1;
		height = 1;
	}

	width = Math.floor(width);
	height = Math.floor(height);

	if (this.width !== width || this.height !== height) {
		this.width = width;
		this.height = height;

		this.emit('resize');
		this.setDirty();
	}

	if (this.uniforms && this.uniforms.resolution) {
		this.uniforms.resolution[0] = width;
		this.uniforms.resolution[1] = height;
	}

	if (this.frameBuffer && this.frameBuffer.resize) {
		this.frameBuffer.resize(width, height);
	}
};

Node.prototype.on = function (eventName, callback) {
	let listeners,
		index = -1;

	if (!eventName || typeof callback !== 'function') {
		return;
	}

	listeners = this.listeners[eventName];
	if (listeners) {
		index = listeners.indexOf(callback);
	} else {
		listeners = this.listeners[eventName] = [];
	}

	if (index < 0) {
		listeners.push(callback);
	}
};

Node.prototype.off = function (eventName, callback) {
	let listeners,
		index = -1;

	if (!eventName || typeof callback !== 'function') {
		return;
	}

	listeners = this.listeners[eventName];
	if (listeners) {
		index = listeners.indexOf(callback);
		if (index >= 0) {
			listeners.splice(index, 1);
		}
	}
};

Node.prototype.emit = function (eventName) {
	let i,
		listeners = this.listeners[eventName];

	if (listeners && listeners.length) {
		for (i = 0; i < listeners.length; i++) {
			setTimeoutZero(listeners[i]);
		}
	}
};

Node.prototype.destroy = function () {
	let i, key;

	//remove all listeners
	for (key in this.listeners) {
		if (this.listeners.hasOwnProperty(key)) {
			delete this.listeners[key];
		}
	}

	//clear out uniforms
	for (i in this.uniforms) {
		if (this.uniforms.hasOwnProperty(i)) {
			delete this.uniforms[i];
		}
	}

	//clear out list of targets and disconnect each
	if (this.targets) {
		delete this.targets;
	}

	//clear out frameBuffer
	if (this.frameBuffer && this.frameBuffer.destroy) {
		this.frameBuffer.destroy();
		delete this.frameBuffer;
	}

	//remove from main nodes index
	this.seriously.removeNode(this);

	delete this.seriously;

	this.isDestroyed = true;
};

const nop$2 = function () {};

function Source(sourceNode) {
	let me = sourceNode;

	//priveleged accessor methods
	Object.defineProperties(this, {
		original: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.source;
			}
		},
		id: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.id;
			}
		},
		width: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.width;
			}
		},
		height: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.height;
			}
		}
	});

	this.render = function () {
		me.render();
	};

	this.update = function () {
		me.update();
		me.setDirty();
	};

	this.readPixels = function (x, y, width, height, dest) {
		return me.readPixels(x, y, width, height, dest);
	};

	this.on = function (eventName, callback) {
		me.on(eventName, callback);
	};

	this.off = function (eventName, callback) {
		me.off(eventName, callback);
	};

	this.destroy = function () {
		let i,
			descriptor;

		me.destroy();

		for (i in this) {
			if (this.hasOwnProperty(i) && i !== 'isDestroyed' && i !== 'id') {
				descriptor = Object.getOwnPropertyDescriptor(this, i);
				if (descriptor.get || descriptor.set ||
					typeof this[i] !== 'function') {
					delete this[i];
				} else {
					this[i] = nop$2;
				}
			}
		}
	};

	this.isDestroyed = function () {
		return me.isDestroyed;
	};

	this.isReady = function () {
		return me.ready;
	};
}

/*
 * possible sources: img, video, canvas (2d or 3d), texture, ImageData, array, typed array
 */
function SourceNode(seriously, hook, source, options) {
	let opts = options || {},
		flip = opts.flip === undefined ? true : opts.flip,
		width = opts.width,
		height = opts.height,
		deferTexture = false,
		that = this,
		matchedType = false,
		gl,
		plugin;

	function compareSource(source) {
		return that.source === source;
	}

	Node.call(this, seriously);

	// set inside Node constructor
	gl = this.seriously.gl;

	if (hook && typeof hook !== 'string' || !source && source !== 0) {
		if (!options || typeof options !== 'object') {
			options = source;
		}
		source = hook;
	}

	if (typeof source === 'string' && isNaN(source)) {
		source = getElement(source, ['canvas', 'img', 'video']);
	}

	// forced source type?
	if (typeof hook === 'string') {
		plugin = this.seriously.constructor.sourcePlugin(this, hook, source, options, true);
		if (plugin) {
			this.hook = hook;
			matchedType = true;
			deferTexture = plugin.deferTexture;
			this.plugin = plugin;
			this.compare = plugin.compare;
			this.checkDirty = plugin.checkDirty;
			if (plugin.source) {
				source = plugin.source;
			}
		}
	}

	//todo: could probably stand to re-work and re-indent this whole block now that we have plugins
	if (!plugin && isInstance(source)) {
		if (source.tagName === 'CANVAS') {
			this.width = source.width;
			this.height = source.height;

			this.render = this.renderImageCanvas.bind(this);
			matchedType = true;
			this.hook = 'canvas';
			this.compare = compareSource;
			this.update = function () {
				this.width = source.width;
				this.height = source.height;
				this.resize();
			};
		} else if (source.tagName === 'IMG') {
			this.width = source.naturalWidth || 1;
			this.height = source.naturalHeight || 1;

			if (!source.complete || !source.naturalWidth) {
				deferTexture = true;
			}

			source.addEventListener('load', function () {
				if (!that.isDestroyed) {
					if (that.width !== source.naturalWidth || that.height !== source.naturalHeight) {
						that.width = source.naturalWidth;
						that.height = source.naturalHeight;
						that.resize();
					}

					that.setDirty();
					that.setReady();
				}
			}, true);

			this.render = this.renderImageCanvas.bind(this);
			matchedType = true;
			this.hook = 'image';
			this.compare = compareSource;
		}
	} else if (!plugin && isInstance(source, 'WebGLTexture')) {
		if (gl && !gl.isTexture(source)) {
			throw new Error('Not a valid WebGL texture.');
		}

		//different defaults
		if (!isNaN(width)) {
			if (isNaN(height)) {
				height = width;
			}
		} else if (!isNaN(height)) {
			width = height;
		}
		/* else {
			//todo: guess based on dimensions of target canvas
			//throw new Error('Must specify width and height when using a WebGL texture as a source');
		}*/

		this.width = width;
		this.height = height;

		if (opts.flip === undefined) {
			flip = false;
		}
		matchedType = true;

		this.texture = source;
		this.initialized = true;
		this.hook = 'texture';
		this.compare = compareSource;

		//todo: if WebGLTexture source is from a different context render it and copy it over
		this.render = function () {};
	}

	if (!matchedType && !plugin) {
		this.seriously.constructor.forEachSource(function (key, plugin) {
			plugin = this.seriously.constructor.sourcePlugin(this, key, source, options, false);
			if (plugin) {
				this.hook = key;
				matchedType = true;
				deferTexture = plugin.deferTexture;
				this.plugin = plugin;
				this.compare = plugin.compare;
				this.checkDirty = plugin.checkDirty;
				if (plugin.source) {
					source = plugin.source;
				}

				return false;
			}
		}.bind(this));
	}

	if (!matchedType) {
		throw new Error('Unknown source type');
	}

	this.source = source;
	if (this.flip === undefined) {
		this.flip = flip;
	}

	this.targets = [];

	if (!deferTexture) {
		that.setReady();
	}

	this.pub = new Source(this);

	seriously.addSourceNode(this);
}

SourceNode.prototype = Object.create(Node.prototype);
SourceNode.prototype.constructor = SourceNode;

SourceNode.prototype.initialize = function () {
	let gl = this.seriously.gl,
		texture;

	if (!gl || this.texture || !this.ready) {
		return;
	}

	texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);

	this.texture = texture;
	this.initialized = true;
	this.allowRefresh = true;
	this.setDirty();
};

SourceNode.prototype.initFrameBuffer = function (useFloat) {
	const gl = this.seriously.gl;

	if (gl) {
		this.frameBuffer = new FrameBuffer(gl, this.width, this.height, {
			texture: this.texture,
			useFloat: useFloat
		});
	}
};

SourceNode.prototype.addTarget = function (target) {
	let i;
	for (i = 0; i < this.targets.length; i++) {
		if (this.targets[i] === target) {
			return;
		}
	}

	this.targets.push(target);
};

SourceNode.prototype.removeTarget = function (target) {
	let i = this.targets && this.targets.indexOf(target);
	if (i >= 0) {
		this.targets.splice(i, 1);
	}
};

SourceNode.prototype.update = nop$2;

SourceNode.prototype.resize = function () {
	let i,
		target;

	this.uniforms.resolution[0] = this.width;
	this.uniforms.resolution[1] = this.height;

	if (this.framebuffer) {
		this.framebuffer.resize(this.width, this.height);
	}

	this.emit('resize');
	this.setDirty();

	if (this.targets) {
		for (i = 0; i < this.targets.length; i++) {
			target = this.targets[i];
			target.resize();
			if (target.setTransformDirty) {
				target.setTransformDirty();
			}
		}
	}
};

SourceNode.prototype.setReady = function () {
	let i;
	if (!this.ready) {
		this.ready = true;
		this.resize();
		this.initialize();

		this.emit('ready');
		if (this.targets) {
			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].setReady();
			}
		}

	}
};

SourceNode.prototype.render = function () {
	const gl = this.seriously.gl;
	let media = this.source;

	if (!gl || !media && media !== 0 || !this.ready) {
		return;
	}

	if (!this.initialized) {
		this.initialize();
	}

	if (!this.allowRefresh) {
		return;
	}

	if (this.plugin && this.plugin.render &&
		(this.dirty || this.checkDirty && this.checkDirty()) &&
		this.plugin.render.call(this, gl, this.seriously.draw, this.seriously.rectangleModel, this.seriously.baseShader)) {

		this.dirty = false;
		this.emit('render');
	}
};

SourceNode.prototype.renderImageCanvas = function () {
	const gl = this.seriously.gl;
	let media = this.source;

	if (!gl || !media || !this.ready) {
		return;
	}

	if (!this.initialized) {
		this.initialize();
	}

	if (!this.allowRefresh) {
		return;
	}

	if (this.dirty) {
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flip);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		try {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);

			this.dirty = false;
			this.emit('render');
			return true;
		} catch (securityError) {
			if (securityError.code === window.DOMException.SECURITY_ERR) {
				this.allowRefresh = false;
				logger.error('Unable to access cross-domain image');
			}
		}

		return false;
	}
};

SourceNode.prototype.destroy = function () {
	let key, item;

	if (this.plugin && this.plugin.destroy) {
		this.plugin.destroy.call(this);
	}

	if (this.seriously.gl && this.texture) {
		this.seriously.gl.deleteTexture(this.texture);
	}

	//targets
	while (this.targets.length) {
		item = this.targets.pop();
		if (item && item.removeSource) {
			item.removeSource(this);
		}
	}

	//remove self from master list of sources
	this.seriously.removeSourceNode(this);

	Node.prototype.destroy.call(this);

	for (key in this) {
		if (this.hasOwnProperty(key) && key !== 'id' && key !== 'isDestroyed') {
			delete this[key];
		}
	}
};

const nop$3 = function () {};

function Effect(effectNode) {
	let name, me = effectNode;

	function setInput(inputName, input) {
		const effectInput = me.effect.inputs[inputName];
		let lookup = me.inputElements[inputName],
			value;

		if (typeof input === 'string' && isNaN(input)) {
			if (effectInput.type === 'enum') {
				if (!effectInput.options.hasOwnProperty(input)) {
					input = getElement(input, ['select']);
				}
			} else if (effectInput.type === 'number' || effectInput.type === 'boolean') {
				input = getElement(input, ['input', 'select']);
			} else if (effectInput.type === 'image') {
				input = getElement(input, ['canvas', 'img', 'video']);
			}
			//todo: color? date/time?
		}

		if (isInstance(input, 'HTMLInputElement') || isInstance(input, 'HTMLSelectElement')) {
			value = input.value;

			if (lookup && lookup.element !== input) {
				lookup.element.removeEventListener('change', lookup.listener, true);
				lookup.element.removeEventListener('input', lookup.listener, true);
				delete me.inputElements[inputName];
				lookup = null;
			}

			if (!lookup) {
				lookup = {
					element: input,
					listener: (function (name, element) {
						return function () {
							let oldValue, newValue;

							if (input.type === 'checkbox') {
								//special case for check box
								oldValue = input.checked;
							} else {
								oldValue = element.value;
							}
							newValue = me.setInput(name, oldValue);

							//special case for color type
							if (effectInput.type === 'color') {
								newValue = colorArrayToHex(newValue).substr(0, 7);
							}

							//if input validator changes our value, update HTML Element
							//todo: make this optional...somehow
							if (newValue !== oldValue) {
								element.value = newValue;
							}
						};
					}(inputName, input))
				};

				me.inputElements[inputName] = lookup;
				if (input.type === 'range') {
					input.addEventListener('input', lookup.listener, true);
					input.addEventListener('change', lookup.listener, true);
				} else {
					input.addEventListener('change', lookup.listener, true);
				}
			}

			if (lookup && input.type === 'checkbox') {
				value = input.checked;
			}
		} else {
			if (lookup) {
				lookup.element.removeEventListener('change', lookup.listener, true);
				lookup.element.removeEventListener('input', lookup.listener, true);
				delete me.inputElements[inputName];
			}
			value = input;
		}

		me.setInput(inputName, value);
		return me.inputs[inputName];
	}

	function makeImageSetter(inputName) {
		return function (value) {
			let val = setInput(inputName, value);
			return val && val.pub;
		};
	}

	function makeImageGetter(inputName) {
		return function () {
			let val = me.inputs[inputName];
			return val && val.pub;
		};
	}

	function makeSetter(inputName) {
		return function (value) {
			return setInput(inputName, value);
		};
	}

	function makeGetter(inputName) {
		return function () {
			return me.inputs[inputName];
		};
	}

	//priveleged publicly accessible methods/setters/getters
	//todo: provide alternate set/get methods
	for (name in me.effect.inputs) {
		if (me.effect.inputs.hasOwnProperty(name)) {
			if (this[name] === undefined) {
				if (me.effect.inputs[name].type === 'image') {
					Object.defineProperty(this, name, {
						configurable: true,
						enumerable: true,
						get: makeImageGetter(name),
						set: makeImageSetter(name)
					});
				} else {
					Object.defineProperty(this, name, {
						configurable: true,
						enumerable: true,
						get: makeGetter(name),
						set: makeSetter(name)
					});
				}
			} else {
				//todo: this is temporary. get rid of it.
				throw new Error('Cannot overwrite Seriously.' + name);
			}
		}
	}

	Object.defineProperties(this, {
		effect: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.hook;
			}
		},
		title: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.effect.title || me.hook;
			}
		},
		width: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.width;
			}
		},
		height: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.height;
			}
		},
		id: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.id;
			}
		}
	});

	this.render = function () {
		me.render();
		return this;
	};

	this.readPixels = function (x, y, width, height, dest) {
		return me.readPixels(x, y, width, height, dest);
	};

	this.on = function (eventName, callback) {
		me.on(eventName, callback);
	};

	this.off = function (eventName, callback) {
		me.off(eventName, callback);
	};

	this.inputs = function (name) {
		let result,
			input,
			inputs = me.effect.inputs,
			key;

		if (name) {
			input = inputs[name];
			if (!input) {
				return null;
			}

			result = {
				type: input.type,
				defaultValue: input.defaultValue,
				title: input.title || name
			};

			if (input.type === 'number') {
				result.min = input.min;
				result.max = input.max;
				result.step = input.step;
				result.mod = input.mod;
			} else if (input.type === 'enum') {
				//make a copy
				result.options = extend({}, input.options);
			} else if (input.type === 'vector') {
				result.dimensions = input.dimensions;
			}

			if (input.description) {
				result.description = input.description;
			}

			return result;
		}

		result = {};
		for (key in inputs) {
			if (inputs.hasOwnProperty(key)) {
				result[key] = this.inputs(key);
			}
		}
		return result;
	};

	this.alias = function (inputName, aliasName) {
		me.alias(inputName, aliasName);
		return this;
	};

	this.matte = function (polygons) {
		me.matte(polygons);
	};

	this.destroy = function () {
		let i,
			descriptor;

		me.destroy();

		for (i in this) {
			if (this.hasOwnProperty(i) && i !== 'isDestroyed' && i !== 'id') {
				descriptor = Object.getOwnPropertyDescriptor(this, i);
				if (descriptor.get || descriptor.set ||
					typeof this[i] !== 'function') {
					delete this[i];
				} else {
					this[i] = nop$3;
				}
			}
		}
	};

	this.isDestroyed = function () {
		return me.isDestroyed;
	};

	this.isReady = function () {
		return me.ready;
	};
}

function EffectNode (seriously, hook, effect, options) {
	let name, input,
		defaultValue,
		defaults,
		defaultSources = {};

	Node.call(this, seriously);

	this.effectRef = effect;
	this.sources = {};
	this.targets = [];
	this.inputElements = {};
	this.dirty = true;
	this.shaderDirty = true;
	this.hook = hook;
	this.options = options;
	this.transform = null;

	this.effect = extend({}, this.effectRef);
	if (this.effectRef.definition) {
		/*
            todo: copy over inputs object separately in case some are specified
            in advance and some are specified in definition function
            */
		extend(this.effect, this.effectRef.definition.call(this, options));
	}

	seriously.constructor.validateInputSpecs(this.effect);

	this.uniforms.transform = identity;
	this.inputs = {};
	defaults = seriously.defaults(hook);

	for (name in this.effect.inputs) {
		if (this.effect.inputs.hasOwnProperty(name)) {
			input = this.effect.inputs[name];

			if (input.defaultValue === undefined || input.defaultValue === null) {
				if (input.type === 'number') {
					input.defaultValue = Math.min(Math.max(0, input.min), input.max);
				} else if (input.type === 'color') {
					input.defaultValue = [0, 0, 0, 0];
				} else if (input.type === 'boolean') {
					input.defaultValue = false;
				} else if (input.type === 'string') {
					input.defaultValue = '';
				} else if (input.type === 'enum') {
					input.defaultValue = input.firstValue;
				}
			}

			defaultValue = input.validate.call(this, input.defaultValue, input);
			if (defaults && defaults[name] !== undefined) {
				defaultValue = input.validate.call(this, defaults[name], input, input.defaultValue, defaultValue);
				defaults[name] = defaultValue;
				if (input.type === 'image') {
					defaultSources[name] = defaultValue;
				}
			}

			this.inputs[name] = defaultValue;
			if (input.uniform) {
				this.uniforms[input.uniform] = input.defaultValue;
			}
		}
	}

	if (this.seriously.gl) {
		this.initialize();
		if (this.effect.commonShader) {
			/*
                this effect is unlikely to need to be modified again
                by changing parameters, so build it now to avoid jank later
                */
			this.buildShader();
		}
	}

	this.updateReady();
	this.inPlace = this.effect.inPlace;

	this.pub = new Effect(this);

	seriously.addEffectNode(this);

	for (name in defaultSources) {
		if (defaultSources.hasOwnProperty(name)) {
			this.setInput(name, defaultSources[name]);
		}
	}
}

EffectNode.prototype = Object.create(Node.prototype);
EffectNode.prototype.constructor = EffectNode;

EffectNode.prototype.initialize = function () {
	if (!this.initialized) {
		this.baseShader = this.seriously.baseShader;

		if (this.shape) {
			this.model = makeGlModel(this.shape, this.gl);
		} else {
			this.model = this.seriously.rectangleModel;
		}

		if (typeof this.effect.initialize === 'function') {
			this.effect.initialize.call(this, function () {
				this.initFrameBuffer(true);
			}.bind(this), this.seriously.gl);
		} else {
			this.initFrameBuffer(true);
		}

		if (this.frameBuffer) {
			this.texture = this.frameBuffer.texture;
		}

		this.initialized = true;
	}
};

EffectNode.prototype.resize = function () {
	let i;

	Node.prototype.resize.call(this);

	if (this.effect.resize) {
		this.effect.resize.call(this);
	}

	for (i = 0; i < this.targets.length; i++) {
		this.targets[i].resize();
	}
};

EffectNode.prototype.updateReady = function () {
	let i,
		input,
		key,
		effect,
		ready = true,
		method;

	effect = this.effect;
	for (key in effect.inputs) {
		if (effect.inputs.hasOwnProperty(key)) {
			input = this.effect.inputs[key];
			if (input.type === 'image' &&
				(!this.sources[key] || !this.sources[key].ready) &&
				(!effect.requires || effect.requires.call(this, key, this.inputs))
			) {
				ready = false;
				break;
			}
		}
	}

	if (this.ready !== ready) {
		this.ready = ready;
		this.emit(ready ? 'ready' : 'unready');
		method = ready ? 'setReady' : 'setUnready';

		if (this.targets) {
			for (i = 0; i < this.targets.length; i++) {
				this.targets[i][method]();
			}
		}
	}
};

EffectNode.prototype.setReady = EffectNode.prototype.updateReady;

EffectNode.prototype.setUnready = EffectNode.prototype.updateReady;

EffectNode.prototype.addTarget = function (target) {
	let i;
	for (i = 0; i < this.targets.length; i++) {
		if (this.targets[i] === target) {
			return;
		}
	}

	this.targets.push(target);
};

EffectNode.prototype.removeTarget = function (target) {
	let i = this.targets && this.targets.indexOf(target);
	if (i >= 0) {
		this.targets.splice(i, 1);
	}
};

EffectNode.prototype.removeSource = function (source) {
	let i, pub = source && source.pub;

	for (i in this.inputs) {
		if (this.inputs.hasOwnProperty(i) &&
			(this.inputs[i] === source || this.inputs[i] === pub)) {
			this.inputs[i] = null;
		}
	}

	for (i in this.sources) {
		if (this.sources.hasOwnProperty(i) &&
			(this.sources[i] === source || this.sources[i] === pub)) {
			this.sources[i] = null;
		}
	}
};

EffectNode.prototype.buildShader = function () {
	let shader,
		effect = this.effect,
		hook = this.hook;

	function addShaderName(shaderSrc) {
		if (shaderNameRegex.test(shaderSrc)) {
			return shaderSrc;
		}

		return '#define SHADER_NAME seriously.' + hook + '\n' +
			shaderSrc;
	}

	if (this.shaderDirty) {
		if (effect.commonShader && this.seriously.commonShaders[this.hook]) {
			if (!this.shader) {
				this.seriously.commonShaders[this.hook].count++;
			}
			this.shader = this.seriously.commonShaders[this.hook].shader;
		} else if (effect.shader) {
			if (this.shader && !effect.commonShader) {
				this.shader.destroy();
			}
			shader = effect.shader.call(this, this.inputs, {
				vertex: baseVertexShader,
				fragment: baseFragmentShader
			}, this.seriously.constructor.util);

			if (shader instanceof ShaderProgram) {
				this.shader = shader;
			} else if (shader && shader.vertex && shader.fragment) {
				this.shader = new ShaderProgram(
					this.seriously.gl,
					addShaderName(shader.vertex),
					addShaderName(shader.fragment)
				);
			} else {
				this.shader = this.seriously.baseShader;
			}

			if (effect.commonShader) {
				this.seriously.commonShaders[this.hook] = {
					count: 1,
					shader: this.shader
				};
			}
		} else {
			this.shader = this.seriously.baseShader;
		}

		this.shaderDirty = false;
	}
};

EffectNode.prototype.render = function () {
	let key,
		frameBuffer,
		effect = this.effect,
		that = this,
		inPlace;

	function drawFn(shader, model, uniforms, frameBuffer, node, options) {
		that.seriously.draw(shader, model, uniforms, frameBuffer, node || that, options);
	}

	if (!this.seriously.gl) {
		return;
	}

	if (!this.initialized) {
		this.initialize();
	}

	if (this.shaderDirty) {
		this.buildShader();
	}

	if (this.dirty && this.ready) {
		for (key in this.sources) {
			if (this.sources.hasOwnProperty(key) &&
				(!effect.requires || effect.requires.call(this, key, this.inputs))) {

				//todo: set source texture in case it changes?
				//sourcetexture = this.sources[i].render() || this.sources[i].texture

				inPlace = typeof this.inPlace === 'function' ? this.inPlace(key) : this.inPlace;
				this.sources[key].render(!inPlace);
			}
		}

		if (this.frameBuffer) {
			frameBuffer = this.frameBuffer.frameBuffer;
		}

		if (typeof effect.draw === 'function') {
			effect.draw.call(this, this.shader, this.model, this.uniforms, frameBuffer, drawFn);
			this.emit('render');
		} else if (frameBuffer) {
			this.seriously.draw(this.shader, this.model, this.uniforms, frameBuffer, this);
			this.emit('render');
		}

		this.dirty = false;
	}

	return this.texture;
};

EffectNode.prototype.setInput = function (name, value) {
	let input, uniform,
		sourceKeys,
		source,
		me = this,
		defaultValue;

	function disconnectSource() {
		let previousSource = me.sources[name],
			key;

		/*
            remove this node from targets of previously connected source node,
            but only if the source node is not being used as another input
            */
		if (previousSource) {
			for (key in me.sources) {
				if (key !== name &&
					me.sources.hasOwnProperty(key) &&
					me.sources[key] === previousSource) {
					return;
				}
			}
			previousSource.removeTarget(me);
		}
	}

	if (this.effect.inputs.hasOwnProperty(name)) {
		input = this.effect.inputs[name];
		if (input.type === 'image') {
			//&& !(value instanceof Effect) && !(value instanceof Source)) {

			if (value) {
				value = this.seriously.findInputNode(value);

				if (value !== this.sources[name]) {
					disconnectSource();

					if (this.seriously.constructor.traceSources(value, this)) {
						throw new Error('Attempt to make cyclical connection.');
					}

					this.sources[name] = value;
					value.addTarget(this);
				}
			} else {
				delete this.sources[name];
				value = false;
			}

			uniform = this.sources[name];

			sourceKeys = Object.keys(this.sources);
			if (this.inPlace === true && sourceKeys.length === 1) {
				source = this.sources[sourceKeys[0]];
				this.uniforms.transform = source && source.cumulativeMatrix || identity;
			} else {
				this.uniforms.transform = identity;
			}
		} else {
			let defaultInput = this.seriously.defaults(this.hook);
			if (defaultInput && defaultInput[name] !== undefined) {
				defaultValue = defaultInput[name];
			} else {
				defaultValue = input.defaultValue;
			}
			value = input.validate.call(this, value, input, defaultValue, this.inputs[name]);
			uniform = value;
		}

		if (this.inputs[name] === value && input.type !== 'color' && input.type !== 'vector') {
			return value;
		}

		this.inputs[name] = value;

		if (input.uniform) {
			this.uniforms[input.uniform] = uniform;
		}

		if (input.type === 'image') {
			this.resize();
			this.updateReady();
		} else if (input.updateSources) {
			this.updateReady();
		}

		if (input.shaderDirty) {
			this.shaderDirty = true;
		}

		this.setDirty();

		if (input.update) {
			input.update.call(this, value);
		}

		return value;
	}
};

EffectNode.prototype.alias = function (inputName, aliasName) {
	const that = this;

	if (reservedNames.indexOf(aliasName) >= 0) {
		throw new Error('\'' + aliasName + '\' is a reserved name and cannot be used as an alias.');
	}

	if (this.effect.inputs.hasOwnProperty(inputName)) {
		if (!aliasName) {
			aliasName = inputName;
		}

		this.seriously.removeAlias(aliasName);
		this.seriously.addAlias(aliasName, {
			node: this,
			input: inputName
		});

		Object.defineProperty(this.seriously, aliasName, {
			configurable: true,
			enumerable: true,
			get: function () {
				return that.inputs[inputName];
			},
			set: function (value) {
				return that.setInput(inputName, value);
			}
		});
	}

	return this;
};

/*
    matte function to be assigned as a method to EffectNode and TargetNode
    */
EffectNode.prototype.matte = function (poly) {
	let polys,
		polygons = [],
		polygon,
		vertices = [],
		i, j, v,
		vert, prev,
		//triangles = [],
		shape = {};

	//detect whether it's multiple polygons or what
	function makePolygonsArray(poly) {
		if (!poly || !poly.length || !Array.isArray(poly)) {
			return [];
		}

		if (!Array.isArray(poly[0])) {
			return [poly];
		}

		if (Array.isArray(poly[0]) && !isNaN(poly[0][0])) {
			return [poly];
		}

		return poly;
	}

	function linesIntersect(a1, a2, b1, b2) {
		const ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x),
			ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x),
			u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

		if (u_b) {
			let ua = ua_t / u_b,
				ub = ub_t / u_b;
			if (ua > 0 && ua <= 1 && ub > 0 && ub <= 1) {
				return {
					x: a1.x + ua * (a2.x - a1.x),
					y: a1.y + ua * (a2.y - a1.y)
				};
			}
		}
		return false;
	}

	function makeSimple(poly) {
		/*
            this uses a slow, naive approach to detecting line intersections.
            Use Bentley-Ottmann Algorithm
            see: http://softsurfer.com/Archive/algorithm_0108/algorithm_0108.htm#Bentley-Ottmann Algorithm
            see: https://github.com/tokumine/sweepline
            */
		let i, j,
			edge1, edge2,
			intersect,
			intersections = [],
			newPoly,
			head, point,
			newPolygons,
			point1, point2;

		if (poly.simple) {
			return;
		}

		for (i = 0; i < poly.edges.length; i++) {
			edge1 = poly.edges[i];
			for (j = i + 1; j < poly.edges.length; j++) {
				edge2 = poly.edges[j];
				intersect = linesIntersect(edge1[0], edge1[1], edge2[0], edge2[1]);
				if (intersect) {
					intersect.edge1 = edge1;
					intersect.edge2 = edge2;
					intersections.push(intersect);
				}
			}
		}

		if (intersections.length) {
			newPolygons = [];

			for (i = 0; i < intersections.length; i++) {
				intersect = intersections[i];
				edge1 = intersect.edge1;
				edge2 = intersect.edge2;

				//make new points
				//todo: set ids for points
				point1 = {
					x: intersect.x,
					y: intersect.y,
					prev: edge1[0],
					next: edge2[1],
					id: vertices.length
				};
				poly.vertices.push(point1);
				vertices.push(point1);

				point2 = {
					x: intersect.x,
					y: intersect.y,
					prev: edge2[0],
					next: edge1[1],
					id: vertices.length
				};
				poly.vertices.push(point2);
				vertices.push(point1);

				//modify old points
				point1.prev.next = point1;
				point1.next.prev = point1;
				point2.prev.next = point2;
				point2.next.prev = point2;

				//don't bother modifying the old edges. we're just gonna throw them out
			}

			//make new polygons
			do {
				newPoly = {
					edges: [],
					vertices: [],
					simple: true
				};
				newPolygons.push(newPoly);
				point = poly.vertices[0];
				head = point;
				//while (point.next !== head && poly.vertices.length) {
				do {
					i = poly.vertices.indexOf(point);
					poly.vertices.splice(i, 1);
					newPoly.edges.push([point, point.next]);
					newPoly.vertices.push(point);
					point = point.next;
				} while (point !== head);
			} while (poly.vertices.length);

			//remove original polygon from list
			i = polygons.indexOf(poly);
			polygons.splice(i, 1);

			//add new polygons to list
			for (i = 0; i < newPolygons.length; i++) {
				polygons.push(newPolygons[i]);
			}
		} else {
			poly.simple = true;
		}
	}

	function clockWise(poly) {
		let p, q, n = poly.vertices.length,
			pv, qv, sum = 0;
		for (p = n - 1, q = 0; q < n; p = q, q++) {
			pv = poly.vertices[p];
			qv = poly.vertices[q];
			//sum += (next.x - v.x) * (next.y + v.y);
			//sum += (v.next.x + v.x) * (v.next.y - v.y);
			sum += pv.x * qv.y - qv.x * pv.y;
		}
		return sum > 0;
	}

	function triangulate(poly) {
		let v, points = poly.vertices,
			n, V = [], indices = [],
			nv, count, m, u, w,

			//todo: give these variables much better names
			a, b, c, s, t;

		function pointInTriangle(a, b, c, p) {
			let ax, ay, bx, by, cx, cy, apx, apy, bpx, bpy, cpx, cpy,
				cXap, bXcp, aXbp;

			ax = c.x - b.x;
			ay = c.y - b.y;
			bx = a.x - c.x;
			by = a.y - c.y;
			cx = b.x - a.x;
			cy = b.y - a.y;
			apx = p.x - a.x;
			apy = p.y - a.y;
			bpx = p.x - b.x;
			bpy = p.y - b.y;
			cpx = p.x - c.x;
			cpy = p.y - c.y;

			aXbp = ax * bpy - ay * bpx;
			cXap = cx * apy - cy * apx;
			bXcp = bx * cpy - by * cpx;

			return aXbp >= 0 && bXcp >= 0 && cXap >= 0;
		}

		function snip(u, v, w, n, V) {
			let p, a, b, c, point;
			a = points[V[u]];
			b = points[V[v]];
			c = points[V[w]];
			if (0 > (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) {
				return false;
			}
			for (p = 0; p < n; p++) {
				if (!(p === u || p === v || p === w)) {
					point = points[V[p]];
					if (pointInTriangle(a, b, c, point)) {
						return false;
					}
				}
			}
			return true;
		}

		//copy points
		//for (v = 0; v < poly.vertices.length; v++) {
		//	points.push(poly.vertices[v]);
		//}
		n = points.length;

		if (poly.clockWise) {
			for (v = 0; v < n; v++) {
				V[v] = v;
			}
		} else {
			for (v = 0; v < n; v++) {
				V[v] = (n - 1) - v;
			}
		}

		nv = n;
		count = 2 * nv;
		v = nv - 1;
		while (nv > 2) {
			if ((count--) <= 0) {
				return indices;
			}

			u = v;
			if (nv <= u) {
				u = 0;
			}

			v = u + 1;
			if (nv <= v) {
				v = 0;
			}

			w = v + 1;
			if (nv < w) {
				w = 0;
			}

			if (snip(u, v, w, nv, V)) {
				a = V[u];
				b = V[v];
				c = V[w];
				if (poly.clockWise) {
					indices.push(points[a]);
					indices.push(points[b]);
					indices.push(points[c]);
				} else {
					indices.push(points[c]);
					indices.push(points[b]);
					indices.push(points[a]);
				}
				for (s = v, t = v + 1; t < nv; s++, t++) {
					V[s] = V[t];
				}
				nv--;
				count = 2 * nv;
			}
		}

		polygon.indices = indices;
	}

	polys = makePolygonsArray(poly);

	for (i = 0; i < polys.length; i++) {
		poly = polys[i];
		prev = null;
		polygon = {
			vertices: [],
			edges: []
		};

		for (j = 0; j < poly.length; j++) {
			v = poly[j];
			if (typeof v === 'object' && !isNaN(v.x) && !isNaN(v.y)) {
				vert = {
					x: v.x,
					y: v.y,
					id: vertices.length
				};
			} else if (v.length >= 2 && !isNaN(v[0]) && !isNaN(v[1])) {
				vert = {
					x: v[0],
					y: v[1],
					id: vertices.length
				};
			}
			if (vert) {
				if (prev) {
					prev.next = vert;
					vert.prev = prev;
					vert.next = polygon.vertices[0];
					polygon.vertices[0].prev = vert;
				} else {
					polygon.head = vert;
					vert.next = vert;
					vert.prev = vert;
				}
				vertices.push(vert);
				polygon.vertices.push(vert);
				prev = vert;
			}
		}

		if (polygon.vertices.length > 2) {
			if (polygon.vertices.length === 3) {
				polygon.simple = true;
			}

			polygons.push(polygon);

			//save edges
			for (j = 0; j < polygon.vertices.length; j++) {
				vert = polygon.vertices[j];
				polygon.edges.push([
					vert, vert.next
				]);
			}
		}
	}

	for (i = polygons.length - 1; i >= 0; i--) {
		polygon = polygons[i];
		makeSimple(polygon);
	}

	for (i = 0; i < polygons.length; i++) {
		polygon = polygons[i];
		polygon.clockWise = clockWise(polygon);
		triangulate(polygon);
	}

	//build shape
	shape.vertices = [];
	shape.coords = [];
	for (i = 0; i < vertices.length; i++) {
		v = vertices[i];
		shape.vertices.push(v.x * 2 - 1);
		shape.vertices.push(v.y * -2 + 1);
		shape.vertices.push(-1);

		shape.coords.push(v.x);
		shape.coords.push(v.y * -1 + 1);
	}
	shape.vertices = new Float32Array(shape.vertices);
	shape.coords = new Float32Array(shape.coords);

	shape.indices = [];
	for (i = 0; i < polygons.length; i++) {
		polygon = polygons[i];
		for (j = 0; j < polygon.indices.length; j++) {
			v = polygon.indices[j];
			shape.indices.push(v.id);
			//shape.indices.push(v[1].id);
			//shape.indices.push(v[2].id);
		}
	}
	shape.indices = new Uint16Array(shape.indices);

	this.shape = shape;
	if (this.gl) {
		makeGlModel(shape, this.gl);
	}
};

EffectNode.prototype.destroy = function () {
	const commonShaders = this.seriously.commonShaders;

	let key, item, hook = this.hook;

	//let effect destroy itself
	if (this.effect.destroy && typeof this.effect.destroy === 'function') {
		this.effect.destroy.call(this);
	}
	delete this.effect;

	//shader
	if (commonShaders[hook]) {
		commonShaders[hook].count--;
		if (!commonShaders[hook].count) {
			delete commonShaders[hook];
		}
	}
	if (this.shader && this.shader.destroy && this.shader !== this.seriously.baseShader && !commonShaders[hook]) {
		this.shader.destroy();
	}
	delete this.shader;

	//stop watching any input elements
	for (key in this.inputElements) {
		if (this.inputElements.hasOwnProperty(key)) {
			item = this.inputElements[key];
			item.element.removeEventListener('change', item.listener, true);
			item.element.removeEventListener('input', item.listener, true);
		}
	}

	//sources
	for (key in this.sources) {
		if (this.sources.hasOwnProperty(key)) {
			item = this.sources[key];
			if (item && item.removeTarget) {
				item.removeTarget(this);
			}
			delete this.sources[key];
		}
	}

	//targets
	while (this.targets.length) {
		item = this.targets.pop();
		if (item && item.removeSource) {
			item.removeSource(this);
		}
	}

	this.seriously.removeEffectNode(this);

	Node.prototype.destroy.call(this);

	for (key in this) {
		if (this.hasOwnProperty(key) && key !== 'id' && key !== 'isDestroyed') {
			delete this[key];
		}
	}
};

const nop$4 = function () {};

function Transform (transformNode) {
	let me = transformNode,
		self = this,
		key;

	function setInput(inputName, def, input) {
		let lookup, value;

		lookup = me.inputElements[inputName];

		//todo: there is some duplicate code with Effect here. Consolidate.
		if (typeof input === 'string' && isNaN(input)) {
			if (def.type === 'enum') {
				if (!def.options.hasOwnProperty(input)) {
					input = getElement(input, ['select']);
				}
			} else if (def.type === 'number' || def.type === 'boolean') {
				input = getElement(input, ['input', 'select']);
			} else if (def.type === 'image') {
				input = getElement(input, ['canvas', 'img', 'video']);
			}
		}

		if (isInstance(input, 'HTMLInputElement') || isInstance(input, 'HTMLSelectElement')) {
			value = input.value;

			if (lookup && lookup.element !== input) {
				lookup.element.removeEventListener('change', lookup.listener, true);
				lookup.element.removeEventListener('input', lookup.listener, true);
				delete me.inputElements[inputName];
				lookup = null;
			}

			if (!lookup) {
				lookup = {
					element: input,
					listener: (function (element) {
						return function () {
							let oldValue, newValue;

							if (input.type === 'checkbox') {
								//special case for check box
								oldValue = input.checked;
							} else {
								oldValue = element.value;
							}
							newValue = me.setInput(inputName, oldValue);

							//special case for color type
							if (input.type === 'color') {
								newValue = colorArrayToHex(newValue);
							}

							//if input validator changes our value, update HTML Element
							//todo: make this optional...somehow
							if (newValue !== oldValue) {
								element.value = newValue;
							}
						};
					}(input))
				};

				me.inputElements[inputName] = lookup;
				if (input.type === 'range') {
					input.addEventListener('input', lookup.listener, true);
					input.addEventListener('change', lookup.listener, true);
				} else {
					input.addEventListener('change', lookup.listener, true);
				}
			}

			if (lookup && input.type === 'checkbox') {
				value = input.checked;
			}
		} else {
			if (lookup) {
				lookup.element.removeEventListener('change', lookup.listener, true);
				lookup.element.removeEventListener('input', lookup.listener, true);
				delete me.inputElements[inputName];
			}
			value = input;
		}

		me.setInput(inputName, value);
	}

	function setProperty(name, def) {
		// todo: validate value passed to 'set'
		Object.defineProperty(self, name, {
			configurable: true,
			enumerable: true,
			get: function () {
				return def.get.call(me);
			},
			set: function (val) {
				setInput(name, def, val);
			}
		});
	}

	function makeMethod(method) {
		return function () {
			if (method.apply(me, arguments)) {
				me.setTransformDirty();
			}
		};
	}

	//priveleged accessor methods
	Object.defineProperties(this, {
		transform: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.hook;
			}
		},
		title: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.plugin.title || me.hook;
			}
		},
		width: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.width;
			}
		},
		height: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.height;
			}
		},
		id: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.id;
			}
		},
		source: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.source && me.source.pub;
			},
			set: function (source) {
				me.setSource(source);
			}
		}
	});

	// attach methods
	for (key in me.methods) {
		if (me.methods.hasOwnProperty(key)) {
			this[key] = makeMethod(me.methods[key]);
		}
	}

	for (key in me.inputs) {
		if (me.inputs.hasOwnProperty(key)) {
			setProperty(key, me.inputs[key]);
		}
	}

	this.update = function () {
		me.setDirty();
	};

	this.inputs = function (name) {
		let result,
			input,
			inputs,
			key;

		inputs = me.plugin.inputs;

		/*
         * Only reports setter/getter inputs, not methods
         */

		if (name) {
			input = inputs[name];
			if (!input || input.method) {
				return null;
			}

			result = {
				type: input.type,
				defaultValue: input.defaultValue,
				title: input.title || name
			};

			if (input.type === 'number') {
				result.min = input.min;
				result.max = input.max;
				result.step = input.step;
				result.mod = input.mod;
			} else if (input.type === 'enum') {
				//make a copy
				result.options = extend({}, input.options);
			} else if (input.type === 'vector') {
				result.dimensions = input.dimensions;
			}

			if (input.description) {
				result.description = input.description;
			}

			return result;
		}

		result = {};
		for (key in inputs) {
			if (inputs.hasOwnProperty(key) && !inputs[key].method) {
				result[key] = this.inputs(key);
			}
		}
		return result;
	};

	this.alias = function (inputName, aliasName) {
		me.alias(inputName, aliasName);
		return this;
	};

	this.on = function (eventName, callback) {
		me.on(eventName, callback);
	};

	this.off = function (eventName, callback) {
		me.off(eventName, callback);
	};

	this.destroy = function () {
		let i,
			descriptor;

		me.destroy();

		for (i in this) {
			if (this.hasOwnProperty(i) && i !== 'isDestroyed' && i !== 'id') {
				//todo: probably can simplify this if the only setter/getter is id
				descriptor = Object.getOwnPropertyDescriptor(this, i);
				if (descriptor.get || descriptor.set ||
					typeof this[i] !== 'function') {
					delete this[i];
				} else {
					this[i] = nop$4;
				}
			}
		}
	};

	this.isDestroyed = function () {
		return me.isDestroyed;
	};

	this.isReady = function () {
		return me.ready;
	};
}

function TransformNode (seriously, hook, transform, options) {
	let key,
		input,
		initialValue,
		defaultValue,
		defaults;

	this.matrix = new Float32Array(16);
	this.cumulativeMatrix = new Float32Array(16);

	this.ready = false;
	this.width = 1;
	this.height = 1;

	this.seriously = seriously;
	this.gl = seriously.gl;

	this.transformRef = transform;
	this.hook = hook;
	this.id = seriously.getNodeId();

	this.options = options;
	this.sources = null;
	this.targets = [];
	this.inputElements = {};
	this.inputs = {};
	this.methods = {};
	this.listeners = {};

	this.texture = null;
	this.frameBuffer = null;
	this.uniforms = null;

	this.dirty = true;
	this.transformDirty = true;
	this.renderDirty = false;
	this.isDestroyed = false;
	this.transformed = false;

	this.plugin = extend({}, this.transformRef);
	if (this.transformRef.definition) {
		extend(this.plugin, this.transformRef.definition.call(this, options));
	}

	// set up inputs and methods
	for (key in this.plugin.inputs) {
		if (this.plugin.inputs.hasOwnProperty(key)) {
			input = this.plugin.inputs[key];

			if (input.method && typeof input.method === 'function') {
				this.methods[key] = input.method;
			} else if (typeof input.set === 'function' && typeof input.get === 'function') {
				this.inputs[key] = input;
			}
		}
	}

	seriously.constructor.validateInputSpecs(this.plugin);

	// set default value for all inputs (no defaults for methods)
	defaults = seriously.defaults(hook);
	for (key in this.plugin.inputs) {
		if (this.plugin.inputs.hasOwnProperty(key)) {
			input = this.plugin.inputs[key];

			if (typeof input.set === 'function' && typeof input.get === 'function' &&
				typeof input.method !== 'function') {

				initialValue = input.get.call(this);
				defaultValue = input.defaultValue === undefined ? initialValue : input.defaultValue;
				defaultValue = input.validate.call(this, defaultValue, input, initialValue);
				if (defaults && defaults[key] !== undefined) {
					defaultValue = input.validate.call(this, defaults[key], input, input.defaultValue, defaultValue);
					defaults[key] = defaultValue;
				}
				if (defaultValue !== initialValue) {
					input.set.call(this, defaultValue);
				}
			}
		}
	}

	this.pub = new Transform(this);

	seriously.addTransformNode(this);
}

TransformNode.prototype = Object.create(Node.prototype);
TransformNode.prototype.constructor = TransformNode;

TransformNode.prototype.setDirty = function () {
	this.renderDirty = true;
	Node.prototype.setDirty.call(this);
};

TransformNode.prototype.setTransformDirty = function () {
	let i,
		target;

	this.transformDirty = true;
	this.dirty = true;
	this.renderDirty = true;

	for (i = 0; i < this.targets.length; i++) {
		target = this.targets[i];
		if (target.setTransformDirty) {
			target.setTransformDirty();
		} else {
			target.setDirty();
		}
	}
};

TransformNode.prototype.resize = function () {
	let i;

	Node.prototype.resize.call(this);

	if (this.plugin.resize) {
		this.plugin.resize.call(this);
	}

	for (i = 0; i < this.targets.length; i++) {
		this.targets[i].resize();
	}

	this.setTransformDirty();
};

TransformNode.prototype.setSource = function (source) {
	let newSource;

	//todo: what if source is null/undefined/false

	newSource = this.seriously.findInputNode(source);

	if (newSource === this.source) {
		return;
	}

	if (this.seriously.constructor.traceSources(newSource, this)) {
		throw new Error('Attempt to make cyclical connection.');
	}

	if (this.source) {
		this.source.removeTarget(this);
	}
	this.source = newSource;
	newSource.addTarget(this);

	if (newSource && newSource.ready) {
		this.setReady();
	} else {
		this.setUnready();
	}
	this.resize();
};

TransformNode.prototype.addTarget = function (target) {
	let i;
	for (i = 0; i < this.targets.length; i++) {
		if (this.targets[i] === target) {
			return;
		}
	}

	this.targets.push(target);
};

TransformNode.prototype.removeTarget = function (target) {
	const i = this.targets && this.targets.indexOf(target);
	if (i >= 0) {
		this.targets.splice(i, 1);
	}

	if (this.targets && this.targets.length) {
		this.resize();
	}
};

TransformNode.prototype.setInput = function (name, value) {
	let defaultInput = this.seriously.defaults(this.hook),
		input,
		defaultValue,
		previous;

	if (this.plugin.inputs.hasOwnProperty(name)) {
		input = this.plugin.inputs[name];

		if (defaultInput && defaultInput[name] !== undefined) {
			defaultValue = defaultInput[name];
		} else {
			defaultValue = input.defaultValue;
		}

		previous = input.get.call(this);
		if (defaultValue === undefined) {
			defaultValue = previous;
		}
		value = input.validate.call(this, value, input, defaultValue, previous);

		if (input.set.call(this, value)) {
			this.setTransformDirty();
		}

		return input.get.call(this);
	}
};

TransformNode.prototype.alias = function (inputName, aliasName) {
	let me = this,
		input,
		def;

	if (reservedNames.indexOf(aliasName) >= 0) {
		throw new Error('\'' + aliasName + '\' is a reserved name and cannot be used as an alias.');
	}

	if (this.plugin.inputs.hasOwnProperty(inputName)) {
		if (!aliasName) {
			aliasName = inputName;
		}

		this.seriously.removeAlias(aliasName);

		input = this.inputs[inputName];
		if (input) {
			def = me.inputs[inputName];
			Object.defineProperty(this.seriously, aliasName, {
				configurable: true,
				enumerable: true,
				get: function () {
					return def.get.call(me);
				},
				set: function (val) {
					if (def.set.call(me, val)) {
						me.setTransformDirty();
					}
				}
			});
		} else {
			input = this.methods[inputName];
			if (input) {
				def = input;
				this.seriously[aliasName] = function () {
					if (def.apply(me, arguments)) {
						me.setTransformDirty();
					}
				};
			}
		}

		if (input) {
			this.seriously.addAlias(aliasName, {
				node: this,
				input: inputName
			});
		}
	}

	return this;
};

TransformNode.prototype.render = function (renderTransform) {
	const gl = this.seriously.gl;

	if (!this.source) {
		if (this.transformDirty) {
			mat4.copy(this.cumulativeMatrix, this.matrix);
			this.transformDirty = false;
		}
		this.texture = null;
		this.dirty = false;

		return;
	}

	this.source.render();

	if (this.transformDirty) {
		if (this.transformed) {
			//use this.matrix
			if (this.source.cumulativeMatrix) {
				mat4.multiply(this.cumulativeMatrix, this.matrix, this.source.cumulativeMatrix);
			} else {
				mat4.copy(this.cumulativeMatrix, this.matrix);
			}
		} else {
			//copy source.cumulativeMatrix
			mat4.copy(this.cumulativeMatrix, this.source.cumulativeMatrix || identity);
		}

		this.transformDirty = false;
	}

	if (renderTransform && gl) {
		if (this.renderDirty) {
			if (!this.frameBuffer) {
				this.uniforms = {
					resolution: [this.width, this.height]
				};
				this.frameBuffer = new FrameBuffer(gl, this.width, this.height);
			}

			this.uniforms.source = this.source.texture;
			this.uniforms.transform = this.cumulativeMatrix || identity;
			this.seriously.draw(this.seriously.baseShader, this.seriously.rectangleModel, this.uniforms, this.frameBuffer.frameBuffer, this);

			this.renderDirty = false;
		}
		this.texture = this.frameBuffer.texture;
	} else if (this.source) {
		this.texture = this.source.texture;
	} else {
		this.texture = null;
	}

	this.dirty = false;

	return this.texture;
};

TransformNode.prototype.readPixels = function (x, y, width, height, dest) {
	const gl = this.seriously.gl,
		nodeGl = this.gl || gl;

	if (!nodeGl) {
		//todo: is this the best approach?
		throw new Error('Cannot read pixels until a canvas is connected');
	}

	//todo: check on x, y, width, height
	this.render(true);

	if (dest === undefined) {
		dest = new Uint8Array(width * height * 4);
	} else if (!(isInstance(dest, 'Uint8Array'))) {
		throw new Error('Incompatible array type');
	}

	nodeGl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer.frameBuffer);
	nodeGl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, dest);

	return dest;
};

TransformNode.prototype.destroy = function () {
	let i, key, item;

	//let effect destroy itself
	if (this.plugin.destroy && typeof this.plugin.destroy === 'function') {
		this.plugin.destroy.call(this);
	}
	delete this.effect;

	if (this.frameBuffer) {
		this.frameBuffer.destroy();
		delete this.frameBuffer;
		delete this.texture;
	}

	//stop watching any input elements
	for (i in this.inputElements) {
		if (this.inputElements.hasOwnProperty(i)) {
			item = this.inputElements[i];
			item.element.removeEventListener('change', item.listener, true);
			item.element.removeEventListener('input', item.listener, true);
		}
	}

	//sources
	if (this.source) {
		this.source.removeTarget(this);
	}

	//targets
	while (this.targets.length) {
		item = this.targets.pop();
		if (item && item.removeSource) {
			item.removeSource(this);
		}
	}

	this.seriously.removeTransformNode(this);

	Node.prototype.destroy.call(this);

	for (key in this) {
		if (this.hasOwnProperty(key) && key !== 'id' && key !== 'isDestroyed') {
			delete this[key];
		}
	}
};

const nop$5 = function () {};


function Target(targetNode) {
	let me = targetNode;

	//priveleged accessor methods
	Object.defineProperties(this, {
		source: {
			enumerable: true,
			configurable: true,
			get: function () {
				if (me.source) {
					return me.source.pub;
				}
			},
			set: function (value) {
				me.setSource(value);
			}
		},
		original: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.target;
			}
		},
		width: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.width;
			},
			set: function (value) {
				if (!isNaN(value) && value > 0 && me.width !== value) {
					me.width = value;
					me.resize();
					me.setTransformDirty();
				}
			}
		},
		height: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.height;
			},
			set: function (value) {
				if (!isNaN(value) && value > 0 && me.height !== value) {
					me.height = value;
					me.resize();
					me.setTransformDirty();
				}
			}
		},
		id: {
			enumerable: true,
			configurable: true,
			get: function () {
				return me.id;
			}
		}
	});

	this.render = function () {
		me.render();
	};

	this.readPixels = function (x, y, width, height, dest) {
		return me.readPixels(x, y, width, height, dest);
	};

	this.on = function (eventName, callback) {
		me.on(eventName, callback);
	};

	this.off = function (eventName, callback) {
		me.off(eventName, callback);
	};

	this.go = function (options) {
		me.go(options);
	};

	this.stop = function () {
		me.stop();
	};

	this.getTexture = function () {
		return me.frameBuffer.texture;
	};

	this.destroy = function () {
		let i,
			descriptor;

		me.destroy();

		for (i in this) {
			if (this.hasOwnProperty(i) && i !== 'isDestroyed' && i !== 'id') {
				descriptor = Object.getOwnPropertyDescriptor(this, i);
				if (descriptor.get || descriptor.set ||
					typeof this[i] !== 'function') {
					delete this[i];
				} else {
					this[i] = nop$5;
				}
			}
		}
	};

	this.inputs = function (name) {
		return {
			source: {
				type: 'image'
			}
		};
	};

	this.isDestroyed = function () {
		return me.isDestroyed;
	};

	this.isReady = function () {
		return me.ready;
	};
}

/*
 * possible targets: canvas (2d or 3d), gl render buffer (must be same canvas)
 */
function TargetNode(seriously, hook, target, options) {
	let opts,
		flip,
		width,
		height,
		gl,
		that = this,
		matchedType = false,
		context,
		debugContext,
		frameBuffer,
		triedWebGl = false,
		key;

	function targetPlugin (hook, target, options, force) {
		let plugin = seriously.getTarget(hook);
		if (plugin.definition) {
			plugin = plugin.definition.call(that, target, options, force);
			if (!plugin) {
				return null;
			}
			plugin = extend(extend({}, seriously.getTarget(hook)), plugin);
			that.hook = key;
			matchedType = true;
			that.plugin = plugin;
			that.compare = plugin.compare;
			if (plugin.target) {
				target = plugin.target;
			}
			if (plugin.gl && !that.gl) {
				that.gl = plugin.gl;
				if (!seriously.gl) {
					seriously.attachContext(plugin.gl);
				}
			}
			if (that.gl === seriously.gl) {
				that.model = seriously.rectangleModel;
				that.shader = seriously.baseShader;
			}
		}
		return plugin;
	}

	Node.call(this, seriously);

	// set in Node constructor
	gl = seriously.gl;

	if (hook && typeof hook !== 'string' || !target && target !== 0) {
		if (!options || typeof options !== 'object') {
			options = target;
		}
		target = hook;
	}

	opts = options || {};
	flip = opts.flip === undefined ? true : opts.flip;
	width = parseInt(opts.width, 10);
	height = parseInt(opts.height, 10);
	debugContext = opts.debugContext;

	// forced target type?
	if (typeof hook === 'string' && seriously.hasTarget(hook)) {
		seriously.targetPlugin(hook, target, opts, true);
	}

	this.renderToTexture = opts.renderToTexture;

	if (isInstance(target, 'WebGLFramebuffer')) {
		frameBuffer = target;

		if (isInstance(opts, 'HTMLCanvasElement')) {
			target = opts;
		} else if (isInstance(opts, 'WebGLRenderingContext')) {
			target = opts.canvas;
		} else if (isInstance(opts.canvas, 'HTMLCanvasElement')) {
			target = opts.canvas;
		} else if (isInstance(opts.context, 'WebGLRenderingContext')) {
			target = opts.context.canvas;
		} else {
			//todo: search all canvases for matching contexts?
			throw new Error('Must provide a canvas with WebGLFramebuffer target');
		}
	}

	if (isInstance(target, 'HTMLCanvasElement')) {
		width = target.width;
		height = target.height;

		//try to get a webgl context.
		if (!gl || gl.canvas !== target && opts.allowSecondaryWebGL) {
			context = getWebGlContext(target, {
				alpha: true,
				premultipliedAlpha: true,
				preserveDrawingBuffer: true,
				stencil: true,
				debugContext: debugContext
			});
		}

		if (!context) {
			if (!opts.allowSecondaryWebGL && gl && gl.canvas !== target) {
				throw new Error('Only one WebGL target canvas allowed. Set allowSecondaryWebGL option to create secondary context.');
			}

			this.render = nop$5;
			logger.log('Unable to create WebGL context.');
			//throw new Error('Unable to create WebGL context.');
		} else if (!gl || gl === context) {
			//this is our main WebGL canvas
			if (!this.seriously.primaryTarget) {
				this.seriously.primaryTarget = this;
			}
			if (!gl) {
				seriously.attachContext(context);
			}
			this.render = this.renderWebGL;

			/*
                Don't remember what this is for. Maybe we should remove it
                */
			if (opts.renderToTexture) {
				if (gl) {
					this.frameBuffer = new FrameBuffer(gl, width, height, false);
				}
			} else {
				this.frameBuffer = {
					frameBuffer: frameBuffer || null
				};
			}
		} else {
			//set up alternative drawing method using ArrayBufferView
			this.gl = context;

			//this.pixels = new Uint8Array(width * height * 4);
			//todo: probably need another framebuffer for renderToTexture?
			//todo: handle lost context on secondary webgl
			this.frameBuffer = {
				frameBuffer: frameBuffer || null
			};
			this.shader = new ShaderProgram(this.gl, baseVertexShader, baseFragmentShader);
			this.model = buildRectangleModel(this.gl);
			this.pixels = null;

			this.texture = this.gl.createTexture();
			this.gl.bindTexture(gl.TEXTURE_2D, this.texture);
			this.gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			this.gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			this.gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			this.gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			this.render = this.renderSecondaryWebGL;
		}

		matchedType = true;
	}

	if (!matchedType) {
		seriously.constructor.forEachTarget(function (k) {
			if (targetPlugin(k, target, opts, false)) {
				key = k;
				// break!
				return false;
			}
		});
	}

	if (!matchedType) {
		throw new Error('Unknown target type');
	}

	this.target = target;
	this.transform = null;
	this.transformDirty = true;
	this.flip = flip;
	if (width) {
		this.width = width;
	}
	if (height) {
		this.height = height;
	}

	this.uniforms.resolution[0] = this.width;
	this.uniforms.resolution[1] = this.height;

	if (opts.auto !== undefined) {
		this.auto = opts.auto;
	} else {
		this.auto = seriously.auto;
	}
	this.frames = 0;

	this.pub = new Target(this);

	seriously.addTargetNode(this);
}

TargetNode.prototype = Object.create(Node.prototype);
TargetNode.prototype.constructor = TargetNode;

TargetNode.prototype.setSource = function (source) {
	let newSource;

	//todo: what if source is null/undefined/false

	newSource = this.seriously.findInputNode(source);

	//todo: check for cycles

	if (newSource !== this.source) {
		if (this.source) {
			this.source.removeTarget(this);
		}
		this.source = newSource;
		newSource.addTarget(this);

		if (newSource) {
			this.resize();
			if (newSource.ready) {
				this.setReady();
			} else {
				this.setUnready();
			}
		}

		this.setDirty();
	}
};

TargetNode.prototype.setDirty = function () {
	this.dirty = true;

	if (this.auto) {
		this.seriously.initDaemon();
	}
};

TargetNode.prototype.resize = function () {
	//if target is a canvas, reset size to canvas size
	if (isInstance(this.target, 'HTMLCanvasElement')) {
		if (this.width !== this.target.width || this.height !== this.target.height) {
			this.target.width = this.width;
			this.target.height = this.height;
			this.uniforms.resolution[0] = this.width;
			this.uniforms.resolution[1] = this.height;
			this.emit('resize');
			this.setTransformDirty();
		}
	} else if (this.plugin && this.plugin.resize) {
		this.plugin.resize.call(this);
	}

	if (this.source &&
		(this.source.width !== this.width || this.source.height !== this.height)) {
		if (!this.transform) {
			this.transform = new Float32Array(16);
		}
	}
};

TargetNode.prototype.setTransformDirty = function () {
	this.transformDirty = true;
	this.setDirty();
};

TargetNode.prototype.go = function () {
	this.auto = true;
	this.setDirty();
};

TargetNode.prototype.stop = function () {
	this.auto = false;
};

TargetNode.prototype.render = function () {
	if (this.seriously.gl && this.plugin && this.plugin.render) {
		this.plugin.render.call(this, this.seriously.draw.bind(this.seriously), this.seriously.baseShader, this.seriously.rectangleModel);
	}
};

TargetNode.prototype.renderWebGL = function () {
	let matrix, x, y;

	this.resize();

	if (this.seriously.gl && this.dirty && this.ready) {
		if (!this.source) {
			return;
		}

		this.source.render();

		this.uniforms.source = this.source.texture;

		if (this.source.width === this.width && this.source.height === this.height) {
			this.uniforms.transform = this.source.cumulativeMatrix || identity;
		} else if (this.transformDirty) {
			matrix = this.transform;
			mat4.copy(matrix, this.source.cumulativeMatrix || identity);
			x = this.source.width / this.width;
			y = this.source.height / this.height;
			matrix[0] *= x;
			matrix[1] *= x;
			matrix[2] *= x;
			matrix[3] *= x;
			matrix[4] *= y;
			matrix[5] *= y;
			matrix[6] *= y;
			matrix[7] *= y;
			this.uniforms.transform = matrix;
			this.transformDirty = false;
		}

		this.seriously.draw(this.seriously.baseShader, this.seriously.rectangleModel, this.uniforms, this.frameBuffer.frameBuffer, this, outputRenderOptions);

		this.emit('render');
		this.dirty = false;
	}
};

TargetNode.prototype.renderSecondaryWebGL = function () {
	let gl = this.gl,
		sourceWidth,
		sourceHeight,
		matrix,
		x,
		y;

	if (this.dirty && this.ready && this.source) {
		this.emit('render');
		this.source.render(true);

		sourceWidth = this.source.width;
		sourceHeight = this.source.height;

		if (!this.pixels || this.pixels.length !== sourceWidth * sourceHeight * 4) {
			this.pixels = new Uint8Array(sourceWidth * sourceHeight * 4);
		}

		this.source.readPixels(0, 0, sourceWidth, sourceHeight, this.pixels);

		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, sourceWidth, sourceHeight, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixels);

		if (sourceWidth === this.width && sourceHeight === this.height) {
			this.uniforms.transform = identity;
		} else if (this.transformDirty) {
			matrix = this.transform;
			mat4.copy(matrix, identity);
			x = this.source.width / this.width;
			y = this.source.height / this.height;
			matrix[0] *= x;
			matrix[1] *= x;
			matrix[2] *= x;
			matrix[3] *= x;
			matrix[4] *= y;
			matrix[5] *= y;
			matrix[6] *= y;
			matrix[7] *= y;
			this.uniforms.transform = matrix;
			this.transformDirty = false;
		}

		this.uniforms.source = this.texture;
		this.seriously.draw(this.shader, this.model, this.uniforms, null, this, outputRenderOptions);

		this.dirty = false;
	}
};

TargetNode.prototype.removeSource = function (source) {
	if (this.source === source || this.source === source.pub) {
		this.source = null;
	}
};

TargetNode.prototype.destroy = function () {
	//source
	if (this.source && this.source.removeTarget) {
		this.source.removeTarget(this);
	}

	this.seriously.removeTargetNode(this);

	if (this.plugin && this.plugin.destroy) {
		this.plugin.destroy.call(this);
	}

	delete this.source;
	delete this.target;
	delete this.pub;
	delete this.uniforms;
	delete this.pixels;
	delete this.auto;

	Node.prototype.destroy.call(this);
};

const document$1 = window.document;
const allSourcesByHook = {
		canvas: [],
		image: [],
		video: []
	};
const seriousEffects = {};
const seriousTransforms = {};
const seriousSources = {};
const seriousTargets = {};
const allTargetsByHook = {};
const allTransformsByHook = {};
const allEffectsByHook = {};
const allTargets = window.WeakMap && new WeakMap();
const nop  = function () {};

let maxSeriouslyId = 0;
let colorCtx;
let incompatibility;


function validateInputSpecs(plugin) {
	let input,
		options,
		name;

	function normalizeEnumOption(option, i) {
		let key,
			name;

		if (isArrayLike(option)) {
			key = option[0];
			name = option[1] || key;
		} else {
			key = option;
		}

		if (typeof key === 'string') {
			key = key.toLowerCase();
		} else if (typeof key === 'number') {
			key = String(key);
		} else if (!key) {
			key = '';
		}

		options[key] = name;

		if (!i) {
			input.firstValue = key;
		}
	}

	function passThrough(value) {
		return value;
	}

	for (name in plugin.inputs) {
		if (plugin.inputs.hasOwnProperty(name)) {
			if (plugin.reserved.indexOf(name) >= 0 || Object.prototype[name]) {
				throw new Error('Reserved input name: ' + name);
			}

			input = plugin.inputs[name];
			input.name = name;

			if (isNaN(input.min)) {
				input.min = -Infinity;
			}

			if (isNaN(input.max)) {
				input.max = Infinity;
			}

			if (isNaN(input.minCount)) {
				input.minCount = -Infinity;
			}

			if (isNaN(input.maxCount)) {
				input.maxCount = Infinity;
			}

			if (isNaN(input.step)) {
				input.step = 0;
			}

			if (isNaN(input.mod)) {
				input.mod = 0;
			}

			if (input.type === 'enum') {
				/*
                Normalize options to make validation easy
                - all items will have both a key and a name
                - all keys will be lowercase strings
                */
				if (input.options && isArrayLike(input.options) && input.options.length) {
					options = {};
					input.options.forEach(normalizeEnumOption);
					input.options = options;
				}
			}

			if (input.type === 'vector') {
				if (input.dimensions < 2) {
					input.dimensions = 2;
				} else if (input.dimensions > 4) {
					input.dimensions = 4;
				} else if (!input.dimensions || isNaN(input.dimensions)) {
					input.dimensions = 4;
				} else {
					input.dimensions = Math.round(input.dimensions);
				}
			} else {
				input.dimensions = 1;
			}

			input.shaderDirty = !!input.shaderDirty;

			if (typeof input.validate !== 'function') {
				input.validate = Seriously$1.inputValidators[input.type] || passThrough;
			}

			if (!plugin.defaultImageInput && input.type === 'image') {
				plugin.defaultImageInput = name;
			}
		}
	}
}

function Seriously$1(options) {

	//if called without 'new', make a new object and return that
	if (window === this || !(this instanceof Seriously$1) || this.id !== undefined) {
		return new Seriously$1(options);
	}

	//initialize object, private properties
	let id = ++maxSeriouslyId,
		seriously = this,
		nodeId = 0,
		nodes = [],
		nodesById = {},
		sources = [],
		targets = [],
		transforms = [],
		effects = [],
		aliases = {},
		preCallbacks = [],
		postCallbacks = [],
		defaultInputs = {},
		glCanvas,
		isDestroyed = false,
		rafId;

	function restoreContext() {
		let gl = this.gl,
			context,
			target,
			i,
			node;

		if (this.primaryTarget && !gl) {
			target = this.primaryTarget.target;

			//todo: if too many webglcontextlost events fired in too short a time, abort
			//todo: consider allowing "manual" control of restoring context

			if (isInstance(target, 'WebGLFramebuffer')) {
				logger.error('Unable to restore target built on WebGLFramebuffer');
				return;
			}

			context = getWebGlContext(target, {
				alpha: true,
				premultipliedAlpha: true,
				preserveDrawingBuffer: true,
				stencil: true,
				debugContext: this.primaryTarget.debugContext
			});

			if (context) {
				if (context.isContextLost()) {
					logger.error('Unable to restore WebGL Context');
					return;
				}

				this.attachContext(context);

				if (this.primaryTarget.renderToTexture) {
					this.primaryTarget.frameBuffer = new FrameBuffer(gl, this.primaryTarget.width, this.primaryTarget.height, false);
				} else {
					this.primaryTarget.frameBuffer = {
						frameBuffer: null
					};
				}

				/*
                    Set all nodes dirty. In most cases, it should only be necessary
                    to set sources dirty, but we want to make sure unattached nodes are covered

                    This should get renderDaemon running again if necessary.
                    */
				for (i = 0; i < nodes.length; i++) {
					node = nodes[i];
					node.setDirty();
					node.emit('webglcontextrestored');
				}

				logger.log('WebGL context restored');
			}
		}
	}

	function destroyContext(event) {
		// either webglcontextlost or primary target node has been destroyed
		let gl = this.gl,
			i, node;

		/*
            todo: once multiple shared webgl resources are supported,
            see if we can switch context to another existing one and
            rebuild immediately
            */

		if (event) {
			logger.warn('WebGL context lost');
			/*
                todo: if too many webglcontextlost events fired in too short a time,
                don't preventDefault
                */
			event.preventDefault();
		}

		//don't draw anymore until context is restored
		if (rafId) {
			cancelAnimFrame(rafId);
			rafId = 0;
		}

		if (glCanvas) {
			glCanvas.removeEventListener('webglcontextlost', destroyContext.bind(this), false);
		}

		for (i = 0; i < effects.length; i++) {
			node = effects[i];
			node.gl = null;
			node.initialized = false;
			node.baseShader = null;
			node.model = null;
			node.frameBuffer = null;
			node.texture = null;
			if (node.shader && node.shader.destroy) {
				node.shader.destroy();
				if (node.effect.commonShader) {
					delete this.commonShaders[node.hook];
				}
			}
			node.shaderDirty = true;
			node.shader = null;
			if (node.effect.lostContext) {
				node.effect.lostContext.call(node);
			}

			/*
                todo: do we need to set nodes to uready?
                if so, make sure nodes never get set to ready unless gl exists
                and make sure to set ready again when context is restored
                */

			if (event) {
				node.emit('webglcontextlost');
			}
		}

		for (i = 0; i < sources.length; i++) {
			node = sources[i];
			//node.setUnready();
			node.texture = null;
			node.initialized = false;
			node.allowRefresh = false;
			if (event) {
				node.emit('webglcontextlost');
			}
		}

		for (i = 0; i < transforms.length; i++) {
			node = transforms[i];
			node.frameBuffer = null;
			node.texture = null;
			if (event) {
				node.emit('webglcontextlost');
			}
		}

		for (i = 0; i < targets.length; i++) {
			node = targets[i];
			node.model = false;
			node.frameBuffer = null;
			//texture?
			if (event) {
				node.emit('webglcontextlost');
			}
		}

		if (this.baseShader && this.baseShader.destroy) {
			this.baseShader.destroy();
		}

		//clean up rectangleModel
		if (gl) {
			gl.deleteBuffer(this.rectangleModel.vertex);
			gl.deleteBuffer(this.rectangleModel.texCoord);
			gl.deleteBuffer(this.rectangleModel.index);
		}

		if (this.rectangleModel) {
			delete this.rectangleModel.vertex;
			delete this.rectangleModel.texCoord;
			delete this.rectangleModel.index;
		}

		this.rectangleModel = null;
		this.baseShader = null;
		this.gl = gl = null;
		glCanvas = null;
	}

	/*
        runs on every frame, as long as there are media sources (img, video, canvas, etc.) to check,
        dirty target nodes or pre/post callbacks to run. any sources that are updated are set to dirty,
        forcing all dependent nodes to render
        */
	function renderDaemon(now) {
		let i, node,
			keepRunning = false;

		rafId = 0;

		if (preCallbacks.length) {
			keepRunning = true;
			for (i = 0; i < preCallbacks.length; i++) {
				preCallbacks[i].call(seriously, now);
			}
		}

		if (sources && sources.length) {
			keepRunning = true;
			for (i = 0; i < sources.length; i++) {
				node = sources[i];

				if (node.dirty ||
					node.checkDirty && node.checkDirty()) {
					node.dirty = false;
					node.setDirty();
				}
			}
		}

		for (i = 0; i < targets.length; i++) {
			node = targets[i];
			if (node.auto && node.dirty) {
				node.render();
			}
		}

		if (postCallbacks.length) {
			keepRunning = true;
			for (i = 0; i < postCallbacks.length; i++) {
				postCallbacks[i].call(seriously);
			}
		}

		//rafId may have been set again by a callback or in target.setDirty()
		if (keepRunning && !rafId) {
			rafId = requestAnimationFrame(renderDaemon);
		}
	}

	function draw(shader, model, uniforms, frameBuffer, node, options) {
		let numTextures = 0,
			name, value, shaderUniform,
			width, height,
			gl = this.gl,
			nodeGl = (node && node.gl) || gl,
			srcRGB, srcAlpha,
			dstRGB, dstAlpha;

		if (!nodeGl) {
			return;
		}

		if (node) {
			width = options && options.width || node.width || nodeGl.canvas.width;
			height = options && options.height || node.height || nodeGl.canvas.height;
		} else {
			width = options && options.width || nodeGl.canvas.width;
			height = options && options.height || nodeGl.canvas.height;
		}

		shader.use();

		nodeGl.viewport(0, 0, width, height);

		nodeGl.bindFramebuffer(nodeGl.FRAMEBUFFER, frameBuffer);

		/* todo: do this all only once at the beginning, since we only have one model? */
		nodeGl.enableVertexAttribArray(shader.location.position);
		nodeGl.enableVertexAttribArray(shader.location.texCoord);

		if (model.texCoord) {
			nodeGl.bindBuffer(nodeGl.ARRAY_BUFFER, model.texCoord);
			nodeGl.vertexAttribPointer(shader.location.texCoord, model.texCoord.size, nodeGl.FLOAT, false, 0, 0);
		}

		nodeGl.bindBuffer(nodeGl.ARRAY_BUFFER, model.vertex);
		nodeGl.vertexAttribPointer(shader.location.position, model.vertex.size, nodeGl.FLOAT, false, 0, 0);

		nodeGl.bindBuffer(nodeGl.ELEMENT_ARRAY_BUFFER, model.index);

		//default for depth is disable
		if (options && options.depth) {
			gl.enable(gl.DEPTH_TEST);
		} else {
			gl.disable(gl.DEPTH_TEST);
		}

		//default for blend is enabled
		if (!options) {
			gl.enable(gl.BLEND);
			gl.blendFunc(
				gl.ONE,
				gl.ZERO
			);
			gl.blendEquation(gl.FUNC_ADD);
		} else if (options.blend === undefined || options.blend) {
			gl.enable(gl.BLEND);

			srcRGB = options.srcRGB === undefined ? gl.ONE : options.srcRGB;
			dstRGB = options.dstRGB || gl.ZERO;
			srcAlpha = options.srcAlpha === undefined ? srcRGB : options.srcAlpha;
			dstAlpha = options.dstAlpha === undefined ? dstRGB : options.dstAlpha;

			gl.blendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha);
			gl.blendEquation(options.blendEquation || gl.FUNC_ADD);
		} else {
			gl.disable(gl.BLEND);
		}

		/* set uniforms to current values */
		for (name in uniforms) {
			if (uniforms.hasOwnProperty(name)) {
				value = uniforms[name];
				shaderUniform = shader.uniforms[name];
				if (shaderUniform) {
					if (isInstance(value, 'WebGLTexture')) {
						nodeGl.activeTexture(nodeGl.TEXTURE0 + numTextures);
						nodeGl.bindTexture(nodeGl.TEXTURE_2D, value);
						shaderUniform.set(numTextures);
						numTextures++;
					} else if (value instanceof SourceNode ||
						value instanceof EffectNode ||
						value instanceof TransformNode) {
						if (value.texture) {
							nodeGl.activeTexture(nodeGl.TEXTURE0 + numTextures);
							nodeGl.bindTexture(nodeGl.TEXTURE_2D, value.texture);
							shaderUniform.set(numTextures);
							numTextures++;
						}
					} else if (value !== undefined && value !== null) {
						shaderUniform.set(value);
					}
				}
			}
		}

		//default for clear is true
		if (!options || options.clear === undefined || options.clear) {
			nodeGl.clearColor(0.0, 0.0, 0.0, 0.0);
			nodeGl.clear(nodeGl.COLOR_BUFFER_BIT | nodeGl.DEPTH_BUFFER_BIT);
		}

		// draw!
		nodeGl.drawElements(model.mode, model.length, nodeGl.UNSIGNED_SHORT, 0);

		//to protect other 3D libraries that may not remember to turn their depth tests on
		gl.enable(gl.DEPTH_TEST);
	}

	//todo: implement render for array and typed array

	this.commonShaders = {};
	this.auto = false;

	/*
     * Initialize Seriously object based on options
     */

	if (isInstance(options, 'HTMLCanvasElement')) {
		options = {
			canvas: options
		};
	} else {
		options = options || {};
	}

	/*
     * priveleged methods
     */
	this.attachContext = function (context) {
		let gl = this.gl,
			i, node;

		if (gl) {
			return;
		}

		context.canvas.addEventListener('webglcontextlost', destroyContext.bind(this), false);
		context.canvas.addEventListener('webglcontextrestored', restoreContext.bind(this), false);

		if (context.isContextLost()) {
			logger.warn('Unable to attach lost WebGL context. Will try again when context is restored.');
			return;
		}

		this.gl = gl = context;
		glCanvas = context.canvas;

		this.rectangleModel = buildRectangleModel(gl);

		this.baseShader = new ShaderProgram(
			gl,
			'#define SHADER_NAME seriously.base\n' + baseVertexShader, '#define SHADER_NAME seriously.base\n' + baseFragmentShader
		);

		for (i = 0; i < effects.length; i++) {
			node = effects[i];
			node.gl = gl;
			node.initialize();
			node.buildShader();
		}

		for (i = 0; i < sources.length; i++) {
			node = sources[i];
			node.initialize();
		}

		for (i = 0; i < targets.length; i++) {
			node = targets[i];

			if (!node.model) {
				node.model = this.rectangleModel;
				node.shader = this.baseShader;
			}

			//todo: initialize frame buffer if not main canvas
		}
	};

	this.effect = function (hook, options) {
		if (!seriousEffects[hook]) {
			throw new Error('Unknown effect: ' + hook);
		}

		let effectNode = new EffectNode(this, hook, seriousEffects[hook], options);
		return effectNode.pub;
	};

	this.source = function (hook, source, options) {
		let sourceNode = this.findInputNode(hook, source, options);
		return sourceNode.pub;
	};

	this.transform = function (hook, opts) {
		let transformNode;

		if (typeof hook !== 'string') {
			opts = hook;
			hook = false;
		}

		if (hook) {
			if (!seriousTransforms[hook]) {
				throw new Error('Unknown transform: ' + hook);
			}
		} else {
			hook = options && options.defaultTransform || '2d';
			if (!seriousTransforms[hook]) {
				throw new Error('No transform specified');
			}
		}

		transformNode = new TransformNode(this, hook, seriousTransforms[hook], opts);
		return transformNode.pub;
	};

	this.target = function (hook, target, options) {
		let targetNode,
			element,
			i;

		if (hook && typeof hook === 'string' && !seriousTargets[hook]) {
			element = document$1.querySelector(hook);
		}

		if (typeof hook !== 'string' || !target && target !== 0 || element) {
			if (!options || typeof options !== 'object') {
				options = target;
			}
			target = element || hook;
			hook = null;
		}

		if (typeof target === 'string' && isNaN(target)) {
			target = document$1.querySelector(target);
		}

		for (i = 0; i < targets.length; i++) {
			targetNode = targets[i];
			if ((!hook || hook === targetNode.hook) &&
				(targetNode.target === target || targetNode.compare && targetNode.compare(target, options))) {

				return targetNode.pub;
			}
		}

		targetNode = new TargetNode(this, hook, target, options);

		return targetNode.pub;
	};

	this.aliases = function () {
		return Object.keys(aliases);
	};

	this.addAlias = function (name, data) {
		aliases[name] = data;
	};

	this.removeAlias = function (name) {
		if (aliases[name]) {
			delete this[name];
			delete aliases[name];
		}
	};

	this.getNodeId = function () {
		return nodeId++;
	};

	this.findInputNode = function (hook, source, options) {
		let node, i;

		if (typeof hook !== 'string' || !source && source !== 0) {
			if (!options || typeof options !== 'object') {
				options = source;
			}
			source = hook;
		}

		if (typeof hook !== 'string' || !seriousSources[hook]) {
			hook = null;
		}

		if (source instanceof SourceNode ||
			source instanceof EffectNode ||
			source instanceof TransformNode) {
			node = source;
		} else if (source instanceof Effect ||
			source instanceof Source ||
			source instanceof Transform) {
			node = nodesById[source.id];

			if (!node) {
				throw new Error('Cannot connect a foreign node');
			}
		} else {
			if (typeof source === 'string' && isNaN(source)) {
				source = getElement(source, ['canvas', 'img', 'video']);
			}

			for (i = 0; i < sources.length; i++) {
				node = sources[i];
				if ((!hook || hook === node.hook) && node.compare && node.compare(source, options)) {
					return node;
				}
			}

			node = new SourceNode(this, hook, source, options);
		}

		return node;
	};

	this.addNode = function (node) {
		nodes.push(node);
		nodesById[node.id] = node;
	};

	this.removeNode = function (node) {
		let i = nodes.indexOf(node);
		if (i >= 0) {
			nodes.splice(i, 1);
		}

		delete nodesById[node.id];
	};

	this.addSourceNode = function (node) {
		this.addNode(node);

		sources.push(node);
		allSourcesByHook[node.hook].push(node);

		if (sources.length && !rafId) {
			renderDaemon();
		}
	};

	this.removeSourceNode = function (node) {
		let i = sources.indexOf(node);

		if (i >= 0) {
			sources.splice(i, 1);
		}

		i = allSourcesByHook[node.hook].indexOf(node);

		if (i >= 0) {
			allSourcesByHook[node.hook].splice(i, 1);
		}
	};

	this.addEffectNode = function (node) {
		this.addNode(node);

		effects.push(node);
		allEffectsByHook[node.hook].push(node);
	};

	this.removeEffectNode = function (node) {
		let key, item, i;

		//remove any aliases
		for (key in aliases) {
			if (aliases.hasOwnProperty(key)) {
				item = aliases[key];
				if (item.node === node) {
					this.removeAlias(key);
				}
			}
		}

		//remove self from master list of effects
		i = effects.indexOf(node);
		if (i >= 0) {
			effects.splice(i, 1);
		}

		i = allEffectsByHook[node.hook].indexOf(node);
		if (i >= 0) {
			allEffectsByHook[node.hook].splice(i, 1);
		}
	};

	this.addTransformNode = function (node) {
		this.addNode(node);

		transforms.push(node);
		allTransformsByHook[node.hook].push(node);
	};

	this.removeTransformNode = function (node) {
		let key, item, i;

		//remove any aliases
		for (key in aliases) {
			if (aliases.hasOwnProperty(key)) {
				item = aliases[key];
				if (item.node === node) {
					seriously.removeAlias(key);
				}
			}
		}

		//remove self from master list of effects
		i = transforms.indexOf(node);
		if (i >= 0) {
			transforms.splice(i, 1);
		}

		i = allTransformsByHook[node.hook].indexOf(node);
		if (i >= 0) {
			allTransformsByHook[node.hook].splice(i, 1);
		}
	};

	this.addTargetNode = function (node) {
		let target = node.target,
			targetList;

		if (allTargets) {
			targetList = allTargets.get(target);
			if (targetList) {
				Seriously$1.logger.warn(
					'Target already in use by another instance',
					target,
					Object.keys(targetList).map(function (key) {
						return targetList[key];
					})
				);
			} else {
				targetList = {};
				allTargets.set(target, targetList);
			}
			targetList[this.id] = this;
		}

		nodes.push(node);
		nodesById[node.id] = node;
		targets.push(node);
	};

	this.removeTargetNode = function (node) {
		let targetList, i;

		if (allTargets) {
			targetList = allTargets.get(node.target);
			delete targetList[seriously.id];
			if (!Object.keys(targetList).length) {
				allTargets.delete(node.target);
			}
		}

		//remove self from master list of targets
		i = targets.indexOf(node);
		if (i >= 0) {
			targets.splice(i, 1);
		}

		//clear out context so we can start over
		if (node === this.primaryTarget) {
			glCanvas.removeEventListener('webglcontextrestored', restoreContext.call(this), false);
			destroyContext.call(this);
			this.primaryTarget = null;
		}
	};

	this.defaults = function (hook, options) {
		let key;

		if (!hook) {
			if (hook === null) {
				for (key in defaultInputs) {
					if (defaultInputs.hasOwnProperty(key)) {
						delete defaultInputs[key];
					}
				}
			}
			return;
		}

		if (typeof hook === 'object') {
			for (key in hook) {
				if (hook.hasOwnProperty(key)) {
					this.defaults(key, hook[key]);
				}
			}

			return;
		}

		if (options === null) {
			delete defaultInputs[hook];
		} else if (typeof options === 'object') {
			defaultInputs[hook] = extend({}, options);
		} else if (options === undefined) {
			return defaultInputs[hook];
		}
	};

	this.draw = draw;

	this.initDaemon = function () {
		if (!rafId) {
			rafId = requestAnimationFrame(renderDaemon);
		}
	};

	this.go = function (pre, post) {
		let i;

		if (typeof pre === 'function' && preCallbacks.indexOf(pre) < 0) {
			preCallbacks.push(pre);
		}

		if (typeof post === 'function' && postCallbacks.indexOf(post) < 0) {
			postCallbacks.push(post);
		}

		this.auto = true;
		for (i = 0; i < targets.length; i++) {
			targets[i].go();
		}

		if (!rafId && (preCallbacks.length || postCallbacks.length)) {
			renderDaemon();
		}
	};

	this.stop = function () {
		preCallbacks.length = 0;
		postCallbacks.length = 0;
		cancelAnimFrame(rafId);
		rafId = 0;
	};

	this.render = function () {
		let i;
		for (i = 0; i < targets.length; i++) {
			targets[i].render(options);
		}
	};

	this.destroy = function () {
		let i,
			node,
			descriptor;

		while (nodes.length) {
			node = nodes[0];
			node.pub.destroy();
		}

		for (i in this) {
			if (this.hasOwnProperty(i) && i !== 'isDestroyed' && i !== 'id') {
				descriptor = Object.getOwnPropertyDescriptor(this, i);
				if (descriptor.get || descriptor.set ||
					typeof this[i] !== 'function') {
					delete this[i];
				} else {
					this[i] = nop;
				}
			}
		}

		seriously = null;

		//todo: do we really need to allocate new arrays here?
		sources = [];
		targets = [];
		effects = [];
		nodes = [];

		preCallbacks.length = 0;
		postCallbacks.length = 0;
		cancelAnimFrame(rafId);
		rafId = 0;

		isDestroyed = true;
	};

	this.isDestroyed = function () {
		return isDestroyed;
	};

	this.incompatible = function (hook) {
		var key,
			plugin,
			failure = Seriously$1.incompatible(hook);

		if (failure) {
			return failure;
		}

		if (!hook) {
			for (key in allEffectsByHook) {
				if (allEffectsByHook.hasOwnProperty(key) && allEffectsByHook[key].length) {
					plugin = seriousEffects[key];
					if (plugin && typeof plugin.compatible === 'function' &&
						!plugin.compatible.call(this)) {
						return 'plugin-' + key;
					}
				}
			}

			for (key in allSourcesByHook) {
				if (allSourcesByHook.hasOwnProperty(key) && allSourcesByHook[key].length) {
					plugin = seriousSources[key];
					if (plugin && typeof plugin.compatible === 'function' &&
						!plugin.compatible.call(this)) {
						return 'source-' + key;
					}
				}
			}
		}

		return false;
	};

	/*
     * Informational utility methods
     */

	this.isNode = function (candidate) {
		let node;
		if (candidate) {
			node = nodesById[candidate.id];
			if (node && !node.isDestroyed) {
				return true;
			}
		}
		return false;
	};

	this.isSource = function (candidate) {
		return this.isNode(candidate) && candidate instanceof Source;
	};

	this.isEffect = function (candidate) {
		return this.isNode(candidate) && candidate instanceof Effect;
	};

	this.isTransform = function (candidate) {
		return this.isNode(candidate) && candidate instanceof Transform;
	};

	this.isTarget = function (candidate) {
		return this.isNode(candidate) && candidate instanceof Target;
	};

	Object.defineProperties(this, {
		id: {
			enumerable: true,
			configurable: true,
			get: function () {
				return id;
			}
		}
	});

	//todo: load, save, find

	this.defaults(options.defaults);
}

//trace back all sources to make sure we're not making a cyclical connection
Seriously$1.traceSources = function traceSources (node, original) {
	let i,
		source,
		nodeSources;

	if (!(node instanceof EffectNode) && !(node instanceof TransformNode)) {
		return false;
	}

	if (node === original) {
		return true;
	}

	nodeSources = node.sources;

	for (i in nodeSources) {
		if (nodeSources.hasOwnProperty(i)) {
			source = nodeSources[i];

			if (source === original || traceSources(source, original)) {
				return true;
			}
		}
	}

	return false;
};

Seriously$1.incompatible = function (hook) {
	let canvas, gl, plugin;

	if (incompatibility === undefined) {
		canvas = document$1.createElement('canvas');
		if (!canvas || !canvas.getContext) {
			incompatibility = 'canvas';
		} else if (!window.WebGLRenderingContext) {
			incompatibility = 'webgl';
		} else {
			gl = getTestContext(incompatibility);
			if (!gl) {
				incompatibility = 'context';
			}
		}
	}

	if (incompatibility) {
		return incompatibility;
	}

	if (hook) {
		plugin = seriousEffects[hook];
		if (plugin && typeof plugin.compatible === 'function' &&
			!plugin.compatible(gl)) {

			return 'plugin-' + hook;
		}

		plugin = seriousSources[hook];
		if (plugin && typeof plugin.compatible === 'function' &&
			!plugin.compatible(gl)) {

			return 'source-' + hook;
		}
	}

	return false;
};

Seriously$1.plugin = function (hook, definition, meta) {
	let effect;

	if (seriousEffects[hook]) {
		Seriously$1.logger.warn('Effect [' + hook + '] already loaded');
		return;
	}

	if (meta === undefined && typeof definition === 'object') {
		meta = definition;
	}

	if (!meta) {
		return;
	}

	effect = extend({}, meta);

	if (typeof definition === 'function') {
		effect.definition = definition;
	}

	effect.reserved = reservedEffectProperties;

	if (effect.inputs) {
		validateInputSpecs(effect);
	}

	if (!effect.title) {
		effect.title = hook;
	}

	/*
        if (typeof effect.requires !== 'function') {
            effect.requires = false;
        }
        */

	seriousEffects[hook] = effect;
	allEffectsByHook[hook] = [];

	return effect;
};

Seriously$1.removePlugin = function (hook) {
	let all, effect, plugin;

	if (!hook) {
		return this;
	}

	plugin = seriousEffects[hook];

	if (!plugin) {
		return this;
	}

	all = allEffectsByHook[hook];
	if (all) {
		while (all.length) {
			effect = all.shift();
			effect.destroy();
		}
		delete allEffectsByHook[hook];
	}

	delete seriousEffects[hook];

	return this;
};

Seriously$1.source = function (hook, definition, meta) {
	let source;

	if (seriousSources[hook]) {
		Seriously$1.logger.warn('Source [' + hook + '] already loaded');
		return;
	}

	if (meta === undefined && typeof definition === 'object') {
		meta = definition;
	}

	if (!meta && !definition) {
		return;
	}

	source = extend({}, meta);

	if (typeof definition === 'function') {
		source.definition = definition;
	}

	if (!source.title) {
		source.title = hook;
	}


	seriousSources[hook] = source;
	allSourcesByHook[hook] = [];

	return source;
};

Seriously$1.removeSource = function (hook) {
	let all, source, plugin;

	if (!hook) {
		return this;
	}

	plugin = seriousSources[hook];

	if (!plugin) {
		return this;
	}

	all = allSourcesByHook[hook];
	if (all) {
		while (all.length) {
			source = all.shift();
			source.destroy();
		}
		delete allSourcesByHook[hook];
	}

	delete seriousSources[hook];

	return this;
};

Seriously$1.transform = function (hook, definition, meta) {
	let transform;

	if (seriousTransforms[hook]) {
		Seriously$1.logger.warn('Transform [' + hook + '] already loaded');
		return;
	}

	if (meta === undefined && typeof definition === 'object') {
		meta = definition;
	}

	if (!meta && !definition) {
		return;
	}

	transform = extend({}, meta);

	if (typeof definition === 'function') {
		transform.definition = definition;
	}

	transform.reserved = reservedTransformProperties;

	//todo: validate method definitions
	if (transform.inputs) {
		validateInputSpecs(transform);
	}

	if (!transform.title) {
		transform.title = hook;
	}

	seriousTransforms[hook] = transform;
	allTransformsByHook[hook] = [];

	return transform;
};

Seriously$1.removeTransform = function (hook) {
	let all, transform, plugin;

	if (!hook) {
		return this;
	}

	plugin = seriousTransforms[hook];

	if (!plugin) {
		return this;
	}

	all = allTransformsByHook[hook];
	if (all) {
		while (all.length) {
			transform = all.shift();
			transform.destroy();
		}
		delete allTransformsByHook[hook];
	}

	delete seriousTransforms[hook];

	return this;
};

Seriously$1.target = function (hook, definition, meta) {
	let target;

	if (seriousTargets[hook]) {
		Seriously$1.logger.warn('Target [' + hook + '] already loaded');
		return;
	}

	if (meta === undefined && typeof definition === 'object') {
		meta = definition;
	}

	if (!meta && !definition) {
		return;
	}

	target = extend({}, meta);

	if (typeof definition === 'function') {
		target.definition = definition;
	}

	if (!target.title) {
		target.title = hook;
	}


	seriousTargets[hook] = target;
	allTargetsByHook[hook] = [];

	return target;
};

Seriously$1.removeTarget = function (hook) {
	let all, target, plugin;

	if (!hook) {
		return this;
	}

	plugin = seriousTargets[hook];

	if (!plugin) {
		return this;
	}

	all = allTargetsByHook[hook];
	if (all) {
		while (all.length) {
			target = all.shift();
			target.destroy();
		}
		delete allTargetsByHook[hook];
	}

	delete seriousTargets[hook];

	return this;
};

Seriously$1.sourcePlugin = function (node, hook, source, options, force) {
	let p = seriousSources[hook];
	if (p && p.definition) {
		p = p.definition.call(node, source, options, force);
		if (p) {
			p = extend(extend({}, seriousSources[hook]), p);
		} else {
			return null;
		}
	}
	return p;
};

Seriously$1.getTarget = function (hook) {
	return seriousTargets[hook];
};

Seriously$1.forEachSource = function (fn) {
	for (let key in seriousSources) {
		if (seriousSources.hasOwnProperty(key) && seriousSources[key]) {
			if (fn(key, seriousSources[key]) === false) {
				break;
			}
		}
	}
};

Seriously$1.forEachTarget = function (fn) {
	for (let key in seriousTargets) {
		if (seriousTargets.hasOwnProperty(key) && seriousTargets[key]) {
			if (fn(key, seriousSources[key]) === false) {
				break;
			}
		}
	}
};

//todo: validators should not allocate new objects/arrays if input is valid
Seriously$1.inputValidators = {
	color: function (value, input, defaultValue, oldValue) {
		var s,
			a,
			match,
			i;

		a = oldValue || [];

		if (typeof value === 'string') {
			//todo: support percentages, decimals
			match = colorRegex.exec(value);
			if (match && match.length) {
				if (match.length < 3) {
					a[0] = a[1] = a[2] = a[3] = 0;
					return a;
				}

				a[3] = 1;
				for (i = 0; i < 3; i++) {
					a[i] = parseFloat(match[i + 2]) / 255;
				}
				if (!isNaN(match[6])) {
					a[3] = parseFloat(match[6]);
				}
				if (match[1].toLowerCase() === 'hsl') {
					return hslToRgb(a[0], a[1], a[2], a[3], a);
				}

				return a;
			}

			match = hexColorRegex.exec(value);
			if (match && match.length) {
				s = match[1];
				if (s.length === 3) {
					a[0] = parseInt(s[0], 16) / 15;
					a[1] = parseInt(s[1], 16) / 15;
					a[2] = parseInt(s[2], 16) / 15;
					a[3] = 1;
				} else if (s.length === 4) {
					a[0] = parseInt(s[0], 16) / 15;
					a[1] = parseInt(s[1], 16) / 15;
					a[2] = parseInt(s[2], 16) / 15;
					a[3] = parseInt(s[3], 16) / 15;
				} else if (s.length === 6) {
					a[0] = parseInt(s.substr(0, 2), 16) / 255;
					a[1] = parseInt(s.substr(2, 2), 16) / 255;
					a[2] = parseInt(s.substr(4, 2), 16) / 255;
					a[3] = 1;
				} else if (s.length === 8) {
					a[0] = parseInt(s.substr(0, 2), 16) / 255;
					a[1] = parseInt(s.substr(2, 2), 16) / 255;
					a[2] = parseInt(s.substr(4, 2), 16) / 255;
					a[3] = parseInt(s.substr(6, 2), 16) / 255;
				} else {
					a[0] = a[1] = a[2] = a[3] = 0;
				}
				return a;
			}

			match = colorNames[value.toLowerCase()];
			if (match) {
				for (i = 0; i < 4; i++) {
					a[i] = match[i];
				}
				return a;
			}

			if (!colorCtx) {
				colorCtx = document$1.createElement('canvas').getContext('2d');
			}
			colorCtx.fillStyle = value;
			s = colorCtx.fillStyle;
			if (s && s !== '#000000') {
				return Seriously$1.inputValidators.color(s, input, defaultValue, oldValue);
			}

			a[0] = a[1] = a[2] = a[3] = 0;
			return a;
		}

		if (isArrayLike(value)) {
			a = value;
			if (a.length < 3) {
				a[0] = a[1] = a[2] = a[3] = 0;
				return a;
			}
			for (i = 0; i < 3; i++) {
				if (isNaN(a[i])) {
					a[0] = a[1] = a[2] = a[3] = 0;
					return a;
				}
			}
			if (a.length < 4) {
				a.push(1);
			}
			return a;
		}

		if (typeof value === 'number') {
			a[0] = a[1] = a[2] = value;
			a[3] = 1;
			return a;
		}

		if (typeof value === 'object') {
			for (i = 0; i < 4; i++) {
				s = colorFields[i];
				if (value[s] === null || isNaN(value[s])) {
					a[i] = i === 3 ? 1 : 0;
				} else {
					a[i] = value[s];
				}
			}
			return a;
		}

		a[0] = a[1] = a[2] = a[3] = 0;
		return a;
	},
	number: function (value, input, defaultValue) {
		value = parseFloat(value);

		if (isNaN(value)) {
			return defaultValue || 0;
		}

		if (input.mod) {
			value = value - input.mod * Math.floor(value / input.mod);
		}

		if (value < input.min) {
			return input.min;
		}

		if (value > input.max) {
			return input.max;
		}

		if (input.step) {
			return Math.round(value / input.step) * input.step;
		}

		return value;
	},
	'enum': function (value, input, defaultValue) {
		let options = input.options || [];

		if (typeof value === 'string') {
			value = value.toLowerCase();
		} else if (typeof value === 'number') {
			value = value.toString();
		} else if (!value) {
			value = '';
		}

		if (options.hasOwnProperty(value)) {
			return value;
		}

		return defaultValue || '';
	},
	vector: function (value, input, defaultValue, oldValue) {
		let a, i, s, n = input.dimensions || 4;

		a = oldValue || [];
		if (isArrayLike(value)) {
			for (i = 0; i < n; i++) {
				a[i] = value[i] || 0;
			}
			return a;
		}

		if (typeof value === 'object') {
			for (i = 0; i < n; i++) {
				s = vectorFields[i];
				if (value[s] === undefined) {
					s = colorFields[i];
				}
				a[i] = value[s] || 0;
			}
			return a;
		}

		value = parseFloat(value) || 0;
		for (i = 0; i < n; i++) {
			a[i] = value;
		}

		return a;
	},
	'boolean': function (value) {
		if (!value) {
			return false;
		}

		if (value && value.toLowerCase && value.toLowerCase() === 'false') {
			return false;
		}

		return true;
	},
	'string': function (value) {
		if (typeof value === 'string') {
			return value;
		}

		if (value !== 0 && !value) {
			return '';
		}

		if (value.toString) {
			return value.toString();
		}

		return String(value);
	}
	//todo: date/time
};

Seriously$1.validateInputSpecs = validateInputSpecs;

Seriously$1.prototype.effects = Seriously$1.effects = function () {
	let name,
		effect,
		manifest,
		effects = {},
		input,
		i;

	for (name in seriousEffects) {
		if (seriousEffects.hasOwnProperty(name)) {
			effect = seriousEffects[name];
			manifest = {
				title: effect.title || name,
				description: effect.description || '',
				inputs: {}
			};

			for (i in effect.inputs) {
				if (effect.inputs.hasOwnProperty(i)) {
					input = effect.inputs[i];
					manifest.inputs[i] = {
						type: input.type,
						defaultValue: input.defaultValue,
						step: input.step,
						min: input.min,
						max: input.max,
						mod: input.mod,
						minCount: input.minCount,
						maxCount: input.maxCount,
						dimensions: input.dimensions,
						title: input.title || i,
						description: input.description || '',
						options: input.options || []
					};
				}
			}

			effects[name] = manifest;
		}
	}

	return effects;
};

Seriously$1.prototype.getTarget = function (hook) {
	return seriousTargets[hook];
};

Seriously$1.prototype.hasTarget = function (hook) {
	return !!seriousTargets[hook];
};

//check for plugins loaded out of order
if (window.Seriously) {
	if (typeof window.Seriously === 'object') {
		(function () {
			let i;
			for (i in window.Seriously) {
				if (window.Seriously.hasOwnProperty(i) &&
					i !== 'plugin' &&
					typeof window.Seriously[i] === 'object') {

					Seriously$1.plugin(i, window.Seriously[i]);
				}
			}
		}());
	}
}

Seriously$1.logger = logger;

Seriously$1.util = {
	mat4: mat4,
	checkSource: function (source) {
		return checkSource(source, incompatibility);
	},
	hslToRgb: hslToRgb,
	colors: colorNames,
	setTimeoutZero: setTimeoutZero,
	ShaderProgram: ShaderProgram,
	FrameBuffer: FrameBuffer,
	requestAnimationFrame: requestAnimationFrame
};

const document$4 = window.document;

let noVideoTextureSupport;

Seriously$1.source('video', function (video, options, force) {
	const me = this;

	let canvas,
		ctx2d,
		destroyed = false,
		deferTexture = false,
		isSeeking = false,
		lastRenderTime = 0;

	function initializeVideo() {
		video.removeEventListener('loadedmetadata', initializeVideo, true);

		if (destroyed) {
			return;
		}

		if (video.videoWidth) {
			if (me.width !== video.videoWidth || me.height !== video.videoHeight) {
				me.width = video.videoWidth;
				me.height = video.videoHeight;
				me.resize();
			}

			if (deferTexture) {
				me.setReady();
			}
		} else {
			//Workaround for Firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=926753
			deferTexture = true;
			window.setTimeout(initializeVideo, 50);
		}
	}

	function seeking() {
		// IE doesn't report .seeking properly so make our own
		isSeeking = true;
	}

	function seeked() {
		isSeeking = false;
		me.setDirty();
	}

	if (isInstance(video, 'HTMLVideoElement')) {
		if (video.readyState) {
			initializeVideo();
		} else {
			deferTexture = true;
			video.addEventListener('loadedmetadata', initializeVideo, true);
		}

		video.addEventListener('seeking', seeking, false);
		video.addEventListener('seeked', seeked, false);

		return {
			deferTexture: deferTexture,
			source: video,
			render: function renderVideo(gl) {
				let source,
					error;

				lastRenderTime = video.currentTime;

				if (!video.videoHeight || !video.videoWidth) {
					return false;
				}

				if (noVideoTextureSupport) {
					if (!ctx2d) {
						ctx2d = document$4.createElement('canvas').getContext('2d');
						canvas = ctx2d.canvas;
						canvas.width = me.width;
						canvas.height = me.height;
					}
					source = canvas;
					ctx2d.drawImage(video, 0, 0, me.width, me.height);
				} else {
					source = video;
				}

				gl.bindTexture(gl.TEXTURE_2D, me.texture);
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, me.flip);
				gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
				try {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

					//workaround for lack of video texture support in IE
					if (noVideoTextureSupport === undefined) {
						error = gl.getError();
						if (error === gl.INVALID_VALUE) {
							noVideoTextureSupport = true;
							return renderVideo(gl);
						}
						noVideoTextureSupport = false;
					}
					return true;
				} catch (securityError) {
					if (securityError.code === window.DOMException.SECURITY_ERR) {
						me.allowRefresh = false;
						Seriously$1.logger.error('Unable to access cross-domain image');
					} else {
						Seriously$1.logger.error('Error rendering video source', securityError);
					}
				}
				return false;
			},
			checkDirty: function () {
				return !isSeeking && video.currentTime !== lastRenderTime;
			},
			compare: function (source) {
				return me.source === source;
			},
			destroy: function () {
				destroyed = true;
				video.removeEventListener('seeking', seeking, false);
				video.removeEventListener('seeked', seeked, false);
				video.removeEventListener('loadedmetadata', initializeVideo, true);
			}
		};
	}
}, {
	title: 'Video'
});

let getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
let URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

Seriously$1.source('camera', function (source, options, force) {
	let me = this,
		video,
		key,
		opts,
		destroyed = false,
		stream,

		lastRenderTime = 0;

	function cleanUp() {
		if (video) {
			video.pause();
			video.src = '';
			video.load();
		}

		if (stream && stream.stop) {
			stream.stop();
		}
		stream = null;
	}

	function initialize() {
		if (destroyed) {
			return;
		}

		if (video.videoWidth) {
			me.width = video.videoWidth;
			me.height = video.videoHeight;
			me.setReady();
		} else {
			//Workaround for Firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=926753
			setTimeout(initialize, 50);
		}
	}

	//todo: support options for video resolution, etc.

	if (force) {
		if (!getUserMedia) {
			throw 'Camera source type unavailable. Browser does not support getUserMedia';
		}

		opts = {};
		if (source && typeof source === 'object') {
			//copy over constraints
			for (key in source) {
				if (source.hasOwnProperty(key)) {
					opts[key] = source[key];
				}
			}
		}
		if (!opts.video) {
			opts.video = true;
		}

		video = document.createElement('video');

		getUserMedia.call(navigator, opts, function (s) {
			stream = s;

			if (destroyed) {
				cleanUp();
				return;
			}

			// check for firefox
			if (video.mozCaptureStream) {
				video.mozSrcObject = stream;
			} else {
				video.src = (URL && URL.createObjectURL(stream)) || stream;
			}

			if (video.readyState) {
				initialize();
			} else {
				video.addEventListener('loadedmetadata', initialize, false);
			}

			video.play();
		}, function (evt) {
			//todo: emit error event
			console.log('Unable to access video camera', evt);
		});

		return {
			deferTexture: true,
			source: video,
			render: function (gl) {
				lastRenderTime = video.currentTime;

				gl.bindTexture(gl.TEXTURE_2D, this.texture);
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flip);
				gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
				try {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
					return true;
				} catch (error) {
					Seriously$1.logger.error('Error rendering camera video source', error);
				}

				return false;
			},
			checkDirty: function () {
				return video.currentTime !== lastRenderTime;
			},
			destroy: function () {
				destroyed = true;
				cleanUp();
			}
		};
	}
}, {
	compatible: function () {
		return !!getUserMedia;
	},
	title: 'Camera'
});

Seriously$1.source('three', function (source, options, force) {
	let width,
		height,
		typedArray,
		me = this,
		setDirty = this.setDirty;

	function initialize() {
		const texture = source.__webglTexture,
			gl = me.gl;

		if (!texture || !gl || me.initialized) {
			// not ready yet
			return;
		}

		if (!gl.isTexture(texture)) {
			throw new Error('Failed to create Three.js source. WebGL texture is from a different context');
		}

		me.texture = texture;
		me.initialized = true;
		me.allowRefresh = true;
		me.setReady();
	}

	if (THREE && source instanceof THREE.WebGLRenderTarget) {

		width = source.width;
		height = source.height;

		this.width = width;
		this.height = height;

		/*
		 * Three.js doesn't set up a WebGL texture until the first time it renders,
		 * and there's no way to be notified. So we place a hook on setDirty, which
		 * gets called by update or by renderDaemon
		 */
		initialize();
		if (!this.initialized) {
			this.setDirty = function () {
				initialize();
				if (this.initialized) {
					this.setDirty = setDirty;
				}
				setDirty.call(this);
			};
		}

		return {
			deferTexture: !this.initialized,
			//todo: compare?
			render: function (gl) {
				this.lastRenderTime = Date.now() / 1000;
				this.dirty = false;
				this.emit('render');
			}
		};
	}
}, {
	title: 'Three.js WebGLRenderTarget Source'
});

/*
 * Load depth map from JPG file
 * https://developers.google.com/depthmap-metadata/
 *
 * Depth maps can be generated by Android Camera app
 * http://googleresearch.blogspot.sg/2014/04/lens-blur-in-new-google-camera-app.html
 *
 * Method for loading depth image from jpg borrowed from Jaume Sanchez Elias (@thespite)
 * http://www.clicktorelease.com/tools/lens-blur-depth-extractor/
 */

function ab2str(buf) {
	return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function memcpy(dst, dstOffset, src, srcOffset, length) {
	let dstU8 = new Uint8Array(dst, dstOffset, length),
		srcU8 = new Uint8Array(src, srcOffset, length);

	dstU8.set(srcU8);
}

let depthRegex = /GDepth:Data="([\S]*)"/;

Seriously$1.source('depth', function (source, options, force) {
	let that = this,
		element,
		url,
		xhr,
		depthImage,

		destroyed = false;

	/*
	todo: what happens if src of source image changes? can we adapt?
	*/

	function initialize() {
		if (!destroyed) {
			that.width = depthImage.naturalWidth;
			that.height = depthImage.naturalHeight;
			that.setReady();
		}
	}

	function parseArrayBuffer(arrayBuffer) {
		var byteArray = new Uint8Array(arrayBuffer), // this.response == uInt8Array.buffer
			boundaries = [],

			str = '',
			i, j,
			tmp,
			tmpStr,
			length,
			offset,
			match;

		if (byteArray[0] == 0xff && byteArray[1] == 0xd8) {
			//look for boundaries
			for (i = 0; i < byteArray.byteLength; i++) {
				if (byteArray[i] === 0xff && byteArray[i + 1] === 0xe1) {
					boundaries.push(i);
					i++;
				}
			}
			boundaries.push(byteArray.byteLength);

			for (j = 0; j < boundaries.length - 1; j++) {
				if (byteArray[boundaries[j]] === 0xff && byteArray[boundaries[j] + 1] === 0xe1) {
					length = byteArray[boundaries[j] + 2] * 256 + byteArray[boundaries[j] + 3];
					offset = 79;
					if (offset > length) {
						offset = 0;
					}
					length += 2;

					tmp = new ArrayBuffer(length - offset);
					memcpy(tmp, 0, arrayBuffer, boundaries[j] + offset, length - offset);
					tmpStr = ab2str(tmp);
					str += tmpStr;
				}
			}

			match = depthRegex.exec(str);
			if (match === null) {
				Seriously$1.logger.error('JPEG file does not include depth image.');
				return false;
			}

			if (!depthImage) {
				depthImage = document.createElement('img');
			}

			depthImage.src = 'data:image/png;base64,' + match[1];

			if (!depthImage.complete || !depthImage.naturalWidth) {
				depthImage.addEventListener('load', initialize, true);
				depthImage.addEventListener('error', function (evt) {
					Seriously$1.logger.error('Error loading depth image.', evt);
				}, true);
			} else {
				initialize();
			}
		} else {
			Seriously$1.logger.error('Unable to load depth image. File is not a JPEG.');
			return false;
		}
	}

	if (force) {
		if (typeof source === 'string') {
			element = document.querySelector(source);
		} else {
			element = source;
		}

		if (element instanceof window.ArrayBuffer) {
			parseArrayBuffer(source);
		} else if (options && options.url) {
			url = options.url;
		} else if (element && element instanceof window.HTMLImageElement &&
			(element.tagName === 'IMG' || force)) {

			url = element.src;
			//todo: validate url
		}

		if (!url && typeof source === 'string') {
			url = source;
		}

		if (url) {
			depthImage = document.createElement('img');

			xhr = new XMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.responseType = 'arraybuffer';

			xhr.onload = function () {
				parseArrayBuffer(this.response);
			};

			xhr.send();
		}

		return !depthImage ? false : {
			deferTexture: true,
			source: depthImage,
			render: Object.getPrototypeOf(this).renderImageCanvas,
			destroy: function () {
				destroyed = true;
			}
		};

	}
}, {
	title: 'Depth Image'
});

/*
 * There is currently no way to resize a THREE.WebGLRenderTarget,
 * so we won't allow resizing of this kind of target node until that gets fixed
 */

const identity$1 = new Float32Array([
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1
]);

Seriously$1.target('three', function (target, options) {
	let me = this,
		gl,
		frameBuffer;

	function initialize() {
		if (!frameBuffer || !gl || me.initialized) {
			// not ready yet
			return;
		}

		me.initialized = true;
		me.allowRefresh = true;
		me.setReady();
	}

	if (THREE && target instanceof THREE.WebGLRenderTarget) {
		/*
		if not passed a canvas or gl by options and we don't have one already,
		throw an error
		*/
		if (me.gl) {
			gl = me.gl;
		} else if (options) {
			if (options.gl) {
				gl = options.gl;
			} else if (options.canvas && options.canvas.getContext) {
				try {
					gl = options.canvas.getContext('webgl');
				} catch (ignore) {
				}

				if (!gl) {
					try {
						gl = options.canvas.getContext('experimental-webgl');
					} catch (ignore) {
					}
				}
			}
		}

		if (!gl) {
			throw new Error('Failed to create Three.js target. Missing WebGL context');
		}

		this.ready = false;
		this.width = target.width;
		this.height = target.height;

		if (target.__webglFramebuffer) {
			if (!gl.isFramebuffer(target.__webglFramebuffer)) {
				throw new Error('Failed to create Three.js target. WebGL texture is from a different context');
			}
			frameBuffer = target.__webglFramebuffer;
			initialize();
		} else {
			Object.defineProperty(target, '__webglFramebuffer', {
				configurable: true,
				enumerable: true,
				get: function () {
					return frameBuffer;
				},
				set: function (fb) {
					if (fb) {
						frameBuffer = fb;
						initialize();
					}
				}
			});
		}

		this.setReady = function () {
			if (frameBuffer && this.source && this.source.ready && !this.ready) {
				this.emit('ready');
				this.ready = true;
			}
		};

		this.target = target;

		return {
			gl: gl,
			resize: function () {
				this.width = target.width;
				this.height = target.height;
			},
			render: function (draw, shader, model) {
				var matrix, x, y;
				if (gl && this.dirty && this.ready && this.source) {

					this.source.render();
					this.uniforms.source = this.source.texture;

					if (this.source.width === this.width && this.source.height === this.height) {
						this.uniforms.transform = this.source.cumulativeMatrix || identity$1;
					} else if (this.transformDirty) {
						matrix = this.transform;
						mat4.copy(matrix, this.source.cumulativeMatrix || identity$1);
						x = this.source.width / this.width;
						y = this.source.height / this.height;
						matrix[0] *= x;
						matrix[1] *= x;
						matrix[2] *= x;
						matrix[3] *= x;
						matrix[4] *= y;
						matrix[5] *= y;
						matrix[6] *= y;
						matrix[7] *= y;
						this.uniforms.transform = matrix;
						this.transformDirty = false;
					}

					draw(shader, model, this.uniforms, frameBuffer, this);

					this.emit('render');
					this.dirty = false;
					if (target.onUpdate) {
						target.onUpdate();
					}
				}
			},
			destroy: function () {
				Object.defineProperty(target, '__webglFramebuffer', {
					configurable: true,
					enumerable: true,
					value: frameBuffer
				});
			}
		};
	}
}, {
	title: 'THREE.js WebGLRenderTarget Target'
});

let mat4$1 = Seriously$1.util.mat4;

Seriously$1.transform('flip', function () {
	let me = this,
		horizontal = true;

	function recompute() {
		let matrix = me.matrix;

		//calculate transformation matrix
		//mat4.identity(matrix);

		//scale
		if (horizontal) {
			matrix[0] = -1;
			matrix[5] = 1;
		} else {
			matrix[0] = 1;
			matrix[5] = -1;
		}
	}

	mat4$1.identity(me.matrix);
	recompute();

	me.transformDirty = true;

	me.transformed = true;

	return {
		inputs: {
			direction: {
				get: function () {
					return horizontal ? 'horizontal' : 'vertical';
				},
				set: function (d) {
					let horiz = d !== 'vertical';

					if (horiz === horizontal) {
						return false;
					}

					horizontal = horiz;
					recompute();
					return true;
				},
				type: 'string'
			}
		}
	};
}, {
	title: 'Flip',
	description: 'Flip Horizontal/Vertical'
});

const mat4$2 = Seriously$1.util.mat4;
const PI = Math.PI;
const f2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const g2 = (3.0 - Math.sqrt(3.0)) / 6.0;
const random = Math.random;

/*
 * Camera Shake
 * - amplitude (x/y)
 * - rotation (degrees)
 * - frequency
 * - octaves
 * - autoScale (true/false)
 */


/*
 * Simplex Noise
 * adapted from https://github.com/jwagner/simplex-noise.js
 */

let p;
let perm;
let permMod12;
let grad3;
let initialized = false;

function initializeSimplex() {
	//initialize simplex lookup tables
	let i;
	if (!initialized) {
		p = new Uint8Array(256);
		perm = new Uint8Array(512);
		permMod12 = new Uint8Array(512);
		grad3 = new Float32Array([
			1, 1, 0,
			-1, 1, 0,
			1, -1, 0,

			-1, -1, 0,
			1, 0, 1,
			-1, 0, 1,

			1, 0, -1,
			-1, 0, -1,
			0, 1, 1,

			0, -1, 1,
			0, 1, -1,
			0, -1, -1
		]);

		for (i = 0; i < 256; i++) {
			p[i] = random() * 256;
		}
		for (i = 0; i < 512; i++) {
			perm[i] = p[i & 255];
			permMod12[i] = perm[i] % 12;
		}
		initialized = true;
	}
}

function noise2D(xin, yin) {
	let n0 = 0, // Noise contributions from the three corners
		n1 = 0, // Skew the input space to determine which simplex cell we're in
		n2 = 0,

		s = (xin + yin) * f2, // Hairy factor for 2D
		i = Math.floor(xin + s),
		j = Math.floor(yin + s),
		t = (i + j) * g2,

		xx0 = i - t, // Unskew the cell origin back to (x,y) space
		yy0 = j - t,

		x0 = xin - xx0,
		y0 = yin - yy0,

		/*
		 * For the 2D case, the simplex shape is an equilateral triangle.
		 * Determine which simplex we are in.
		 * Offsets for second (middle) corner of simplex in (i,j) coords
		 */
		i1 = x0 > y0 ? 1 : 0,
		j1 = (i1 + 1) % 2, //opposite of i1

		x1 = x0 - i1 + g2,
		y1 = y0 - j1 + g2,
		x2 = x0 - 1 + 2 * g2,
		y2 = y0 - 1 + 2 * g2,

		ii = i & 255,
		jj = j & 255,

		t0 = 0.5 - x0 * x0 - y0 * y0,

		t1,
		t2,

		gi;

	if (t0 >= 0) {
		gi = permMod12[ii + perm[jj]] * 3;
		t0 *= t0;
		n0 = t0 * t0 * (grad3[gi] * x0 + grad3[gi + 1] * y0); // (x,y) of grad3 used for 2D gradient
	}

	t1 = 0.5 - x1 * x1 - y1 * y1;
	if (t1 >= 0) {
		gi = permMod12[ii + i1 + perm[jj + j1]] * 3;
		t1 *= t1;
		n1 = t1 * t1 * (grad3[gi] * x1 + grad3[gi + 1] * y1);
	}

	t2 = 0.5 - x2 * x2 - y2 * y2;
	if (t2 >= 0) {
		gi = permMod12[ii + 1 + perm[jj + 1]] * 3;
		t2 *= t2;
		n2 = t2 * t2 * (grad3[gi] * x2 + grad3[gi + 1] * y2);
	}

	return 70.0 * (n0 + n1 + n2);
}

Seriously$1.transform('camerashake', function () {
	let me = this,
		octaves = 1,
		time = 0,
		amplitudeX = 0,
		amplitudeY = 0,
		frequency = 1,
		rotation = 0,
		preScale = 0,
		autoScale = true,
		maxScale = 1;

	function calcScale(x, y, angle) {
		let width = me.width,
			height = me.height,
			scale = 1,
			x0, y0,
			x1, y1,
			x2, y2,
			sin,
			cos;

		// angle mod 180
		angle = angle - PI * Math.floor(angle / PI);

		if (angle) {
			sin = Math.sin(angle);
			cos = Math.sqrt(1 - sin * sin);

			/*
			 * Take two top corner points, rotate them and find absolute value.
			 * This should find the bounding box of the rotated recangle,
			 * assuming it's centered at 0, 0
			 */

			// rotate point top right corner
			x0 = width / 2;
			y0 = height / 2;
			x1 = Math.abs(x0 * cos - y0 * sin);
			y1 = Math.abs(x0 * sin + y0 * cos);

			// rotate point top left corner
			x0 = -x0;
			x2 = Math.abs(x0 * cos - y0 * sin);
			y2 = Math.abs(x0 * sin + y0 * cos);

			// find maximum scale
			scale = 2 * Math.max(x1 / width, x2 / width, y1 / height, y2 / height);
		}

		scale *= Math.max(
			(2 * Math.abs(x) + width) / width,
			(2 * Math.abs(y) + height) / height
		);

		return scale;
	}

	function recompute() {
		let matrix = me.matrix,
			s, c,
			t,
			freq,
			amp,
			adjust = 0,
			i,
			scale = 1,
			translateX = 0,
			translateY = 0,
			rotationZ = 0,
			angle = 0,
			m00,
			m01,
			m02,
			m03,
			m10,
			m11,
			m12,
			m13;

		function translate(x, y) {
			matrix[12] = matrix[0] * x + matrix[4] * y + matrix[12];
			matrix[13] = matrix[1] * x + matrix[5] * y + matrix[13];
			matrix[14] = matrix[2] * x + matrix[6] * y + matrix[14];
			matrix[15] = matrix[3] * x + matrix[7] * y + matrix[15];
		}

		function rotateZ() {
			if (!rotationZ) {
				return;
			}

			s = Math.sin(angle);
			c = Math.cos(angle);

			m00 = matrix[0];
			m01 = matrix[1];
			m02 = matrix[2];
			m03 = matrix[3];
			m10 = matrix[4];
			m11 = matrix[5];
			m12 = matrix[6];
			m13 = matrix[7];

			matrix[0] = m00 * c + m10 * s;
			matrix[1] = m01 * c + m11 * s;
			matrix[2] = m02 * c + m12 * s;
			matrix[3] = m03 * c + m13 * s;
			matrix[4] = m10 * c - m00 * s;
			matrix[5] = m11 * c - m01 * s;
			matrix[6] = m12 * c - m02 * s;
			matrix[7] = m13 * c - m03 * s;
		}

		if (!amplitudeX &&
			!amplitudeY &&
			!rotation
		) {
			me.transformed = false;
			return;
		}

		t = time * frequency;

		for (i = 0; i < octaves; i++) {
			freq = Math.pow(2, i);
			amp = Math.pow(0.5, i);
			adjust += amp;
			if (rotation) {
				rotationZ += noise2D(t * freq, 7 * freq) * amp;
			}
			if (amplitudeX) {
				translateX += noise2D(t * freq, 11 * freq) * amp;
			}
			if (amplitudeY) {
				translateY += noise2D(t * freq, 13 * freq) * amp;
			}
		}
		rotationZ *= rotation / adjust;
		translateX *= amplitudeX / adjust;
		translateY *= amplitudeY / adjust;
		angle = rotationZ * PI / 180;

		//calculate transformation matrix
		mat4$2.identity(matrix);

		translate(translateX, translateY);

		rotateZ();

		if (autoScale) {
			if (preScale === 1) {
				scale = maxScale;
			} else {
				scale = calcScale(translateX, translateY, angle);
				scale = preScale * maxScale + (1 - preScale) * scale;
			}

			//scale
			if (scale !== 1) {
				matrix[0] *= scale;
				matrix[1] *= scale;
				matrix[2] *= scale;
				matrix[3] *= scale;
				matrix[4] *= scale;
				matrix[5] *= scale;
				matrix[6] *= scale;
				matrix[7] *= scale;
			}
		}

		me.transformed = true;
	}

	initializeSimplex();

	return {
		resize: recompute,
		inputs: {
			time: {
				get: function () {
					return time;
				},
				set: function (t) {
					if (t === time) {
						return false;
					}

					time = t;

					recompute();
					return true;
				},
				type: 'number'
			},
			frequency: {
				get: function () {
					return frequency;
				},
				set: function (f) {
					if (f === frequency) {
						return false;
					}

					frequency = f;

					recompute();
					return true;
				},
				type: 'number'
			},
			octaves: {
				get: function () {
					return octaves;
				},
				set: function (o) {
					o = Math.max(1, o);
					if (o === octaves) {
						return false;
					}

					octaves = o;

					recompute();
					return true;
				},
				type: 'number'
			},
			rotation: {
				get: function () {
					return rotation;
				},
				set: function (r) {
					if (r === rotation) {
						return false;
					}

					rotation = r;

					maxScale = calcScale(amplitudeX, amplitudeY, rotation * PI / 180);
					recompute();
					return true;
				},
				type: 'number'
			},
			amplitudeX: {
				get: function () {
					return amplitudeX;
				},
				set: function (x) {
					x = Math.max(0, x);
					if (x === amplitudeX) {
						return false;
					}

					amplitudeX = x;

					maxScale = calcScale(amplitudeX, amplitudeY, rotation * PI / 180);
					recompute();
					return true;
				},
				type: 'number'
			},
			amplitudeY: {
				get: function () {
					return amplitudeY;
				},
				set: function (y) {
					y = Math.max(0, y);
					if (y === amplitudeY) {
						return false;
					}

					amplitudeY = y;

					maxScale = calcScale(amplitudeX, amplitudeY, rotation * PI / 180);
					recompute();
					return true;
				},
				type: 'number'
			},
			autoScale: {
				get: function () {
					return autoScale;
				},
				set: function (a) {
					a = !!a;
					if (a === autoScale) {
						return false;
					}

					autoScale = a;

					recompute();
					return true;
				},
				type: 'boolean'
			},
			preScale: {
				get: function () {
					return preScale;
				},
				set: function (ps) {
					ps = Math.max(0, Math.min(1, ps));
					if (ps === preScale) {
						return false;
					}

					preScale = ps;

					recompute();
					return true;
				},
				type: 'number'
			}
		}
	};
}, {
	title: 'Camera Shake'
});

const mat4$3 = Seriously$1.util.mat4;

Seriously$1.transform('reformat', function () {
	let me = this,
		forceWidth,
		forceHeight,
		mode = 'contain';

	function recompute() {
		let matrix = me.matrix,
			width = forceWidth || me.width,
			height = forceHeight || me.height,
			scaleX,
			scaleY,
			source = me.source,
			sourceWidth = source && source.width || 1,
			sourceHeight = source && source.height || 1,
			aspectIn,
			aspectOut;

		if (mode === 'distort' || width === sourceWidth && height === sourceHeight) {
			me.transformed = false;
			return;
		}

		aspectIn = sourceWidth / sourceHeight;

		aspectOut = width / height;

		if (mode === 'none') {
			scaleX = sourceWidth / width;
			scaleY = sourceHeight / height;
		} else if (mode === 'width' || mode === 'contain' && aspectOut <= aspectIn) {
			scaleX = 1;
			scaleY = aspectOut / aspectIn;
		} else if (mode === 'height' || mode === 'contain' && aspectOut > aspectIn) {
			scaleX = aspectIn / aspectOut;
			scaleY = 1;
		} else {
			//mode === 'cover'
			if (aspectOut > aspectIn) {
				scaleX = 1;
				scaleY = aspectOut / aspectIn;
			} else {
				scaleX = aspectIn / aspectOut;
				scaleY = 1;
			}
		}

		if (scaleX === 1 && scaleY === 1) {
			me.transformed = false;
			return;
		}

		//calculate transformation matrix
		mat4$3.identity(matrix);

		//scale
		if (scaleX !== 1) {
			matrix[0] *= scaleX;
			matrix[1] *= scaleX;
			matrix[2] *= scaleX;
			matrix[3] *= scaleX;
		}
		if (scaleY !== 1) {
			matrix[4] *= scaleY;
			matrix[5] *= scaleY;
			matrix[6] *= scaleY;
			matrix[7] *= scaleY;
		}
		me.transformed = true;
	}

	function getWidth() {
		return forceWidth || me.source && me.source.width || 1;
	}

	function getHeight() {
		return forceHeight || me.source && me.source.height || 1;
	}

	this.resize = function () {
		let width = getWidth(),
			height = getHeight(),
			i;

		if (this.width !== width || this.height !== height) {
			this.width = width;
			this.height = height;

			if (this.uniforms && this.uniforms.resolution) {
				this.uniforms.resolution[0] = width;
				this.uniforms.resolution[1] = height;
			}

			if (this.frameBuffer && this.frameBuffer.resize) {
				this.frameBuffer.resize(width, height);
			}

			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].resize();
			}
		}

		this.setTransformDirty();

		recompute();
	};

	return {
		inputs: {
			width: {
				get: getWidth,
				set: function (x) {
					x = Math.floor(x);
					if (x === forceWidth) {
						return false;
					}

					forceWidth = x;

					this.resize();

					//don't need to run setTransformDirty again
					return false;
				},
				type: 'number'
			},
			height: {
				get: getHeight,
				set: function (y) {
					y = Math.floor(y);
					if (y === forceHeight) {
						return false;
					}

					forceHeight = y;

					this.resize();

					//don't need to run setTransformDirty again
					return false;
				},
				type: 'number'
			},
			mode: {
				get: function () {
					return mode;
				},
				set: function (m) {
					if (m === mode) {
						return false;
					}

					mode = m;

					recompute();
					return true;
				},
				type: 'enum',
				options: [
					'cover',
					'contain',
					'distort',
					'width',
					'height',
					'none'
				]
			}
		}
	};
}, {
	title: 'Reformat',
	description: 'Change output dimensions'
});

const mat4$4 = Seriously$1.util.mat4;

/*
 *	Default transform - 2D
 *	Affine transforms
 *	- translate
 *	- rotate (degrees)
 *	- scale
 *	- skew
 */
Seriously$1.transform('2d', function (options) {
	let me = this,
		degrees = !(options && options.radians),

		centerX = 0,
		centerY = 0,
		scaleX = 1,
		scaleY = 1,
		translateX = 0,
		translateY = 0,
		rotation = 0,
		skewX = 0,
		skewY = 0;

	//todo: skew order
	//todo: invert?

	function recompute() {
		let matrix = me.matrix,
			angle,
			s, c,
			m00,
			m01,
			m02,
			m03,
			m10,
			m11,
			m12,
			m13;

		function translate(x, y) {
			matrix[12] = matrix[0] * x + matrix[4] * y + matrix[12];
			matrix[13] = matrix[1] * x + matrix[5] * y + matrix[13];
			matrix[14] = matrix[2] * x + matrix[6] * y + matrix[14];
			matrix[15] = matrix[3] * x + matrix[7] * y + matrix[15];
		}

		if (!translateX &&
			!translateY &&
			!rotation &&
			!skewX &&
			!skewY &&
			scaleX === 1 &&
			scaleY === 1
		) {
			me.transformed = false;
			return;
		}

		//calculate transformation matrix
		mat4$4.identity(matrix);

		translate(translateX + centerX, translateY + centerY);

		//skew
		if (skewX) {
			matrix[4] = skewX / me.width;
		}
		if (skewY) {
			matrix[1] = skewY / me.height;
		}

		if (rotation) {
			m00 = matrix[0];
			m01 = matrix[1];
			m02 = matrix[2];
			m03 = matrix[3];
			m10 = matrix[4];
			m11 = matrix[5];
			m12 = matrix[6];
			m13 = matrix[7];

			//rotate
			angle = -(degrees ? rotation * Math.PI / 180 : rotation);
			//...rotate
			s = Math.sin(angle);
			c = Math.cos(angle);
			matrix[0] = m00 * c + m10 * s;
			matrix[1] = m01 * c + m11 * s;
			matrix[2] = m02 * c + m12 * s;
			matrix[3] = m03 * c + m13 * s;
			matrix[4] = m10 * c - m00 * s;
			matrix[5] = m11 * c - m01 * s;
			matrix[6] = m12 * c - m02 * s;
			matrix[7] = m13 * c - m03 * s;
		}

		//scale
		if (scaleX !== 1) {
			matrix[0] *= scaleX;
			matrix[1] *= scaleX;
			matrix[2] *= scaleX;
			matrix[3] *= scaleX;
		}
		if (scaleY !== 1) {
			matrix[4] *= scaleY;
			matrix[5] *= scaleY;
			matrix[6] *= scaleY;
			matrix[7] *= scaleY;
		}

		translate(-centerX, -centerY);

		me.transformed = true;
	}

	return {
		inputs: {
			reset: {
				method: function () {
					centerX = 0;
					centerY = 0;
					scaleX = 1;
					scaleY = 1;
					translateX = 0;
					translateY = 0;
					rotation = 0;
					skewX = 0;
					skewY = 0;

					if (me.transformed) {
						me.transformed = false;
						return true;
					}

					return false;
				}
			},
			translate: {
				method: function (x, y) {
					if (isNaN(x)) {
						x = translateX;
					}

					if (isNaN(y)) {
						y = translateY;
					}

					if (x === translateX && y === translateY) {
						return false;
					}

					translateX = x;
					translateY = y;

					recompute();
					return true;
				},
				type: [
					'number',
					'number'
				]
			},
			translateX: {
				get: function () {
					return translateX;
				},
				set: function (x) {
					if (x === translateX) {
						return false;
					}

					translateX = x;

					recompute();
					return true;
				},
				type: 'number'
			},
			translateY: {
				get: function () {
					return translateY;
				},
				set: function (y) {
					if (y === translateY) {
						return false;
					}

					translateY = y;

					recompute();
					return true;
				},
				type: 'number'
			},
			rotation: {
				get: function () {
					return rotation;
				},
				set: function (angle) {
					if (angle === rotation) {
						return false;
					}

					//todo: fmod 360deg or Math.PI * 2 radians
					rotation = parseFloat(angle);

					recompute();
					return true;
				},
				type: 'number'
			},
			center: {
				method: function (x, y) {
					if (isNaN(x)) {
						x = centerX;
					}

					if (isNaN(y)) {
						y = centerY;
					}

					if (x === centerX && y === centerY) {
						return false;
					}

					centerX = x;
					centerY = y;

					recompute();
					return true;
				},
				type: [
					'number',
					'number'
				]
			},
			centerX: {
				get: function () {
					return centerX;
				},
				set: function (x) {
					if (x === centerX) {
						return false;
					}

					centerX = x;

					recompute();
					return true;
				},
				type: 'number'
			},
			centerY: {
				get: function () {
					return centerY;
				},
				set: function (y) {
					if (y === centerY) {
						return false;
					}

					centerY = y;

					recompute();
					return true;
				},
				type: 'number'
			},
			skew: {
				method: function (x, y) {
					if (isNaN(x)) {
						x = skewX;
					}

					if (isNaN(y)) {
						y = skewY;
					}

					if (x === skewX && y === skewY) {
						return false;
					}

					skewX = x;
					skewY = y;

					recompute();
					return true;
				},
				type: [
					'number',
					'number'
				]
			},
			skewX: {
				get: function () {
					return skewX;
				},
				set: function (x) {
					if (x === skewX) {
						return false;
					}

					skewX = x;

					recompute();
					return true;
				},
				type: 'number'
			},
			skewY: {
				get: function () {
					return skewY;
				},
				set: function (y) {
					if (y === skewY) {
						return false;
					}

					skewY = y;

					recompute();
					return true;
				},
				type: 'number'
			},
			scale: {
				method: function (x, y) {
					var newX, newY;

					if (isNaN(x)) {
						newX = scaleX;
					} else {
						newX = x;
					}

					/*
                        if only one value is specified, set both x and y to the same scale
                        */
					if (isNaN(y)) {
						if (isNaN(x)) {
							return false;
						}

						newY = newX;
					} else {
						newY = y;
					}

					if (newX === scaleX && newY === scaleY) {
						return false;
					}

					scaleX = newX;
					scaleY = newY;

					recompute();
					return true;
				},
				type: [
					'number',
					'number'
				]
			},
			scaleX: {
				get: function () {
					return scaleX;
				},
				set: function (x) {
					if (x === scaleX) {
						return false;
					}

					scaleX = x;

					recompute();
					return true;
				},
				type: 'number'
			},
			scaleY: {
				get: function () {
					return scaleY;
				},
				set: function (y) {
					if (y === scaleY) {
						return false;
					}

					scaleY = y;

					recompute();
					return true;
				},
				type: 'number'
			}
		}
	};
}, {
	title: '2D Transform',
	description: 'Translate, Rotate, Scale, Skew'
});

const mat4$5 = Seriously$1.util.mat4;

/*
 * 3D transform
 * - translate
 * - rotate (degrees)
 * - scale
 */
Seriously$1.transform('3d', function (options) {
	let me = this,
		degrees = !(options && options.radians),
		centerX = 0,
		centerY = 0,
		centerZ = 0,
		scaleX = 1,
		scaleY = 1,
		scaleZ = 1,
		translateX = 0,
		translateY = 0,
		translateZ = 0,
		rotationX = 0,
		rotationY = 0,
		rotationZ = 0,
		rotationOrder = 'XYZ';

	function recompute() {
		let matrix = me.matrix,
			s, c,
			m00,
			m01,
			m02,
			m03,
			m10,
			m11,
			m12,
			m13,
			m20,
			m21,
			m22,
			m23;

		function translate(x, y, z) {
			matrix[12] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
			matrix[13] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
			matrix[14] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
			matrix[15] = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
		}

		function rotateX() {
			let angle;

			if (!rotationX) {
				return;
			}

			angle = -(degrees ? rotationX * Math.PI / 180 : rotationX);

			s = Math.sin(angle);
			c = Math.cos(angle);

			m10 = matrix[4];
			m11 = matrix[5];
			m12 = matrix[6];
			m13 = matrix[7];
			m20 = matrix[8];
			m21 = matrix[9];
			m22 = matrix[10];
			m23 = matrix[11];

			matrix[4] = m10 * c + m20 * s;
			matrix[5] = m11 * c + m21 * s;
			matrix[6] = m12 * c + m22 * s;
			matrix[7] = m13 * c + m23 * s;
			matrix[8] = m20 * c - m10 * s;
			matrix[9] = m21 * c - m11 * s;
			matrix[10] = m22 * c - m12 * s;
			matrix[11] = m23 * c - m13 * s;
		}

		function rotateY() {
			let angle;

			if (!rotationY) {
				return;
			}

			angle = -(degrees ? rotationY * Math.PI / 180 : rotationY);

			s = Math.sin(angle);
			c = Math.cos(angle);

			m00 = matrix[0];
			m01 = matrix[1];
			m02 = matrix[2];
			m03 = matrix[3];
			m20 = matrix[8];
			m21 = matrix[9];
			m22 = matrix[10];
			m23 = matrix[11];

			matrix[0] = m00 * c - m20 * s;
			matrix[1] = m01 * c - m21 * s;
			matrix[2] = m02 * c - m22 * s;
			matrix[3] = m03 * c - m23 * s;
			matrix[8] = m00 * s + m20 * c;
			matrix[9] = m01 * s + m21 * c;
			matrix[10] = m02 * s + m22 * c;
			matrix[11] = m03 * s + m23 * c;
		}

		function rotateZ() {
			let angle;

			if (!rotationZ) {
				return;
			}

			angle = -(degrees ? rotationZ * Math.PI / 180 : rotationZ);

			s = Math.sin(angle);
			c = Math.cos(angle);

			m00 = matrix[0];
			m01 = matrix[1];
			m02 = matrix[2];
			m03 = matrix[3];
			m10 = matrix[4];
			m11 = matrix[5];
			m12 = matrix[6];
			m13 = matrix[7];

			matrix[0] = m00 * c + m10 * s;
			matrix[1] = m01 * c + m11 * s;
			matrix[2] = m02 * c + m12 * s;
			matrix[3] = m03 * c + m13 * s;
			matrix[4] = m10 * c - m00 * s;
			matrix[5] = m11 * c - m01 * s;
			matrix[6] = m12 * c - m02 * s;
			matrix[7] = m13 * c - m03 * s;
		}

		if (!translateX &&
			!translateY &&
			!translateZ &&
			!rotationX &&
			!rotationY &&
			!rotationZ &&
			scaleX === 1 &&
			scaleY === 1 &&
			scaleZ === 1
		) {
			me.transformed = false;
			return;
		}

		//calculate transformation matrix
		mat4$5.identity(matrix);

		translate(translateX + centerX, translateY + centerY, translateZ + centerZ);

		if (rotationOrder === 'XYZ') {
			rotateX();
			rotateY();
			rotateZ();
		} else if (rotationOrder === 'XZY') {
			rotateX();
			rotateZ();
			rotateY();
		} else if (rotationOrder === 'YXZ') {
			rotateY();
			rotateX();
			rotateZ();
		} else if (rotationOrder === 'YZX') {
			rotateY();
			rotateZ();
			rotateX();
		} else if (rotationOrder === 'ZXY') {
			rotateZ();
			rotateX();
			rotateY();
		} else { //ZYX
			rotateZ();
			rotateY();
			rotateX();
		}

		//scale
		if (scaleX !== 1) {
			matrix[0] *= scaleX;
			matrix[1] *= scaleX;
			matrix[2] *= scaleX;
			matrix[3] *= scaleX;
		}
		if (scaleY !== 1) {
			matrix[4] *= scaleY;
			matrix[5] *= scaleY;
			matrix[6] *= scaleY;
			matrix[7] *= scaleY;
		}
		if (scaleZ !== 1) {
			matrix[8] *= scaleZ;
			matrix[9] *= scaleZ;
			matrix[10] *= scaleZ;
			matrix[11] *= scaleZ;
		}

		translate(-centerX, -centerY, -centerZ);

		me.transformed = true;
	}

	return {
		inputs: {
			reset: {
				method: function () {
					centerX = 0;
					centerY = 0;
					centerZ = 0;
					scaleX = 1;
					scaleY = 1;
					scaleZ = 1;
					translateX = 0;
					translateY = 0;
					translateZ = 0;
					rotationX = 0;
					rotationY = 0;
					rotationZ = 0;

					if (me.transformed) {
						me.transformed = false;
						return true;
					}

					return false;
				}
			},
			translate: {
				method: function (x, y, z) {
					if (isNaN(x)) {
						x = translateX;
					}

					if (isNaN(y)) {
						y = translateY;
					}

					if (isNaN(z)) {
						z = translateZ;
					}

					if (x === translateX && y === translateY && z === translateZ) {
						return false;
					}

					translateX = x;
					translateY = y;
					translateZ = z;

					recompute();
					return true;
				},
				type: [
					'number',
					'number',
					'number'
				]
			},
			translateX: {
				get: function () {
					return translateX;
				},
				set: function (x) {
					if (x === translateX) {
						return false;
					}

					translateX = x;

					recompute();
					return true;
				},
				type: 'number'
			},
			translateY: {
				get: function () {
					return translateY;
				},
				set: function (y) {
					if (y === translateY) {
						return false;
					}

					translateY = y;

					recompute();
					return true;
				},
				type: 'number'
			},
			translateZ: {
				get: function () {
					return translateZ;
				},
				set: function (z) {
					if (z === translateZ) {
						return false;
					}

					translateZ = z;

					recompute();
					return true;
				},
				type: 'number'
			},
			rotationOrder: {
				get: function () {
					return rotationOrder;
				},
				set: function (order) {
					if (order === rotationOrder) {
						return false;
					}

					rotationOrder = order;

					recompute();
					return true;
				},
				type: 'number'
			},
			rotationX: {
				get: function () {
					return rotationX;
				},
				set: function (angle) {
					if (angle === rotationX) {
						return false;
					}

					//todo: fmod 360deg or Math.PI * 2 radians
					rotationX = angle;

					recompute();
					return true;
				},
				type: 'number'
			},
			rotationY: {
				get: function () {
					return rotationY;
				},
				set: function (angle) {
					if (angle === rotationY) {
						return false;
					}

					//todo: fmod 360deg or Math.PI * 2 radians
					rotationY = angle;

					recompute();
					return true;
				},
				type: 'number'
			},
			rotationZ: {
				get: function () {
					return rotationZ;
				},
				set: function (angle) {
					if (angle === rotationZ) {
						return false;
					}

					//todo: fmod 360deg or Math.PI * 2 radians
					rotationZ = angle;

					recompute();
					return true;
				},
				type: 'number'
			},
			center: {
				method: function (x, y, z) {
					if (isNaN(x)) {
						x = centerX;
					}

					if (isNaN(y)) {
						y = centerY;
					}

					if (isNaN(z)) {
						z = centerZ;
					}

					if (x === centerX && y === centerY && z === centerZ) {
						return false;
					}

					centerX = x;
					centerY = y;
					centerZ = z;

					recompute();
					return true;
				},
				type: [
					'number',
					'number',
					'number'
				]
			},
			centerX: {
				get: function () {
					return centerX;
				},
				set: function (x) {
					if (x === centerX) {
						return false;
					}

					centerX = x;

					recompute();
					return true;
				},
				type: 'number'
			},
			centerY: {
				get: function () {
					return centerY;
				},
				set: function (y) {
					if (y === centerY) {
						return false;
					}

					centerY = y;

					recompute();
					return true;
				},
				type: 'number'
			},
			centerZ: {
				get: function () {
					return centerZ;
				},
				set: function (z) {
					if (z === centerZ) {
						return false;
					}

					centerZ = z;

					recompute();
					return true;
				},
				type: 'number'
			},
			scale: {
				method: function (x, y, z) {
					var newX, newY, newZ;

					if (isNaN(x)) {
						newX = scaleX;
					} else {
						newX = x;
					}

					/*
					 * if only one value is specified, set all to the same scale
					 */
					if (isNaN(y)) {
						if (!isNaN(x) && isNaN(z)) {
							newY = newX;
							newZ = newX;
						} else {
							newY = scaleY;
						}
					} else {
						newY = y;
					}

					if (isNaN(z)) {
						if (newZ === undefined) {
							newZ = scaleZ;
						}
					} else {
						newZ = z;
					}

					if (newX === scaleX && newY === scaleY && newZ === scaleZ) {
						return false;
					}

					scaleX = newX;
					scaleY = newY;
					scaleZ = newZ;

					recompute();
					return true;
				},
				type: [
					'number',
					'number',
					'number'
				]
			},
			scaleX: {
				get: function () {
					return scaleX;
				},
				set: function (x) {
					if (x === scaleX) {
						return false;
					}

					scaleX = x;

					recompute();
					return true;
				},
				type: 'number'
			},
			scaleY: {
				get: function () {
					return scaleY;
				},
				set: function (y) {
					if (y === scaleY) {
						return false;
					}

					scaleY = y;

					recompute();
					return true;
				},
				type: 'number'
			},
			scaleZ: {
				get: function () {
					return scaleZ;
				},
				set: function (z) {
					if (z === scaleZ) {
						return false;
					}

					scaleZ = z;

					recompute();
					return true;
				},
				type: 'number'
			}
		}
	};
}, {
	title: '3D Transform',
	description: 'Translate, Rotate, Scale'
});

/*!
 * Adapted from blend mode shader by Romain Dura
 * http://mouaif.wordpress.com/2009/01/05/photoshop-math-with-glsl-shaders/
 */

function vectorBlendFormula(formula, base, blend) {
	function replace(channel) {
		const r = {
			base: (base || 'base') + '.' + channel,
			blend: (blend || 'blend') + '.' + channel
		};
		return function (match) {
			return r[match] || match;
		};
	}

	return 'vec3(' +
		formula.replace(/blend|base/g, replace('r')) + ', ' +
		formula.replace(/blend|base/g, replace('g')) + ', ' +
		formula.replace(/blend|base/g, replace('b')) +
		')';
}

const blendModes = {
		normal: 'blend',
		lighten: 'max(blend, base)',
		darken: 'min(blend, base)',
		multiply: '(base * blend)',
		average: '(base + blend / TWO)',
		add: 'min(base + blend, ONE)',
		subtract: 'max(base - blend, ZERO)',
		divide: 'base / blend',
		difference: 'abs(base - blend)',
		negation: '(ONE - abs(ONE - base - blend))',
		exclusion: '(base + blend - TWO * base * blend)',
		screen: '(ONE - ((ONE - base) * (ONE - blend)))',
		lineardodge: 'min(base + blend, ONE)',
		phoenix: '(min(base, blend) - max(base, blend) + ONE)',
		linearburn: 'max(base + blend - ONE, ZERO)', //same as subtract?

		hue: 'BlendHue(base, blend)',
		saturation: 'BlendSaturation(base, blend)',
		color: 'BlendColor(base, blend)',
		luminosity: 'BlendLuminosity(base, blend)',
		darkercolor: 'BlendDarkerColor(base, blend)',
		lightercolor: 'BlendLighterColor(base, blend)',

		overlay: vectorBlendFormula('base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend))'),
		softlight: vectorBlendFormula('blend < 0.5 ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend))'),
		hardlight: vectorBlendFormula('base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend))', 'blend', 'base'),
		colordodge: vectorBlendFormula('blend == 1.0 ? blend : min(base / (1.0 - blend), 1.0)'),
		colorburn: vectorBlendFormula('blend == 0.0 ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0)'),
		linearlight: vectorBlendFormula('BlendLinearLightf(base, blend)'),
		vividlight: vectorBlendFormula('BlendVividLightf(base, blend)'),
		pinlight: vectorBlendFormula('BlendPinLightf(base, blend)'),
		hardmix: vectorBlendFormula('BlendHardMixf(base, blend)'),
		reflect: vectorBlendFormula('BlendReflectf(base, blend)'),
		glow: vectorBlendFormula('BlendReflectf(blend, base)')
	};
const mixAlpha = {
		normal: true
	};

Seriously$1.plugin('accumulator', function () {
	let drawOpts = {
			clear: false
		},
		frameBuffers,
		fbIndex = 0,
		me = this,
		width = this.width,
		height = this.height;

	function clear() {
		let gl = me.gl,
			width = me.width,
			height = me.height,
			color = me.inputs.startColor;

		if (gl && width && height) {
			gl.viewport(0, 0, width, height);
			gl.clearColor.apply(gl, color);

			gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[0].frameBuffer);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[1].frameBuffer);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		}
	}

	return {
		initialize: function (initialize, gl) {
			initialize();
			frameBuffers = [
				this.frameBuffer,
				new Seriously$1.util.FrameBuffer(gl, this.width, this.height)
			];
			clear();
		},
		shader: function (inputs, shaderSource) {
			let mode = inputs.blendMode || 'normal';
			mode = mode.toLowerCase();

			shaderSource.fragment = [
				'#define SHADER_NAME seriously.accumulator.' + mode,
				'precision mediump float;',

				'const vec3 ZERO = vec3(0.0);',
				'const vec3 ONE = vec3(1.0);',
				'const vec3 HALF = vec3(0.5);',
				'const vec3 TWO = vec3(2.0);',

				'#define BlendAddf(base, blend)			min(base + blend, 1.0)',
				'#define BlendLinearDodgef(base, blend)	BlendAddf(base, blend)',
				'#define BlendLinearBurnf(base, blend)	max(base + blend - 1.0, 0.0)',
				'#define BlendLightenf(base, blend)		max(blend, base)',
				'#define BlendDarkenf(base, blend)		min(blend, base)',
				'#define BlendLinearLightf(base, blend)	(blend < 0.5 ? BlendLinearBurnf(base, (2.0 * blend)) : BlendLinearDodgef(base, (2.0 * (blend - 0.5))))',
				'#define BlendScreenf(base, blend)		(1.0 - ((1.0 - base) * (1.0 - blend)))',
				'#define BlendOverlayf(base, blend)		(base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)))',
				'#define BlendSoftLightf(base, blend)	((blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend)))',
				'#define BlendColorDodgef(base, blend)	((blend == 1.0) ? blend : min(base / (1.0 - blend), 1.0))',
				'#define BlendColorBurnf(base, blend)	((blend == 0.0) ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0))',
				'#define BlendVividLightf(base, blend)	((blend < 0.5) ? BlendColorBurnf(base, (2.0 * blend)) : BlendColorDodgef(base, (2.0 * (blend - 0.5))))',
				'#define BlendPinLightf(base, blend)	((blend < 0.5) ? BlendDarkenf(base, (2.0 * blend)) : BlendLightenf(base, (2.0 *(blend - 0.5))))',
				'#define BlendHardMixf(base, blend)		((BlendVividLightf(base, blend) < 0.5) ? 0.0 : 1.0)',
				'#define BlendReflectf(base, blend)		((blend == 1.0) ? blend : min(base * base / (1.0 - blend), 1.0))',

				/*
				Linear Light is another contrast-increasing mode
				If the blend color is darker than midgray, Linear Light darkens the image
				by decreasing the brightness. If the blend color is lighter than midgray,
				the result is a brighter image due to increased brightness.
				*/

				/*
				RGB/HSL conversion functions needed for Color, Saturation, Hue, Luminosity, etc.
				*/

				'vec3 RGBToHSL(vec3 color) {',
				'	vec3 hsl;', // init to 0 to avoid warnings ? (and reverse if + remove first part)

				'	float fmin = min(min(color.r, color.g), color.b);',    //Min. value of RGB
				'	float fmax = max(max(color.r, color.g), color.b);',    //Max. value of RGB
				'	float delta = fmax - fmin;',             //Delta RGB value

				'	hsl.z = (fmax + fmin) / 2.0;', // Luminance

				'	if (delta == 0.0) {',		//This is a gray, no chroma...
				'		hsl.x = 0.0;',	// Hue
				'		hsl.y = 0.0;',	// Saturation
				'	} else {',                                    //Chromatic data...
				'		if (hsl.z < 0.5)',
				'			hsl.y = delta / (fmax + fmin);', // Saturation
				'		else',
				'			hsl.y = delta / (2.0 - fmax - fmin);', // Saturation

				'		float deltaR = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;',
				'		float deltaG = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;',
				'		float deltaB = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;',

				'		if (color.r == fmax )',
				'			hsl.x = deltaB - deltaG;', // Hue
				'		else if (color.g == fmax)',
				'			hsl.x = (1.0 / 3.0) + deltaR - deltaB;', // Hue
				'		else if (color.b == fmax)',
				'			hsl.x = (2.0 / 3.0) + deltaG - deltaR;', // Hue

				'		if (hsl.x < 0.0)',
				'			hsl.x += 1.0;', // Hue
				'		else if (hsl.x > 1.0)',
				'			hsl.x -= 1.0;', // Hue
				'	}',

				'	return hsl;',
				'}',

				'float HueToRGB(float f1, float f2, float hue) {',
				'	if (hue < 0.0)',
				'		hue += 1.0;',
				'	else if (hue > 1.0)',
				'		hue -= 1.0;',
				'	float res;',
				'	if ((6.0 * hue) < 1.0)',
				'		res = f1 + (f2 - f1) * 6.0 * hue;',
				'	else if ((2.0 * hue) < 1.0)',
				'		res = f2;',
				'	else if ((3.0 * hue) < 2.0)',
				'		res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;',
				'	else',
				'		res = f1;',
				'	return res;',
				'}',

				'vec3 HSLToRGB(vec3 hsl) {',
				'	vec3 rgb;',

				'	if (hsl.y == 0.0)',
				'		rgb = vec3(hsl.z);', // Luminance
				'	else {',
				'		float f2;',

				'		if (hsl.z < 0.5)',
				'			f2 = hsl.z * (1.0 + hsl.y);',
				'		else',
				'			f2 = (hsl.z + hsl.y) - (hsl.y * hsl.z);',

				'		float f1 = 2.0 * hsl.z - f2;',

				'		rgb.r = HueToRGB(f1, f2, hsl.x + (1.0/3.0));',
				'		rgb.g = HueToRGB(f1, f2, hsl.x);',
				'		rgb.b= HueToRGB(f1, f2, hsl.x - (1.0/3.0));',
				'	}',

				'	return rgb;',
				'}',

				// Hue Blend mode creates the result color by combining the luminance and saturation of the base color with the hue of the blend color.
				'vec3 BlendHue(vec3 base, vec3 blend) {',
				'	vec3 baseHSL = RGBToHSL(base);',
				'	return HSLToRGB(vec3(RGBToHSL(blend).r, baseHSL.g, baseHSL.b));',
				'}',

				// Saturation Blend mode creates the result color by combining the luminance and hue of the base color with the saturation of the blend color.
				'vec3 BlendSaturation(vec3 base, vec3 blend) {',
				'	vec3 baseHSL = RGBToHSL(base);',
				'	return HSLToRGB(vec3(baseHSL.r, RGBToHSL(blend).g, baseHSL.b));',
				'}',

				// Color Mode keeps the brightness of the base color and applies both the hue and saturation of the blend color.
				'vec3 BlendColor(vec3 base, vec3 blend) {',
				'	vec3 blendHSL = RGBToHSL(blend);',
				'	return HSLToRGB(vec3(blendHSL.r, blendHSL.g, RGBToHSL(base).b));',
				'}',

				// Luminosity Blend mode creates the result color by combining the hue and saturation of the base color with the luminance of the blend color.
				'vec3 BlendLuminosity(vec3 base, vec3 blend) {',
				'	vec3 baseHSL = RGBToHSL(base);',
				'	return HSLToRGB(vec3(baseHSL.r, baseHSL.g, RGBToHSL(blend).b));',
				'}',

				// Compares the total of all channel values for the blend and base color and displays the higher value color.
				'vec3 BlendLighterColor(vec3 base, vec3 blend) {',
				'	float baseTotal = base.r + base.g + base.b;',
				'	float blendTotal = blend.r + blend.g + blend.b;',
				'	return blendTotal > baseTotal ? blend : base;',
				'}',

				// Compares the total of all channel values for the blend and base color and displays the lower value color.
				'vec3 BlendDarkerColor(vec3 base, vec3 blend) {',
				'	float baseTotal = base.r + base.g + base.b;',
				'	float blendTotal = blend.r + blend.g + blend.b;',
				'	return blendTotal < baseTotal ? blend : base;',
				'}',

				'#define BlendFunction(base, blend) ' + blendModes[mode],
				(mixAlpha[mode] ? '#define MIX_ALPHA' : ''),

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform sampler2D previous;',

				'uniform float opacity;',
				'uniform float blendGamma;',

				'vec3 BlendOpacity(vec4 base, vec4 blend, float opacity) {',
				//apply blend, then mix by (opacity * blend.a)
				'	vec3 blendedColor = BlendFunction(base.rgb, blend.rgb);',
				'	return mix(base.rgb, blendedColor, opacity * blend.a);',
				'}',

				'vec4 linear(vec4 color, vec3 gamma) {',
				'	return vec4(pow(color.rgb, gamma), color.a);',
				'}',

				'void main(void) {',
				'	vec3 exp = vec3(blendGamma);',
				'	vec4 topPixel = linear(texture2D(source, vTexCoord), exp);',
				'	vec4 bottomPixel = texture2D(previous, vTexCoord);',

				'	if (topPixel.a == 0.0) {',
				'		gl_FragColor = bottomPixel;',
				'	} else {',
				'		float alpha;',
				'#ifdef MIX_ALPHA',
				'		alpha = topPixel.a * opacity;',
				'		alpha = alpha + bottomPixel.a * (1.0 - alpha);',
				'#else',
				'		alpha = bottomPixel.a;',
				'#endif',
				'		bottomPixel = linear(bottomPixel, exp);',
				'		gl_FragColor = vec4(pow(BlendOpacity(bottomPixel, topPixel, opacity), 1.0 / exp), alpha);',
				'	}',
				'}'
			].join('\n');

			return shaderSource;
		},
		resize: function () {
			if (frameBuffers && (this.width !== width || this.height !== height)) {
				width = this.width;
				height = this.height;
				frameBuffers[0].resize(width, height);
				frameBuffers[1].resize(width, height);
				clear();
			}
		},
		draw: function (shader, model, uniforms, frameBuffer, draw) {
			var fb;

			// ping-pong textures
			this.uniforms.previous = this.frameBuffer.texture;
			fbIndex = (fbIndex + 1) % 2;
			fb = frameBuffers[fbIndex];
			this.frameBuffer = fb;
			this.texture = fb.texture;

			if (this.inputs.clear) {
				clear();
				draw(this.baseShader, model, uniforms, fb.frameBuffer, null);
				return;
			}

			draw(shader, model, uniforms, fb.frameBuffer, null, drawOpts);
		},
		destroy: function () {
			if (frameBuffers) {
				frameBuffers[0].destroy();
				frameBuffers[1].destroy();
				frameBuffers.length = 0;
			}
		}
	};
}, {
	inPlace: false,
	title: 'Accumulator',
	description: 'Draw on top of previous frame',
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		clear: {
			type: 'boolean',
			defaultValue: false
		},
		startColor: {
			type: 'color',
			defaultValue: [0, 0, 0, 0]
		},
		opacity: {
			type: 'number',
			uniform: 'opacity',
			defaultValue: 1,
			min: 0,
			max: 1
		},
		blendGamma: {
			type: 'number',
			uniform: 'blendGamma',
			defaultValue: 2.2,
			min: 0,
			max: 4
		},
		blendMode: {
			type: 'enum',
			shaderDirty: true,
			defaultValue: 'normal',
			options: [
				['normal', 'Normal'],
				['lighten', 'Lighten'],
				['darken', 'Darken'],
				['multiply', 'Multiply'],
				['average', 'Average'],
				['add', 'Add'],
				['subtract', 'Subtract'],
				['divide', 'Divide'],
				['difference', 'Difference'],
				['negation', 'Negation'],
				['exclusion', 'Exclusion'],
				['screen', 'Screen'],
				['overlay', 'Overlay'],
				['softlight', 'Soft Light'],
				['hardlight', 'Hard Light'],
				['colordodge', 'Color Dodge'],
				['colorburn', 'Color Burn'],
				['lineardodge', 'Linear Dodge'],
				['linearburn', 'Linear Burn'],
				['linearlight', 'Linear Light'],
				['vividlight', 'Vivid Light'],
				['pinlight', 'Pin Light'],
				['hardmix', 'Hard Mix'],
				['reflect', 'Reflect'],
				['glow', 'Glow'],
				['phoenix', 'Phoenix'],
				['hue', 'Hue'],
				['saturation', 'Saturation'],
				['color', 'color'],
				['luminosity', 'Luminosity'],
				['darkercolor', 'Darker Color'],
				['lightercolor', 'Lighter Color']
			]
		}
	}
});

Seriously$1.plugin('vignette', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float amount;',

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	vec2 pos = vTexCoord.xy - 0.5;',
			'	float vignette = 1.0 - (dot(pos, pos) * amount);',
			'	gl_FragColor = vec4(pixel.rgb * vignette, pixel.a);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: false,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			defaultValue: 1,
			min: 0
		}
	},
	title: 'Vignette',
	description: 'Vignette'
});

/*!
 * inspired by Evan Wallace (https://github.com/evanw/glfx.js)
 */

Seriously$1.plugin('hue-saturation', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.vertex = [
			'precision mediump float;',

			'attribute vec4 position;',
			'attribute vec2 texCoord;',

			'uniform vec2 resolution;',
			'uniform mat4 projection;',
			'uniform mat4 transform;',

			'uniform float hue;',
			'uniform float saturation;',

			'varying vec2 vTexCoord;',

			'varying vec3 weights;',

			'void main(void) {',
			'	float angle = hue * 3.14159265358979323846264;',
			'	float s = sin(angle);',
			'	float c = cos(angle);',
			'	weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;',

			// first convert to screen space
			'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
			'	screenPosition = transform * screenPosition;',

			// convert back to OpenGL coords
			'	gl_Position = screenPosition;',
			'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
			'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
			'	vTexCoord = texCoord;',
			'}'
		].join('\n');
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'varying vec3 weights;',

			'uniform sampler2D source;',
			'uniform float hue;',
			'uniform float saturation;',

			'void main(void) {',
			'	vec4 color = texture2D(source, vTexCoord);',

			//adjust hue
			'	float len = length(color.rgb);',
			'	color.rgb = vec3(' +
			'dot(color.rgb, weights.xyz), ' +
			'dot(color.rgb, weights.zxy), ' +
			'dot(color.rgb, weights.yzx) ' +
			');',

			//adjust saturation
			'	vec3 adjustment = (color.r + color.g + color.b) / 3.0 - color.rgb;',
			'	if (saturation > 0.0) {',
			'		adjustment *= (1.0 - 1.0 / (1.0 - saturation));',
			'	} else {',
			'		adjustment *= (-saturation);',
			'	}',
			'	color.rgb += adjustment;',

			'	gl_FragColor = color;',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		hue: {
			type: 'number',
			uniform: 'hue',
			defaultValue: 0.4,
			min: -1,
			max: 1
		},
		saturation: {
			type: 'number',
			uniform: 'saturation',
			defaultValue: 0,
			min: -1,
			max: 1
		}
	},
	title: 'Hue/Saturation',
	description: 'Rotate hue and multiply saturation.'
});

Seriously$1.plugin('split', function () {
	let baseShader,
		resolutionA = [1, 1],
		resolutionB = [1, 1];

	// custom resize method
	this.resize = function () {
		let width,
			height,
			mode = this.inputs.sizeMode,
			node,
			fn,
			i,
			sourceA = this.inputs.sourceA,
			sourceB = this.inputs.sourceB;

		if (mode === 'a' || mode === 'b') {
			node = mode === 'a' ? sourceA : sourceB;
			if (node) {
				width = node.width;
				height = node.height;
			} else {
				width = 1;
				height = 1;
			}
		} else {
			if (sourceA) {
				if (sourceB) {
					fn = (mode === 'union' ? Math.max : Math.min);
					width = fn(sourceA.width, sourceB.width);
					height = fn(sourceA.height, sourceB.height);
				} else {
					width = sourceA.width;
					height = sourceA.height;
				}
			} else if (sourceB) {
				width = sourceB.width;
				height = sourceB.height;
			} else {
				width = 1;
				height = 1;
			}
		}

		if (this.width !== width || this.height !== height) {
			this.width = width;
			this.height = height;

			this.uniforms.resolution[0] = width;
			this.uniforms.resolution[1] = height;

			if (this.frameBuffer) {
				this.frameBuffer.resize(width, height);
			}

			this.emit('resize');
			this.setDirty();
		}

		if (sourceA) {
			resolutionA[0] = sourceA.width;
			resolutionA[1] = sourceA.height;
		}
		if (sourceB) {
			resolutionB[0] = sourceB.width;
			resolutionB[1] = sourceB.height;
		}

		for (i = 0; i < this.targets.length; i++) {
			this.targets[i].resize();
		}
	};

	return {
		initialize: function (initialize) {
			initialize();
			this.uniforms.resolutionA = resolutionA;
			this.uniforms.resolutionB = resolutionB;
			baseShader = this.baseShader;
		},
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform vec2 resolutionA;',
				'uniform vec2 resolutionB;',
				'uniform mat4 projection;',
				//'uniform mat4 transform;',

				'varying vec2 vTexCoord;',
				'varying vec2 vTexCoordA;',
				'varying vec2 vTexCoordB;',

				'uniform float angle;',
				'varying float c;',
				'varying float s;',
				'varying float t;',

				'void main(void) {',
				'   c = cos(angle);',
				'   s = sin(angle);',
				'	t = abs(c + s);',

				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				//'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	gl_Position.w = screenPosition.w;',

				'	vec2 adjustedTexCoord = (texCoord - 0.5) * resolution;',
				'	vTexCoordA = adjustedTexCoord / resolutionA + 0.5;',
				'	vTexCoordB = adjustedTexCoord / resolutionB + 0.5;',
				'	vTexCoord = texCoord;',
				'}'
			].join('\n');
			shaderSource.fragment = [
				'precision mediump float;\n',

				'varying vec2 vTexCoord;',
				'varying vec2 vTexCoordA;',
				'varying vec2 vTexCoordB;',

				'varying float c;',
				'varying float s;',
				'varying float t;',

				'uniform sampler2D sourceA;',
				'uniform sampler2D sourceB;',
				'uniform float split;',
				'uniform float angle;',
				'uniform float fuzzy;',
				'uniform float blendGamma;',

				'vec4 textureLookup(sampler2D tex, vec2 texCoord, vec3 exp) {',
				'	if (any(lessThan(texCoord, vec2(0.0))) || any(greaterThan(texCoord, vec2(1.0)))) {',
				'		return vec4(0.0);',
				'	} else {',
				'		vec4 pixel = texture2D(tex, texCoord);',
				'		pixel.rgb = pow(pixel.rgb, exp);',
				'		return pixel;',
				'	}',
				'}',

				'void main(void) {',
				'	vec3 exp = vec3(blendGamma);',
				'	vec4 pixel1 = textureLookup(sourceA, vTexCoordA, exp);',
				'	vec4 pixel2 = textureLookup(sourceB, vTexCoordB, exp);',
				'	float mn = (split - fuzzy * (1.0 - split));',
				'	float mx = (split + fuzzy * split);;',
				'	vec2 coords = vTexCoord - vec2(0.5);',
				'	coords = vec2(coords.x * c - coords.y * s, coords.x * s + coords.y * c);',
				'	float scale = max(abs(c - s), abs(s + c));',
				'	coords /= scale;',
				'	coords += vec2(0.5);',
				'	float x = coords.x;',
				'	gl_FragColor = mix(pixel2, pixel1, smoothstep(mn, mx, x));',
				'	gl_FragColor.rgb = pow(gl_FragColor.rgb, 1.0 / exp);',
				'}'
			].join('\n');

			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {
			if (uniforms.split >= 1) {
				uniforms.source = uniforms.sourceB;
				parent(baseShader, model, uniforms, frameBuffer);
				return;
			}

			if (uniforms.split <= 0) {
				uniforms.source = uniforms.sourceA;
				parent(baseShader, model, uniforms, frameBuffer);
				return;
			}

			parent(shader, model, uniforms, frameBuffer);
		},
		inPlace: false,
		requires: function (sourceName, inputs) {
			if (sourceName === 'sourceA' && inputs.split >= 1) {
				return false;
			}

			if (sourceName === 'sourceB' && inputs.split <= 0) {
				return false;
			}

			return true;
		}
	};
},
{
	inputs: {
		sourceA: {
			type: 'image',
			uniform: 'sourceA',
			shaderDirty: false,
			update: function () {
				this.resize();
			}
		},
		sourceB: {
			type: 'image',
			uniform: 'sourceB',
			shaderDirty: false,
			update: function () {
				this.resize();
			}
		},
		sizeMode: {
			type: 'enum',
			defaultValue: 'a',
			options: [
				'a',
				'b',
				'union',
				'intersection'
			],
			update: function () {
				this.resize();
			}
		},
		split: {
			type: 'number',
			uniform: 'split',
			defaultValue: 0.5,
			min: 0,
			max: 1,
			updateSources: true
		},
		angle: {
			type: 'number',
			uniform: 'angle',
			defaultValue: 0
		},
		fuzzy: {
			type: 'number',
			uniform: 'fuzzy',
			defaultValue: 0,
			min: 0,
			max: 1
		},
		blendGamma: {
			type: 'number',
			uniform: 'blendGamma',
			defaultValue: 2.2,
			min: 0,
			max: 4
		}
	},
	description: 'Split screen or wipe',
	title: 'Split'
});

/*!
 * Adapted from blend mode shader by Romain Dura
 * http://mouaif.wordpress.com/2009/01/05/photoshop-math-with-glsl-shaders/
 */

//todo: if transforms are used, do multiple passes and enable depth testing?
//todo: for now, only supporting float blend modes. Add complex ones
//todo: apply proper credit and license


function vectorBlendFormula$1(formula, base, blend) {
	function replace(channel) {
		const r = {
			base: (base || 'base') + '.' + channel,
			blend: (blend || 'blend') + '.' + channel
		};
		return function (match) {
			return r[match] || match;
		};
	}

	return 'vec3(' +
		formula.replace(/blend|base/g, replace('r')) + ', ' +
		formula.replace(/blend|base/g, replace('g')) + ', ' +
		formula.replace(/blend|base/g, replace('b')) +
		')';
}

const blendModes$1 = {
		normal: 'blend',
		lighten: 'max(blend, base)',
		darken: 'min(blend, base)',
		multiply: '(base * blend)',
		average: '(base + blend / TWO)',
		add: 'min(base + blend, ONE)',
		subtract: 'max(base - blend, ZERO)',
		divide: 'base / blend',
		difference: 'abs(base - blend)',
		negation: '(ONE - abs(ONE - base - blend))',
		exclusion: '(base + blend - TWO * base * blend)',
		screen: '(ONE - ((ONE - base) * (ONE - blend)))',
		lineardodge: 'min(base + blend, ONE)',
		phoenix: '(min(base, blend) - max(base, blend) + ONE)',
		linearburn: 'max(base + blend - ONE, ZERO)',

		hue: 'BlendHue(base, blend)',
		saturation: 'BlendSaturation(base, blend)',
		color: 'BlendColor(base, blend)',
		luminosity: 'BlendLuminosity(base, blend)',
		darkercolor: 'BlendDarkerColor(base, blend)',
		lightercolor: 'BlendLighterColor(base, blend)',

		overlay: vectorBlendFormula$1('base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend))'),
		softlight: vectorBlendFormula$1('blend < 0.5 ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend))'),
		hardlight: vectorBlendFormula$1('base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend))', 'blend', 'base'),
		colordodge: vectorBlendFormula$1('blend == 1.0 ? blend : min(base / (1.0 - blend), 1.0)'),
		colorburn: vectorBlendFormula$1('blend == 0.0 ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0)'),
		linearlight: vectorBlendFormula$1('BlendLinearLightf(base, blend)'),
		vividlight: vectorBlendFormula$1('BlendVividLightf(base, blend)'),
		pinlight: vectorBlendFormula$1('BlendPinLightf(base, blend)'),
		hardmix: vectorBlendFormula$1('BlendHardMixf(base, blend)'),
		reflect: vectorBlendFormula$1('BlendReflectf(base, blend)'),
		glow: vectorBlendFormula$1('BlendReflectf(blend, base)')
	};
const nativeBlendModes = {
		//native blend modes removed for now, because they don't work with linear blending
		// normal: ['FUNC_ADD', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'SRC_ALPHA', 'DST_ALPHA']
		//todo: add, multiply, screen
	};
const identity$2 = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);

Seriously$1.plugin('blend', function () {
	let topUniforms,
		bottomUniforms,
		topOpts = {
			clear: false
		},
		inputs,
		gl;

	function updateDrawFunction() {
		let nativeMode = inputs && nativeBlendModes[inputs.mode];

		if (nativeMode && gl) {
			topOpts.blendEquation = gl[nativeMode[0]];
			topOpts.srcRGB = gl[nativeMode[1]];
			topOpts.dstRGB = gl[nativeMode[2]];
			topOpts.srcAlpha = gl[nativeMode[3]];
			topOpts.dstAlpha = gl[nativeMode[4]];
		}
	}

	// custom resize method
	this.resize = function () {
		let width,
			height,
			mode = this.inputs.sizeMode,
			node,
			fn,
			i,
			bottom = this.inputs.bottom,
			top = this.inputs.top;

		if (mode === 'bottom' || mode === 'top') {
			node = this.inputs[mode];
			if (node) {
				width = node.width;
				height = node.height;
			} else {
				width = 1;
				height = 1;
			}
		} else {
			if (bottom) {
				if (top) {
					fn = (mode === 'union' ? Math.max : Math.min);
					width = fn(bottom.width, top.width);
					height = fn(bottom.height, top.height);
				} else {
					width = bottom.width;
					height = bottom.height;
				}
			} else if (top) {
				width = top.width;
				height = top.height;
			} else {
				width = 1;
				height = 1;
			}
		}

		if (this.width !== width || this.height !== height) {
			this.width = width;
			this.height = height;

			this.uniforms.resolution[0] = width;
			this.uniforms.resolution[1] = height;

			if (this.frameBuffer) {
				this.frameBuffer.resize(width, height);
			}

			this.emit('resize');
			this.setDirty();
		}

		this.uniforms.resBottom[0] = bottom && bottom.width || 1;
		this.uniforms.resBottom[1] = bottom && bottom.height || 1;
		this.uniforms.resTop[0] = top && top.width || 1;
		this.uniforms.resTop[1] = top && top.height || 1;

		if (topUniforms) {
			if (bottom) {
				bottomUniforms.resolution[0] = bottom.width;
				bottomUniforms.resolution[1] = bottom.height;
			}
			if (top) {
				topUniforms.resolution[0] = top.width;
				topUniforms.resolution[1] = top.height;
			}
		}

		for (i = 0; i < this.targets.length; i++) {
			this.targets[i].resize();
		}
	};

	this.uniforms.resTop = [1, 1];
	this.uniforms.resBottom = [1, 1];

	return {
		initialize: function (initialize) {
			inputs = this.inputs;
			initialize();
			gl = this.gl;
			updateDrawFunction();
		},
		shader: function (inputs, shaderSource) {
			let mode = inputs.mode || 'normal',
				node;
			mode = mode.toLowerCase();

			if (nativeBlendModes[mode]) {
				//todo: move this to an 'update' event for 'mode' input
				if (!topUniforms) {
					node = this.inputs.top;
					topUniforms = {
						resolution: [
							node && node.width || 1,
							node && node.height || 1
						],
						targetRes: this.uniforms.resolution,
						source: node,
						transform: node && node.cumulativeMatrix || identity$2,
						opacity: this.inputs.opacity
					};

					node = this.inputs.bottom;
					bottomUniforms = {
						resolution: [
							node && node.width || 1,
							node && node.height || 1
						],
						targetRes: this.uniforms.resolution,
						source: node,
						transform: node && node.cumulativeMatrix || identity$2,
						opacity: 1
					};
				}

				shaderSource.vertex = [
					'#define SHADER_NAME seriously.blend.' + mode,
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform vec2 targetRes;',
					'uniform mat4 transform;',

					'varying vec2 vTexCoord;',

					'void main(void) {',
					// first convert to screen space
					'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
					'	screenPosition = transform * screenPosition;',

					// convert back to OpenGL coords
					'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
					'	gl_Position.xy *= resolution / targetRes;',
					'	gl_Position.w = screenPosition.w;',
					'	vTexCoord = texCoord;',
					'}\n'
				].join('\n');

				shaderSource.fragment = [
					'#define SHADER_NAME seriously.blend.' + mode,
					'precision mediump float;',
					'varying vec2 vTexCoord;',
					'uniform sampler2D source;',
					'uniform float opacity;',
					'void main(void) {',
					'	if (vTexCoord.x < 0.0 || vTexCoord.x > 1.0 || vTexCoord.y < 0.0 || vTexCoord.y > 1.0) {',
					'		discard;',
					'	}',
					'	gl_FragColor = texture2D(source, vTexCoord);',
					'	gl_FragColor.a *= opacity;',
					'}'
				].join('\n');

				return shaderSource;
			}

			topUniforms = null;
			bottomUniforms = null;

			shaderSource.vertex = [
				'#define SHADER_NAME seriously.blend.' + mode,
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform vec2 resBottom;',
				'uniform vec2 resTop;',

				'varying vec2 texCoordBottom;',
				'varying vec2 texCoordTop;',

				'const vec2 HALF = vec2(0.5);',

				'void main(void) {',
				//we don't need to do a transform in this shader, since this effect is not "inPlace"
				'	gl_Position = position;',

				'	vec2 adjusted = (texCoord - HALF) * resolution;',

				'	texCoordBottom = adjusted / resBottom + HALF;',
				'	texCoordTop = adjusted / resTop + HALF;',
				'}'
			].join('\n');

			shaderSource.fragment = [
				'#define SHADER_NAME seriously.blend.' + mode,
				'precision mediump float;',

				'const vec3 ZERO = vec3(0.0);',
				'const vec3 ONE = vec3(1.0);',
				'const vec3 HALF = vec3(0.5);',
				'const vec3 TWO = vec3(2.0);',

				/*
				Linear Light is another contrast-increasing mode
				If the blend color is darker than midgray, Linear Light darkens the image
				by decreasing the brightness. If the blend color is lighter than midgray,
				the result is a brighter image due to increased brightness.
				*/

				'#define BlendAddf(base, blend)			min(base + blend, 1.0)',
				'#define BlendLinearDodgef(base, blend)	BlendAddf(base, blend)',
				'#define BlendLinearBurnf(base, blend)	max(base + blend - 1.0, 0.0)',
				'#define BlendLightenf(base, blend)		max(blend, base)',
				'#define BlendDarkenf(base, blend)		min(blend, base)',
				'#define BlendLinearLightf(base, blend)	(blend < 0.5 ? BlendLinearBurnf(base, (2.0 * blend)) : BlendLinearDodgef(base, (2.0 * (blend - 0.5))))',
				'#define BlendScreenf(base, blend)		(1.0 - ((1.0 - base) * (1.0 - blend)))',
				'#define BlendOverlayf(base, blend)		(base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)))',
				'#define BlendSoftLightf(base, blend)	((blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend)))',
				'#define BlendColorDodgef(base, blend)	((blend == 1.0) ? blend : min(base / (1.0 - blend), 1.0))',
				'#define BlendColorBurnf(base, blend)	((blend == 0.0) ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0))',
				'#define BlendVividLightf(base, blend)	((blend < 0.5) ? BlendColorBurnf(base, (2.0 * blend)) : BlendColorDodgef(base, (2.0 * (blend - 0.5))))',
				'#define BlendPinLightf(base, blend)	((blend < 0.5) ? BlendDarkenf(base, (2.0 * blend)) : BlendLightenf(base, (2.0 *(blend - 0.5))))',
				'#define BlendHardMixf(base, blend)		((BlendVividLightf(base, blend) < 0.5) ? 0.0 : 1.0)',
				'#define BlendReflectf(base, blend)		((blend == 1.0) ? blend : min(base * base / (1.0 - blend), 1.0))',

				/*
				RGB/HSL conversion functions needed for Color, Saturation, Hue, Luminosity, etc.
				*/

				'vec3 RGBToHSL(vec3 color) {',
				'	vec3 hsl;', // init to 0 to avoid warnings ? (and reverse if + remove first part)

				'	float fmin = min(min(color.r, color.g), color.b);',    //Min. value of RGB
				'	float fmax = max(max(color.r, color.g), color.b);',    //Max. value of RGB
				'	float delta = fmax - fmin;',             //Delta RGB value

				'	hsl.z = (fmax + fmin) / 2.0;', // Luminance

				'	if (delta == 0.0) {',		//This is a gray, no chroma...
				'		hsl.x = 0.0;',	// Hue
				'		hsl.y = 0.0;',	// Saturation
				'	} else {',                                    //Chromatic data...
				'		if (hsl.z < 0.5)',
				'			hsl.y = delta / (fmax + fmin);', // Saturation
				'		else',
				'			hsl.y = delta / (2.0 - fmax - fmin);', // Saturation

				'		float deltaR = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;',
				'		float deltaG = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;',
				'		float deltaB = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;',

				'		if (color.r == fmax )',
				'			hsl.x = deltaB - deltaG;', // Hue
				'		else if (color.g == fmax)',
				'			hsl.x = (1.0 / 3.0) + deltaR - deltaB;', // Hue
				'		else if (color.b == fmax)',
				'			hsl.x = (2.0 / 3.0) + deltaG - deltaR;', // Hue

				'		if (hsl.x < 0.0)',
				'			hsl.x += 1.0;', // Hue
				'		else if (hsl.x > 1.0)',
				'			hsl.x -= 1.0;', // Hue
				'	}',

				'	return hsl;',
				'}',

				'float HueToRGB(float f1, float f2, float hue) {',
				'	if (hue < 0.0)',
				'		hue += 1.0;',
				'	else if (hue > 1.0)',
				'		hue -= 1.0;',
				'	float res;',
				'	if ((6.0 * hue) < 1.0)',
				'		res = f1 + (f2 - f1) * 6.0 * hue;',
				'	else if ((2.0 * hue) < 1.0)',
				'		res = f2;',
				'	else if ((3.0 * hue) < 2.0)',
				'		res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;',
				'	else',
				'		res = f1;',
				'	return res;',
				'}',

				'vec3 HSLToRGB(vec3 hsl) {',
				'	vec3 rgb;',

				'	if (hsl.y == 0.0)',
				'		rgb = vec3(hsl.z);', // Luminance
				'	else {',
				'		float f2;',

				'		if (hsl.z < 0.5)',
				'			f2 = hsl.z * (1.0 + hsl.y);',
				'		else',
				'			f2 = (hsl.z + hsl.y) - (hsl.y * hsl.z);',

				'		float f1 = 2.0 * hsl.z - f2;',

				'		rgb.r = HueToRGB(f1, f2, hsl.x + (1.0/3.0));',
				'		rgb.g = HueToRGB(f1, f2, hsl.x);',
				'		rgb.b= HueToRGB(f1, f2, hsl.x - (1.0/3.0));',
				'	}',

				'	return rgb;',
				'}',

				// Hue Blend mode creates the result color by combining the luminance and saturation of the base color with the hue of the blend color.
				'vec3 BlendHue(vec3 base, vec3 blend) {',
				'	vec3 baseHSL = RGBToHSL(base);',
				'	return HSLToRGB(vec3(RGBToHSL(blend).r, baseHSL.g, baseHSL.b));',
				'}',

				// Saturation Blend mode creates the result color by combining the luminance and hue of the base color with the saturation of the blend color.
				'vec3 BlendSaturation(vec3 base, vec3 blend) {',
				'	vec3 baseHSL = RGBToHSL(base);',
				'	return HSLToRGB(vec3(baseHSL.r, RGBToHSL(blend).g, baseHSL.b));',
				'}',

				// Color Mode keeps the brightness of the base color and applies both the hue and saturation of the blend color.
				'vec3 BlendColor(vec3 base, vec3 blend) {',
				'	vec3 blendHSL = RGBToHSL(blend);',
				'	return HSLToRGB(vec3(blendHSL.r, blendHSL.g, RGBToHSL(base).b));',
				'}',

				// Luminosity Blend mode creates the result color by combining the hue and saturation of the base color with the luminance of the blend color.
				'vec3 BlendLuminosity(vec3 base, vec3 blend) {',
				'	vec3 baseHSL = RGBToHSL(base);',
				'	return HSLToRGB(vec3(baseHSL.r, baseHSL.g, RGBToHSL(blend).b));',
				'}',

				// Compares the total of all channel values for the blend and base color and displays the higher value color.
				'vec3 BlendLighterColor(vec3 base, vec3 blend) {',
				'	float baseTotal = base.r + base.g + base.b;',
				'	float blendTotal = blend.r + blend.g + blend.b;',
				'	return blendTotal > baseTotal ? blend : base;',
				'}',

				// Compares the total of all channel values for the blend and base color and displays the lower value color.
				'vec3 BlendDarkerColor(vec3 base, vec3 blend) {',
				'	float baseTotal = base.r + base.g + base.b;',
				'	float blendTotal = blend.r + blend.g + blend.b;',
				'	return blendTotal < baseTotal ? blend : base;',
				'}',

				'#define BlendFunction(base, blend) ' + blendModes$1[mode],

				'varying vec2 texCoordBottom;',
				'varying vec2 texCoordTop;',

				'uniform sampler2D top;',
				'uniform sampler2D bottom;',
				'uniform float opacity;',
				'uniform float blendGamma;',

				'vec3 BlendOpacity(vec4 base, vec4 blend, float opacity) {',
				//apply blend, then mix by (opacity * blend.a)
				'	vec3 blendedColor = BlendFunction(base.rgb, blend.rgb);',
				'	return mix(base.rgb, blendedColor, opacity * blend.a);',
				'}',

				'vec4 linear(vec4 color, vec3 gamma) {',
				'	return vec4(pow(color.rgb, gamma), color.a);',
				'}',

				'bool inBounds(vec2 uv) {',
				'	return uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0;',
				'}',

				'void main(void) {',
				'	vec3 exp = vec3(blendGamma);',
				'	vec4 topPixel = inBounds(texCoordTop) ? linear(texture2D(top, texCoordTop), exp) : vec4(0.0);',
				'	vec4 bottomPixel = inBounds(texCoordBottom) ? texture2D(bottom, texCoordBottom) : vec4(0.0);',

				'	if (topPixel.a == 0.0) {',
				'		gl_FragColor = bottomPixel;',
				'	} else {',
				'		bottomPixel = linear(bottomPixel, exp);',
				'		gl_FragColor = vec4(pow(BlendOpacity(bottomPixel, topPixel, opacity), 1.0 / exp), bottomPixel.a);',
				'	}',
				'}'
			].join('\n');

			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, draw) {
			if (nativeBlendModes[this.inputs.mode]) {
				if (this.inputs.bottom) {
					draw(shader, model, bottomUniforms, frameBuffer);
				} else {
					//just clear
					gl.viewport(0, 0, this.width, this.height);
					gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
					gl.clearColor(0.0, 0.0, 0.0, 0.0);
					gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				}

				if (this.inputs.top && this.inputs.opacity) {
					draw(shader, model, topUniforms, frameBuffer, null, topOpts);
				}
			} else {
				draw(shader, model, uniforms, frameBuffer);
			}
		},
		requires: function (sourceName) {
			if (!this.inputs.opacity && sourceName === 'top') {
				return false;
			}
			return true;
		},
		inputs: {
			top: {
				type: 'image',
				uniform: 'top',
				update: function () {
					if (topUniforms) {
						topUniforms.source = this.inputs.top;
						topUniforms.transform = this.inputs.top.cumulativeMatrix || identity$2;
					}
					this.resize();
				}
			},
			bottom: {
				type: 'image',
				uniform: 'bottom',
				update: function () {
					if (bottomUniforms) {
						bottomUniforms.source = this.inputs.bottom;
						bottomUniforms.transform = this.inputs.bottom.cumulativeMatrix || identity$2;
					}
					this.resize();
				}
			},
			opacity: {
				type: 'number',
				uniform: 'opacity',
				defaultValue: 1,
				min: 0,
				max: 1,
				updateSources: true,
				update: function (opacity) {
					if (topUniforms) {
						topUniforms.opacity = opacity;
					}
				}
			},
			blendGamma: {
				type: 'number',
				uniform: 'blendGamma',
				defaultValue: 2.2,
				min: 0,
				max: 4
			},
			sizeMode: {
				type: 'enum',
				defaultValue: 'bottom',
				options: [
					'bottom',
					'top',
					'union',
					'intersection'
				],
				update: function () {
					this.resize();
				}
			},
			mode: {
				type: 'enum',
				shaderDirty: true,
				defaultValue: 'normal',
				options: [
					['normal', 'Normal'],
					['lighten', 'Lighten'],
					['darken', 'Darken'],
					['multiply', 'Multiply'],
					['average', 'Average'],
					['add', 'Add'],
					['subtract', 'Subtract'],
					['divide', 'Divide'],
					['difference', 'Difference'],
					['negation', 'Negation'],
					['exclusion', 'Exclusion'],
					['screen', 'Screen'],
					['overlay', 'Overlay'],
					['softlight', 'Soft Light'],
					['hardlight', 'Hard Light'],
					['colordodge', 'Color Dodge'],
					['colorburn', 'Color Burn'],
					['lineardodge', 'Linear Dodge'],
					['linearburn', 'Linear Burn'],
					['linearlight', 'Linear Light'],
					['vividlight', 'Vivid Light'],
					['pinlight', 'Pin Light'],
					['hardmix', 'Hard Mix'],
					['reflect', 'Reflect'],
					['glow', 'Glow'],
					['phoenix', 'Phoenix'],
					['hue', 'Hue'],
					['saturation', 'Saturation'],
					['color', 'color'],
					['luminosity', 'Luminosity'],
					['darkercolor', 'Darker Color'],
					['lightercolor', 'Lighter Color']
				],
				update: function () {
					updateDrawFunction();
				}
			}
		}
	};
},
{
	inPlace: function () {
		return !!nativeBlendModes[this.inputs.mode];
	},
	description: 'Blend two layers',
	title: 'Blend'
});

/*!
 * Blur
 * Adapted from v002 by Anton Marini and Tom Butterworth
 * Copyright vade - Anton Marini
 * Creative Commons, Attribution - Non Commercial - Share Alike 3.0
 * http://v002.info/plugins/v002-blurs/
 */

let passes = [0.2, 0.3, 0.5, 0.8, 1];
let finalPass = passes.length - 1;
let horizontal = [1, 0];
let vertical = [0, 1];
let identity$3 = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);

Seriously$1.plugin('blur', function (options) {
	let fbHorizontal,
		fbVertical,
		baseShader,
		loopUniforms = {
			amount: 0,
			blendGamma: 2,
			inputScale: 1,
			resolution: [this.width, this.height],
			transform: identity$3,
			direction: null
		};

	return {
		initialize: function (parent) {
			const gl = this.gl;

			parent();

			if (!gl) {
				return;
			}

			baseShader = this.baseShader;

			fbHorizontal = new FrameBuffer(gl, this.width, this.height);
			fbVertical = new FrameBuffer(gl, this.width, this.height);
		},
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform mat4 transform;',

				'uniform vec2 direction;',
				'uniform float amount;',
				'uniform float inputScale;',

				'const vec2 zero = vec2(0.0);',

				'varying vec2 vTexCoord;',
				'varying vec2 vTexCoords[8];',

				'void main(void) {',
				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position = screenPosition;',
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	vTexCoord = texCoord;',

				'	vec2 one = vec2(inputScale);',
				'	if (inputScale < 1.0) {',
				'		one -= 1.0 / resolution;',
				'	}',

				'	vTexCoord = max(zero, min(one, texCoord * inputScale));',
				'	vec2 amount = direction * (inputScale * amount * 5.0 / resolution);',

				'	for (int i = 0; i < 4; i++) {',
				'		float s = pow(3.0, float(i));',
				'		vTexCoords[i * 2] = max(zero, min(one, vTexCoord + amount * s));',
				'		vTexCoords[i * 2 + 1] = max(zero, min(one, vTexCoord - amount * s));',
				'	}',
				'}'
			].join('\n');
			shaderSource.fragment = [
				'precision mediump float;\n',

				'uniform sampler2D source;',
				'uniform float blendGamma;',

				'varying vec2 vTexCoord;',
				'varying vec2 vTexCoords[8];',

				'vec3 exp;',

				'vec4 sample(sampler2D sampler, vec2 coord) {',
				'	vec4 pixel = texture2D(sampler, coord);',
				'	pixel.rgb = pow(pixel.rgb, exp);',
				'	return pixel;',
				'}',

				'void main(void) {',

				'	exp = vec3(blendGamma);',

				'	gl_FragColor = sample(source, vTexCoord) / 9.0;',

				'	for (int i = 0; i < 8; i++) {',
				'		gl_FragColor += sample(source, vTexCoords[i]) / 9.0;',
				'	}',

				'	gl_FragColor.rgb = pow(gl_FragColor.rgb, 1.0 / exp);',

				'}'
			].join('\n');

			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {
			let i,
				pass,
				amount,
				width,
				height,
				opts = {
					width: 0,
					height: 0,
					blend: false
				},
				previousPass = 1;

			amount = this.inputs.amount;
			if (!amount) {
				uniforms.source = this.inputs.source.texture;
				parent(baseShader, model, uniforms, frameBuffer);
				return;
			}

			if (amount <= 0.01) {
				//horizontal pass
				uniforms.inputScale = 1;
				uniforms.direction = horizontal;
				uniforms.source = this.inputs.source.texture;
				parent(shader, model, uniforms, fbHorizontal.frameBuffer);

				//vertical pass
				uniforms.direction = vertical;
				uniforms.source = fbHorizontal.texture;
				parent(shader, model, uniforms, frameBuffer);
				return;
			}

			loopUniforms.amount = amount;
			loopUniforms.blendGamma = uniforms.blendGamma;
			loopUniforms.source = this.inputs.source.texture;

			for (i = 0; i < passes.length; i++) {
				pass = Math.min(1, passes[i] / amount);
				width = Math.floor(pass * this.width);
				height = Math.floor(pass * this.height);

				loopUniforms.resolution[0] = width;
				loopUniforms.resolution[1] = height;
				loopUniforms.inputScale = previousPass;
				previousPass = pass;

				opts.width = width;
				opts.height = height;

				//horizontal pass
				loopUniforms.direction = horizontal;
				parent(shader, model, loopUniforms, fbHorizontal.frameBuffer, null, opts);

				//vertical pass
				loopUniforms.inputScale = pass;
				loopUniforms.source = fbHorizontal.texture;
				loopUniforms.direction = vertical;
				parent(shader, model, loopUniforms, i === finalPass ? frameBuffer : fbVertical.frameBuffer, null, opts);

				loopUniforms.source = fbVertical.texture;
			}
		},
		resize: function () {
			loopUniforms.resolution[0] = this.width;
			loopUniforms.resolution[1] = this.height;
			if (fbHorizontal) {
				fbHorizontal.resize(this.width, this.height);
				fbVertical.resize(this.width, this.height);
			}
		},
		destroy: function () {
			if (fbHorizontal) {
				fbHorizontal.destroy();
				fbVertical.destroy();
				fbHorizontal = null;
				fbVertical = null;
			}

			loopUniforms = null;
		}
	};
},
{
	inputs: {
		source: {
			type: 'image',
			shaderDirty: false
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			defaultValue: 0.2,
			min: 0,
			max: 1
		},
		blendGamma: {
			type: 'number',
			uniform: 'blendGamma',
			defaultValue: 2.2,
			min: 0,
			max: 4
		}
	},
	title: 'Gaussian Blur'
});

/*!
 * Directional Motion Blur
 * Adapted from v002 by Anton Marini and Tom Butterworth
 * Copyright vade - Anton Marini
 * Creative Commons, Attribution - Non Commercial - Share Alike 3.0
 * http://v002.info/plugins/v002-blurs/
 */

const passes$1 = [0.2, 0.3, 0.5, 0.8];
const identity$4 = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);

Seriously$1.plugin('directionblur', function (options) {
	let fbs,
		baseShader,
		loopUniforms = {
			amount: 0,
			blendGamma: 2,
			angle: 0,
			inputScale: 1,
			resolution: [this.width, this.height],
			transform: identity$4,
			projection: new Float32Array([
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				0, 0, 0, 1
			])
		};

	return {
		initialize: function (parent) {
			const gl = this.gl;

			parent();

			if (!gl) {
				return;
			}

			baseShader = this.baseShader;

			fbs = [
				new FrameBuffer(gl, this.width, this.height),
				new FrameBuffer(gl, this.width, this.height)
			];
		},
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform mat4 projection;',
				'uniform mat4 transform;',

				'uniform float angle;',
				'uniform float amount;',
				'uniform float inputScale;',

				'const vec2 zero = vec2(0.0);',

				'varying vec2 vTexCoord;',
				'varying vec2 vTexCoords[8];',

				'void main(void) {',
				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position = screenPosition;',
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	vTexCoord = texCoord;',

				'	vec2 one = vec2(inputScale);',
				'	if (inputScale < 1.0) {',
				'		one -= 1.0 / resolution;',
				'	}',
				'	vTexCoord = max(zero, min(one, texCoord * inputScale));',
				'	vec2 amount = vec2(cos(angle), sin(angle)) * amount * 5.0 / resolution;',

				'	for (int i = 0; i < 4; i++) {',
				'		float s = pow(3.0, float(i));',
				'		vTexCoords[i * 2] = max(zero, min(one, vTexCoord + amount * s));',
				'		vTexCoords[i * 2 + 1] = max(zero, min(one, vTexCoord - amount * s));',
				'	}',
				'}'
			].join('\n');
			shaderSource.fragment = [
				'precision mediump float;\n',

				'uniform lowp sampler2D source;',
				'uniform float blendGamma;',

				'varying vec2 vTexCoord;',
				'varying vec2 vTexCoords[8];',

				'vec3 exp;',

				'vec4 sample(lowp vec4 pixel) {',
				'	pixel.rgb = pow(pixel.rgb, exp);',
				'	return pixel;',
				'}',

				'void main(void) {',

				'	exp = vec3(blendGamma);',

				'	gl_FragColor = sample(texture2D(source, vTexCoord)) / 9.0;',

				'	for (int i = 0; i < 8; i++) {',
				'		gl_FragColor += sample(texture2D(source, vTexCoords[i])) / 9.0;',
				'	}',

				'	gl_FragColor.rgb = pow(gl_FragColor.rgb, 1.0 / exp);',

				'}'
			].join('\n');

			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {
			let i,
				fb,
				pass,
				amount,
				width,
				height,
				opts = {
					width: 0,
					height: 0,
					blend: false
				},
				previousPass = 1;

			amount = this.inputs.amount;
			if (!amount) {
				parent(baseShader, model, uniforms, frameBuffer);
				return;
			}

			if (amount <= 0.01) {
				parent(shader, model, uniforms, frameBuffer);
				return;
			}

			loopUniforms.amount = amount;
			loopUniforms.angle = this.inputs.angle;
			loopUniforms.projection[0] = this.height / this.width;

			for (i = 0; i < passes$1.length; i++) {
				pass = Math.min(1, passes$1[i] / amount);
				width = Math.floor(pass * this.width);
				height = Math.floor(pass * this.height);

				loopUniforms.source = fb ? fb.texture : this.inputs.source.texture;

				fb = fbs[i % 2];
				loopUniforms.inputScale = previousPass;//pass;
				previousPass = pass;
				opts.width = width;
				opts.height = height;

				parent(shader, model, loopUniforms, fb.frameBuffer, null, opts);
			}

			loopUniforms.source = fb.texture;
			loopUniforms.inputScale = previousPass;
			parent(shader, model, loopUniforms, frameBuffer);
		},
		resize: function () {
			loopUniforms.resolution[0] = this.width;
			loopUniforms.resolution[1] = this.height;
			if (fbs) {
				fbs[0].resize(this.width, this.height);
				fbs[1].resize(this.width, this.height);
			}
		},
		destroy: function () {
			if (fbs) {
				fbs[0].destroy();
				fbs[1].destroy();
				fbs = null;
			}

			if (baseShader) {
				baseShader.destroy();
			}

			loopUniforms = null;
		}
	};
},
{
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			defaultValue: 0.4,
			min: 0,
			max: 1
		},
		angle: {
			type: 'number',
			uniform: 'angle',
			defaultValue: 0
		},
		blendGamma: {
			type: 'number',
			uniform: 'blendGamma',
			defaultValue: 2.2,
			min: 0,
			max: 4
		}
	},
	title: 'Directional Motion Blur'
});

/*!
 * Adapted from http://rastergrid.com/blog/2011/01/frei-chen-edge-detector/
 */
let sqrt = Math.sqrt;
let i;
let j;
let flatMatrices = [];
let matrices;
let freiChenMatrixConstants;
let sobelMatrixConstants;

//initialize shader matrix arrays
function multiplyArray(factor, a) {
	for (let i = 0; i < a.length; i++) {
		a[i] *= factor;
	}
	return a;
}

matrices = [
	multiplyArray(1.0 / (2.0 * sqrt(2.0)), [1.0, sqrt(2.0), 1.0, 0.0, 0.0, 0.0, -1.0, -sqrt(2.0), -1.0]),
	multiplyArray(1.0 / (2.0 * sqrt(2.0)), [1.0, 0.0, -1.0, sqrt(2.0), 0.0, -sqrt(2.0), 1.0, 0.0, -1.0]),
	multiplyArray(1.0 / (2.0 * sqrt(2.0)), [0.0, -1.0, sqrt(2.0), 1.0, 0.0, -1.0, -sqrt(2.0), 1.0, 0.0]),
	multiplyArray(1.0 / (2.0 * sqrt(2.0)), [sqrt(2.0), -1.0, 0.0, -1.0, 0.0, 1.0, 0.0, 1.0, -sqrt(2.0)]),
	multiplyArray(1.0 / 2.0, [0.0, 1.0, 0.0, -1.0, 0.0, -1.0, 0.0, 1.0, 0.0]),
	multiplyArray(1.0 / 2.0, [-1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, -1.0]),
	multiplyArray(1.0 / 6.0, [1.0, -2.0, 1.0, -2.0, 4.0, -2.0, 1.0, -2.0, 1.0]),
	multiplyArray(1.0 / 6.0, [-2.0, 1.0, -2.0, 1.0, 4.0, 1.0, -2.0, 1.0, -2.0]),
	multiplyArray(1.0 / 3.0, [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0])
];

for (i = 0; i < matrices.length; i++) {
	for (j = 0; j < matrices[i].length; j++) {
		flatMatrices.push(matrices[i][j]);
	}
}

freiChenMatrixConstants = new Float32Array(flatMatrices);

sobelMatrixConstants = new Float32Array([
	1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0,
	1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0
]);

Seriously$1.plugin('edge', {
	initialize: function (initialize) {
		initialize();

		this.uniforms.pixelWidth = 1 / this.width;
		this.uniforms.pixelHeight = 1 / this.height;

		if (this.inputs.mode === 'sobel') {
			this.uniforms.G = sobelMatrixConstants;
		} else {
			this.uniforms.G = freiChenMatrixConstants;
		}
	},
	shader: function (inputs, shaderSource) {
		let defines;

		if (inputs.mode === 'sobel') {
			defines = '#define N_MATRICES 2\n' +
				'#define SOBEL\n';
		} else {
			//frei-chen
			defines = '#define N_MATRICES 9\n';
		}

		shaderSource.fragment = [
			defines,
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float pixelWidth;',
			'uniform float pixelHeight;',
			'uniform mat3 G[9];',

			'void main(void) {',
			'	mat3 I;',
			'	float dp3, cnv[9];',
			'	vec3 tc;',

			// fetch the 3x3 neighbourhood and use the RGB vector's length as intensity value
			'	float fi = 0.0, fj = 0.0;',
			'	for (int i = 0; i < 3; i++) {',
			'		fj = 0.0;',
			'		for (int j = 0; j < 3; j++) {',
			'			I[i][j] = length( ' +
			'texture2D(source, ' +
			'vTexCoord + vec2((fi - 1.0) * pixelWidth, (fj - 1.0) * pixelHeight)' +
			').rgb );',
			'			fj += 1.0;',
			'		};',
			'		fi += 1.0;',
			'	};',

			// calculate the convolution values for all the masks

			'	for (int i = 0; i < N_MATRICES; i++) {',
			'		dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);',
			'		cnv[i] = dp3 * dp3;',
			'	};',

			//Sobel
			'#ifdef SOBEL',
			'	tc = vec3(0.5 * sqrt(cnv[0]*cnv[0]+cnv[1]*cnv[1]));',
			'#else',

			//Frei-Chen
			// Line detector
			'	float M = (cnv[4] + cnv[5]) + (cnv[6] + cnv[7]);',
			'	float S = (cnv[0] + cnv[1]) + (cnv[2] + cnv[3]) + (cnv[4] + cnv[5]) + (cnv[6] + cnv[7]) + cnv[8];',
			'	tc = vec3(sqrt(M/S));',
			'#endif',

			'	gl_FragColor = vec4(tc, 1.0);',
			'}'
		].join('\n');

		return shaderSource;
	},
	resize: function () {
		this.uniforms.pixelWidth = 1 / this.width;
		this.uniforms.pixelHeight = 1 / this.height;
	},
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		mode: {
			type: 'enum',
			shaderDirty: true,
			defaultValue: 'sobel',
			options: [
				['sobel', 'Sobel'],
				['frei-chen', 'Frei-Chen']
			],
			update: function () {
				if (this.inputs.mode === 'sobel') {
					this.uniforms.G = sobelMatrixConstants;
				} else {
					this.uniforms.G = freiChenMatrixConstants;
				}
			}
		}
	},
	description: 'Edge Detect',
	title: 'Edge Detect'
});

const channelOptions = [
		'Red',
		'Green',
		'Blue',
		'Alpha'
	];
const channelLookup = {
		r: 0,
		g: 1,
		b: 2,
		a: 3,
		x: 0,
		y: 1,
		z: 2,
		w: 3
	};

Seriously$1.plugin('channels', function () {
	const sources = [],
		shaders = [],
		matrices = [],
		me = this;

	function validateChannel(value, input, name) {
		let val;
		if (typeof value === 'string') {
			val = value.charAt(0).toLowerCase();
			val = channelLookup[val];
			if (val === undefined) {
				val = -1;
			}
			if (val < 0) {
				val = parseFloat(value);
			}
		} else {
			val = value;
		}

		if (val === 0 || val === 1 || val === 2 || val === 3) {
			return val;
		}

		return me.inputs[name];
	}

	function updateChannels() {
		let inputs = me.inputs,
			i, j,
			source,
			matrix;

		for (i = 0; i < sources.length; i++) {
			source = sources[i];
			matrix = matrices[i];
			if (!matrix) {
				matrix = matrices[i] = [];
				me.uniforms['channels' + i] = matrix;
			}

			for (j = 0; j < 16; j++) {
				matrix[j] = 0;
			}

			matrix[inputs.red] = (inputs.redSource === source) ? 1 : 0;
			matrix[4 + inputs.green] = (inputs.greenSource === source) ? 1 : 0;
			matrix[8 + inputs.blue] = (inputs.blueSource === source) ? 1 : 0;
			matrix[12 + inputs.alpha] = (inputs.alphaSource === source) ? 1 : 0;
		}
	}

	function updateSources() {
		const inputs = me.inputs;

		function validateSource(name) {
			let s, j;
			s = inputs[name];
			if (!s) {
				s = me.sources[name] = inputs[name] = inputs.source;

				if (!s) {
					//no main source to fall back to
					return;
				}
			}

			j = sources.indexOf(s);
			if (j < 0) {
				j = sources.length;
				sources.push(s);
				me.uniforms['source' + j] = s;
			}
		}

		sources.length = 0;

		validateSource('redSource');
		validateSource('greenSource');
		validateSource('blueSource');
		validateSource('alphaSource');

		me.resize();

		updateChannels();
	}

	// custom resize method
	this.resize = function () {
		let width,
			height,
			mode = this.inputs.sizeMode,
			i,
			resolution,
			source;

		if (!sources.length) {
			width = 1;
			height = 1;
		} else if (sources.length === 1) {
			source = sources[0];
			width = source.width;
			height = source.height;
		} else if (mode === 'union') {
			width = 0;
			height = 0;
			for (i = 0; i < sources.length; i++) {
				source = sources[0];
				width = Math.max(width, source.width);
				height = Math.max(height, source.height);
			}
		} else if (mode === 'intersection') {
			width = Infinity;
			height = Infinity;
			for (i = 0; i < sources.length; i++) {
				source = sources[0];
				width = Math.min(width, source.width);
				height = Math.min(height, source.height);
			}
		} else {
			source = me.inputs[mode + 'Source'];
			if (source) {
				width = source.width;
				height = source.height;
			} else {
				width = 1;
				height = 1;
			}
		}

		for (i = 0; i < sources.length; i++) {
			source = sources[i];
			resolution = me.uniforms['resolution' + i];
			if (resolution) {
				resolution[0] = source.width;
				resolution[1] = source.height;
			} else {
				me.uniforms['resolution' + i] = [source.width, source.height];
			}
		}

		if (this.width !== width || this.height !== height) {
			this.width = width;
			this.height = height;

			this.uniforms.resolution[0] = width;
			this.uniforms.resolution[1] = height;

			if (this.frameBuffer) {
				this.frameBuffer.resize(width, height);
			}

			this.emit('resize');
			this.setDirty();
		}

		for (i = 0; i < this.targets.length; i++) {
			this.targets[i].resize();
		}
	};

	return {
		shader: function () {
			let i,
				frag,
				vert,
				shader,
				uniforms = '',
				samples = '',
				varyings = '',
				position = '';

			/*
			We'll restore this and the draw function below if we ever figure out a way to
			add/& multiple renders without screwing up the brightness
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',
				'uniform mat4 channels;',
				'uniform sampler2D source;',
				//'uniform sampler2D previous;',
				'void main(void) {',
				'	vec4 pixel;',
				'	if (any(lessThan(vTexCoord, vec2(0.0))) || any(greaterThanEqual(vTexCoord, vec2(1.0)))) {',
				'		pixel = vec4(0.0);',
				'	} else {',
				'		pixel = texture2D(source, vTexCoord) * channels;',
				//'		if (gl_FragColor.a == 0.0) gl_FragColor.a = 1.0;',
				'	}',
				'	gl_FragColor = pixel;',
				'}'
			].join('\n');

			return shaderSource;
			*/
			if (shaders[sources.length]) {
				return shaders[sources.length];
			}

			for (i = 0; i < sources.length; i++) {
				varyings += 'varying vec2 vTexCoord' + i + ';\n';

				uniforms += 'uniform sampler2D source' + i + ';\n' +
					'uniform mat4 channels' + i + ';\n' +
					'uniform vec2 resolution' + i + ';\n\n';

				position += '    vTexCoord' + i + ' = (position.xy * resolution / resolution' + i + ') * 0.5 + 0.5;\n';

				samples += '    if (all(greaterThanEqual(vTexCoord' + i + ', vec2(0.0))) && all(lessThan(vTexCoord' + i + ', vec2(1.0)))) {\n' +
					'        gl_FragColor += texture2D(source' + i + ', vTexCoord' + i + ') * channels' + i + ';\n    }\n';
			}

			vert = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				uniforms,

				varyings,

				'void main(void) {',
				position,
				'	gl_Position = position;',
				'}\n'
			].join('\n');

			frag = [
				'precision mediump float;',

				varyings,
				uniforms,

				'void main(void) {',
				'	gl_FragColor = vec4(0.0);',
				samples,
				'}'
			].join('\n');

			shader = new Seriously$1.util.ShaderProgram(this.gl,
				vert,
				frag);

			shaders[sources.length] = shader;
			return shader;
		},
		/*
		draw: function (shader, model, uniforms, frameBuffer, draw) {
			var i,
				source;

			options.clear = true;
			for (i = 0; i < sources.length; i++) {
			//for (i = sources.length - 1; i >= 0; i--) {
				uniforms.channels = matrices[i];
				source = sources[i];
				uniforms.source = sources[i];
				//uniforms.resolution[]

				draw(shader, model, uniforms, frameBuffer, null, options);
				options.clear = false;
			}
		},
		*/
		inputs: {
			sizeMode: {
				type: 'enum',
				defaultValue: 'red',
				options: [
					'red',
					'green',
					'blue',
					'alpha',
					'union',
					'intersection'
				],
				update: function () {
					this.resize();
				}
			},
			source: {
				type: 'image',
				update: updateSources,
				shaderDirty: true
			},
			redSource: {
				type: 'image',
				update: updateSources,
				shaderDirty: true
			},
			greenSource: {
				type: 'image',
				update: updateSources,
				shaderDirty: true
			},
			blueSource: {
				type: 'image',
				update: updateSources,
				shaderDirty: true
			},
			alphaSource: {
				type: 'image',
				update: updateSources,
				shaderDirty: true
			},
			red: {
				type: 'enum',
				options: channelOptions,
				validate: validateChannel,
				update: updateChannels,
				defaultValue: 0
			},
			green: {
				type: 'enum',
				options: channelOptions,
				validate: validateChannel,
				update: updateChannels,
				defaultValue: 1
			},
			blue: {
				type: 'enum',
				options: channelOptions,
				validate: validateChannel,
				update: updateChannels,
				defaultValue: 2
			},
			alpha: {
				type: 'enum',
				options: channelOptions,
				validate: validateChannel,
				update: updateChannels,
				defaultValue: 3
			}
		}
	};
},
{
	inPlace: false,
	title: 'Channel Mapping'
});

Seriously$1.plugin('color', function () {
	const me = this,
		drawOpts = {
			width: 1,
			height: 1
		};

	let colorDirty = true;

	function resize() {
		me.resize();
	}

	/*!
	 * Similar to the EffectNode prototype resize method, but does not resize the FrameBuffer
	 */
	this.resize = function () {
		let width,
			height,
			i,
			target;

		if (this.inputs && this.inputs.width) {
			width = this.inputs.width;
			height = this.inputs.height || width;
		} else if (this.inputs && this.inputs.height) {
			width = height = this.inputs.height;
		} else {
			width = 1;
			height = 1;
		}

		width = Math.floor(width);
		height = Math.floor(height);

		if (this.width !== width || this.height !== height) {
			this.width = width;
			this.height = height;

			this.emit('resize');
			this.setDirty();
		}

		for (i = 0; i < this.targets.length; i++) {
			target = this.targets[i];
			target.resize();
			if (target.setTransformDirty) {
				target.setTransformDirty();
			}
		}
	};

	return {
		initialize: function (initialize) {
			/*
			 * No reason to use anything bigger than 1x1, since it's a single color.
			 * This should make look-ups on this texture very fast
			 */
			this.frameBuffer = new FrameBuffer(this.gl, 1, 1);
			resize();
			colorDirty = true;
		},
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',

				'void main(void) {',
				'	gl_Position = position;',
				'}\n'
			].join('\n');
			shaderSource.fragment = [
				'precision mediump float;\n',

				'uniform vec4 color;',

				'void main(void) {',
				'	gl_FragColor = color;',
				'}'
			].join('\n');
			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, draw) {
			/*
			Node will be dirty if size changes, but we only need to redraw if
			the color changes...not that it matters much, since we're only drawing
			a single pixel.
			*/
			if (colorDirty) {
				draw(shader, model, uniforms, frameBuffer, null, drawOpts);
				colorDirty = false;
			}
		},
		inPlace: true,
		inputs: {
			color: {
				type: 'color',
				uniform: 'color',
				defaultValue: [0, 0, 0, 1],
				update: function () {
					colorDirty = true;
				}
			},
			width: {
				type: 'number',
				min: 0,
				step: 1,
				update: resize,
				defaultValue: 640
			},
			height: {
				type: 'number',
				min: 0,
				step: 1,
				update: resize,
				defaultValue: 360
			}
		}
	};
}, {
	title: 'Color',
	description: 'Generate color',
	categories: ['generator']
});

Seriously$1.plugin('linear-transfer', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec4 slope;',
			'uniform vec4 intercept;',

			'const vec3 half3 = vec3(0.5);',

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	gl_FragColor = pixel * slope + intercept;',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		slope: {
			type: 'vector',
			dimensions: 4,
			uniform: 'slope',
			defaultValue: [1, 1, 1, 1]
		},
		intercept: {
			type: 'vector',
			uniform: 'intercept',
			dimensions: 4,
			defaultValue: [0, 0, 0, 0]
		}
	},
	title: 'Linear Transfer',
	description: 'For each color channel: [slope] * [value] + [intercept]'
});

Seriously$1.plugin('lut', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		/*!
		 * Shader borrowed from Paul Golds @ BBC R&D, with permission
		 */
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform sampler2D lut;',
			'uniform float amount;',

			'void main(void) {',

			'	vec4 textureColor = texture2D(source, vTexCoord);',
			'	textureColor = clamp(textureColor, 0.0, 1.0);',

			'	float blueColor = textureColor.b * 63.0;',

			'	vec2 quad1;',
			'	quad1.y = floor(floor(blueColor) / 8.0);',
			'	quad1.x = floor(blueColor) - (quad1.y * 8.0);',

			'	vec2 quad2;',
			'	quad2.y = floor(ceil(blueColor) / 8.0);',
			'	quad2.x = ceil(blueColor) - (quad2.y * 8.0);',

			'	vec2 texPos1;',
			'	texPos1 = (quad1 * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.rg);',

			'	vec2 texPos2;',
			'	texPos2 = (quad2 * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.rg);',

			'	lowp vec4 newColor1 = texture2D(lut, vec2(texPos1.x, 1.0 - texPos1.y));',
			'	lowp vec4 newColor2 = texture2D(lut, vec2(texPos2.x, 1.0 - texPos2.y));',

			'	vec4 newColor = mix(newColor1, newColor2, fract(blueColor));',

			'	gl_FragColor = mix(textureColor, newColor, amount);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		lut: {
			type: 'image',
			uniform: 'lut'
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			min: 0,
			max: 1,
			defaultValue: 1
		}
	},
	title: 'Color Look-Up Table',
	description: ''
});

/*!
 * simplex noise shaders
 * https://github.com/ashima/webgl-noise
 * Copyright (C) 2011 by Ashima Arts (Simplex noise)
 * Copyright (C) 2011 by Stefan Gustavson (Classic noise)
 */

const noiseHelpers = '#ifndef NOISE_HELPERS\n' +
	'#define NOISE_HELPERS\n' +
	'vec2 mod289(vec2 x) {\n' +
	'	return x - floor(x * (1.0 / 289.0)) * 289.0;\n' +
	'}\n' +
	'vec3 mod289(vec3 x) {\n' +
	'	return x - floor(x * (1.0 / 289.0)) * 289.0;\n' +
	'}\n' +
	'vec4 mod289(vec4 x) {\n' +
	'	return x - floor(x * (1.0 / 289.0)) * 289.0;\n' +
	'}\n' +
	'vec3 permute(vec3 x) {\n' +
	'	return mod289(((x*34.0)+1.0)*x);\n' +
	'}\n' +
	'vec4 permute(vec4 x) {\n' +
	'	return mod289(((x*34.0)+1.0)*x);\n' +
	'}\n' +
	'vec4 taylorInvSqrt(vec4 r) {\n' +
	'	return 1.79284291400159 - 0.85373472095314 * r;\n' +
	'}\n' +
	'float taylorInvSqrt(float r) {\n' +
	'	return 1.79284291400159 - 0.85373472095314 * r;\n' +
	'}\n' +
	'#endif\n';
const snoise2d = '#ifndef NOISE2D\n' +
		'#define NOISE2D\n' +
		'float snoise(vec2 v) {\n' +
		'	const vec4 C = vec4(0.211324865405187, // (3.0-sqrt(3.0))/6.0\n' +
		'		0.366025403784439, // 0.5*(sqrt(3.0)-1.0)\n' +
		'		-0.577350269189626, // -1.0 + 2.0 * C.x\n' +
		'		0.024390243902439); // 1.0 / 41.0\n' +
		'	vec2 i = floor(v + dot(v, C.yy));\n' +
		'	vec2 x0 = v - i + dot(i, C.xx);\n' +
		'	vec2 i1;\n' +
		'	//i1.x = step(x0.y, x0.x); // x0.x > x0.y ? 1.0 : 0.0\n' +
		'	//i1.y = 1.0 - i1.x;\n' +
		'	i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n' +
		'	// x0 = x0 - 0.0 + 0.0 * C.xx ;\n' +
		'	// x1 = x0 - i1 + 1.0 * C.xx ;\n' +
		'	// x2 = x0 - 1.0 + 2.0 * C.xx ;\n' +
		'	vec4 x12 = x0.xyxy + C.xxzz;\n' +
		'	x12.xy -= i1;\n' +
		'	i = mod289(i); // Avoid truncation effects in permutation\n' +
		'	vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));\n' +
		'	vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);\n' +
		'	m = m*m ;\n' +
		'	m = m*m ;\n' +
		'	vec3 x = 2.0 * fract(p * C.www) - 1.0;\n' +
		'	vec3 h = abs(x) - 0.5;\n' +
		'	vec3 ox = floor(x + 0.5);\n' +
		'	vec3 a0 = x - ox;\n' +
		'	m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);\n' +
		'	vec3 g;\n' +
		'	g.x = a0.x * x0.x + h.x * x0.y;\n' +
		'	g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n' +
		'	return 130.0 * dot(m, g);\n' +
		'}\n' +
		'#endif\n';
const snoise3d = '#ifndef NOISE3D\n' +
		'#define NOISE3D\n' +
		'float snoise(vec3 v) {\n' +
		'	const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;\n' +
		'	const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);\n' +

		// First corner
		'	vec3 i = floor(v + dot(v, C.yyy));\n' +
		'	vec3 x0 = v - i + dot(i, C.xxx) ;\n' +

		// Other corners
		'	vec3 g = step(x0.yzx, x0.xyz);\n' +
		'	vec3 l = 1.0 - g;\n' +
		'	vec3 i1 = min(g.xyz, l.zxy);\n' +
		'	vec3 i2 = max(g.xyz, l.zxy);\n' +

		'	// x0 = x0 - 0.0 + 0.0 * C.xxx;\n' +
		'	// x1 = x0 - i1 + 1.0 * C.xxx;\n' +
		'	// x2 = x0 - i2 + 2.0 * C.xxx;\n' +
		'	// x3 = x0 - 1.0 + 3.0 * C.xxx;\n' +
		'	vec3 x1 = x0 - i1 + C.xxx;\n' +
		'	vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n' +
		'	vec3 x3 = x0 - D.yyy; // -1.0+3.0*C.x = -0.5 = -D.y\n' +

		// Permutations
		'	i = mod289(i);\n' +
		'	vec4 p = permute(permute(permute(\n' +
		'						i.z + vec4(0.0, i1.z, i2.z, 1.0))\n' +
		'						+ i.y + vec4(0.0, i1.y, i2.y, 1.0))\n' +
		'						+ i.x + vec4(0.0, i1.x, i2.x, 1.0));\n' +

		// Gradients: 7x7 points over a square, mapped onto an octahedron.
		// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
		'	float n_ = 0.142857142857; // 1.0/7.0\n' +
		'	vec3 ns = n_ * D.wyz - D.xzx;\n' +

		'	vec4 j = p - 49.0 * floor(p * ns.z * ns.z); // mod(p, 7 * 7)\n' +

		'	vec4 x_ = floor(j * ns.z);\n' +
		'	vec4 y_ = floor(j - 7.0 * x_); // mod(j, N)\n' +

		'	vec4 x = x_ * ns.x + ns.yyyy;\n' +
		'	vec4 y = y_ * ns.x + ns.yyyy;\n' +
		'	vec4 h = 1.0 - abs(x) - abs(y);\n' +

		'	vec4 b0 = vec4(x.xy, y.xy);\n' +
		'	vec4 b1 = vec4(x.zw, y.zw);\n' +

		'	//vec4 s0 = vec4(lessThan(b0, 0.0)) * 2.0 - 1.0;\n' +
		'	//vec4 s1 = vec4(lessThan(b1, 0.0)) * 2.0 - 1.0;\n' +
		'	vec4 s0 = floor(b0) * 2.0 + 1.0;\n' +
		'	vec4 s1 = floor(b1) * 2.0 + 1.0;\n' +
		'	vec4 sh = -step(h, vec4(0.0));\n' +

		'	vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy ;\n' +
		'	vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww ;\n' +

		'	vec3 p0 = vec3(a0.xy, h.x);\n' +
		'	vec3 p1 = vec3(a0.zw, h.y);\n' +
		'	vec3 p2 = vec3(a1.xy, h.z);\n' +
		'	vec3 p3 = vec3(a1.zw, h.w);\n' +

		//Normalise gradients
		'	vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));\n' +
		'	p0 *= norm.x;\n' +
		'	p1 *= norm.y;\n' +
		'	p2 *= norm.z;\n' +
		'	p3 *= norm.w;\n' +

		// Mix final noise value
		'	vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);\n' +
		'	m = m * m;\n' +
		'	return 42.0 * dot(m*m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));\n' +
		'}\n' +
		'#endif\n';
const random$1 = '#ifndef RANDOM\n' +
			'#define RANDOM\n' +
		'float random(vec2 n) {\n' +
		'	return 0.5 + 0.5 * fract(sin(dot(n.xy, vec2(12.9898, 78.233)))* 43758.5453);\n' +
		'}\n' +
		'#endif\n';
const makeNoise = 'float makeNoise(float u, float v, float timer) {\n' +
		'	float x = u * v * mod(timer * 1000.0, 100.0);\n' +
		'	x = mod(x, 13.0) * mod(x, 127.0);\n' +
		'	float dx = mod(x, 0.01);\n' +
		'	return clamp(0.1 + dx * 100.0, 0.0, 1.0);\n' +
		'}\n';

Seriously$1.plugin('simplex', function () {
	const me = this;

	function resize() {
		me.resize();
	}

	return {
		shader: function (inputs, shaderSource) {
			let frequency = 1,
				amplitude = 1,
				i,
				adjust = 0;

			function fmtFloat(n) {
				if (n - Math.floor(n) === 0) {
					return n + '.0';
				}
				return n;
			}

			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform float amount;',
				'uniform vec2 noiseScale;',
				'uniform vec2 noiseOffset;',
				'uniform float time;',
				'uniform vec4 black;',
				'uniform vec4 white;',

				noiseHelpers,
				snoise3d,
				//random,

				'void main(void) {',
				'	float total = 0.0;',
				'	vec3 pos = vec3(vTexCoord.xy * noiseScale + noiseOffset, time);'
			].join('\n');

			for (i = 0; i < inputs.octaves; i++) {
				frequency = Math.pow(2, i);
				amplitude = Math.pow(inputs.persistence, i);
				adjust += amplitude;
				shaderSource.fragment += '\ttotal += snoise(pos * ' + fmtFloat(frequency) + ') * ' + fmtFloat(amplitude) + ';\n';
			}
			shaderSource.fragment += [
				'	total *= amount / ' + fmtFloat(adjust) + ';',
				'	total = (total + 1.0)/ 2.0;',
				'	gl_FragColor = mix(black, white, total);',
				'}'
			].join('\n');

			return shaderSource;
		},
		inputs: {
			noiseScale: {
				type: 'vector',
				dimensions: 2,
				uniform: 'noiseScale',
				defaultValue: [1, 1]
			},
			noiseOffset: {
				type: 'vector',
				dimensions: 2,
				uniform: 'noiseOffset',
				defaultValue: [0, 0]
			},
			octaves: {
				type: 'number',
				shaderDirty: true,
				min: 1,
				max: 8,
				step: 1,
				defaultValue: 1
			},
			persistence: {
				type: 'number',
				defaultValue: 0.5,
				min: 0,
				max: 0.5
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				min: 0,
				defaultValue: 1
			},
			time: {
				type: 'number',
				uniform: 'time',
				defaultValue: 0
			},
			width: {
				type: 'number',
				min: 0,
				step: 1,
				update: resize,
				defaultValue: 0
			},
			height: {
				type: 'number',
				min: 0,
				step: 1,
				update: resize,
				defaultValue: 0
			},
			black: {
				type: 'color',
				uniform: 'black',
				defaultValue: [0, 0, 0, 1]
			},
			white: {
				type: 'color',
				uniform: 'white',
				defaultValue: [1, 1, 1, 1]
			}
		}
	};
}, {
	title: 'Simplex Noise',
	description: 'Generate Simplex Noise'
});

Seriously$1.plugin('falsecolor', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float amount;',
			'uniform vec4 black;',
			'uniform vec4 white;',

			'const vec3 luma = vec3(0.2125, 0.7154, 0.0721);',

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	float luminance = dot(pixel.rgb, luma);',
			'	vec4 result = mix(black, white, luminance);',
			'	gl_FragColor = vec4(result.rgb, pixel.a * result.a);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		black: {
			type: 'color',
			uniform: 'black',
			defaultValue: [0, 0, 0.5, 1]
		},
		white: {
			type: 'color',
			uniform: 'white',
			defaultValue: [1, 0, 0, 1]
		}
	},
	title: 'False Color'
});

Seriously$1.plugin('panorama', function () {
	const me = this;

	function resize() {
		me.resize();
	}

	// custom resize method
	this.resize = function () {
		let width = this.width,
			height = this.height,
			source = me.inputs.source,
			i;

		if (this.source) {
			width = this.source.width;
			height = this.source.height;
		} else if (this.sources && this.sources.source) {
			width = this.sources.source.width;
			height = this.sources.source.height;
		} else {
			width = 1;
			height = 1;
		}

		if (me.inputs.width) {
			width = me.inputs.width;
			if (me.inputs.height) {
				height = me.inputs.height;
			} else if (source) {
				//match source aspect ratio
				height = width * source.height / source.width;
			}
		} else if (me.inputs.height) {
			height = me.inputs.height;
			if (source) {
				//match source aspect ratio
				width = height * source.width / source.height;
			}
		}

		width = Math.floor(width);
		height = Math.floor(height);

		if (source) {
			this.uniforms.resolution[0] = width;
			this.uniforms.resolution[1] = height;
		}

		if (this.width !== width || this.height !== height) {
			this.width = width;
			this.height = height;

			if (this.frameBuffer) {
				this.frameBuffer.resize(this.width, this.height);
			}

			this.emit('resize');
			this.setDirty();
		}

		for (i = 0; i < this.targets.length; i++) {
			this.targets[i].resize();
		}
	};

	return {
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform vec2 resolution;',
				'uniform sampler2D source;',

				'uniform float fov;',
				'uniform float yaw;',
				'uniform float pitch;',

				'const float M_PI = 3.141592653589793238462643;',
				'const float M_TWOPI = 6.283185307179586476925286;',

				'mat3 rotationMatrix(vec2 euler) {',
				'	vec2 se = sin(euler);',
				'	vec2 ce = cos(euler);',

				'	return mat3(ce.x, 0, -se.x, 0, 1, 0, se.x, 0, ce.x) * ',
				'			mat3(1, 0, 0, 0, ce.y, -se.y, 0, se.y, ce.y);',
				'}',

				'vec3 toCartesian( vec2 st ) {',
				'	return normalize(vec3(st.x, st.y, 0.5 / tan(0.5 * radians(fov))));',
				'}',

				'vec2 toSpherical(vec3 cartesianCoord) {',
				'	vec2 st = vec2(',
				'		atan(cartesianCoord.x, cartesianCoord.z),',
				'		acos(cartesianCoord.y)',
				'	);',
				'	if(st.x < 0.0)',
				'		st.x += M_TWOPI;',

				'	return st;',
				'}',

				'void main(void) {',
				'	vec2 sphericalCoord = gl_FragCoord.xy / resolution - vec2(0.5);',
				'	sphericalCoord.y *= -resolution.y / resolution.x;',

				'	vec3 cartesianCoord = rotationMatrix(radians(vec2(yaw + 180., -pitch))) * toCartesian(sphericalCoord);',

				'	gl_FragColor = texture2D(source, toSpherical( cartesianCoord )/vec2(M_TWOPI, M_PI));',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			width: {
				type: 'number',
				min: 0,
				step: 1,
				update: resize,
				defaultValue: 640
			},
			height: {
				type: 'number',
				min: 0,
				step: 1,
				update: resize,
				defaultValue: 360
			},
			yaw: {
				type: 'number',
				uniform: 'yaw',
				min: 0,
				max: 360,
				defaultValue: 0
			},
			fov: {
				type: 'number',
				uniform: 'fov',
				min: 0,
				max: 180,
				defaultValue: 80
			},
			pitch: {
				type: 'number',
				uniform: 'pitch',
				min: -90,
				max: 90,
				defaultValue: 0
			}
		}
	};
}, {
	commonShader: true,
	title: 'Panorama'
});

/*!
 * Vibrance is similar to saturation, but it has less effect on skin tones
 * http://www.iceflowstudios.com/2013/tips/vibrance-vs-saturation-in-photoshop/
 *
 * Shader adapted from glfx.js by Evan Wallace
 * License: https://github.com/evanw/glfx.js/blob/master/LICENSE
 */

Seriously$1.plugin('vibrance', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float amount;',

			'void main(void) {',
			'	vec4 color = texture2D(source, vTexCoord);',

			'	float average = (color.r + color.g + color.b) / 3.0;',
			'	float mx = max(color.r, max(color.g, color.b));',
			'	float amt = (mx - average) * (-3.0 * amount);',
			'	color.rgb = mix(color.rgb, vec3(mx), amt);',
			'	gl_FragColor = color;',

			/*
			https://github.com/v002/v002-Color-Controls
			doesn't work so well with values < 0
			'	const vec4 lumacoeff = vec4(0.299,0.587,0.114, 0.);',
			'	vec4 luma = vec4(dot(color, lumacoeff));',
			'	vec4 mask = clamp(color - luma, 0.0, 1.0);',
			'	float lumaMask = 1.0 - dot(lumacoeff, mask);',
			'	gl_FragColor = mix(luma, color, 1.0 + amount * lumaMask);',
			*/
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			defaultValue: 0,
			min: -1,
			max: 1
		}
	},
	title: 'Vibrance',
	description: 'Non-peaking saturation effect'
});

const intRegex = /\d+/;

Seriously$1.plugin('select', function (options) {
	let count,
		me = this,
		i,
		inputs;

	function resize() {
		me.resize();
	}

	function update() {
		let i = me.inputs.active,
			source;

		source = me.inputs['source' + i];
		me.texture = source && source.texture;

		resize();
	}

	if (typeof options === 'number' && options >= 2) {
		count = options;
	} else {
		count = options && options.count || 4;
		count = Math.max(2, count);
	}

	inputs = {
		active: {
			type: 'number',
			step: 1,
			min: 0,
			max: count - 1,
			defaultValue: 0,
			update: update,
			updateSources: true
		},
		sizeMode: {
			type: 'enum',
			defaultValue: '0',
			options: [
				'union',
				'intersection',
				'active'
			],
			update: resize
		}
	};

	for (i = 0; i < count; i++) {
		inputs.sizeMode.options.push(i.toString());
		inputs.sizeMode.options.push('source' + i);

		//source
		inputs['source' + i] = {
			type: 'image',
			update: update
		};
	}

	this.uniforms.layerResolution = [1, 1];

	// custom resize method
	this.resize = function () {
		let width,
			height,
			mode = this.inputs.sizeMode,
			i,
			n,
			source,
			a;

		if (mode === 'union') {
			width = 0;
			height = 0;
			for (i = 0; i < count; i++) {
				source = this.inputs['source' + i];
				if (source) {
					width = Math.max(width, source.width);
					height = Math.max(height, source.height);
				}
			}
		} else if (mode === 'intersection') {
			width = Infinity;
			height = Infinity;
			for (i = 0; i < count; i++) {
				source = this.inputs['source' + i];
				if (source) {
					width = Math.min(width, source.width);
					height = Math.min(height, source.height);
				}
			}
		} else if (mode === 'active') {
			i = this.inputs.active;
			source = this.inputs['source' + i];
			width = Math.max(1, source && source.width || 1);
			height = Math.max(1, source && source.height || 1);
		} else {
			width = 1;
			height = 1;
			n = count - 1;
			a = intRegex.exec(this.inputs.sizeMode);
			if (a) {
				n = Math.min(parseInt(a[0], 10), n);
			}

			for (i = 0; i <= n; i++) {
				source = this.inputs['source' + i];
				if (source) {
					width = source.width;
					height = source.height;
					break;
				}
			}
		}

		if (this.width !== width || this.height !== height) {
			this.width = width;
			this.height = height;

			this.emit('resize');
			this.setDirty();
		}

		for (i = 0; i < this.targets.length; i++) {
			this.targets[i].resize();
		}
	};

	return {
		initialize: function () {
			this.initialized = true;
			this.shaderDirty = false;
		},
		requires: function (sourceName) {
			return !!(this.inputs[sourceName] && sourceName === 'source' + this.inputs.active);
		},

		//check the source texture on every draw just in case the source nodes pulls
		//shenanigans with its texture.
		draw: function () {
			let i = me.inputs.active,
				source;

			source = me.inputs['source' + i];
			me.texture = source && source.texture;
		},
		inputs: inputs
	};
},
{
	title: 'Select',
	description: 'Select a single source image from a list of source nodes.',
	inPlace: false,
	commonShader: true
});

const identity$5 = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);
const intRegex$1 = /\d+/;

Seriously$1.plugin('layers', function (options) {
	let count,
		me = this,
		topOpts = {
			clear: false
		},
		i,
		inputs;

	function update() {
		me.resize();
	}

	if (typeof options === 'number' && options >= 2) {
		count = options;
	} else {
		count = options && options.count || 4;
		count = Math.max(2, count);
	}

	inputs = {
		sizeMode: {
			type: 'enum',
			defaultValue: '0',
			options: [
				'union',
				'intersection'
			],
			update: function () {
				this.resize();
			}
		}
	};

	for (i = 0; i < count; i++) {
		inputs.sizeMode.options.push(i.toString());
		inputs.sizeMode.options.push('source' + i);

		//source
		inputs['source' + i] = {
			type: 'image',
			update: update
		};

		//opacity
		inputs['opacity' + i] = {
			type: 'number',
			defaultValue: 1,
			min: 0,
			max: 1,
			updateSources: true
		};
	}

	this.uniforms.layerResolution = [1, 1];

	// custom resize method
	this.resize = function () {
		let width,
			height,
			mode = this.inputs.sizeMode,
			i,
			n,
			source,
			a;

		if (mode === 'union') {
			width = 0;
			height = 0;
			for (i = 0; i < count; i++) {
				source = this.inputs['source' + i];
				if (source) {
					width = Math.max(width, source.width);
					height = Math.max(height, source.height);
				}
			}
		} else if (mode === 'intersection') {
			width = Infinity;
			height = Infinity;
			for (i = 0; i < count; i++) {
				source = this.inputs['source' + i];
				if (source) {
					width = Math.min(width, source.width);
					height = Math.min(height, source.height);
				}
			}
		} else {
			width = 1;
			height = 1;
			n = count - 1;
			a = intRegex$1.exec(this.inputs.sizeMode);
			if (a) {
				n = Math.min(parseInt(a[0], 10), n);
			}

			source = this.inputs['source' + n];
			if (source) {
				width = source.width;
				height = source.height;
			}
		}

		if (this.width !== width || this.height !== height) {
			this.width = width;
			this.height = height;

			this.uniforms.resolution[0] = width;
			this.uniforms.resolution[1] = height;

			if (this.frameBuffer) {
				this.frameBuffer.resize(width, height);
			}

			this.emit('resize');
			this.setDirty();

			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].resize();
			}
		}
	};

	return {
		initialize: function (initialize) {
			const gl = this.gl;
			initialize();

			topOpts.blendEquation = gl.FUNC_ADD;
			topOpts.srcRGB = gl.SRC_ALPHA;
			topOpts.dstRGB = gl.ONE_MINUS_SRC_ALPHA;
			topOpts.srcAlpha = gl.ONE;
			topOpts.dstAlpha = gl.ONE_MINUS_SRC_ALPHA;
		},
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform vec2 layerResolution;',
				'uniform mat4 transform;',

				'varying vec2 vTexCoord;',

				'void main(void) {',
				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * layerResolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position.xy = screenPosition.xy * 2.0 / layerResolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (layerResolution.x / layerResolution.y);',
				'	gl_Position.xy *= layerResolution / resolution;',
				'	gl_Position.w = screenPosition.w;',
				'	vTexCoord = texCoord;',
				'}\n'
			].join('\n');

			shaderSource.fragment = [
				'precision mediump float;',
				'varying vec2 vTexCoord;',
				'uniform sampler2D source;',
				'uniform float opacity;',
				'void main(void) {',
				'	if (any(lessThan(vTexCoord, vec2(0.0))) || any(greaterThanEqual(vTexCoord, vec2(1.0)))) {',
				'		gl_FragColor = vec4(0.0);',
				'	} else {',
				'		gl_FragColor = texture2D(source, vTexCoord);',
				'		gl_FragColor *= opacity;',
				'	}',
				'}'
			].join('\n');

			return shaderSource;
		},
		requires: function (sourceName, inputs) {
			let a, index = count;

			a = intRegex$1.exec(this.inputs.sizeMode);
			if (a) {
				index = parseInt(a[0], 10);
			}
			if (index >= count) {
				return false;
			}

			return !!(inputs[sourceName] && inputs['opacity' + index]);
		},
		draw: function (shader, model, uniforms, frameBuffer, draw) {
			let i,
				opacity,
				source,
				gl = this.gl;

			//clear in case we have no layers to draw
			gl.viewport(0, 0, this.width, this.height);
			gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
			gl.clearColor(0.0, 0.0, 0.0, 0.0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			for (i = 0; i < count; i++) {
				source = this.inputs['source' + i];
				opacity = this.inputs['opacity' + i];

				//don't draw if layer is disconnected or opacity is 0
				if (source && opacity) {
					uniforms.opacity = opacity;
					uniforms.layerResolution[0] = source.width;
					uniforms.layerResolution[1] = source.height;
					uniforms.source = source;
					uniforms.transform = source.cumulativeMatrix || identity$5;

					draw(shader, model, uniforms, frameBuffer, null, topOpts);
				}
			}
		},
		inputs: inputs
	};
},
{
	inPlace: true,
	description: 'Multiple layers',
	title: 'Layers'
});

/*!
 * http://tllabs.io/asciistreetview/
 * http://sol.gfxile.net/textfx/index.html
 */

//todo: consider an alternative algorithm:

const letters = document.createElement('img');
const identity$6 = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);

letters.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAvAAAAAICAYAAACf+MsnAAAFY0lEQVR4Xu2Z644bOwyDN+//0NsOigEMQdRHyU6CFDnA+bHVWNaFojiTx8/Pz+/f/4/89/v7z9Xj8Tjib3XyTN9usFcMz8gt3h9zXf/O6nD/W1V7Vb9uXad+nHucZ9xenX7OqTHdSfmRXfmPsSn8xPMrllcfCkdVfHSe7Ned0/yp7jv2GPfqK+MCByc0zzvxKi5RPq8cuvE4+JrwpFM7N78K2yu+qb9kd3qV+ZjUx5n/+xnXP81ctW/UHQ5P3Gd360vxKf+n8dGpxXTeKu6h2ansFT6pvo5G2/FP99NsUf9d/xleInfetcj629m9cf9WOV5K+78R8ERGRLYO8VQiecd/1vwKEJV46JBJRzhRfXftVL/MTgM48UmL0l2OSmzs9kctAJfE4/1KkNFzbj8cjFHsJ/u460vhnPDfqddujJ27poLCWWBuHt0YKr/ki+yOKJnk5Z7pPLfLf4TZif+qvi7XuDWg+HbtNEe79ds9H7m1m2/3+YzLK5Hc9e/gYxdfNP+ZfdV9lT3usWn+9310/qiAdxa1O5gTEqVhoLudxVwVNPrvCqDp/ZX4d0Uk1Y7sbgyU4zooCk8nB3i9Y61V5wWpIjDlP+ZJsxPvmLxEOD2sntk5Pz1LBOb0L+sPfQGs6ksYpt7QAiHuUwtkgl+F3Qyf2YxTX53+Vdjfjc8VYIq7KT+abzof7ervZ8fX8d/Jyc3PmTcnRrrPEbyVTnD8T+Y38pH624mfNIr6muzO95S/sh1Gvog/XmW/a6N+scww43zgqLjcOX9cwFeESQK3Gpx32QggTlwk8Ei8OXfE4VMLeCLQiLBjfJM7VA069XefnZBGJz7Vr24dK3GwEoqLD7p/1+4IMWdRdxaMK9CmP4E62F7nm8S7s4B3BMCkBzQPVQ0IM06+2WLvzlDlI+NfF4d0ljiHuF/Zb/4m/4ojTgnA6f0qfiWA135P5l/NoFv/7txm+5ZyyOw0e1R/skd8ZKKwwnjXf9xLrkBV+2x3Pib9Vz3JOMaNL/KZ+oCkXhDUTLxEwLsC41OfI5DEYe9+mXfr0l2mJH5ISHTOUw2U8IjD5LyVUtxEmrvi4V5ejvijWNWicBbOyfsrYejkMMXmdIFEAZH19ASWnNyrPlBdKH+yU3y0gGjGKf4Mv51ft9zzKk83vul5qr9r7+CT9gHx2zvs0/yofpGX1AuC4svqhYJeJJydNZk/urcSxet91dfiUy94HX6oBHCHi5+F38svCeg1h+zZ6nyF5VUzVC8Q0X9LwE/IkMjmpJ3i27XvxuqQ0c4dp/JTfnb9T847AoNIW/nokIYrYKvnJvln/siPwtD0XAeTU+x0luEugWdLNeY4ecl260vxK8Efl3OnZi4uaZZIMBFeJ/hw6xrFvppvV1Q559d8MwwR50cskIBQ2KhE3y7/ZeddAUjxOr3diZ/8U3+I953z7uzR7Lj4rvjl9HxXvaHaOflSfSkf93y24xx94PpX89I5H2t9+fwK+KVzNOwdIeM+e905+ZqqRIj7pYHiU3FNFnBnkO+41EKige3cpX7GunwoARfjIwKrxNhEJFLfMrsbI+G/smfkojAa60vxPcNeCZCqhjSra6ydBaAWSFzaqnb01c4VEdVCWWPM7svstKDWuKrZpwUb7dVsOzPcxUeGdYdfdgV8Vr+Mv1R8Tn/iHcSNWR8jjjv9URzama9qbp0XlBP4y2Jw6u/E577AZTVz/BM/OfySzSjl79o73FRxaFdfuPG5/XE58PbXEvAT8UBn1HKuSIB8ThYwiZfJnd8z768Aib/3R/iN4J0VeMXcVwvynbl/735OBV6BKTfyT+e/T4/f7dP3uW8F3Aqs/PIHbWXeeeKjnSsAAAAASUVORK5CYII=';

Seriously$1.plugin('ascii', function () {
	let baseShader,
		scaledBuffer,
		lettersTexture,
		gl,
		width,
		height,
		scaledWidth,
		scaledHeight,
		unif = {},
		me = this;

	function resize() {
		//set up scaledBuffer if (width or height have changed)
		height = me.height;
		width = me.width;
		scaledWidth = Math.ceil(width / 8);
		scaledHeight = Math.ceil(height / 8);

		unif.resolution = me.uniforms.resolution;
		unif.transform = identity$6;

		if (scaledBuffer) {
			scaledBuffer.resize(scaledWidth, scaledHeight);
		}
	}

	return {
		initialize: function (parent) {
			function setLetters() {
				gl.bindTexture(gl.TEXTURE_2D, lettersTexture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, letters);
				gl.bindTexture(gl.TEXTURE_2D, null);
			}

			const me = this;

			parent();

			this.texture = this.frameBuffer.texture;

			gl = this.gl;

			lettersTexture = gl.createTexture();
			if (letters.naturalWidth) {
				setLetters();
			} else {
				letters.addEventListener('load', function () {
					setLetters();
					me.setDirty();
				});
			}

			unif.letters = lettersTexture;

			//when the output scales up, don't smooth it out
			gl.bindTexture(gl.TEXTURE_2D, this.texture || this.frameBuffer && this.frameBuffer.texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.bindTexture(gl.TEXTURE_2D, null);

			resize();

			scaledBuffer = new Seriously$1.util.FrameBuffer(gl, scaledWidth, scaledHeight);

			//so it stays blocky
			gl.bindTexture(gl.TEXTURE_2D, scaledBuffer.texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

			this.uniforms.transform = identity$6;

			baseShader = this.baseShader;
		},
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform sampler2D letters;',
				'uniform vec4 background;',
				'uniform vec2 resolution;',

				'const vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);',
				'const vec2 fontSize = vec2(8.0, 8.0);',

				'vec4 lookup(float ascii) {',
				'	vec2 pos = mod(vTexCoord * resolution, fontSize) / vec2(752.0, fontSize.x) + vec2(ascii, 0.0);',
				'	return texture2D(letters, pos);',
				'}',

				'void main(void) {',
				'	vec4 sample = texture2D(source, vTexCoord);',
				'	vec4 clamped = vec4(floor(sample.rgb * 8.0) / 8.0, sample.a);',

				'	float luma = dot(sample.rgb,lumcoeff);',
				'	float char = floor(luma * 94.0) / 94.0;',

				'	gl_FragColor = mix(background, clamped, lookup(char).r);',
				'}'
			].join('\n');

			return shaderSource;
		},
		resize: resize,
		draw: function (shader, model, uniforms, frameBuffer, draw) {
			draw(baseShader, model, uniforms, scaledBuffer.frameBuffer, false, {
				width: scaledWidth,
				height: scaledHeight,
				blend: false
			});

			unif.source = scaledBuffer.texture;
			unif.background = uniforms.background;

			draw(shader, model, unif, frameBuffer);
		},
		destroy: function () {
			if (scaledBuffer) {
				scaledBuffer.destroy();
			}
			if (gl && lettersTexture) {
				gl.deleteTexture(lettersTexture);
			}
		}
	};
},
{
	inPlace: false,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		background: {
			type: 'color',
			uniform: 'background',
			defaultValue: [0, 0, 0, 1]
		}
	},
	description: 'Display image as ascii text in 8-bit color.',
	title: 'Ascii Text'
});

/*!
 * Shader code:
 * Copyright vade - Anton Marini
 * Creative Commons, Attribution - Non Commercial - Share Alike 3.0
 * http://v002.info/?page_id=34
 *
 * Modified to keep alpha channel constant
 */

Seriously$1.plugin('bleach-bypass', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',

			'uniform float amount;',

			//constants
			'const vec4 one = vec4(1.0);',
			'const vec4 two = vec4(2.0);',
			'const vec4 lumcoeff = vec4(0.2125,0.7154,0.0721,0.0);',

			'vec4 overlay(vec4 myInput, vec4 previousmix, vec4 amount) {',
			'	float luminance = dot(previousmix,lumcoeff);',
			'	float mixamount = clamp((luminance - 0.45) * 10.0, 0.0, 1.0);',

			'	vec4 branch1 = two * previousmix * myInput;',
			'	vec4 branch2 = one - (two * (one - previousmix) * (one - myInput));',

			'	vec4 result = mix(branch1, branch2, vec4(mixamount) );',

			'	return mix(previousmix, result, amount);',
			'}',

			'void main (void)  {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	vec4 luma = vec4(vec3(dot(pixel,lumcoeff)), pixel.a);',
			'	gl_FragColor = overlay(luma, pixel, vec4(amount));',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			defaultValue: 1,
			min: 0,
			max: 1
		}
	},
	title: 'Bleach Bypass',
	categories: ['film'],
	description: [
		'Bleach Bypass film treatment',
		'http://en.wikipedia.org/wiki/Bleach_bypass',
		'see: "Saving Private Ryan", "Minority Report"'
	].join('\n')
});

/*!
 * Daltonization algorithm from:
 * Digital Video Colourmaps for Checking the Legibility of Displays by Dichromats
 * http://vision.psychol.cam.ac.uk/jdmollon/papers/colourmaps.pdf
 *
 * JavaScript implementation:
 * http://mudcu.be/labs/Color/Vision/Javascript/Color.Vision.Daltonize.js
 *
 * Copyright (c) 2013 David Lewis, British Broadcasting Corporation
 * (http://www.bbc.co.uk)
 *
 * MIT Licence:
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

//todo: add Simulate mode http://mudcu.be/labs/Color/Vision/Javascript/Color.Vision.Simulate.js

Seriously$1.plugin('daltonize', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		//Vertex shader
		shaderSource.vertex = [
			'precision mediump float;',

			'attribute vec3 position;',
			'attribute vec2 texCoord;',

			'uniform mat4 transform;',

			'varying vec2 vTexCoord;',

			'void main(void) {',
			'	gl_Position = transform * vec4(position, 1.0);',
			'	vTexCoord = vec2(texCoord.s, texCoord.t);',
			'}'
		].join('\n');
		//Fragment shader
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float cbtype;',

			'void main(void) {',
			'	vec4 color = texture2D(source, vTexCoord);',

			//No change, skip the rest
			'	if (cbtype == 0.0) {',
			'		gl_FragColor = color;',
			'		return;',
			'	}',

			// RGB to LMS matrix conversion
			'	const mat3 RGBLMS = mat3( ' +
			'		17.8824, 43.5161, 4.11935,' +
			'		3.45565, 27.1554, 3.86714,' +
			'		0.0299566, 0.184309, 1.46709' +
			'	);',
			'	vec3 LMS = color.rgb * RGBLMS;',

			'	vec3 lms = vec3(0.0,0.0,0.0);',
			//Protanope
			'	if (cbtype < 0.33) {',
			'		lms = vec3(	' +
			'			(2.02344 * LMS.g) + (-2.52581 * LMS.b),' +
			'			LMS.g,' +
			'			LMS.b' +
			'		);',
			'	}',
			//Deuteranope
			'	if (cbtype > 0.33 && cbtype < 0.66) {',
			'		lms = vec3(	' +
			'			LMS.r,' +
			'			(0.494207 * LMS.r) + (1.24827 * LMS.b),' +
			'			LMS.b' +
			'		);',
			'	}',
			//Tritanope
			'	if (cbtype > 0.66) {',
			'		lms = vec3(	' +
			'			LMS.r,' +
			'			LMS.g,' +
			'			(-0.395913 * LMS.r) + (0.801109 * LMS.g)' +
			'		);',
			'	}',

			// LMS to RGB matrix operation
			'	const mat3 LMSRGB = mat3(    ' +
			'		0.0809444479, -0.130504409, 0.116721066,' +
			'		-0.0102485335, 0.0540193266, -0.113614708,' +
			'		-0.000365296938, -0.00412161469, 0.693511405' +
			'	);',

			'	vec3 RGB = lms * LMSRGB;',

			// Colour shift
			// values may go over 1.0 but will get automatically clamped on output
			'	RGB.rgb = color.rgb - RGB.rgb;',
			'	RGB.g = 0.7*RGB.r + RGB.g;',
			'	RGB.b = 0.7*RGB.r + RGB.b;',
			'	color.rgb = color.rgb + RGB.rgb;',

			//Output
			'	gl_FragColor = color;',

			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		type: {
			title: 'Type',
			type: 'enum',
			uniform: 'cbtype',
			defaultValue: '0.2',
			options: [
				['0.0', 'Off'],
				['0.2', 'Protanope'],
				['0.6', 'Deuteranope'],
				['0.8', 'Tritanope']
			]
		}
	},
	title: 'Daltonize',
	description: 'Add contrast to colours to assist CVD (colour-blind) users.'
});

Seriously$1.plugin('kaleidoscope', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float segments;',
			'uniform float offset;',

			'const float PI = ' + Math.PI + ';',
			'const float TAU = 2.0 * PI;',

			'void main(void) {',
			'	if (segments == 0.0) {',
			'		gl_FragColor = texture2D(source, vTexCoord);',
			'	} else {',
			'		vec2 centered = vTexCoord - 0.5;',

			//to polar
			'		float r = length(centered);',
			'		float theta = atan(centered.y, centered.x);',
			'		theta = mod(theta, TAU / segments);',
			'		theta = abs(theta - PI / segments);',

			//back to cartesian
			'		vec2 newCoords = r * vec2(cos(theta), sin(theta)) + 0.5;',
			'		gl_FragColor = texture2D(source, mod(newCoords - offset, 1.0));',
			'	}',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		segments: {
			type: 'number',
			uniform: 'segments',
			defaultValue: 6
		},
		offset: {
			type: 'number',
			uniform: 'offset',
			defaultValue: 0
		}
	},
	title: 'Kaleidoscope'
});

/*!
 * http://en.wikipedia.org/wiki/Fast_approximate_anti-aliasing
 *
 * adapted from:
 * http://horde3d.org/wiki/index.php5?title=Shading_Technique_-_FXAA
 */

Seriously$1.plugin('fxaa', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.vertex = [
			'precision mediump float;',

			'attribute vec4 position;',
			'attribute vec2 texCoord;',

			'uniform vec2 resolution;',
			'uniform mat4 transform;',

			'varying vec2 vTexCoord;',
			'varying vec2 vTexCoordNW;',
			'varying vec2 vTexCoordNE;',
			'varying vec2 vTexCoordSW;',
			'varying vec2 vTexCoordSE;',

			'const vec2 diag = vec2(1.0, -1.0);',

			'void main(void) {',
			// first convert to screen space
			'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
			'	screenPosition = transform * screenPosition;',

			// convert back to OpenGL coords
			'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
			'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
			'	gl_Position.w = screenPosition.w;',

			'	vTexCoord = texCoord;',

			'	vec2 invRes = 1.0 / resolution;',
			'	vTexCoordNW = texCoord - invRes;',
			'	vTexCoordNE = texCoord + invRes * diag;',
			'	vTexCoordSW = texCoord - invRes * diag;',
			'	vTexCoordSE = texCoord + invRes;',
			'}\n'
		].join('\n');

		shaderSource.fragment = [
			'precision mediump float;',

			'#define FXAA_REDUCE_MIN (1.0 / 128.0)',
			'#define FXAA_REDUCE_MUL (1.0 / 8.0)',
			'#define FXAA_SPAN_MAX 8.0',

			'varying vec2 vTexCoord;',
			'varying vec2 vTexCoordNW;',
			'varying vec2 vTexCoordNE;',
			'varying vec2 vTexCoordSW;',
			'varying vec2 vTexCoordSE;',

			'uniform vec2 resolution;',
			'uniform sampler2D source;',

			'const vec3 luma = vec3(0.299, 0.587, 0.114);',

			'void main(void) {',
			'	vec4 original = texture2D(source, vTexCoord);',
			'	vec3 rgbNW = texture2D(source, vTexCoordNW).rgb;',
			'	vec3 rgbNE = texture2D(source, vTexCoordNE).rgb;',
			'	vec3 rgbSW = texture2D(source, vTexCoordSW).rgb;',
			'	vec3 rgbSE = texture2D(source, vTexCoordSE).rgb;',

			'	float lumaNW = dot(rgbNW, luma);',
			'	float lumaNE = dot(rgbNE, luma);',
			'	float lumaSW = dot(rgbSW, luma);',
			'	float lumaSE = dot(rgbSE, luma);',
			'	float lumaM = dot(original.rgb, luma);',

			'	float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));',
			'	float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));',

			'	vec2 dir = vec2(' +
			'-((lumaNW + lumaNE) - (lumaSW + lumaSE)), ' +
			'((lumaNW + lumaSW) - (lumaNE + lumaSE))' +
			');',

			'	float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * 0.25 * FXAA_REDUCE_MUL, FXAA_REDUCE_MIN);',

			'	float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);',

			'	dir = min(vec2(FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX), dir * rcpDirMin)) / resolution;',

			'	vec3 rgbA = 0.5 * (',
			'		texture2D(source, vTexCoord + dir * (1.0 / 3.0 - 0.5)).rgb +',
			'		texture2D(source, vTexCoord + dir * (2.0 / 3.0 - 0.5)).rgb);',

			'	vec3 rgbB = rgbA * 0.5 + 0.25 * (',
			'		texture2D(source, vTexCoord - dir * 0.5).rgb +',
			'		texture2D(source, vTexCoord + dir * 0.5).rgb);',

			'	float lumaB = dot(rgbB, luma);',
			'	if (lumaB < lumaMin || lumaB > lumaMax) {',
			'		gl_FragColor = vec4(rgbA, original.a);',
			'	} else {',
			'		gl_FragColor = vec4(rgbB, original.a);',
			'	}',
			'}'
		].join('\n');

		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		}
	},
	title: 'FXAA',
	description: 'Fast approximate anti-aliasing'
});

Seriously$1.plugin('checkerboard', function () {
	const me = this;

	function resize() {
		me.resize();
	}

	return {
		initialize: function (initialize) {
			initialize();
			resize();
		},
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform mat4 transform;',

				'uniform vec2 size;',
				'uniform vec2 anchor;',

				'vec2 pixelCoord;', //based in center
				'varying vec2 vGridCoord;', //based in center

				'void main(void) {',
				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	gl_Position.w = screenPosition.w;',

				'	pixelCoord = resolution * (texCoord - 0.5) / 2.0;',
				'	vGridCoord = (pixelCoord - anchor) / size;',
				'}\n'
			].join('\n');
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',
				'varying vec2 vPixelCoord;',
				'varying vec2 vGridCoord;',

				'uniform vec2 resolution;',
				'uniform vec2 anchor;',
				'uniform vec2 size;',
				'uniform vec4 color1;',
				'uniform vec4 color2;',


				'void main(void) {',
				'	vec2 modGridCoord = floor(mod(vGridCoord, 2.0));',
				'	if (modGridCoord.x == modGridCoord.y) {',
				'		gl_FragColor = color1;',
				'	} else  {',
				'		gl_FragColor = color2;',
				'	}',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			anchor: {
				type: 'vector',
				uniform: 'anchor',
				dimensions: 2,
				defaultValue: [0, 0]
			},
			size: {
				type: 'vector',
				uniform: 'size',
				dimensions: 2,
				defaultValue: [4, 4]
			},
			color1: {
				type: 'color',
				uniform: 'color1',
				defaultValue: [1, 1, 1, 1]
			},
			color2: {
				type: 'color',
				uniform: 'color2',
				defaultValue: [187 / 255, 187 / 255, 187 / 255, 1]
			},
			width: {
				type: 'number',
				min: 0,
				step: 1,
				update: resize,
				defaultValue: 640
			},
			height: {
				type: 'number',
				min: 0,
				step: 1,
				update: resize,
				defaultValue: 360
			}
		}
	};
}, {
	commonShader: true,
	title: 'Checkerboard',
	categories: ['generator']
});

/*!
 * Film Grain
 *
 * Shader:
 * Copyright Martins Upitis (martinsh) devlog-martinsh.blogspot.com
 * Creative Commons Attribution 3.0 Unported License
 * http://devlog-martinsh.blogspot.com/2013/05/image-imperfections-and-film-grain-post.html
 *
 * Modified to preserve alpha
 */

Seriously$1.plugin('filmgrain', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec2 resolution;',
			'uniform float time;',
			'uniform float amount;',
			'uniform bool colored;',

			'float timer;',

			// Perm texture texel-size
			'const float permTexUnit = 1.0/256.0;',

			// Half perm texture texel-size
			'const float permTexUnitHalf = 0.5/256.0;',

			'vec4 rnm(in vec2 tc) {',
			'	float noise = sin(dot(tc + vec2(timer,timer),vec2(12.9898,78.233))) * 43758.5453;',

			'	float noiseR = fract(noise)*2.0-1.0;',
			'	float noiseG = fract(noise*1.2154)*2.0-1.0; ',
			'	float noiseB = fract(noise*1.3453)*2.0-1.0;',
			'	float noiseA = fract(noise*1.3647)*2.0-1.0;',
			'	',
			'	return vec4(noiseR,noiseG,noiseB,noiseA);',
			'}',

			'float fade(in float t) {',
			'	return t*t*t*(t*(t*6.0-15.0)+10.0);',
			'}',

			'float pnoise3D(in vec3 p) {',
			// Integer part, scaled so +1 moves permTexUnit texel
			'	vec3 pi = permTexUnit*floor(p)+permTexUnitHalf;',

			// and offset 1/2 texel to sample texel centers
			// Fractional part for interpolation'
			'	vec3 pf = fract(p);',

			// Noise contributions from (x=0, y=0), z=0 and z=1
			'	float perm00 = rnm(pi.xy).a ;',
			'	vec3 grad000 = rnm(vec2(perm00, pi.z)).rgb * 4.0 - 1.0;',
			'	float n000 = dot(grad000, pf);',
			'	vec3 grad001 = rnm(vec2(perm00, pi.z + permTexUnit)).rgb * 4.0 - 1.0;',
			'	float n001 = dot(grad001, pf - vec3(0.0, 0.0, 1.0));',

			// Noise contributions from (x=0, y=1), z=0 and z=1
			'	float perm01 = rnm(pi.xy + vec2(0.0, permTexUnit)).a ;',
			'	vec3 grad010 = rnm(vec2(perm01, pi.z)).rgb * 4.0 - 1.0;',
			'	float n010 = dot(grad010, pf - vec3(0.0, 1.0, 0.0));',
			'	vec3 grad011 = rnm(vec2(perm01, pi.z + permTexUnit)).rgb * 4.0 - 1.0;',
			'	float n011 = dot(grad011, pf - vec3(0.0, 1.0, 1.0));',

			// Noise contributions from (x=1, y=0), z=0 and z=1
			'	float perm10 = rnm(pi.xy + vec2(permTexUnit, 0.0)).a ;',
			'	vec3 grad100 = rnm(vec2(perm10, pi.z)).rgb * 4.0 - 1.0;',
			'	float n100 = dot(grad100, pf - vec3(1.0, 0.0, 0.0));',
			'	vec3 grad101 = rnm(vec2(perm10, pi.z + permTexUnit)).rgb * 4.0 - 1.0;',
			'	float n101 = dot(grad101, pf - vec3(1.0, 0.0, 1.0));',

			// Noise contributions from (x=1, y=1), z=0 and z=1
			'	float perm11 = rnm(pi.xy + vec2(permTexUnit, permTexUnit)).a ;',
			'	vec3 grad110 = rnm(vec2(perm11, pi.z)).rgb * 4.0 - 1.0;',
			'	float n110 = dot(grad110, pf - vec3(1.0, 1.0, 0.0));',
			'	vec3 grad111 = rnm(vec2(perm11, pi.z + permTexUnit)).rgb * 4.0 - 1.0;',
			'	float n111 = dot(grad111, pf - vec3(1.0, 1.0, 1.0));',

			// Blend contributions along x
			'	vec4 n_x = mix(vec4(n000, n001, n010, n011), vec4(n100, n101, n110, n111), fade(pf.x));',

			// Blend contributions along y
			'	vec2 n_xy = mix(n_x.xy, n_x.zw, fade(pf.y));',

			//Blend contributions along z
			'	float n_xyz = mix(n_xy.x, n_xy.y, fade(pf.z));',

			'	return n_xyz;',
			'}',

			'void main(void) {',
			'	timer = mod(time, 10000.0) / 10000.0;',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	vec3 noise = vec3(pnoise3D(vec3(vTexCoord * resolution, timer + 0.0)));',
			'	if (colored) {',
			'		noise.g = pnoise3D(vec3(vTexCoord * resolution, timer + 1.0));',
			'		noise.b = pnoise3D(vec3(vTexCoord * resolution, timer + 2.0));',
			'	}',
			'	gl_FragColor = vec4(pixel.rgb + noise * amount, pixel.a);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		time: {
			type: 'number',
			uniform: 'time',
			mod: 65536
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			min: 0,
			max: 1,
			defaultValue: 0.03
		},
		colored: {
			type: 'boolean',
			uniform: 'colored',
			defaultValue: false
		}
	},
	title: 'Film Grain',
	description: 'Don\'t over-do it.'
});

const fillModes = {
		wrap: 'pos = mod(pos, 1.0);',
		clamp: 'pos = min(max(pos, 0.0), 1.0);',
		ignore: 'pos = texCoordSource;',
		color: 'gl_FragColor = color;\n\treturn;'
	};
const channelVectors = {
		none: [0, 0, 0, 0],
		red: [1, 0, 0, 0],
		green: [0, 1, 0, 0],
		blue: [0, 0, 1, 0],
		alpha: [0, 0, 0, 1],
		luma: [0.2125, 0.7154, 0.0721, 0],
		lightness: [1 / 3, 1 / 3, 1 / 3, 0]
	};

Seriously$1.plugin('displacement', function () {
	this.uniforms.resMap = [1, 1];
	this.uniforms.resSource = [1, 1];
	this.uniforms.xVector = channelVectors.red;
	this.uniforms.yVector = channelVectors.green;

	return {
		shader: function (inputs, shaderSource) {
			const fillMode = fillModes[inputs.fillMode];

			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform vec2 resSource;',
				'uniform vec2 resMap;',

				'varying vec2 texCoordSource;',
				'varying vec2 texCoordMap;',

				'const vec2 HALF = vec2(0.5);',

				'void main(void) {',
				//we don't need to do a transform in this shader, since this effect is not "inPlace"
				'	gl_Position = position;',

				'	vec2 adjusted = (texCoord - HALF) * resolution;',

				'	texCoordSource = adjusted / resSource + HALF;',
				'	texCoordMap = adjusted / resMap + HALF;',
				'}'
			].join('\n');

			shaderSource.fragment = [
				'precision mediump float;\n',

				'varying vec2 texCoordSource;',
				'varying vec2 texCoordMap;',

				'uniform sampler2D source;',
				'uniform sampler2D map;',

				'uniform float amount;',
				'uniform float offset;',
				'uniform vec2 mapScale;',
				'uniform vec4 color;',
				'uniform vec4 xVector;',
				'uniform vec4 yVector;',

				'void main(void) {',
				'	vec4 mapPixel = texture2D(map, texCoordMap);',
				'	vec2 mapVector = vec2(dot(mapPixel, xVector), dot(mapPixel, yVector));',
				'	vec2 pos = texCoordSource + (mapVector.xy - offset) * mapScale * amount;',

				'	if (pos.x < 0.0 || pos.x > 1.0 || pos.y < 0.0 || pos.y > 1.0) {',
				'		' + fillMode,
				'	}',

				'	gl_FragColor = texture2D(source, pos);',
				'}'
			].join('\n');

			return shaderSource;
		},
		requires: function (sourceName) {
			if (!this.inputs.mapScale && sourceName === 'map') {
				return false;
			}
			return true;
		},
		resize: function () {
			const source = this.inputs.source,
				map = this.inputs.map;

			if (source) {
				this.uniforms.resSource[0] = source.width;
				this.uniforms.resSource[1] = source.height;
			} else {
				this.uniforms.resSource[0] = 1;
				this.uniforms.resSource[1] = 1;
			}

			if (map) {
				this.uniforms.resMap[0] = map.width;
				this.uniforms.resMap[1] = map.height;
			} else {
				this.uniforms.resMap[0] = 1;
				this.uniforms.resMap[1] = 1;
			}
		}
	};
},
{
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		map: {
			type: 'image',
			uniform: 'map'
		},
		xChannel: {
			type: 'enum',
			defaultValue: 'red',
			options: [
				'red', 'green', 'blue', 'alpha', 'luma', 'lightness', 'none'
			],
			update: function (val) {
				this.uniforms.xVector = channelVectors[val];
			}
		},
		yChannel: {
			type: 'enum',
			defaultValue: 'green',
			options: [
				'red', 'green', 'blue', 'alpha', 'luma', 'lightness', 'none'
			],
			update: function (val) {
				this.uniforms.yVector = channelVectors[val];
			}
		},
		fillMode: {
			type: 'enum',
			shaderDirty: true,
			defaultValue: 'color',
			options: [
				'color', 'wrap', 'clamp', 'ignore'
			]
		},
		color: {
			type: 'color',
			uniform: 'color',
			defaultValue: [0, 0, 0, 0]
		},
		offset: {
			type: 'number',
			uniform: 'offset',
			defaultValue: 0.5
		},
		mapScale: {
			type: 'vector',
			dimensions: 2,
			uniform: 'mapScale',
			defaultValue: [1, 1],
			updateSources: true
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			defaultValue: 1
		}
	},
	title: 'Displacement Map',
	description: ''
});

/*!
 * based on tutorial: http://www.geeks3d.com/20091009/shader-library-night-vision-post-processing-filter-glsl/
 */
//todo: make noise better?

Seriously$1.plugin('nightvision', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float time;',
			'uniform float luminanceThreshold;',
			'uniform float amplification;',
			'uniform vec3 nightVisionColor;',

			makeNoise,

			'void main(void) {',
			'	vec3 noise = vec3(' +
			'makeNoise(vTexCoord.x, vTexCoord.y, time), ' +
			'makeNoise(vTexCoord.x, vTexCoord.y, time * 200.0 + 1.0), ' +
			'makeNoise(vTexCoord.x, vTexCoord.y, time * 100.0 + 3.0)' +
			');',
			'	vec4 pixel = texture2D(source, vTexCoord + noise.xy * 0.0025);',
			'	float luminance = dot(vec3(0.299, 0.587, 0.114), pixel.rgb);',
			'	pixel.rgb *= step(luminanceThreshold, luminance) * amplification;',
			'	gl_FragColor = vec4( (pixel.rgb + noise * 0.1) * nightVisionColor, pixel.a);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		time: {
			type: 'number',
			uniform: 'time',
			defaultValue: 0,
			mod: 65536
		},
		luminanceThreshold: {
			type: 'number',
			uniform: 'luminanceThreshold',
			defaultValue: 0.1,
			min: 0,
			max: 1
		},
		amplification: {
			type: 'number',
			uniform: 'amplification',
			defaultValue: 1.4,
			min: 0
		},
		color: {
			type: 'color',
			uniform: 'nightVisionColor',
			defaultValue: [0.1, 0.95, 0.2]
		}
	},
	title: 'Night Vision',
	description: ''
});

//particle parameters
const minVelocity = 0.2;
const maxVelocity = 0.8;
const minSize = 0.02;
const maxSize = 0.3;
const particleCount = 20;

Seriously$1.plugin('tvglitch', function () {
	let lastHeight,
		lastTime,
		particleBuffer,
		particleShader,
		particleFrameBuffer,
		gl;

	return {
		initialize: function (parent) {
			let i,
				sizeRange,
				velocityRange,
				particleVertex,
				particleFragment,
				particles;

			gl = this.gl;

			lastHeight = this.height;

			//initialize particles
			particles = [];
			sizeRange = maxSize - minSize;
			velocityRange = maxVelocity - minVelocity;
			for (i = 0; i < particleCount; i++) {
				particles.push(Math.random() * 2 - 1); //position
				particles.push(Math.random() * velocityRange + minVelocity); //velocity
				particles.push(Math.random() * sizeRange + minSize); //size
				particles.push(Math.random() * 0.2); //intensity
			}

			particleBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particles), gl.STATIC_DRAW);
			particleBuffer.itemSize = 4;
			particleBuffer.numItems = particleCount;

			particleVertex = [
				'#define SHADER_NAME seriously.tvglitch.particle',
				'precision mediump float;',

				'attribute vec4 particle;',

				'uniform float time;',
				'uniform float height;',

				'varying float intensity;',

				'void main(void) {',
				'	float y = particle.x + time * particle.y;',
				'	y = fract((y + 1.0) / 2.0) * 4.0 - 2.0;',
				'	intensity = particle.w;',
				'	gl_Position = vec4(0.0, -y , 1.0, 2.0);',
				//'	gl_Position = vec4(0.0, 1.0 , 1.0, 1.0);',
				'	gl_PointSize = height * particle.z;',
				'}'
			].join('\n');

			particleFragment = [
				'#define SHADER_NAME seriously.tvglitch.particle',
				'precision mediump float;',

				'varying float intensity;',

				'void main(void) {',
				'	gl_FragColor = vec4(1.0);',
				'	gl_FragColor.a = 2.0 * intensity * (1.0 - abs(gl_PointCoord.y - 0.5));',
				'}'
			].join('\n');

			particleShader = new ShaderProgram(gl, particleVertex, particleFragment);

			particleFrameBuffer = new FrameBuffer(gl, 1, Math.max(1, this.height / 2));
			parent();
		},
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'#define HardLight(top, bottom)  (1.0 - 2.0 * (1.0 - top) * (1.0 - bottom))',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform sampler2D particles;',
				'uniform float time;',
				'uniform float scanlines;',
				'uniform float lineSync;',
				'uniform float lineHeight;', //for scanlines and distortion
				'uniform float distortion;',
				'uniform float vsync;',
				'uniform float bars;',
				'uniform float frameSharpness;',
				'uniform float frameShape;',
				'uniform float frameLimit;',
				'uniform vec4 frameColor;',

				//todo: need much better pseudo-random number generator
				noiseHelpers +
				snoise2d +

				'void main(void) {',
				'	vec2 texCoord = vTexCoord;',

				//distortion
				'	float drandom = snoise(vec2(time * 10.0, texCoord.y /lineHeight));',
				'	float distortAmount = distortion * (drandom - 0.25) * 0.5;',
				//line sync
				'	vec4 particleOffset = texture2D(particles, vec2(0.0, texCoord.y));',
				'	distortAmount -= lineSync * (2.0 * particleOffset.a - 0.5);',

				'	texCoord.x -= distortAmount;',
				'	texCoord.x = mod(texCoord.x, 1.0);',

				//vertical sync
				'	float roll;',
				'	if (vsync != 0.0) {',
				'		roll = fract(time / vsync);',
				'		texCoord.y = mod(texCoord.y - roll, 1.0);',
				'	}',

				'	vec4 pixel = texture2D(source, texCoord);',

				//horizontal bars
				'	float barsAmount = particleOffset.r;',
				'	if (barsAmount > 0.0) {',
				'		pixel = vec4(pixel.r + bars * barsAmount,' +
				'pixel.g + bars * barsAmount,' +
				'pixel.b + bars * barsAmount,' +
				'pixel.a);',
				'	}',

				'	if (mod(texCoord.y / lineHeight, 2.0) < 1.0 ) {',
				'		pixel.rgb *= (1.0 - scanlines);',
				'	}',

				'	float f = (1.0 - gl_FragCoord.x * gl_FragCoord.x) * (1.0 - gl_FragCoord.y * gl_FragCoord.y);',
				'	float frame = clamp( frameSharpness * (pow(f, frameShape) - frameLimit), 0.0, 1.0);',

				'	gl_FragColor = mix(frameColor, pixel, frame);',
				'}'
			].join('\n');

			return shaderSource;
		},
		resize: function () {
			if (particleFrameBuffer) {
				particleFrameBuffer.resize(1, Math.max(1, this.height / 2));
			}
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {
			let doParticles = (lastTime !== this.inputs.time),
				vsyncPeriod;

			if (lastHeight !== this.height) {
				lastHeight = this.height;
				doParticles = true;
			}

			//todo: make this configurable?
			uniforms.lineHeight = 1 / this.height;

			if (this.inputs.verticalSync) {
				vsyncPeriod = 0.2 / this.inputs.verticalSync;
				uniforms.vsync = vsyncPeriod;
			} else {
				vsyncPeriod = 1;
				uniforms.vsync = 0;
			}
			uniforms.time = (this.inputs.time % (1000 * vsyncPeriod));
			uniforms.distortion = Math.random() * this.inputs.distortion;

			//render particle canvas and attach uniform
			//todo: this is a good spot for parallel processing. ParallelArray maybe?
			if (doParticles && (this.inputs.lineSync || this.inputs.bars)) {
				particleShader.use();
				gl.viewport(0, 0, 1, this.height / 2);
				gl.bindFramebuffer(gl.FRAMEBUFFER, particleFrameBuffer.frameBuffer);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				gl.enableVertexAttribArray(particleShader.location.particle);
				gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
				gl.vertexAttribPointer(particleShader.location.particle, particleBuffer.itemSize, gl.FLOAT, false, 0, 0);
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
				particleShader.time.set(uniforms.time * this.inputs.barsRate);
				particleShader.height.set(this.height);
				gl.drawArrays(gl.POINTS, 0, particleCount);

				lastTime = this.inputs.time;
			}
			uniforms.particles = particleFrameBuffer.texture;

			parent(shader, model, uniforms, frameBuffer);
		},
		destroy: function () {
			particleBuffer = null;
			if (particleFrameBuffer) {
				particleFrameBuffer.destroy();
				particleFrameBuffer = null;
			}
		}
	};
},
{
	inPlace: false,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		time: {
			type: 'number',
			defaultValue: 0
		},
		distortion: {
			type: 'number',
			defaultValue: 0.1,
			min: 0,
			max: 1
		},
		verticalSync: {
			type: 'number',
			defaultValue: 0.1,
			min: 0,
			max: 1
		},
		lineSync: {
			type: 'number',
			uniform: 'lineSync',
			defaultValue: 0.2,
			min: 0,
			max: 1
		},
		scanlines: {
			type: 'number',
			uniform: 'scanlines',
			defaultValue: 0.3,
			min: 0,
			max: 1
		},
		bars: {
			type: 'number',
			uniform: 'bars',
			defaultValue: 0,
			min: 0,
			max: 1
		},
		barsRate: {
			type: 'number',
			defaultValue: 1
		},
		frameShape: {
			type: 'number',
			uniform: 'frameShape',
			min: 0,
			max: 2,
			defaultValue: 0.27
		},
		frameLimit: {
			type: 'number',
			uniform: 'frameLimit',
			min: -1,
			max: 1,
			defaultValue: 0.34
		},
		frameSharpness: {
			type: 'number',
			uniform: 'frameSharpness',
			min: 0,
			max: 40,
			defaultValue: 8.4
		},
		frameColor: {
			type: 'color',
			uniform: 'frameColor',
			defaultValue: [0, 0, 0, 1]
		}
	},
	title: 'TV Glitch'
});

Seriously$1.plugin('mirror', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'uniform vec2 resolution;',
			'uniform sampler2D source;',

			'varying vec2 vTexCoord;',

			'void main(void) {',
			'	gl_FragColor = texture2D(source, vec2(0.5 - abs(0.5 - vTexCoord.x), vTexCoord.y));',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		}
	},
	title: 'Mirror',
	description: 'Shader Mirror Effect'
});

Seriously$1.plugin('colorcomplements', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec4 guideColor;',
			'uniform float correlation;',
			'uniform float amount;',
			'uniform float concentration;',

			'float hueLerp(float h1, float h2, float v) {',
			'	float d = abs(h1 - h2);',
			'	if (d <= 0.5) {',
			'		return mix(h1, h2, v);',
			'	} else if (h1 < h2) {',
			'		return fract(mix((h1 + 1.0), h2, v));',
			'	} else {',
			'		return fract(mix(h1, (h2 + 1.0), v));',
			'	}',
			'}',

			/*!
			 * conversion functions borrowed from http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
			 */
			'vec3 rgbToHsv(vec3 c) {',
			'	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);',
			'	vec4 p = c.g < c.b ? vec4(c.bg, K.wz) : vec4(c.gb, K.xy);',
			'	vec4 q = c.r < p.x ? vec4(p.xyw, c.r) : vec4(c.r, p.yzx);',

			'	float d = q.x - min(q.w, q.y);',
			'	float e = 1.0e-10;',
			'	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);',
			'}',

			'vec3 hsvToRgb(vec3 c) {',
			'	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);',
			'	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);',
			'	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);',
			'}',

			'vec3 hsvComplement(vec3 hsv) {',
			'	vec3 compl = hsv;',
			'	compl.x = mod(compl.x - 0.5, 1.0);',
			'	return compl;',
			'}',

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	vec3 hsv = rgbToHsv(pixel.rgb);',
			'	vec3 hsvPole1 = rgbToHsv(guideColor.rgb);',
			'	vec3 hsvPole2 = hsvPole1;',
			'	hsvPole2 = hsvComplement(hsvPole1);',
			'	float dist1 = abs(hsv.x - hsvPole1.x);',
			'	dist1 = dist1 > 0.5 ? 1.0 - dist1 : dist1;',
			'	float dist2 = abs(hsv.x - hsvPole2.x);',
			'	dist2 = dist2 > 0.5 ? 1.0 - dist2 : dist2;',

			'	float descent = smoothstep(0.0, correlation, hsv.y);',
			'	vec3 outputHsv = hsv;',
			'	vec3 pole = dist1 < dist2 ? hsvPole1 : hsvPole2;',
			'	float dist = min(dist1, dist2);',
			'	float c = descent * amount * (1.0 - pow((dist * 2.0), 1.0 / concentration));',
			'	outputHsv.x = hueLerp(hsv.x, pole.x, c);',
			'	outputHsv.y = mix(hsv.y, pole.y, c);',

			'	gl_FragColor = vec4(hsvToRgb(outputHsv), pixel.a);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			min: 0,
			max: 1,
			defaultValue: 0.8
		},
		concentration: {
			type: 'number',
			uniform: 'concentration',
			min: 0.1,
			max: 4,
			defaultValue: 2
		},
		correlation: {
			type: 'number',
			uniform: 'correlation',
			min: 0,
			max: 1,
			defaultValue: 0.5
		},
		guideColor: {
			type: 'color',
			uniform: 'guideColor',
			defaultValue: [1, 0.5, 0, 1]
		}
	},
	title: 'Color Complements',
	categories: ['color'],
	description: 'http://theabyssgazes.blogspot.com/2010/03/teal-and-orange-hollywood-please-stop.html'
});

Seriously$1.plugin('crop', function () {
	const me = this;

	// custom resize method
	function resize() {
		let width = 1,
			height = 1,
			source = me.inputs.source,
			target,
			i;

		if (me.source) {
			width = me.source.width;
			height = me.source.height;
		} else if (me.sources && me.sources.source) {
			width = me.sources.source.width;
			height = me.sources.source.height;
		}

		width = width - me.inputs.left - me.inputs.right;
		height = height - me.inputs.top - me.inputs.bottom;

		width = Math.max(1, Math.floor(width));
		height = Math.max(1, Math.floor(height));


		if (me.width !== width || me.height !== height) {
			me.width = width;
			me.height = height;

			me.uniforms.resolution[0] = width;
			me.uniforms.resolution[1] = height;

			if (me.frameBuffer) {
				me.frameBuffer.resize(me.width, me.height);
			}

			me.emit('resize');
			me.setDirty();
		}

		for (i = 0; i < me.targets.length; i++) {
			target = me.targets[i];
			target.resize();
			if (target.setTransformDirty) {
				target.setTransformDirty();
			}
		}
	}

	me.resize = resize;

	return {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform mat4 transform;',

				'uniform float top;',
				'uniform float left;',
				'uniform float bottom;',
				'uniform float right;',

				'varying vec2 vTexCoord;',

				'const vec2 ZERO = vec2(0.0);',
				'const vec2 ONE = vec2(1.0);',

				'void main(void) {',
				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	gl_Position.w = screenPosition.w;',

				'	vec2 dim = resolution + vec2(right + left, bottom + top);',
				'	vec2 scale = dim / resolution;',
				'	vec2 offset = vec2(left, bottom) / resolution;',

				'	vTexCoord = max(ZERO, (texCoord + offset) / scale);',
				'}\n'
			].join('\n');
			return shaderSource;
		},
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				update: resize
			},
			top: {
				type: 'number',
				uniform: 'top',
				min: 0,
				step: 1,
				update: resize,
				defaultValue: 0
			},
			left: {
				type: 'number',
				uniform: 'left',
				min: 0,
				step: 1,
				update: resize,
				defaultValue: 0
			},
			bottom: {
				type: 'number',
				uniform: 'bottom',
				min: 0,
				step: 1,
				update: resize,
				defaultValue: 0
			},
			right: {
				type: 'number',
				uniform: 'right',
				min: 0,
				step: 1,
				update: resize,
				defaultValue: 0
			}
		}
	};
},
{
	inPlace: true,
	title: 'Crop'
});

Seriously$1.plugin('gradientwipe', function () {
	this.uniforms.resGradient = [1, 1];
	this.uniforms.resSource = [1, 1];

	return {
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform vec2 resSource;',
				'uniform vec2 resGradient;',

				'varying vec2 texCoordSource;',
				'varying vec2 texCoordGradient;',

				'const vec2 HALF = vec2(0.5);',

				'void main(void) {',
				//we don't need to do a transform in this shader, since this effect is not "inPlace"
				'	gl_Position = position;',

				'	vec2 adjusted = (texCoord - HALF) * resolution;',

				'	texCoordSource = adjusted / resSource + HALF;',
				'	texCoordGradient = adjusted / resGradient + HALF;',
				'}'
			].join('\n');

			shaderSource.fragment = [
				'precision mediump float;\n',

				'varying vec2 texCoordSource;',
				'varying vec2 texCoordGradient;',

				'uniform sampler2D source;',
				'uniform sampler2D gradient;',

				'uniform float transition;',
				'uniform float smoothness;',
				'uniform bool invert;',

				'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);',

				'void main(void) {',
				'	float gradientVal = 1.0 - dot(texture2D(gradient, texCoordGradient).rgb, lumcoeff);',

				'	if (invert) {',
				'		gradientVal = 1.0 - gradientVal;',
				'	}',

				'	float amount = 1.0 - transition;',

				'	float mn = (amount - smoothness * (1.0 - amount));',
				'	float mx = (amount + smoothness * amount);',

				'	if (gradientVal <= mn) {',
				'		gl_FragColor = texture2D(source, texCoordSource);',
				'		return;',
				'	}',

				'	if (gradientVal >= mx) {',
				'		gl_FragColor = vec4(0.0);',
				'		return;',
				'	}',

				'	float alpha = mix(1.0, 0.0, smoothstep(mn, mx, gradientVal));',
				'	vec4 pixel = texture2D(source, texCoordSource);',

				'	gl_FragColor = vec4(pixel.rgb, pixel.a * alpha);',
				'}'
			].join('\n');

			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {
			if (uniforms.transition <= 0) {
				//uniforms.source = uniforms.sourceB;
				parent(this.baseShader, model, uniforms, frameBuffer);
				return;
			}

			if (uniforms.transition >= 1) {
				const gl = this.gl;

				gl.viewport(0, 0, this.width, this.height);
				gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
				gl.clearColor(0.0, 0.0, 0.0, 0.0);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

				return;
			}

			parent(shader, model, uniforms, frameBuffer);
		},
		inPlace: false,
		requires: function (sourceName, inputs) {

			if (sourceName === 'source' && inputs.transition >= 1) {
				return false;
			}

			if (sourceName === 'gradient' &&
				(inputs.transition <= 0 || inputs.transition >= 1)) {
				return false;
			}

			return true;
		},
		resize: function () {
			const source = this.inputs.source,
				gradient = this.inputs.gradient;

			if (source) {
				this.uniforms.resSource[0] = source.width;
				this.uniforms.resSource[1] = source.height;
			} else {
				this.uniforms.resSource[0] = 1;
				this.uniforms.resSource[1] = 1;
			}

			if (gradient) {
				this.uniforms.resGradient[0] = gradient.width;
				this.uniforms.resGradient[1] = gradient.height;
			} else {
				this.uniforms.resGradient[0] = 1;
				this.uniforms.resGradient[1] = 1;
			}
		}
	};
},
{
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		gradient: {
			type: 'image',
			uniform: 'gradient'
		},
		transition: {
			type: 'number',
			uniform: 'transition',
			defaultValue: 0
		},
		invert: {
			type: 'boolean',
			uniform: 'invert',
			defaultValue: false
		},
		smoothness: {
			type: 'number',
			uniform: 'smoothness',
			defaultValue: 0,
			min: 0,
			max: 1
		}
	},
	title: 'Gradient Wipe'
});

/*!
 * Horn-Schunke Optical Flow
 * Based on shader by Andrew Benson
 * https://github.com/v002/v002-Optical-Flow/blob/master/v002.GPUHSFlow.frag
 *
 * Creative Commons, Attribution – Non Commercial – Share Alike 3.0
 * http://v002.info/licenses/
 */

Seriously$1.plugin('opticalflow', function () {
	let previousFrameBuffer,
		baseShader;

	return {
		initialize: function (initialize) {
			previousFrameBuffer = new FrameBuffer(this.gl, this.width, this.height);
			initialize();
			baseShader = this.baseShader;
		},
		resize: function () {
			previousFrameBuffer.resize(this.width, this.height);
		},
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform sampler2D previous;',
				'uniform vec2 resolution;',

				'uniform vec2 scale;',
				'uniform float offsetX;',
				'uniform float lambda;',
				// 'const vec4 lumcoeff = vec4(0.299, 0.587, 0.114, 0.0);',

				'void main() {',
				'	vec4 a = texture2D(previous, vTexCoord);',
				'	vec4 b = texture2D(source, vTexCoord);',
				'	vec2 offset = offsetX / resolution;',
				'	vec2 x1 = vec2(offset.x, 0.0);',
				'	vec2 y1 = vec2(0.0, offset.y);',

				//get the difference
				'	vec4 curdif = b - a;',

				//calculate the gradient
				'	vec4 gradx = texture2D(source, vTexCoord + x1) - texture2D(source, vTexCoord - x1);',
				'	gradx += texture2D(previous, vTexCoord + x1) - texture2D(previous, vTexCoord - x1);',

				'	vec4 grady = texture2D(source, vTexCoord + y1) - texture2D(source, vTexCoord - y1);',
				'	grady += texture2D(previous, vTexCoord + y1) - texture2D(previous, vTexCoord - y1);',

				'	vec4 gradmag = sqrt((gradx * gradx) + (grady * grady) + vec4(lambda));',

				'	vec4 vx = curdif * (gradx / gradmag);',
				'	float vxd = vx.r;', //assumes greyscale

				//format output for flowrepos, out(-x,+x,-y,+y)
				'	vec2 xout = vec2(max(vxd, 0.0), abs(min(vxd, 0.0))) * scale.x;',

				'	vec4 vy = curdif * (grady / gradmag);',
				'	float vyd = vy.r;', //assumes greyscale

				//format output for flowrepos, out(-x,+x,-y,+y)
				'	vec2 yout = vec2(max(vyd, 0.0), abs(min(vyd, 0.0))) * scale.y;',

				'	gl_FragColor = clamp(vec4(xout.xy, yout.xy), 0.0, 1.0);',
				'	gl_FragColor.a = 1.0;',
				'}'
			].join('\n');

			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {
			uniforms.previous = previousFrameBuffer.texture;

			parent(shader, model, uniforms, frameBuffer);

			//todo: just swap buffers rather than copy?
			parent(baseShader, model, uniforms, previousFrameBuffer.frameBuffer);
		},
		destroy: function () {
			if (previousFrameBuffer) {
				previousFrameBuffer.destroy();
				previousFrameBuffer = null;
			}
		}
	};
},
{
	inPlace: false,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		lambda: {
			type: 'number',
			uniform: 'lambda',
			min: 0,
			defaultValue: 0,
			description: 'noise limiting'
		},
		scaleResult: {
			type: 'vector',
			dimensions: 2,
			uniform: 'scale',
			defaultValue: [1, 1]
		},
		offset: {
			type: 'number',
			uniform: 'offsetX',
			defaultValue: 1,
			min: 1,
			max: 100,
			description: 'distance between texel samples for gradient calculation'
		}
	},
	description: 'Horn-Schunke Optical Flow',
	title: 'Optical Flow'
});

Seriously$1.plugin('brightness-contrast', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float brightness;',
			'uniform float saturation;',
			'uniform float contrast;',

			'const vec3 half3 = vec3(0.5);',

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',

			//adjust brightness
			'	vec3 color = pixel.rgb * brightness;',

			//adjust contrast
			'	color = (color - half3) * contrast + half3;',

			//keep alpha the same
			'	gl_FragColor = vec4(color, pixel.a);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		brightness: {
			type: 'number',
			uniform: 'brightness',
			defaultValue: 1,
			min: 0
		},
		contrast: {
			type: 'number',
			uniform: 'contrast',
			defaultValue: 1,
			min: 0
		}
	},
	title: 'Brightness/Contrast',
	description: 'Multiply brightness and contrast values. Works the same as CSS filters.'
});

/*
 *	experimental chroma key algorithm
 *	todo: try allowing some color despill on opaque pixels
 *	todo: add different modes?
 */

Seriously$1.plugin('chroma', {
	shader: function (inputs, shaderSource) {
		shaderSource.vertex = [
			'precision mediump float;',

			'attribute vec4 position;',
			'attribute vec2 texCoord;',

			'uniform vec2 resolution;',
			'uniform mat4 transform;',

			'varying vec2 vTexCoord;',

			'uniform vec4 screen;',
			'uniform float balance;',
			'varying float screenSat;',
			'varying vec3 screenPrimary;',

			'void main(void) {',
			'	float fmin = min(min(screen.r, screen.g), screen.b);', //Min. value of RGB
			'	float fmax = max(max(screen.r, screen.g), screen.b);', //Max. value of RGB
			'	float secondaryComponents;',

			'	screenPrimary = step(fmax, screen.rgb);',
			'	secondaryComponents = dot(1.0 - screenPrimary, screen.rgb);',
			'	screenSat = fmax - mix(secondaryComponents - fmin, secondaryComponents / 2.0, balance);',

			// first convert to screen space
			'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
			'	screenPosition = transform * screenPosition;',

			// convert back to OpenGL coords
			'	gl_Position = screenPosition;',
			'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
			'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
			'	vTexCoord = texCoord;',
			'}'
		].join('\n');
		shaderSource.fragment = [
			this.inputs.mask ? '#define MASK' : '',
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec4 screen;',
			'uniform float screenWeight;',
			'uniform float balance;',
			'uniform float clipBlack;',
			'uniform float clipWhite;',
			'uniform bool mask;',

			'varying float screenSat;',
			'varying vec3 screenPrimary;',

			'void main(void) {',
			'	float pixelSat, secondaryComponents;',
			'	vec4 sourcePixel = texture2D(source, vTexCoord);',

			'	float fmin = min(min(sourcePixel.r, sourcePixel.g), sourcePixel.b);', //Min. value of RGB
			'	float fmax = max(max(sourcePixel.r, sourcePixel.g), sourcePixel.b);', //Max. value of RGB
			//	luminance = fmax

			'	vec3 pixelPrimary = step(fmax, sourcePixel.rgb);',

			'	secondaryComponents = dot(1.0 - pixelPrimary, sourcePixel.rgb);',
			'	pixelSat = fmax - mix(secondaryComponents - fmin, secondaryComponents / 2.0, balance);', // Saturation

			// solid pixel if primary color component is not the same as the screen color
			'	float diffPrimary = dot(abs(pixelPrimary - screenPrimary), vec3(1.0));',
			'	float solid = step(1.0, step(pixelSat, 0.1) + step(fmax, 0.1) + diffPrimary);',

			/*
			Semi-transparent pixel if the primary component matches but if saturation is less
			than that of screen color. Otherwise totally transparent
			*/
			'	float alpha = max(0.0, 1.0 - pixelSat / screenSat);',
			'	alpha = smoothstep(clipBlack, clipWhite, alpha);',
			'	vec4 semiTransparentPixel = vec4((sourcePixel.rgb - (1.0 - alpha) * screen.rgb * screenWeight) / max(0.0001, alpha), alpha);',

			'	vec4 pixel = mix(semiTransparentPixel, sourcePixel, solid);',

			/*
			Old branching code
			'	if (pixelSat < 0.1 || fmax < 0.1 || any(notEqual(pixelPrimary, screenPrimary))) {',
			'		pixel = sourcePixel;',

			'	} else if (pixelSat < screenSat) {',
			'		float alpha = max(0.0, 1.0 - pixelSat / screenSat);',
			'		alpha = smoothstep(clipBlack, clipWhite, alpha);',
			'		pixel = vec4((sourcePixel.rgb - (1.0 - alpha) * screen.rgb * screenWeight) / alpha, alpha);',
			'	}',
			//*/


			'#ifdef MASK',
			'	gl_FragColor = vec4(vec3(pixel.a), 1.0);',
			'#else',
			'	gl_FragColor = pixel;',
			'#endif',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		screen: {
			type: 'color',
			uniform: 'screen',
			defaultValue: [66 / 255, 195 / 255, 31 / 255, 1]
		},
		weight: {
			type: 'number',
			uniform: 'screenWeight',
			defaultValue: 1,
			min: 0
		},
		balance: {
			type: 'number',
			uniform: 'balance',
			defaultValue: 1,
			min: 0,
			max: 1
		},
		clipBlack: {
			type: 'number',
			uniform: 'clipBlack',
			defaultValue: 0,
			min: 0,
			max: 1
		},
		clipWhite: {
			type: 'number',
			uniform: 'clipWhite',
			defaultValue: 1,
			min: 0,
			max: 1
		},
		mask: {
			type: 'boolean',
			defaultValue: false,
			uniform: 'mask',
			shaderDirty: true
		}
	},
	title: 'Chroma Key',
	description: ''
});

Seriously$1.plugin('color-select', {
	shader: function (inputs, shaderSource) {
		shaderSource.vertex = [
			'precision mediump float;',

			'attribute vec4 position;',
			'attribute vec2 texCoord;',

			'uniform vec2 resolution;',
			'uniform mat4 transform;',

			'uniform float hueMin;',
			'uniform float hueMax;',
			'uniform float hueMinFalloff;',
			'uniform float hueMaxFalloff;',
			'uniform float saturationMin;',
			'uniform float saturationMax;',
			'uniform float saturationMinFalloff;',
			'uniform float saturationMaxFalloff;',
			'uniform float lightnessMin;',
			'uniform float lightnessMax;',
			'uniform float lightnessMinFalloff;',
			'uniform float lightnessMaxFalloff;',

			'varying vec2 vTexCoord;',
			'varying vec4 adjustedHueRange;',
			'varying vec4 saturationRange;',
			'varying vec4 lightnessRange;',

			'void main(void) {',
			// first convert to screen space
			'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
			'	screenPosition = transform * screenPosition;',

			// convert back to OpenGL coords
			'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
			'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
			'	gl_Position.w = screenPosition.w;',
			'	vTexCoord = texCoord;',

			'	float hueOffset = hueMin - hueMinFalloff;',
			'	adjustedHueRange = mod(vec4(' +
			'hueOffset, ' +
			'hueMin - hueOffset, ' +
			'hueMax - hueOffset, ' +
			'hueMax + hueMaxFalloff - hueOffset' +
			'), 360.0);',
			'	if (hueMin != hueMax) {',
			'		if (adjustedHueRange.z == 0.0) {',
			'			adjustedHueRange.z = 360.0;',
			'			adjustedHueRange.w += 360.0;',
			'		} else if (adjustedHueRange.w == 0.0) {',
			'			adjustedHueRange.w += 360.0;',
			'		}',
			'	}',
			'	saturationRange = vec4(' +
			'saturationMin - saturationMinFalloff, ' +
			'saturationMin, ' +
			'saturationMax, ' +
			'saturationMax + saturationMaxFalloff ' +
			');',

			'	lightnessRange = vec4(' +
			'lightnessMin - lightnessMinFalloff, ' +
			'lightnessMin, ' +
			'lightnessMax, ' +
			'lightnessMax + lightnessMaxFalloff ' +
			');',
			'}'
		].join('\n');

		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform bool mask;',

			'varying vec4 adjustedHueRange;',
			'varying vec4 saturationRange;',
			'varying vec4 lightnessRange;',

			'vec3 calcHSL(vec3 c) {',
			'	float minColor = min(c.r, min(c.g, c.b));',
			'	float maxColor = max(c.r, max(c.g, c.b));',
			'	float delta = maxColor - minColor;',
			'	vec3 hsl = vec3(0.0, 0.0, (maxColor + minColor) / 2.0);',
			'	if (delta > 0.0) {',
			'		if (hsl.z < 0.5) {',
			'			hsl.y = delta / (maxColor + minColor);',
			'		} else {',
			'			hsl.y = delta / (2.0 - maxColor - minColor);',
			'		}',
			'		if (c.r == maxColor) {',
			'			hsl.x = (c.g - c.b) / delta;',
			'		} else if (c.g == maxColor) {',
			'			hsl.x = 2.0 + (c.b - c.r) / delta;',
			'		} else {',
			'			hsl.x = 4.0 + (c.r - c.g) / delta;',
			'		}',
			'		hsl.x = hsl.x * 360.0 / 6.0;',
			'		if (hsl.x < 0.0) {',
			'			hsl.x += 360.0;',
			'		} else {',
			'			hsl.x = mod(hsl.x, 360.0);',
			'		}',
			'	}',
			'	return hsl;',
			'}',

			'void main(void) {',
			'	vec4 color = texture2D(source, vTexCoord);',
			'	vec3 hsl = calcHSL(color.rgb);',
			'	float adjustedHue = mod(hsl.x - adjustedHueRange.x, 360.0);',

			// calculate hue mask
			'	float maskValue;',
			'	if (adjustedHue < adjustedHueRange.y) {',
			'		maskValue = smoothstep(0.0, adjustedHueRange.y, adjustedHue);',
			'	} else if (adjustedHue < adjustedHueRange.z) {',
			'		maskValue = 1.0;',
			'	} else {',
			'		maskValue = 1.0 - smoothstep(adjustedHueRange.z, adjustedHueRange.w, adjustedHue);',
			'	}',

			// calculate saturation maskValue
			'	if (maskValue > 0.0) {',
			'		if (hsl.y < saturationRange.y) {',
			'			maskValue = min(maskValue, smoothstep(saturationRange.x, saturationRange.y, hsl.y));',
			'		} else {',
			'			maskValue = min(maskValue, 1.0 - smoothstep(saturationRange.z, saturationRange.w, hsl.y));',
			'		}',
			'	}',

			// calculate lightness maskValue
			'	if (maskValue > 0.0) {',
			'		if (hsl.z < lightnessRange.y) {',
			'			maskValue = min(maskValue, smoothstep(lightnessRange.x, lightnessRange.z, hsl.y));',
			'		} else {',
			'			maskValue = min(maskValue, 1.0 - smoothstep(lightnessRange.z, lightnessRange.w, hsl.z));',
			'		}',
			'	}',

			'	if (mask) {',
			'		gl_FragColor = vec4(maskValue, maskValue, maskValue, 1.0);',
			'	} else {',
			'		color.a = min(color.a, maskValue);',
			'		gl_FragColor = color;',
			'	}',
			'}'
		].join('\n');

		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		hueMin: {
			type: 'number',
			uniform: 'hueMin',
			defaultValue: 0
		},
		hueMax: {
			type: 'number',
			uniform: 'hueMax',
			defaultValue: 360
		},
		hueMinFalloff: {
			type: 'number',
			uniform: 'hueMinFalloff',
			defaultValue: 0,
			min: 0
		},
		hueMaxFalloff: {
			type: 'number',
			uniform: 'hueMaxFalloff',
			defaultValue: 0,
			min: 0
		},
		saturationMin: {
			type: 'number',
			uniform: 'saturationMin',
			defaultValue: 0,
			min: 0,
			max: 1
		},
		saturationMax: {
			type: 'number',
			uniform: 'saturationMax',
			defaultValue: 1,
			min: 0,
			max: 1
		},
		saturationMinFalloff: {
			type: 'number',
			uniform: 'saturationMinFalloff',
			defaultValue: 0,
			min: 0
		},
		saturationMaxFalloff: {
			type: 'number',
			uniform: 'saturationMaxFalloff',
			defaultValue: 0,
			min: 0
		},
		lightnessMin: {
			type: 'number',
			uniform: 'lightnessMin',
			defaultValue: 0,
			min: 0,
			max: 1
		},
		lightnessMax: {
			type: 'number',
			uniform: 'lightnessMax',
			defaultValue: 1,
			min: 0,
			max: 1
		},
		lightnessMinFalloff: {
			type: 'number',
			uniform: 'lightnessMinFalloff',
			defaultValue: 0,
			min: 0
		},
		lightnessMaxFalloff: {
			type: 'number',
			uniform: 'lightnessMaxFalloff',
			defaultValue: 0,
			min: 0
		},
		mask: {
			type: 'boolean',
			defaultValue: false,
			uniform: 'mask'
		}
	},
	title: 'Color Select',
	description: 'Create a mask by hue, saturation and lightness range.'
});

/*!
 * algorithm from http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
 */

Seriously$1.plugin('temperature', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.vertex = [
			'precision mediump float;',

			'attribute vec4 position;',
			'attribute vec2 texCoord;',

			'uniform vec2 resolution;',
			'uniform mat4 transform;',

			'uniform float temperature;',

			'varying vec2 vTexCoord;',
			'varying vec3 tempFactor;',

			'const vec3 luma = vec3(0.2125,0.7154,0.0721);',

			'vec3 temperatureRGB(float t) {',
			'	float temp = t / 100.0;',
			'	vec3 color = vec3(1.0);',
			'	if (temp < 66.0) {',
			'		color.g = 0.3900815787690196 * log(temp) - 0.6318414437886275;',
			'		color.b = 0.543206789110196 * log(temp - 10.0) - 1.19625408914;',
			'	} else {',
			'		color.r = 1.292936186062745 * pow(temp - 60.0, -0.1332047592);',
			'		color.g = 1.129890860895294 * pow(temp - 60.0, -0.0755148492);',
			'	}',
			'	return color;',
			'}',

			'void main(void) {',
			// first convert to screen space
			'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
			'	screenPosition = transform * screenPosition;',

			// convert back to OpenGL coords
			'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
			'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
			'	gl_Position.w = screenPosition.w;',
			'	vTexCoord = texCoord;',
			'	vec3 tempColor = temperatureRGB(temperature);',
			'	tempFactor = dot(tempColor, luma) / tempColor;',
			'}\n'
		].join('\n');

		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',
			'varying vec3 tempFactor;',

			'uniform sampler2D source;',

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	gl_FragColor = vec4(pixel.rgb * tempFactor, pixel.a);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		temperature: {
			type: 'number',
			uniform: 'temperature',
			defaultValue: 6500,
			min: 3000,
			max: 25000
		}
	},
	title: 'Color Temperature',
	description: ''
});

/*!
 * Shader code:
 * Adapted from a blog post by Martin Upitis
 * http://devlog-martinsh.blogspot.com.es/2011/03/glsl-dithering.html
 */

Seriously$1.plugin('dither', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'#define mod4(a) (a >= 4 ? a - 4 : a)',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec2 resolution;',

			'const mat4 dither = mat4(' +
			'1.0, 33.0, 9.0, 41.0,' +
			'49.0, 17.0, 57.0, 25.0,' +
			'13.0, 45.0, 5.0, 37.0,' +
			'61.0, 29.0, 53.0, 21.0' +
			');',

			'float find_closest(int x, int y, float c0) {',
			'	float limit = 0.0;',
			'	int x4 = mod4(x);',
			'	int y4 = mod4(y);',
			//annoying hack since GLSL ES doesn't support variable array index
			'	for (int i = 0; i < 4; i++) {',
			'		if (i == x4) {',
			'			for (int j = 0; j < 4; j++) {',
			'				if (j == y4) {',
			'					limit = dither[i][j];',
			'					break;',
			'				}',
			'			}',
			'		}',
			'	}',
			'	if (x < 4) {',
			'		if (y >= 4) {',
			'			limit += 3.0;',
			'		}',
			'	} else {',
			'		if (y >= 4) {',
			'			limit += 1.0;',
			'		} else {',
			'			limit += 2.0;',
			'		}',
			'	}',
			'	limit /= 65.0;',
			'	return c0 < limit ? 0.0 : 1.0;',
			'}',

			'void main (void)  {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	vec2 coord = vTexCoord * resolution;',
			'	int x = int(mod(coord.x, 8.0));',
			'	int y = int(mod(coord.y, 8.0));',
			'	pixel.r = find_closest(x, y, pixel.r);',
			'	pixel.g = find_closest(x, y, pixel.g);',
			'	pixel.b = find_closest(x, y, pixel.b);',
			'	gl_FragColor = pixel;',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: false,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		}
	},
	title: 'Dither'
});

Seriously$1.plugin('emboss', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.vertex = [
			'precision mediump float;',

			'attribute vec4 position;',
			'attribute vec2 texCoord;',

			'uniform vec2 resolution;',
			'uniform mat4 transform;',

			'varying vec2 vTexCoord1;',
			'varying vec2 vTexCoord2;',

			'void main(void) {',
			// first convert to screen space
			'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
			'	screenPosition = transform * screenPosition;',

			// convert back to OpenGL coords
			'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
			'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
			'	gl_Position.w = screenPosition.w;',

			'	vec2 offset = 1.0 / resolution;',
			'	vTexCoord1 = texCoord - offset;',
			'	vTexCoord2 = texCoord + offset;',
			'}'
		].join('\n');

		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord1;',
			'varying vec2 vTexCoord2;',

			'uniform sampler2D source;',
			'uniform float amount;',

			'const vec3 average = vec3(1.0 / 3.0);',

			'void main (void)  {',
			'	vec4 pixel = vec4(0.5, 0.5, 0.5, 1.0);',

			'	pixel -= texture2D(source, vTexCoord1) * amount;',
			'	pixel += texture2D(source, vTexCoord2) * amount;',
			'	pixel.rgb = vec3(dot(pixel.rgb, average));',

			'	gl_FragColor = pixel;',
			'}'
		].join('\n');
		return shaderSource;
	},
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			defaultValue: 1,
			min: -255 / 3,
			max: 255 / 3
		}
	},
	title: 'Emboss',
	categories: [],
	description: 'Emboss'
});

Seriously$1.plugin('exposure', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',

			'uniform float exposure;',

			'void main (void)  {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	gl_FragColor = vec4(pow(2.0, exposure) * pixel.rgb, pixel.a);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		exposure: {
			type: 'number',
			uniform: 'exposure',
			defaultValue: 1,
			min: -8,
			max: 8
		}
	},
	title: 'Exposure',
	categories: ['film'],
	description: 'Exposure control'
});

Seriously$1.plugin('freeze', {
	draw: function (shader, model, uniforms, frameBuffer, draw) {
		if (!this.inputs.frozen) {
			draw(shader, model, uniforms, frameBuffer);
		}
	},
	requires: function () {
		return !this.inputs.frozen;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		frozen: {
			type: 'boolean',
			defaultValue: false,
			updateSources: true
		}
	},
	title: 'Freeze',
	description: 'Freeze Frame'
});

Seriously$1.plugin('highlights-shadows', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float shadows;',
			'uniform float highlights;',

			'const vec3 luma = vec3(0.2125, 0.7154, 0.0721);',

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	float luminance = dot(pixel.rgb, luma);',
			'	float shadow = clamp((pow(luminance, 1.0 / (shadows + 1.0)) + (-0.76) * pow(luminance, 2.0 / (shadows + 1.0))) - luminance, 0.0, 1.0);',
			'	float highlight = clamp((1.0 - (pow(1.0 - luminance, 1.0 / (2.0 - highlights)) + (-0.8) * pow(1.0 - luminance, 2.0 / (2.0 - highlights)))) - luminance, -1.0, 0.0);',
			'	vec3 rgb = (luminance + shadow + highlight) * (pixel.rgb / vec3(luminance));',
			//'	vec3 rgb = vec3(0.0, 0.0, 0.0) + ((luminance + shadow + highlight) - 0.0) * ((pixel.rgb - vec3(0.0, 0.0, 0.0))/(luminance - 0.0));',
			'	gl_FragColor = vec4(rgb, pixel.a);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		highlights: {
			type: 'number',
			uniform: 'highlights',
			min: 0,
			max: 1,
			defaultValue: 1
		},
		shadows: {
			type: 'number',
			uniform: 'shadows',
			min: 0,
			max: 1,
			defaultValue: 0
		}
	},
	title: 'Highlights/Shadows',
	description: 'Darken highlights, lighten shadows'
});

Seriously$1.plugin('lumakey', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',

			'uniform float threshold;',
			'uniform float clipBlack;',
			'uniform float clipWhite;',
			'uniform bool invert;',

			'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);',

			'void main (void)  {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	float luma = dot(pixel.rgb,lumcoeff);',
			'	float alpha = 1.0 - smoothstep(clipBlack, clipWhite, luma);',
			'	if (invert) alpha = 1.0 - alpha;',
			'	gl_FragColor = vec4(pixel.rgb, min(pixel.a, alpha) );',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		clipBlack: {
			type: 'number',
			uniform: 'clipBlack',
			defaultValue: 0.9,
			min: 0,
			max: 1
		},
		clipWhite: {
			type: 'number',
			uniform: 'clipWhite',
			defaultValue: 1,
			min: 0,
			max: 1
		},
		invert: {
			type: 'boolean',
			uniform: 'invert',
			defaultValue: false
		}
	},
	title: 'Luma Key',
	categories: ['key'],
	description: ''
});

Seriously$1.plugin('fader', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec4 color;',
			'uniform float amount;',

			'void main(void) {',
			'	gl_FragColor = texture2D(source, vTexCoord);',
			'	gl_FragColor = mix(gl_FragColor, color, amount);',
			'}'
		].join('\n');
		return shaderSource;
	},
	requires: function (sourceName, inputs) {
		return inputs.amount < 1;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		color: {
			type: 'color',
			uniform: 'color',
			defaultValue: [0, 0, 0, 1]
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			defaultValue: 0.5,
			min: 0,
			max: 1
		}
	},
	title: 'Fader',
	description: 'Fade image to a color'
});

/*!
 * Shader adapted from glfx.js by Evan Wallace
 * License: https://github.com/evanw/glfx.js/blob/master/LICENSE
 */

Seriously$1.plugin('hex', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;\n',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec2 resolution;',
			'uniform vec2 center;',
			'uniform float size;',

			'void main(void) {',
			'	vec2 aspect = normalize(resolution);',
			'	vec2 tex = (vTexCoord * aspect - center) / size;',
			'	tex.y /= 0.866025404;',
			'	tex.x -= tex.y * 0.5;',
			'	vec2 a;',
			'	if (tex.x + tex.y - floor(tex.x) - floor(tex.y) < 1.0) {',
			'		a = vec2(floor(tex.x), floor(tex.y));',
			'	} else {',
			'		a = vec2(ceil(tex.x), ceil(tex.y));',
			'	}',
			'	vec2 b = vec2(ceil(tex.x), floor(tex.y));',
			'	vec2 c = vec2(floor(tex.x), ceil(tex.y));',
			'	vec3 tex3 = vec3(tex.x, tex.y, 1.0 - tex.x - tex.y);',
			'	vec3 a3 = vec3(a.x, a.y, 1.0 - a.x - a.y);',
			'	vec3 b3 = vec3(b.x, b.y, 1.0 - b.x - b.y);',
			'	vec3 c3 = vec3(c.x, c.y, 1.0 - c.x - c.y);',
			'	float alen =length(tex3 - a3);',
			'	float blen =length(tex3 - b3);',
			'	float clen =length(tex3 - c3);',
			'	vec2 choice;',
			'	if (alen < blen) {',
			'		if (alen < clen) {',
			'			choice = a;',
			'		} else {',
			'			choice = c;',
			'		}',
			'	} else {',
			'		if (blen < clen) {',
			'			choice = b;',
			'		} else {',
			'			choice = c;',
			'		}',
			'	}',
			'	choice.x += choice.y * 0.5;',
			'	choice.y *= 0.866025404;',
			'	choice *= size / aspect;',
			'	gl_FragColor = texture2D(source, choice + center / aspect);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: false,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		size: {
			type: 'number',
			uniform: 'size',
			min: 0,
			max: 0.4,
			defaultValue: 0.01
		},
		center: {
			type: 'vector',
			uniform: 'center',
			dimensions: 2,
			defaultValue: [0, 0]
		}
	},
	title: 'Hex',
	description: 'Hexagonal Pixelate'
});

Seriously$1.plugin('invert', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',

			'void main(void) {',
			'	gl_FragColor = texture2D(source, vTexCoord);',
			'	gl_FragColor = vec4(1.0 - gl_FragColor.rgb, gl_FragColor.a);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		}
	},
	title: 'Invert',
	description: 'Invert image color'
});

Seriously$1.plugin('noise', {
	shader: function (inputs, shaderSource, utilities) {
		const frag = [
			'precision mediump float;',

			'#define Blend(base, blend, funcf)		vec3(funcf(base.r, blend.r), funcf(base.g, blend.g), funcf(base.b, blend.b))',
			'#define BlendOverlayf(base, blend) (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)))',
			'#define BlendOverlay(base, blend)		Blend(base, blend, BlendOverlayf)',
			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',

			'uniform vec2 resolution;',
			'uniform float amount;',
			'uniform float time;',

			noiseHelpers,
			snoise3d,
			random$1,

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	float r = random(vec2(time * vTexCoord.xy));',
			'	float noise = snoise(vec3(vTexCoord * (1024.4 + r * 512.0), time)) * 0.5;'
		];

		if (inputs.overlay) {
			frag.push('	vec3 overlay = BlendOverlay(pixel.rgb, vec3(noise));');
			frag.push('	pixel.rgb = mix(pixel.rgb, overlay, amount);');
		} else {
			frag.push('	pixel.rgb += noise * amount;');
		}
		frag.push('	gl_FragColor = pixel;}');

		shaderSource.fragment = frag.join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		overlay: {
			type: 'boolean',
			shaderDirty: true,
			defaultValue: true
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			min: 0,
			max: 1,
			defaultValue: 1
		},
		time: {
			type: 'number',
			uniform: 'time',
			defaultValue: 0,
			mod: 65536
		}
	},
	title: 'Noise',
	description: 'Add noise'
});

Seriously$1.plugin('pixelate', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec2 resolution;',
			'uniform vec2 pixelSize;',

			'void main(void) {',
			'	vec2 delta = pixelSize / resolution;',
			'	gl_FragColor = texture2D(source, delta * floor(vTexCoord / delta));',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		pixelSize: {
			type: 'vector',
			dimensions: 2,
			defaultValue: [8, 8],
			min: 0,
			uniform: 'pixelSize'
		}
	},
	title: 'Pixelate'
});

Seriously$1.plugin('polar', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float angle;',

			'const float PI = ' + Math.PI + ';',

			'void main(void) {',
			'	vec2 norm = (1.0 - vTexCoord) * 2.0 - 1.0;',
			'	float theta = mod(PI + atan(norm.x, norm.y) - angle * (PI / 180.0), PI * 2.0);',
			'	vec2 polar = vec2(theta / (2.0 * PI), length(norm));',
			'	gl_FragColor = texture2D(source, polar);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: false,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		angle: {
			type: 'number',
			uniform: 'angle',
			defaultValue: 0
		}
	},
	title: 'Polar Coordinates',
	description: 'Convert cartesian to polar coordinates'
});

/*!
 * http://msdn.microsoft.com/en-us/library/bb313868(v=xnagamestudio.10).aspx
 */

Seriously$1.plugin('ripple', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float wave;',
			'uniform float distortion;',
			'uniform vec2 center;',

			'void main(void) {',
			//todo: can at least move scalar into vertex shader
			'	float scalar = abs(1.0 - abs(distance(vTexCoord, center)));',
			'	float sinOffset = sin(wave / scalar);',
			'	sinOffset = clamp(sinOffset, 0.0, 1.0);',
			'	float sinSign = cos(wave / scalar);',
			'	sinOffset = sinOffset * distortion / 32.0;',
			'	gl_FragColor = texture2D(source, vTexCoord + sinOffset * sinSign);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: false,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		wave: {
			type: 'number',
			uniform: 'wave',
			defaultValue: Math.PI / 0.75
		},
		distortion: {
			type: 'number',
			uniform: 'distortion',
			defaultValue: 1
		},
		center: {
			type: 'vector',
			uniform: 'center',
			dimensions: 2,
			defaultValue: [0.5, 0.5]
		}
	},
	title: 'Ripple Distortion',
	description: ''
});

Seriously$1.plugin('scanlines', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float lines;',
			'uniform float width;',
			'uniform float intensity;',

			//todo: add vertical offset for animating

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	float darken = 2.0 * abs( fract(vTexCoord.y * lines / 2.0) - 0.5);',
			'	darken = clamp(darken - width + 0.5, 0.0, 1.0);',
			'	darken = 1.0 - ((1.0 - darken) * intensity);',
			'	gl_FragColor = vec4(pixel.rgb * darken, 1.0);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		lines: {
			type: 'number',
			uniform: 'lines',
			defaultValue: 60
		},
		size: {
			type: 'number',
			uniform: 'size',
			defaultValue: 0.2,
			min: 0,
			max: 1
		},
		intensity: {
			type: 'number',
			uniform: 'intensity',
			defaultValue: 0.1,
			min: 0,
			max: 1
		}
	},
	title: 'Scan Lines',
	description: ''
});

/*!
 * sepia coefficients borrowed from:
 * http://www.techrepublic.com/blog/howdoi/how-do-i-convert-images-to-grayscale-and-sepia-tone-using-c/120
 */

Seriously$1.plugin('sepia', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec4 light;',
			'uniform vec4 dark;',
			'uniform float desat;',
			'uniform float toned;',

			'const mat4 coeff = mat4(' +
			'0.393, 0.349, 0.272, 1.0,' +
			'0.796, 0.686, 0.534, 1.0, ' +
			'0.189, 0.168, 0.131, 1.0, ' +
			'0.0, 0.0, 0.0, 1.0 ' +
			');',

			'void main(void) {',
			'	vec4 sourcePixel = texture2D(source, vTexCoord);',
			'	gl_FragColor = coeff * sourcePixel;',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		}
	},
	title: 'Sepia',
	description: ''
});

/*!
 * inspired by http://lab.adjazent.com/2009/01/09/more-pixel-bender/
 */

Seriously$1.plugin('sketch', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			//todo: make adjust adjustable
			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec2 resolution;',

			'float res = resolution.x;',
			'float n0 = 97.0 / res;',
			'float n1 = 15.0 / res;',
			'float n2 = 97.0 / res;',
			'float n3 = 9.7 / res;',
			'float total = n2 + ( 4.0 * n0 ) + ( 4.0 * n1 );',

			'const vec3 div3 = vec3(1.0 / 3.0);',

			'void main(void) {',
			'	float offset, temp1, temp2;',
			'	vec4 m, p0, p1, p2, p3, p4, p5, p6, p7, p8;',
			'	offset = n3;',

			'	p0=texture2D(source,vTexCoord);',
			'	p1=texture2D(source,vTexCoord+vec2(-offset,-offset));',
			'	p2=texture2D(source,vTexCoord+vec2( offset,-offset));',
			'	p3=texture2D(source,vTexCoord+vec2( offset, offset));',
			'	p4=texture2D(source,vTexCoord+vec2(-offset, offset));',

			'	offset=n3*2.0;',

			'	p5=texture2D(source,vTexCoord+vec2(-offset,-offset));',
			'	p6=texture2D(source,vTexCoord+vec2( offset,-offset));',
			'	p7=texture2D(source,vTexCoord+vec2( offset, offset));',
			'	p8=texture2D(source,vTexCoord+vec2(-offset, offset));',
			'	m = (p0 * n2 + (p1 + p2 + p3 + p4) * n0 + (p5 + p6 + p7 + p8) * n1) / total;',

			//convert to b/w
			'	temp1 = dot(p0.rgb, div3);',
			'	temp2 = dot(m.rgb, div3);',

			//color dodge blend mode
			'	if (temp2 <= 0.0005) {',
			'		gl_FragColor = vec4( 1.0, 1.0, 1.0, p0.a);',
			'	} else {',
			'		gl_FragColor = vec4( vec3(min(temp1 / temp2, 1.0)), p0.a);',
			'	}',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: false,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		}
	},
	title: 'Sketch',
	description: 'Pencil/charcoal sketch'
});

Seriously$1.plugin('throttle', function () {
	let lastDrawTime = 0;
	return {
		draw: function (shader, model, uniforms, frameBuffer, draw) {
			if (this.inputs.frameRate && Date.now() - lastDrawTime >= 1000 / this.inputs.frameRate) {
				draw(shader, model, uniforms, frameBuffer);
				lastDrawTime = Date.now();
			}
		},
		requires: function (sourceName, inputs) {
			if (inputs.frameRate && Date.now() - lastDrawTime >= 1000 / inputs.frameRate) {
				return true;
			}

			return false;
		}
	};
}, {
	inPlace: true,
	commonShader: true,
	title: 'Throttle',
	description: 'Throttle frame rate',
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		frameRate: {
			type: 'number',
			uniform: 'opacity',
			defaultValue: 15,
			min: 0
		}
	}
});

Seriously$1.plugin('tone', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec4 light;',
			'uniform vec4 dark;',
			'uniform float desat;',
			'uniform float toned;',

			'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);',

			'void main(void) {',
			'	vec4 sourcePixel = texture2D(source, vTexCoord);',
			'	vec3 sceneColor = light.rgb * sourcePixel.rgb;',
			'	vec3 gray = vec3(dot(lumcoeff, sceneColor));',
			'	vec3 muted = mix(sceneColor, gray, desat);',
			'	vec3 tonedColor = mix(dark.rgb, light.rgb, gray);',
			'	gl_FragColor = vec4(mix(muted, tonedColor, toned), sourcePixel.a);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		light: {
			type: 'color',
			uniform: 'light',
			defaultValue: [1, 0.9, 0.5, 1]
		},
		dark: {
			type: 'color',
			uniform: 'dark',
			defaultValue: [0.2, 0.05, 0, 1]
		},
		toned: {
			type: 'number',
			uniform: 'toned',
			defaultValue: 1,
			minimumRange: 0,
			maximumRange: 1
		},
		desat: {
			type: 'number',
			uniform: 'desat',
			defaultValue: 0.5,
			minimumRange: 0,
			maximumRange: 1
		}
	},
	title: 'Tone',
	description: ''
});

return Seriously$1;

})));
