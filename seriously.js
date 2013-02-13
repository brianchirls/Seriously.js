/*jslint devel: true, bitwise: true, browser: true, white: true, nomen: true, plusplus: true, maxerr: 50, indent: 4 */
/*global Float32Array, Uint8Array, Uint16Array, WebGLTexture, HTMLInputElement, HTMLSelectElement, HTMLElement, WebGLFramebuffer, HTMLCanvasElement, WebGLRenderingContext */
(function (window, undefined) {
"use strict";

var document = window.document,
	console = window.console,

/*
	Global environment variables
*/

benchmarkResults,
incompatibility,
seriousEffects = {},
timeouts = [],
allEffectsByHook = {},
defaultTransform,

/*
	Global reference variables
*/

// http://www.w3.org/TR/css3-color/#svg-color
colorNames = {
	'transparent': [0,0,0,0],
	'aliceblue':	[240/255,248/255,255/255,1],
	'antiquewhite':	[250/255,235/255,215/255,1],
	'aqua':	[0,255/255,255/255,1],
	'aquamarine':	[127/255,255/255,212/255,1],
	'azure':	[240/255,255/255,255/255,1],
	'beige':	[245/255,245/255,220/255,1],
	'bisque':	[255/255,228/255,196/255,1],
	'black':	[0,0,0,1],
	'blanchedalmond':	[255/255,235/255,205/255,1],
	'blue':	[0,0,255/255,1],
	'blueviolet':	[138/255,43/255,226/255,1],
	'brown':	[165/255,42/255,42/255,1],
	'burlywood':	[222/255,184/255,135/255,1],
	'cadetblue':	[95/255,158/255,160/255,1],
	'chartreuse':	[127/255,255/255,0,1],
	'chocolate':	[210/255,105/255,30/255,1],
	'coral':	[255/255,127/255,80/255,1],
	'cornflowerblue':	[100/255,149/255,237/255,1],
	'cornsilk':	[255/255,248/255,220/255,1],
	'crimson':	[220/255,20/255,60/255,1],
	'cyan':	[0,255/255,255/255,1],
	'darkblue':	[0,0,139/255,1],
	'darkcyan':	[0,139/255,139/255,1],
	'darkgoldenrod':	[184/255,134/255,11/255,1],
	'darkgray':	[169/255,169/255,169/255,1],
	'darkgreen':	[0,100/255,0,1],
	'darkgrey':	[169/255,169/255,169/255,1],
	'darkkhaki':	[189/255,183/255,107/255,1],
	'darkmagenta':	[139/255,0,139/255,1],
	'darkolivegreen':	[85/255,107/255,47/255,1],
	'darkorange':	[255/255,140/255,0,1],
	'darkorchid':	[153/255,50/255,204/255,1],
	'darkred':	[139/255,0,0,1],
	'darksalmon':	[233/255,150/255,122/255,1],
	'darkseagreen':	[143/255,188/255,143/255,1],
	'darkslateblue':	[72/255,61/255,139/255,1],
	'darkslategray':	[47/255,79/255,79/255,1],
	'darkslategrey':	[47/255,79/255,79/255,1],
	'darkturquoise':	[0,206/255,209/255,1],
	'darkviolet':	[148/255,0,211/255,1],
	'deeppink':	[255/255,20/255,147/255,1],
	'deepskyblue':	[0,191/255,255/255,1],
	'dimgray':	[105/255,105/255,105/255,1],
	'dimgrey':	[105/255,105/255,105/255,1],
	'dodgerblue':	[30/255,144/255,255/255,1],
	'firebrick':	[178/255,34/255,34/255,1],
	'floralwhite':	[255/255,250/255,240/255,1],
	'forestgreen':	[34/255,139/255,34/255,1],
	'fuchsia':	[255/255,0,255/255,1],
	'gainsboro':	[220/255,220/255,220/255,1],
	'ghostwhite':	[248/255,248/255,255/255,1],
	'gold':	[255/255,215/255,0,1],
	'goldenrod':	[218/255,165/255,32/255,1],
	'gray':	[128/255,128/255,128/255,1],
	'green':	[0,128/255,0,1],
	'greenyellow':	[173/255,255/255,47/255,1],
	'grey':	[128/255,128/255,128/255,1],
	'honeydew':	[240/255,255/255,240/255,1],
	'hotpink':	[255/255,105/255,180/255,1],
	'indianred':	[205/255,92/255,92/255,1],
	'indigo':	[75/255,0,130/255,1],
	'ivory':	[255/255,255/255,240/255,1],
	'khaki':	[240/255,230/255,140/255,1],
	'lavender':	[230/255,230/255,250/255,1],
	'lavenderblush':	[255/255,240/255,245/255,1],
	'lawngreen':	[124/255,252/255,0,1],
	'lemonchiffon':	[255/255,250/255,205/255,1],
	'lightblue':	[173/255,216/255,230/255,1],
	'lightcoral':	[240/255,128/255,128/255,1],
	'lightcyan':	[224/255,255/255,255/255,1],
	'lightgoldenrodyellow':	[250/255,250/255,210/255,1],
	'lightgray':	[211/255,211/255,211/255,1],
	'lightgreen':	[144/255,238/255,144/255,1],
	'lightgrey':	[211/255,211/255,211/255,1],
	'lightpink':	[255/255,182/255,193/255,1],
	'lightsalmon':	[255/255,160/255,122/255,1],
	'lightseagreen':	[32/255,178/255,170/255,1],
	'lightskyblue':	[135/255,206/255,250/255,1],
	'lightslategray':	[119/255,136/255,153/255,1],
	'lightslategrey':	[119/255,136/255,153/255,1],
	'lightsteelblue':	[176/255,196/255,222/255,1],
	'lightyellow':	[255/255,255/255,224/255,1],
	'lime':	[0,255/255,0,1],
	'limegreen':	[50/255,205/255,50/255,1],
	'linen':	[250/255,240/255,230/255,1],
	'magenta':	[255/255,0,255/255,1],
	'maroon':	[128/255,0,0,1],
	'mediumaquamarine':	[102/255,205/255,170/255,1],
	'mediumblue':	[0,0,205/255,1],
	'mediumorchid':	[186/255,85/255,211/255,1],
	'mediumpurple':	[147/255,112/255,219/255,1],
	'mediumseagreen':	[60/255,179/255,113/255,1],
	'mediumslateblue':	[123/255,104/255,238/255,1],
	'mediumspringgreen':	[0,250/255,154/255,1],
	'mediumturquoise':	[72/255,209/255,204/255,1],
	'mediumvioletred':	[199/255,21/255,133/255,1],
	'midnightblue':	[25/255,25/255,112/255,1],
	'mintcream':	[245/255,255/255,250/255,1],
	'mistyrose':	[255/255,228/255,225/255,1],
	'moccasin':	[255/255,228/255,181/255,1],
	'navajowhite':	[255/255,222/255,173/255,1],
	'navy':	[0,0,128/255,1],
	'oldlace':	[253/255,245/255,230/255,1],
	'olive':	[128/255,128/255,0,1],
	'olivedrab':	[107/255,142/255,35/255,1],
	'orange':	[255/255,165/255,0,1],
	'orangered':	[255/255,69/255,0,1],
	'orchid':	[218/255,112/255,214/255,1],
	'palegoldenrod':	[238/255,232/255,170/255,1],
	'palegreen':	[152/255,251/255,152/255,1],
	'paleturquoise':	[175/255,238/255,238/255,1],
	'palevioletred':	[219/255,112/255,147/255,1],
	'papayawhip':	[255/255,239/255,213/255,1],
	'peachpuff':	[255/255,218/255,185/255,1],
	'peru':	[205/255,133/255,63/255,1],
	'pink':	[255/255,192/255,203/255,1],
	'plum':	[221/255,160/255,221/255,1],
	'powderblue':	[176/255,224/255,230/255,1],
	'purple':	[128/255,0,128/255,1],
	'red':	[255/255,0,0,1],
	'rosybrown':	[188/255,143/255,143/255,1],
	'royalblue':	[65/255,105/255,225/255,1],
	'saddlebrown':	[139/255,69/255,19/255,1],
	'salmon':	[250/255,128/255,114/255,1],
	'sandybrown':	[244/255,164/255,96/255,1],
	'seagreen':	[46/255,139/255,87/255,1],
	'seashell':	[255/255,245/255,238/255,1],
	'sienna':	[160/255,82/255,45/255,1],
	'silver':	[192/255,192/255,192/255,1],
	'skyblue':	[135/255,206/255,235/255,1],
	'slateblue':	[106/255,90/255,205/255,1],
	'slategray':	[112/255,128/255,144/255,1],
	'slategrey':	[112/255,128/255,144/255,1],
	'snow':	[255/255,250/255,250/255,1],
	'springgreen':	[0,255/255,127/255,1],
	'steelblue':	[70/255,130/255,180/255,1],
	'tan':	[210/255,180/255,140/255,1],
	'teal':	[0,128/255,128/255,1],
	'thistle':	[216/255,191/255,216/255,1],
	'tomato':	[255/255,99/255,71/255,1],
	'turquoise':	[64/255,224/255,208/255,1],
	'violet':	[238/255,130/255,238/255,1],
	'wheat':	[245/255,222/255,179/255,1],
	'white':	[255/255,255/255,255/255,1],
	'whitesmoke':	[245/255,245/255,245/255,1],
	'yellow':	[255/255,255/255,0,1],
	'yellowgreen':	[154/255,205/255,50/255,1]
},

/*
	utility functions
*/

mat4 = {
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
	frustum: function(left, right, bottom, top, near, far, dest) {
		if(!dest) { dest = mat4.create(); }
		var rl = (right - left),
			tb = (top - bottom),
			fn = (far - near);
		dest[0] = (near*2) / rl;
		dest[1] = 0;
		dest[2] = 0;
		dest[3] = 0;
		dest[4] = 0;
		dest[5] = (near*2) / tb;
		dest[6] = 0;
		dest[7] = 0;
		dest[8] = (right + left) / rl;
		dest[9] = (top + bottom) / tb;
		dest[10] = -(far + near) / fn;
		dest[11] = -1;
		dest[12] = 0;
		dest[13] = 0;
		dest[14] = -(far*near*2) / fn;
		dest[15] = 0;
		return dest;
	},

	perspective: function(fovy, aspect, near, far, dest) {
		var top = near*Math.tan(fovy*Math.PI / 360.0),
			right = top*aspect;
		return mat4.frustum(-right, right, -top, top, near, far, dest);
	}
},

requestAnimFrame = (function(){
	var lastTime = 0;
	return  window.requestAnimationFrame       ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame    ||
			window.oRequestAnimationFrame      ||
			window.msRequestAnimationFrame     ||
			function (callback) {
				var currTime, timeToCall, id;

				function timeoutCallback() {
					callback(currTime + timeToCall);
				}

				currTime = new Date().getTime();
				timeToCall = Math.max(0, 16 - (currTime - lastTime));
				id = window.setTimeout(timeoutCallback, timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};
}());

function getElement(input, tags) {
	var element,
		tag;
	if (typeof input === 'string') {
		//element = document.getElementById(input) || document.getElementsByTagName( input )[0];
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

function extend(dest, src) {
	var property, g, s;

	//todo: are we sure this is safe?
	if (dest.prototype && src.prototype && dest.prototype !== src.prototype) {
		extend(dest.prototype, src.prototype);
	}

	for ( property in src ) {
		g = src.__lookupGetter__(property);
		s = src.__lookupSetter__(property);

		if (g || s) {
			if (g) {
				dest.__defineGetter__(property, g);
			}
			if (s) {
				dest.__defineSetter__(property, s);
			}
		} else {
			dest[ property ] = src[ property ];
		}
	}

	return dest;
}

//http://www.w3.org/TR/css3-color/#hsl-color
function hslToRgb(h, s, l, a) {
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
			return m1 + (m2 - m1) * (2/3 - h) * 6;
		}
		return m1;
	}

	var m1, m2;
	if (l < 0.5) {
		m2 = l * (s + 1);
	} else {
		m2 = l + s - l * s;
	}
	m1 = l * 2 - m2;
	return [
		hueToRgb(m1, m2, h + 1/3),
		hueToRgb(m1, m2, h),
		hueToRgb(m1, m2, h - 1/3),
		a
	];
}

/*
faster than setTimeout(fn, 0);
http://dbaron.org/log/20100309-faster-timeouts
*/
function setTimeoutZero(fn) {
	/*
	Workaround for postMessage bug in Firefox if the page is loaded from the file system
	https://bugzilla.mozilla.org/show_bug.cgi?id=740576
	Should run fine, but maybe a few milliseconds slower per frame.
	*/
	function timeoutFunction() {
		if (timeouts.length) {
			(timeouts.shift())();
		}
	}

	if (typeof fn !== 'function') {
		throw 'setTimeoutZero argument is not a function';
	}

	timeouts.push(fn);
	if (window.location.protocol === 'file:') {
		setTimeout(timeoutFunction, 0);
		return;
	}

	window.postMessage('seriously-timeout-message', window.location);
}

window.addEventListener('message', function(event) {
	if (event.source === window && event.data === 'seriously-timeout-message') {
		event.stopPropagation();
		if (timeouts.length > 0) {
			var fn = timeouts.shift();
			fn();
		}
	}
}, true);

function checkSource(source) {
	var element, canvas, ctx, texture;
	
	element = getElement(source, ['img', 'canvas', 'video']);
	if (!element) {
		return false;
	}
	
	canvas = document.createElement('canvas');
	if (!canvas) {
		console.log('Browser does not support canvas or Seriously.js');
		return false;
	}
	
	if (window.WebGLRenderingContext) {
		try {
			ctx = canvas.getContext('experimental-webgl');
		} catch (webglError) {
			console.log('Unable to access WebGL. Trying 2D canvas.');
		}
	}

	if (ctx) {
		texture = ctx.createTexture();
		ctx.bindTexture(ctx.TEXTURE_2D, texture);

		try {
			ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, element);
		} catch (textureError) {
			if (textureError.name === 'SECURITY_ERR') {
				console.log('Unable to access cross-domain image');
			} else {
				console.log('Error: ' + textureError.message);
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
			if (drawImageError.name === 'SECURITY_ERR') {
				console.log('Unable to access cross-domain image');
			} else {
				console.log('Error: ' + drawImageError.message);
			}
			return false;
		}
	}
		

	// This method will return a false positive for resources that aren't
	// actually images or haven't loaded yet
	
	return true;
}

/*
	helper Classes
*/

function FrameBuffer(gl, width, height, useFloat) {
	var frameBuffer,
		renderBuffer,
		tex,
		status;

	useFloat = false && useFloat && !!gl.getExtension("OES_texture_float"); //useFloat is not ready!
	if (useFloat) {
		this.type = gl.FLOAT;
	} else {
		this.type = gl.UNSIGNED_BYTE;
	}

	frameBuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

	this.texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

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

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

	//clean up
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	if (!gl.isFramebuffer(frameBuffer)) {
		throw('Invalid framebuffer');
	}

	status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

	if (status === gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT) {
		throw('Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT');
	}

	if (status === gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT) {
		throw('Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT');
	}

	if (status === gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS) {
		throw('Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS');
	}

	if (status === gl.FRAMEBUFFER_UNSUPPORTED) {
		throw('Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED');
	}

	if (status !== gl.FRAMEBUFFER_COMPLETE) {
		throw('Incomplete framebuffer: ' + status);
	}

	this.gl = gl;
	this.frameBuffer = frameBuffer;
	this.renderBuffer = renderBuffer;
	this.width = width;
	this.height = height;
}

FrameBuffer.prototype.destroy = function() {
	var gl = this.gl;
	
	if (gl) {
		gl.deleteFramebuffer(this.frameBuffer);
		gl.deleteRenderbuffer(this.renderBuffer);
		gl.deleteTexture(this.texture);
	}

	delete this.frameBuffer;
	delete this.renderBuffer;
	delete this.texture;
};

/* ShaderProgram - utility class for building and accessing WebGL shaders */

function ShaderProgram(gl, vertexShaderSource, fragmentShaderSource) {

	var program, vertexShader, fragmentShader,
		programError = '', shaderError,
		num_uniforms,
		num_attribs,
		i, info, name, loc, setter, getter;

	function compileShader(source, fragment) {
		var shader, i;
		if (fragment) {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		} else {
			shader = gl.createShader(gl.VERTEX_SHADER);
		}

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			source = source.split(/[\n\r]/);
			for (i = 0; i < source.length; i++) {
				source[i] = (i + 1) + ":\t" + source[i];
			}
			console.log(source.join('\n'));
			throw 'Shader error: ' + gl.getShaderInfoLog(shader);
		}

		return shader;
	}

	function makeShaderSetter(info, loc) {

		if (info.type === gl.SAMPLER_2D) {
			return function(value) {
				info.glTexture = gl['TEXTURE' + value];
				gl.uniform1i(loc, value);
			};
		}

		if (info.type === gl.BOOL|| info.type === gl.INT) {
			if (info.size > 1) {
				return function(value) {
					gl.uniform1iv(loc, value);
				};
			}

			return function(value) {
				gl.uniform1i(loc, value);
			};
		}

		if (info.type === gl.FLOAT) {
			if (info.size > 1) {
				return function(value) {
					gl.uniform1fv(loc, value);
				};
			}

			return function(value) {
				gl.uniform1f(loc, value);
			};
		}

		if (info.type === gl.FLOAT_VEC2) {
			return function(obj) {
				//todo: standardize this so we don't have to do this check
				if ( Array.isArray(obj) ) {
					gl.uniform2f(loc, obj[0], obj[1]);
				} else {
					gl.uniform2f(loc, obj.x, obj.y);
				}
			};
		}

		if (info.type === gl.FLOAT_VEC3) {
			return function(obj) {
				//todo: standardize this so we don't have to do this check
				if ( Array.isArray(obj) ) {
					gl.uniform3f(loc, obj[0], obj[1], obj[2]);
				} else {
					gl.uniform3f(loc, obj.x, obj.y, obj.z);
				}
			};
		}

		if (info.type === gl.FLOAT_VEC4) {
			return function(obj) {
				//todo: standardize this so we don't have to do this check
				if ( Array.isArray(obj) ) {
					gl.uniform4f(loc, obj[0], obj[1], obj[2], obj[3]);
				} else {
					gl.uniform4f(loc, obj.x, obj.y, obj.z, obj.w);
				}
			};
		}

		if (info.type === gl.FLOAT_MAT3) {
			return function(mat3) {
				gl.uniformMatrix3fv(loc, false, mat3);
			};
		}

		if (info.type === gl.FLOAT_MAT4) {
			return function(mat4) {
				gl.uniformMatrix4fv(loc, false, mat4);
			};
		}

		throw "Unknown shader uniform type: " + info.type;

	}

	function makeShaderGetter(loc) {
		return function() {
			return gl.getUniform(program, loc);
		};
	}

	vertexShader = compileShader(vertexShaderSource);
	fragmentShader = compileShader(fragmentShaderSource, true);

	program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	shaderError = gl.getShaderInfoLog(vertexShader);
	if (shaderError) {
		programError += 'Vertex shader error: ' + shaderError + "\n";
	}
	gl.attachShader(program, fragmentShader);
	shaderError = gl.getShaderInfoLog(fragmentShader);
	if (shaderError) {
		programError += 'Fragment shader error: ' + shaderError + "\n";
	}
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		programError += gl.getProgramInfoLog(program);
		gl.deleteProgram(program);
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		throw 'Could not initialise shader: ' + programError;
	}

	gl.useProgram(program);
	num_uniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
	this.uniforms = [];
	for (i = 0; i < num_uniforms; ++i) {
		info = gl.getActiveUniform(program, i);
		name = info.name;
		loc = gl.getUniformLocation(program, name);
		loc.name = name;

		setter = makeShaderSetter(info, loc);
		info.set = setter;
		this['set_' + name] = setter;

		getter = makeShaderGetter(loc);
		info.get = getter;
		this['get_' + name] = getter;

		info.loc = this['location_' + name] = loc;

		this.uniforms.push(info);
	}

	num_attribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
	this.attributes = [];
	for (i = 0; i < num_attribs; ++i) {
		info = gl.getActiveAttrib(program, i);
		name = info.name;
		loc = gl.getAttribLocation(program, name);
		this['location_' + name] = loc;
		this.attributes.push(name);
	}

	this.gl = gl;
	this.program = program;
	
	this.destroy = function() {
		var i;

		if (gl) {
			gl.deleteProgram(program);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
		}
		
		for (i in this) {
			if (this.hasOwnProperty(i)) {
				
				delete this[i];
			}
		}
		
		program = null;
		vertexShader = null;
		fragmentShader = null;
	};
}

ShaderProgram.prototype.useProgram = function() {
	this.gl.useProgram(this.program);
};

/*
	main class: Seriously
*/

function Seriously(options) {

	//if called without 'new', make a new object and return that
	if (window === this || !(this instanceof Seriously) ) {
		return new Seriously(options);
	}

	//initialize object, private properties
	var seriously = this,
		nodes = [],
		nodesById = {},
		nodeId = 0,
		sources = [],
		targets = [],
		effects = [],
		aliases = {},
		callbacks = [],
		glCanvas,
		gl,
		rectangleModel,
		baseShader,
		baseVertexShader, baseFragmentShader,
		Node, SourceNode, EffectNode, TargetNode,
		Effect, Source, Target,
		auto = false,
		callbacksRunning = false,
		isDestroyed = false;

	function makeGlModel(shape, gl) {
		var vertex, index, texCoord;

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
		var shape = {};

		shape.vertices = new Float32Array([
			-1, -1, -1,
			1, -1, -1,
			1, 1, -1,
			-1, 1, -1
		]);

		shape.indices = new Uint16Array([
			0, 1, 2,
			0, 2, 3    // Front face
		]);

		shape.coords = new Float32Array([
			0,0,
			1,0,
			1,1,
			0,1
		]);

		return makeGlModel(shape, gl);
	}

	function attachContext(context) {
		var i, node;

		gl = context;
		glCanvas = context.canvas;

		rectangleModel = buildRectangleModel(gl);

		baseShader = new ShaderProgram(gl, baseVertexShader, baseFragmentShader);

		for (i = 0; i < effects.length; i++) {
			node = effects[i];

			node.gl = gl;

			if (node.initialized) {
				node.buildShader();
			}
		}

		for (i = 0; i < sources.length; i++) {
			node = sources[i];
			node.initialize();
		}

		for (i = 0; i < targets.length; i++) {
			node = targets[i];

			if (!node.model) {
				node.model = rectangleModel;
			}

			//todo: initialize frame buffer if not main canvas
		}
	}

	//runs on every frame, as long as there are media sources (img, video, canvas, etc.) to check
	//any sources that are updated are set to dirty, forcing all dependent nodes to render on next pass
	//target nodes that are set to auto by .go() will render immediately when set to dirty
	function monitorSources() {
		var i, node, media;
		if (sources && sources.length) {
			for (i = 0; i < sources.length; i++) {
				node = sources[i];

				media = node.source;
				if (node.lastRenderTime === undefined ||
					node.dirty ||
					media.currentTime !== undefined && node.lastRenderTime !== media.currentTime) {
					node.dirty = false;
					node.setDirty();
				}
			}

			requestAnimFrame(monitorSources);
		}
	}

	function draw(shader, model, uniforms, frameBuffer, node, options) {
		var numTextures = 0,
			name, value, setter,
			width, height,
			nodeGl = (node && node.gl) || gl,
			opts = options || {};

		if (!nodeGl) {
			return;
		}

		if (node) {
			width = opts.width || node.width || nodeGl.canvas.width;
			height = opts.height || node.height || nodeGl.canvas.height;
		} else {
			width = opts.width || nodeGl.canvas.width;
			height = opts.height || nodeGl.canvas.height;
		}

		shader.useProgram();

		nodeGl.viewport(0, 0, width, height);

		nodeGl.bindFramebuffer(nodeGl.FRAMEBUFFER, frameBuffer);

		/* todo: do this all only once at the beginning, since we only have one model? */
		nodeGl.enableVertexAttribArray(shader.location_position);
		nodeGl.enableVertexAttribArray(shader.location_texCoord);

		if (model.texCoord) {
			nodeGl.bindBuffer(nodeGl.ARRAY_BUFFER, model.texCoord);
			nodeGl.vertexAttribPointer(shader.location_texCoord, model.texCoord.size, nodeGl.FLOAT, false, 0, 0);
		}

		nodeGl.bindBuffer(nodeGl.ARRAY_BUFFER, model.vertex);
		nodeGl.vertexAttribPointer(shader.location_position, model.vertex.size, nodeGl.FLOAT, false, 0, 0);

		nodeGl.bindBuffer(nodeGl.ELEMENT_ARRAY_BUFFER, model.index);

		//default for depth is disable
		if (opts.depth) {
			gl.enable(gl.DEPTH_TEST);
		} else {
			gl.disable(gl.DEPTH_TEST);
		}

		//default for blend is enable
		if (opts.blend === undefined || opts.blend) {
			gl.enable(gl.BLEND);
			gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
								gl.SRC_ALPHA, gl.DST_ALPHA);
			gl.blendEquation(gl.FUNC_ADD);
		} else {
			gl.disable(gl.BLEND);
		}

		/* set uniforms to current values */
		for (name in uniforms) {
			if (uniforms.hasOwnProperty(name)) {
				value = uniforms[name];
				setter = 'set_' + name;
				if (shader[setter]) {
					if (value instanceof WebGLTexture) {
						nodeGl.activeTexture(nodeGl.TEXTURE0 + numTextures);
						nodeGl.bindTexture(nodeGl.TEXTURE_2D, value);
						shader[setter](numTextures); //todo: make this faster
						numTextures++;
					} else if (value instanceof SourceNode || value instanceof EffectNode) {
						if (value.texture) {
							nodeGl.activeTexture(nodeGl.TEXTURE0 + numTextures);
							nodeGl.bindTexture(nodeGl.TEXTURE_2D, value.texture);
							shader[setter](numTextures); //todo: make this faster
							numTextures++;
						}
					} else if(value !== undefined && value !== null) {
						shader['set_' + name](value);
					}
				}
			}
		}

		//default for clear is true
		if (opts.clear === undefined || opts.clear) {
			nodeGl.clearColor(0.0, 0.0, 0.0, 0.0);
			nodeGl.clear(nodeGl.COLOR_BUFFER_BIT | nodeGl.DEPTH_BUFFER_BIT);
		}

		// draw!
		nodeGl.drawElements(model.mode, model.length, nodeGl.UNSIGNED_SHORT, 0);

		//to protect other 3D libraries that may not remember to turn their depth tests on
		gl.enable(gl.DEPTH_TEST);
	}

	function findInputNode(source, options) {
		var node, i;
		if (source instanceof SourceNode || source instanceof EffectNode) {
			node = source;
		} else if (source instanceof Effect || source instanceof Source) {
			node = nodesById[source.id];

			if (!node) {
				throw 'Cannot connect a foreign node';
			}
		} else {
			if ( typeof source === 'string' && isNaN(source) ) {
				source = getElement(source, ['canvas', 'img', 'video']);
			}

			for (i = 0; i < sources.length; i++) {
				if (sources[i].source === source) {
					return sources[i];
				}
			}

			node = new SourceNode(source, options);
		}

		return node;
	}

	function runCallbacks() {
		function run() {
			var i;
			for (i = 0; i < callbacks.length; i++) {
				callbacks[i].call(seriously);
			}
			callbacksRunning = false;
		}

		if (!callbacksRunning) {
			setTimeoutZero(run);
			callbacksRunning = true;
		}
	}

	Node = function (options) {
		this.transform = new Float32Array(defaultTransform);

		if (options) {
			this.desiredWidth = parseInt(options.width, 10);
			this.desiredHeight = parseInt(options.height, 10);
		}

		this.gl = gl;

		this.uniforms = {
			transform: this.transform
		};

		this.dirty = true;
		this.isDestroyed = false;

		this.seriously = seriously;

		this.id = nodeId;
		nodes.push(this);
		nodesById[nodeId] = this;
		nodeId++;
	};

	Node.prototype.setDirty = function () {
		//loop through all targets calling setDirty (depth-first)
		var i;

		if (!this.dirty) {
			this.dirty = true;
			if (this.targets) {
				for (i = 0; i < this.targets.length; i++) {
					this.targets[i].setDirty();
				}
			}
		}
	};

	Node.prototype.initFrameBuffer = function (useFloat) {
		if (gl) {
			if (!this.width) {
				this.width = this.desiredWidth || glCanvas.width;
			}

			if (!this.height) {
				this.height = this.desiredHeight || glCanvas.height;
			}

			this.frameBuffer = new FrameBuffer(gl, this.width, this.height, useFloat);
		}
	};

	Node.prototype.readPixels = function (x, y, width, height, dest) {

		if (!gl) {
			//todo: is this the best approach?
			throw 'Cannot read pixels until a canvas is connected';
		}

		//todo: check on x, y, width, height

		if (!this.frameBuffer) {
			this.initFrameBuffer();
		}

		//todo: should we render here?
		this.render();

		if (this instanceof SourceNode) {
			//todo: move this to SourceNode.render so it only runs when it changes
			this.uniforms.source = this.texture;
			draw(baseShader, rectangleModel, this.uniforms, this.frameBuffer.frameBuffer, this);
		}

		//todo: figure out formats and types
		if (dest === undefined) {
			dest = new Uint8Array(width * height * 4);
		} else if ( !dest instanceof Uint8Array ) {
			throw 'Incompatible array type';
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer.frameBuffer); //todo: are we sure about this?
		gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, dest);

		return dest;
	};

	Node.prototype.reset = function () {
		this.transform = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		]);
		this.setDirty();
	};

	//matrix code inspired by glMatrix
	//todo: only 2D for now, so z is always 0.  allow 3D later.
	Node.prototype.translate = function(x, y) {
		var mat = this.transform;
		mat[12] = mat[0]*x + mat[4]*y + /* mat[8]*z + */ mat[12];
		mat[13] = mat[1]*x + mat[5]*y + /* mat[9]*z + */ mat[13];
		mat[14] = mat[2]*x + mat[6]*y + /* mat[10]*z + */ mat[14];
		mat[15] = mat[3]*x + mat[7]*y + /* mat[11]*z + */ mat[15];
		this.setDirty();
	};

	//todo: only 2D for now, so z is always 1.  allow 3D later.
	Node.prototype.scale = function(x, y) {
		var mat = this.transform;
		mat[0] *= x;
		mat[1] *= x;
		mat[2] *= x;
		mat[3] *= x;
		mat[4] *= y;
		mat[5] *= y;
		mat[6] *= y;
		mat[7] *= y;
		this.setDirty();
	};

	Node.prototype.rotateY = function(angle) {
		var mat = this.transform,
			sin = Math.sin(angle),
			cos = Math.cos(angle),

		// Cache the matrix values (makes for huge speed increases!)
			a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
			a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];

		// Perform axis-specific matrix multiplication
		mat[0] = a00*cos + a20*-sin;
		mat[1] = a01*cos + a21*-sin;
		mat[2] = a02*cos + a22*-sin;
		mat[3] = a03*cos + a23*-sin;

		mat[8] = a00*sin + a20*cos;
		mat[9] = a01*sin + a21*cos;
		mat[10] = a02*sin + a22*cos;
		mat[11] = a03*sin + a23*cos;
		this.setDirty();
	};

	Node.prototype.rotateZ = function(angle) {
		var mat = this.transform,
			sin = Math.sin(angle),
			cos = Math.cos(angle),

		// Cache the matrix values (makes for huge speed increases!)
			a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
			a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];

		// Perform axis-specific matrix multiplication
		mat[0] = a00*cos + a10*sin;
		mat[1] = a01*cos + a11*sin;
		mat[2] = a02*cos + a12*sin;
		mat[3] = a03*cos + a13*sin;

		mat[4] = a00*-sin + a10*cos;
		mat[5] = a01*-sin + a11*cos;
		mat[6] = a02*-sin + a12*cos;
		mat[7] = a03*-sin + a13*cos;
		this.setDirty();
	};

	Node.prototype.destroy = function () {
		var i;
		
		delete this.gl;
		delete this.seriously;
		
		//clear out uniforms
		for (i in this.uniforms) {
			delete this.uniforms[i];
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
		i = nodes.indexOf(this);
		if (i >= 0) {
			nodes.splice(i, 1);
		}
		delete nodesById[this.id];
		
		this.isDestroyed = true;
	};

	/*
	matte function to be assigned as a method to EffectNode and TargetNode
	*/

	function matte(poly) {
		var polys,
			polygons = [],
			polygon,
			vertices = [],
			i, j, v,
			vert, prev,
			triangles = [],
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
			var ua_t, ub_t, u_b, ua, ub;
			ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
			ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
			u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
			if (u_b) {
				ua = ua_t / u_b;
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
			var i, j,
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
			var p, q, n = poly.vertices.length,
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
			function pointInTriangle(a, b, c, p) {
				var ax, ay, bx, by, cx, cy, apx, apy, bpx, bpy, cpx, cpy,
					cXap, bXcp, aXbp;

				ax = c.x - b.x; ay = c.y - b.y;
				bx = a.x - c.x; by = a.y - c.y;
				cx = b.x - a.x; cy = b.y - a.y;
				apx = p.x - a.x; apy = p.y - a.y;
				bpx = p.x - b.x; bpy = p.y - b.y;
				cpx = p.x - c.x; cpy = p.y - c.y;

				aXbp = ax * bpy - ay * bpx;
				cXap = cx * apy - cy * apx;
				bXcp = bx * cpy - by * cpx;

				return aXbp >= 0 && bXcp >=0 && cXap >=0;
			}

			function snip(u, v, w, n, V) {
				var p, a, b, c, point;
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

			var v, points = poly.vertices,
				n, V = [], indices = [],
				nv, count, m, u, w;

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
			for (m = 0, v = nv - 1; nv > 2; ) {
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
					var a, b, c, s, t;
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
					m++;
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
				if (typeof v ==='object' && !isNaN(v.x) && !isNaN(v.y)) {
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
	}

	Effect = function (effectNode) {
		var name, me = effectNode;

		function arrayToHex(color) {
			var i, val, s = '#';
			for (i = 0; i < 4; i++) {
				val = Math.min(255, Math.round(color[i] * 255 || 0));
				s += val.toString(16);
			}
			return s;
		}

		function setInput(inputName, input) {
			var lookup, value, effectInput, i;

			effectInput = me.effect.inputs[inputName];

			lookup = me.inputElements[inputName];

			if ( typeof input === 'string' && isNaN(input)) {
				if (effectInput.type === 'enum') {
					if (effectInput.options && effectInput.options.filter) {
						i = ('' + input).toLowerCase();
						value = effectInput.options.filter(function (e) {
							return (typeof e === 'string' && e.toLowerCase() === i) ||
								(e.length && typeof e[0] === 'string' && e[0].toLowerCase() === i);
						});

						value = value.length;
					}

					if (!value) {
						input = getElement(input, ['select']);
					}

				} else if (effectInput.type === 'number' || effectInput.type === 'boolean') {
					input = getElement(input, ['input', 'select']);
				} else if (effectInput.type === 'image') {
					input = getElement(input, ['canvas', 'img', 'video']);
				}
				//todo: color? date/time?
			}

			if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
				value = input.value;

				if (lookup && lookup.element !== input) {
					lookup.element.removeEventListener('change', lookup.listener, true);
					delete me.inputElements[inputName];
					lookup = null;
				}

				if (!lookup) {
					lookup = {
						element: input,
						listener: (function (name, element) {
							return function() {
								var oldValue, newValue;

								if (input.type === 'checkbox') {
									//special case for check box
									oldValue = input.checked;
								} else {
									oldValue = element.value;
								}
								newValue = me.setInput(name, oldValue);

								//special case for color type
								if (effectInput.type === 'color') {
									newValue = arrayToHex(newValue);
								}

								//if input validator changes our value, update HTML Element
								//todo: make this optional...somehow
								if (newValue !== oldValue) {
									element.value = newValue;
								}
							};
						}(inputName, input))
					};

					if (input.type === 'checkbox') {
						value = input.checked;
					}

					me.inputElements[inputName] = lookup;
					input.addEventListener('change', lookup.listener, true);
				}
			} else {
				if (lookup) {
					lookup.element.removeEventListener('change', lookup.listener, true);
					delete me.inputElements[inputName];
				}
				value = input;
			}

			me.setInput(inputName, value);
			return me.inputs[inputName];
		}

		//priveleged publicly accessible methods/setters/getters
		//todo: provide an alternate method
		for (name in me.effect.inputs) {
			if (this[name] === undefined) {
				if (me.effect.inputs[name].type === 'image') {
					this.__defineSetter__(name, (function (inputName) {
						return function (value) {
							var val = setInput(inputName, value);
							return val && val.pub;
						};
					}(name)));

					this.__defineGetter__(name, (function (inputName) {
						return function () {
							var val = me.inputs[inputName];
							return val && val.pub;
						};
					}(name)));
				} else {
					this.__defineSetter__(name, (function (inputName) {
						return function (value) {
							return setInput(inputName, value);
						};
					}(name)));

					this.__defineGetter__(name, (function (inputName) {
						return function () {
							return me.inputs[inputName];
						};
					}(name)));
				}
			} else {
				//todo: this is temporary. get rid of it.
				throw 'Cannot overwrite Seriously.' + name;
			}
		}

		this.__defineGetter__('inputs', function () {
			return {
				source: {
					type: 'image'
				}
			};
		});

		this.__defineSetter__('inputs', function () {
			//should we throw an error or just fail silently
			return;
		});

		this.__defineGetter__('original', function () {
			return me.source;
		});

		this.__defineSetter__('original', function () {
		});

		this.__defineSetter__('width', function(value) {
			me.setSize(value);
		});

		this.__defineSetter__('height', function(value) {
			me.setSize(undefined, value);
		});

		this.__defineGetter__('id', function () {
			return me.id;
		});

		this.__defineSetter__('id', function () {
		});

		this.render = function(callback) {
			me.render(callback);
			return this;
		};

		this.alias = function(inputName, aliasName) {
			me.alias(inputName, aliasName);
			return this;
		};

		this.reset = function() {
			me.reset();
		};

		this.translate = function(x, y, z) {
			me.translate(x, y, z);
		};

		this.scale = function(x, y) {
			me.scale(x, y);
		};

		this.rotateY = function(angle) {
			me.rotateZ(angle);
		};

		this.rotateZ = function(angle) {
			me.rotateZ(angle);
		};

		this.matte = function(polygons) {
			me.matte(polygons);
		};

		this.destroy = function() {
			var i, nop = function() { };

			me.destroy();
			
			for (i in this) {
				if (this.hasOwnProperty(i) && i !== 'isDestroyed') {
					if (this.__lookupGetter__(i) ||
						typeof this[i] !== 'function') {
						
						delete this[i];
					} else {
						this[i] = nop;
					}
				}
			}
			
			//todo: remove getters/setters
		};
		
		this.isDestroyed = function() {
			return me.isDestroyed;
		};
	};

	EffectNode = function (hook, options) {
		Node.call(this, options);

		this.effect = seriousEffects[hook];
		this.sources = {};
		this.targets = [];
		this.inputElements = {};
		this.dirty = true;
		this.shaderDirty = true;
		this.hook = hook;
		this.options = options;

		//todo: set up frame buffer(s), inputs, transforms, stencils, draw method. allow plugin to override

		this.inputs = {};
		var name, input;
		for (name in this.effect.inputs) {
			input = this.effect.inputs[name];

			this.inputs[name] = input.defaultValue;
			if (input.uniform) {
				this.uniforms[input.uniform] = input.defaultValue;
			}
		}

		if (gl) {
			this.buildShader();
		}

		this.pub = new Effect(this);

		effects.push(this);
		
		allEffectsByHook[hook].push(this);
	};

	extend(EffectNode, Node);

	EffectNode.prototype.initialize = function () {
		if (!this.initialized) {
			var that = this;

			if (this.shape) {
				this.model = makeGlModel(this.shape, this.gl);
			} else {
				this.model = rectangleModel;
			}

			if (typeof this.effect.initialize === 'function') {
				this.effect.initialize.call(this, function () {
					that.initFrameBuffer(true);
				}, gl);
			} else {
				this.initFrameBuffer(true);
			}

			if (this.frameBuffer) {
				this.texture = this.frameBuffer.texture;
			}

			this.initialized = true;
		}
	};

	EffectNode.prototype.setSize = function (width, height) {
		var i, maxWidth = 0, maxHeight = 0, dirty = false;

		if (width !== undefined) {
			if (width <= 0) {
				this.desiredWidth = null;
			} else {
				if (this.desiredWidth !== width) {
					dirty = true;
				}
				this.desiredWidth = width;
			}
		}

		if (height !== undefined) {
			if (height <= 0) {
				this.desiredHeight = null;
			} else {
				if (this.desiredHeight !== height) {
					dirty = true;
				}
				this.desiredHeight = height;
			}
		}

		if (!this.desiredWidth || !this.desiredHeight) {
			for (i = 0; i < this.targets.length; i++) {
				maxWidth = Math.max(maxWidth, this.targets[i].width);
				maxHeight = Math.max(maxHeight, this.targets[i].height);
			}

			this.width = this.desiredWidth || maxWidth;
			this.height = this.desiredHeight || maxHeight;

			this.setDirty();

			for (i in this.sources) {
				if (this.sources[i].setSize) {
					this.sources[i].setSize();
				}
			}
		} else {
			this.width = this.desiredWidth;
			this.height = this.desiredHeight;

			if (dirty) {
				this.setDirty();
			}
		}

	};

	EffectNode.prototype.setTarget = function (target) {
		var i;
		for (i = 0; i < this.targets.length; i++) {
			if (this.targets[i] === target) {
				return;
			}
		}

		this.targets.push(target);

		this.setSize();
	};

	EffectNode.prototype.removeTarget = function (target) {
		var i = this.targets && this.targets.indexOf(target);
		if (i >= 0) {
			this.targets.splice(i, 1);
		}

		if (this.targets.length) {
			this.setSize();
		}
	};

	EffectNode.prototype.removeSource = function (source) {
		var i, pub = source && source.pub;
		
		for (i in this.inputs) {
			if (this.inputs[i] === source || this.inputs[i] === pub) {
				this.inputs[i] = null;
			}
		}
		
		for (i in this.sources) {
			if (this.sources[i] === source || this.sources[i] === pub) {
				this.sources[i] = null;
			}
		}
	};

	EffectNode.prototype.buildShader = function () {
		var shader, effect = this.effect;
		if (this.shaderDirty) {
			if (effect.shader) {
				shader = effect.shader.call(this, this.inputs, {
					vertex: baseVertexShader,
					fragment: baseFragmentShader
				}, Seriously.util);

				if (shader instanceof ShaderProgram) {
					this.shader = shader;
				} else if (shader && shader.vertex && shader.fragment) {
					this.shader = new ShaderProgram(gl, shader.vertex, shader.fragment);
				} else {
					this.shader = baseShader;
				}
			} else {
				this.shader = baseShader;
			}

			this.shaderDirty = false;
		}
	};

	EffectNode.prototype.render = function (callback) {
		var i,
			frameBuffer,
			effect = this.effect,
			that = this,
			dirty = this.dirty || this.reusedFrameBuffer;

		if (!this.initialized) {
			this.initialize();
		}

		if (this.shaderDirty) {
			this.buildShader();
		}

		if (dirty) {
			for (i in this.sources) {
				if (!effect.requires || effect.requires.call(this, i, this.inputs)) {
					this.sources[i].render();
				}
			}

			if (this.reusedFrameBuffer) {
				//todo: frameBuffer =
			} else if (this.frameBuffer) {
				frameBuffer = this.frameBuffer.frameBuffer;
			}

			if (typeof effect.draw === 'function') {
				effect.draw.call(this, this.shader, this.model, this.uniforms, frameBuffer,
					function(shader, model, uniforms, frameBuffer, node, options) {
						draw(shader, model, uniforms, frameBuffer, node || that, options);
					});
			} else if (frameBuffer) {
				draw(this.shader, this.model, this.uniforms, frameBuffer, this);
			}

			this.dirty = false;
		}

		if (callback && typeof callback === 'function') {
			callback();
		}

		return this;
	};

	EffectNode.prototype.setInput = function (name, value) {
		var input, uniform;

		//trace back all sources to make sure we're not making a cyclical connection
		function traceSources(node, original) {
			var i,
				source,
				sources;

			if ( !(node instanceof EffectNode) ) {
				return false;
			}

			sources = node.sources;

			for (i in sources) {
				source = sources[i];

				if ( source === original || traceSources(source, original) ) {
					return true;
				}
			}

			return false;
		}

		if (this.effect.inputs.hasOwnProperty(name)) {
			input = this.effect.inputs[name];
			if (input.type === 'image') {
				//&& !(value instanceof Effect) && !(value instanceof Source)) {

				if (value) {
					value = findInputNode(value);

					if (value !== this.sources[name]) {
						if (this.sources[name]) {
							this.sources[name].removeTarget(this);
						}

						if ( traceSources(value, this) ) {
							throw 'Attempt to make cyclical connection.';
						}

						this.sources[name] = value;
						value.setTarget(this);
					}
				} else {
					value = false;
				}

				uniform = this.sources[name];
			} else {
				value = input.validate.call(this, value, input, name);
				uniform = value;
			}

			this.inputs[name] = value;

			if (input.uniform) {
				this.uniforms[input.uniform] = uniform;
			}

			if (input.shaderDirty) {
				this.shaderDirty = true;
			}

			this.setDirty();

			return value;
		}
	};

	EffectNode.prototype.alias = function (inputName, aliasName) {
		var that = this,
			reservedNames = ['source', 'target', 'effect', 'effects', 'benchmark', 'incompatible',
				'util', 'ShaderProgram', 'inputValidators', 'save', 'load',
				'plugin', 'removePlugin', 'alias', 'removeAlias', 'stop', 'go',
				'destroy', 'isDestroyed'];
		
		if (reservedNames.indexOf(aliasName) >= 0) {
			throw aliasName + ' is a reserved name and cannot be used as an alias.';
		}

		if (this.effect.inputs.hasOwnProperty(inputName)) {
			if (!aliasName) {
				aliasName = inputName;
			}

			seriously.removeAlias(aliasName);

			aliases[aliasName] = {
				node: this,
				input: inputName
			};

			seriously.__defineSetter__(aliasName, function (value) {
				return that.setInput(inputName, value);
			});

			seriously.__defineGetter__(aliasName, function () {
				return that.inputs[inputName];
			});
		}

		return this;
	};

	EffectNode.prototype.matte = matte;

	EffectNode.prototype.destroy = function () {
		var i, item, hook = this.hook;
		
		//let effect destroy itself
		if (this.effect.destroy && typeof this.effect.destroy === 'function') {
			this.effect.destroy.call(this);
		}
		delete this.effect;
		
		//shader
		if (this.shader && this.shader.destroy && this.shader !== baseShader) {
			this.shader.destroy();
		}
		delete this.shader;
		
		//stop watching any input elements
		for (i in this.inputElements) {
			item = this.inputElements[i];
			item.element.removeEventListener('change', item.listener, true);
		}
		
		//sources
		for (i in this.sources) {
			item = this.sources[i];
			if (item && item.removeTarget) {
				item.removeTarget(this);
			}
			delete this.sources[i];
		}

		//targets
		for (i = 0; i < this.targets.length; i++) {
			item = this.targets[i];
			if (item && item.removeSource) {
				item.removeSource(this);
			}
			delete this.targets[i];
		}

		for (i in this) {
			if (i !== 'id' && this.hasOwnProperty(i)) {
				delete this[i];
			}
		}
		
		//remove any aliases
		for (i in aliases) {
			item = aliases[i];
			if (item.node === this) {
				seriously.removeAlias(i);
			}
		}
		
		//remove self from master list of effects
		i = effects.indexOf(this);
		if (i >= 0) {
			effects.splice(i, 1);
		}
		
		i = allEffectsByHook[hook].indexOf(this);
		if (i >= 0) {
			allEffectsByHook[hook].splice(i, 1);
		}
		
		Node.prototype.destroy.call(this);
	};

	Source = function (sourceNode) {
		var me = sourceNode;

		//priveleged accessor methods
		this.__defineGetter__('original', function () {
			return me.source;
		});

		this.__defineSetter__('original', function () {
		});

		this.__defineGetter__('id', function () {
			return me.id;
		});

		this.__defineSetter__('id', function () {
		});

		this.render = function(callback) {
			me.render(callback);
		};

		this.update = function() {
			me.setDirty();
		};

		this.readPixels = function (x, y, width, height, dest) {
			return me.readPixels(x, y, width, height, dest);
		};
		
		this.destroy = function() {
			var i, nop = function() { };

			me.destroy();
			
			for (i in this) {
				if (this.hasOwnProperty(i) && i !== 'isDestroyed') {
					if (this.__lookupGetter__(i) ||
						typeof this[i] !== 'function') {
						
						delete this[i];
					} else {
						this[i] = nop;
					}
				}
			}
		};

		this.isDestroyed = function() {
			return me.isDestroyed;
		};
	};

	/*
		possible sources: img, video, canvas (2d or 3d), texture, ImageData, array, typed array
	*/
	SourceNode = function (source, options) {
		var opts = options || {},
			flip = opts.flip === undefined ? true : opts.flip,
			width, height,
			deferTexture = false,
			that = this,
			matchedType = false;

		Node.call(this, options);

		width = this.desiredWidth;
		height = this.desiredHeight;

		if ( typeof source === 'string' && isNaN(source) ) {
			source = getElement(source, ['canvas', 'img', 'video']);
		}

		if (source instanceof HTMLElement) {
			if (source.tagName === 'CANVAS') {
				this.desiredWidth = width = source.width;
				this.desiredHeight = height = source.height;

				this.render = this.renderImageCanvas;
			} else if (source.tagName === 'IMG') {
				width = source.naturalWidth;
				height = source.naturalHeight;

				if (!source.complete) {
					deferTexture = true;

					source.addEventListener('load', function() {
						that.desiredWidth = source.naturalWidth;
						that.desiredHeight = source.naturalHeight;
						that.currentTime = source.src;

						that.width = that.desiredWidth;
						that.height = that.desiredHeight;

						that.initialize();
					}, true);
				}

				this.render = this.renderImageCanvas;
			} else if (source.tagName === 'VIDEO') {
				that.desiredWidth = width = source.videoWidth;
				that.desiredHeight = height = source.videoHeight;

				if (!source.readyState) {
					deferTexture = true;

					source.addEventListener('loadedmetadata', function() {
						that.desiredWidth = source.videoWidth;
						that.desiredHeight = source.videoHeight;

						that.width = that.desiredWidth;
						that.height = that.desiredHeight;

						that.initialize();
					}, true);
				}

				this.render = this.renderVideo;
			} else {
				throw 'Not a valid HTML element: ' + source.tagName + ' (must be img, video or canvas)';
			}
			matchedType = true;

		} else if (source instanceof Object && source.data &&
			source.width && source.height &&
			source.width * source.height * 4 === source.data.length
			) {

			//Because of this bug, Firefox doesn't recognize ImageData, so we have to duck type
			//https://bugzilla.mozilla.org/show_bug.cgi?id=637077

			this.desiredWidth = width = source.width;
			this.desiredHeight = height = source.height;
			matchedType = true;

			this.render = this.renderImageCanvas;
		} else if ( Array.isArray(source) ) {
			if (!width || !height) {
				throw 'Height and width must be provided with an Array';
			}

			if (width * height * 4 !== source.length) {
				throw 'Array length must be height x width x 4.';
			}

			matchedType = true;

			//use opposite default for flip
			if (opts.flip === undefined) {
				flip = false;
			}
			source = new Uint8Array(source);
			this.render = this.renderTypedArray;
		} else if ( source instanceof Uint8Array ) {
			if (!width || !height) {
				throw 'Height and width must be provided with a Uint8Array';
			}

			if (width * height * 4 !== source.length) {
				throw 'Typed array length must be height x width x 4.';
			}

			matchedType = true;

			//use opposite default for flip
			if (opts.flip === undefined) {
				flip = false;
			}
			this.render = this.renderTypedArray;
		} else if (source instanceof WebGLTexture) {
			if (gl && !gl.isTexture(source)) {
				throw 'Not a valid WebGL texture.';
			}

			//different defaults
			if (!isNaN(width)) {
				if (isNaN(height)) {
					height = width;
				}
			} else if (!isNaN(height)) {
				width = height;
			} else {
				//todo: guess based on dimensions of target canvas
				//throw 'Must specify width and height when using a WebGL texture as a source';
			}

			if (opts.flip === undefined) {
				flip = false;
			}
			matchedType = true;

			this.texture = source;
			this.initialized = true;

			//todo: if WebGLTexture source is from a different context render it and copy it over
			this.render = function(callback) { };
		}

		if (!matchedType) {
			throw 'Unknown source type';
		}

		if (!deferTexture) {
			this.initialize();
		}

		this.source = source;
		this.flip = flip;
		this.width = width;
		this.height = height;
		this.targets = [];
		this.pub = new Source(this);

		sources.push(this);

		if (sources.length === 1) {
			monitorSources();
		}

	};

	extend(SourceNode, Node);

	SourceNode.prototype.initialize = function() {
		if (!gl || this.texture) {
			return;
		}

		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
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

	SourceNode.prototype.setTarget = function (target) {
		var i;
		for (i = 0; i < this.targets.length; i++) {
			if (this.targets[i] === target) {
				return;
			}
		}

		this.targets.push(target);
	};

	SourceNode.prototype.removeTarget = function (target) {
		var i = this.targets && this.targets.indexOf(target);
		if (i >= 0) {
			this.targets.splice(i, 1);
		}
	};

	SourceNode.prototype.renderVideo = function(callback) {
		var video = this.source;

		if (!gl || !video || !video.videoHeight || !video.videoWidth || video.readyState < 2) {
			return;
		}

		if (!this.initialized) {
			this.initialize();
		}
		
		if (!this.allowRefresh) {
			return;
		}

		if (this.dirty ||
			this.lastRenderFrame !== video.mozPresentedFrames ||
			this.lastRenderTime !== video.currentTime) {

			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flip);
			try {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
			} catch (securityError) {
				if (securityError.name === 'SECURITY_ERR') {
					this.allowRefresh = false;
					console.log('Unable to access cross-domain image');
				}
			}

			// Render a few extra times because the canvas takes a while to catch up
			if (Date.now() - 100 > this.lastRenderTimeStamp) {
				this.lastRenderTime = video.currentTime;
			}
			this.lastRenderFrame = video.mozPresentedFrames;
			this.lastRenderTimeStamp = Date.now();

			this.dirty = false;
		}

		if (callback && typeof callback === 'function') {
			callback();
		}
	};

	SourceNode.prototype.renderImageCanvas = function(callback) {
		var media = this.source;

		if (!gl || !media || !media.height || !media.width) {
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
			try {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);
			} catch (securityError) {
				if (securityError.name === 'SECURITY_ERR') {
					this.allowRefresh = false;
					console.log('Unable to access cross-domain image');
				}
			}

			this.lastRenderTime = Date.now() / 1000;

			this.dirty = false;
		}

		if (callback && typeof callback === 'function') {
			callback();
		}
	};

	SourceNode.prototype.renderTypedArray = function(callback) {
		var media = this.source;

		if (!gl || !media || !media.length) {
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
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, media);

			this.lastRenderTime = Date.now() / 1000;
			this.dirty = false;
		}
		if (callback && typeof callback === 'function') {
			callback();
		}
	};

	SourceNode.prototype.destroy = function() {
		var i, item;

		if (this.gl && this.texture) {
			this.gl.deleteTexture(this.texture);
		}
	
		//targets
		for (i = 0; i < this.targets.length; i++) {
			item = this.targets[i];
			if (item && item.removeSource) {
				item.removeSource(this);
			}
			delete this.targets[i];
		}

		//remove self from master list of sources
		i = sources.indexOf(this);
		if (i >= 0) {
			sources.splice(i, 1);
		}
		
		for (i in this) {
			if (i !== 'id' && this.hasOwnProperty(i)) {
				delete this[i];
			}
		}

		Node.prototype.destroy.call(this);		
	};

	//todo: implement render for array and typed array

	Target = function (targetNode) {
		var me = targetNode;

		//priveleged accessor methods
		this.__defineGetter__('inputs', function () {
			return {
				source: {
					type: 'image'
					//todo: include current value
				}
			};
		});

		this.__defineSetter__('inputs', function () {
			//should we throw an error or just fail silently
			return;
		});

		this.__defineGetter__('source', function () {
			if (me.source) {
				return me.source.pub;
			}
		});

		this.__defineSetter__('source', function (value) {
			me.setSource(value);
			return this;
		});

		this.__defineGetter__('original', function () {
			return me.target;
		});

		this.__defineSetter__('original', function () {
		});

		this.__defineSetter__('width', function(value) {
			if (!isNaN(value) && value >0 && me.width !== value) {
				me.width = me.desiredWidth = value;
				me.target.width = value;

				me.setDirty();
				return;

				if (this.source && this.source.setSize) {
					this.source.setSize(value);

					//for secondary webgl nodes, we need a new array
					/*
					if ( this.pixels && this.pixels.length !== (this.width * this.height * 4) ) {
						delete this.pixels;
					}
					*/
				}
			}
		});

		this.__defineSetter__('height', function(value) {
			if (!isNaN(value) && value >0 && me.height !== value) {
				me.height = me.desiredHeight = value;
				me.target.height = value;

				me.setDirty();
				return;

				if (this.source && this.source.setSize) {
					this.source.setSize(undefined, value);

					//for secondary webgl nodes, we need a new array
					/*
					if ( this.pixels && this.pixels.length !== (this.width * this.height * 4) ) {
						delete this.pixels;
					}
					*/
				}
			}
		});

		this.__defineGetter__('id', function () {
			return me.id;
		});

		this.__defineSetter__('id', function () {
		});

		this.render = function(callback) {
			me.render(callback);
		};

		this.go = function(options) {
			me.go(options);
		};

		this.stop = function() {
			me.stop();
		};

		this.getTexture = function() {
			return me.frameBuffer.texture;
		};

		this.destroy = function() {
			var i, nop = function() { };

			me.destroy();
			
			for (i in this) {
				if (this.hasOwnProperty(i) && i !== 'isDestroyed') {
					if (this.__lookupGetter__(i) ||
						typeof this[i] !== 'function') {
						
						delete this[i];
					} else {
						this[i] = nop;
					}
				}
			}
		};

		this.isDestroyed = function() {
			return me.isDestroyed;
		};
	};

	/*
		possible targets: canvas (2d or 3d), gl render buffer (must be same canvas)
	*/
	TargetNode = function (target, options) {
		var opts = options || {},
			flip = opts.flip === undefined ? true : opts.flip,
			width = parseInt(opts.width, 10),
			height = parseInt(opts.height, 10),
			matchedType = false,
			i, element, elements, context,
			frameBuffer;

		Node.call(this, options);

//		mat4.perspective(90, 1, 1, 100, this.transform);

		this.renderToTexture = opts.renderToTexture;

		if (typeof target === 'string') {
			elements = document.querySelectorAll(target);

			for (i = 0; i < elements.length; i++) {
				element = elements[i];
				if (element.tagName === 'CANVAS') {
					break;
				}
			}

			if (i >= elements.length) {
				throw 'not a valid HTML element (must be image, video or canvas)';
			}

			target = element;
		} else if (target instanceof WebGLFramebuffer) {

			frameBuffer = target;

			if (opts instanceof HTMLCanvasElement) {
				target = opts;
			} else if (opts instanceof WebGLRenderingContext) {
				target = opts.canvas;
			} else if (opts.canvas instanceof HTMLCanvasElement) {
				target = opts.canvas;
			} else if (opts.context instanceof WebGLRenderingContext) {
				target = opts.context.canvas;
			} else {
				//todo: search all canvases for matching contexts?
				throw "Must provide a canvas with WebGLFramebuffer target";
			}
		}

		if (target instanceof HTMLElement && target.tagName === 'CANVAS') {
			width = target.width;
			height = target.height;

			//todo: try to get a webgl context. if not, get a 2d context, and set up a different render function
			try {
				if (window.WebGLDebugUtils) {
					context = window.WebGLDebugUtils.makeDebugContext(target.getContext('experimental-webgl', {
						alpha: true,
						premultipliedAlpha: false,
						preserveDrawingBuffer: true,
						stencil: true
					}));
				} else {
					context = target.getContext('experimental-webgl', {
						alpha: true,
						premultipliedAlpha: false,
						preserveDrawingBuffer: true,
						stencil: true
					});
				}
			} catch (expError) {
			}

			if (!context) {
				try {
					context = target.getContext('webgl', {
						alpha: true,
						premultipliedAlpha: false,
						preserveDrawingBuffer: true,
						stencil: true
					});
				} catch (error) {

				}
			}

			if (!context) {
				context = target.getContext('2d');
				//todo: set up ImageData and alternative drawing method (or drawImage)
				this.render = this.render2D;
				this.use2D = true;
			} else if (!gl || gl === context) {
				//this is our main WebGL canvas
				if (!gl) {
					attachContext(context);
				}
				this.render = this.renderWebGL;
				if (opts.renderToTexture) {
					this.frameBuffer = new FrameBuffer(gl, width, height, false);
				} else {
					this.frameBuffer = {
						frameBuffer: frameBuffer || null
					};
				}
			} else if (context !== gl) {
				//set up alternative drawing method using ArrayBufferView
				this.gl = context;
				//this.pixels = new Uint8Array(width * height * 4);
				//todo: probably need another framebuffer for renderToTexture
				if (frameBuffer) {
					this.frameBuffer = {
						frameBuffer: frameBuffer
					};
				} else {
					this.frameBuffer = new FrameBuffer(this.gl, width, height, false);
				}
				this.shader = new ShaderProgram(this.gl, baseVertexShader, baseFragmentShader);
				this.model = buildRectangleModel.call(this, this.gl);

				this.texture = this.gl.createTexture();
				this.gl.bindTexture(gl.TEXTURE_2D, this.texture);
				this.gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				this.gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				this.gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				this.gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

				this.render = this.renderSecondaryWebGL;
			} else {
				//todo: this should theoretically never happen
			}

			matchedType = true;
		}

		if (!matchedType) {
			throw 'Unknown target type';
		}

		this.target = target;
		this.flip = flip;
		this.width = width;
		this.height = height;
		this.callbacks = [];
		if (opts.auto !== undefined) {
			this.auto = opts.auto;
		} else {
			this.auto = auto;
		}
		this.frames = 0;

		this.pub = new Target(this);

		targets.push(this);
	};

	extend(TargetNode, Node);

	TargetNode.prototype.setSource = function(source) {
		var newSource;

		//todo: what if source is null/undefined/false

		if (source instanceof SourceNode || source instanceof EffectNode) {
			newSource = source;
		} else if (source instanceof Effect || source instanceof Source) {
			newSource = nodesById[source.id];

			if (!newSource) {
				throw 'Cannot connect a foreign node';
			}

		} else {
			newSource = findInputNode(source);
		}

		//todo: check for cycles

		if (newSource !== this.source) {
			if (this.source) {
				this.source.removeTarget(this);
			}
			this.source = newSource;
			newSource.setTarget(this);

			this.setDirty();
		}

	};

	TargetNode.prototype.setDirty = function () {
		var that;

		function runCallbacks() {
			var i;
			for (i = 0; i < that.callbacks.length; i++) {
				that.callbacks[i]();
			}
		}

		function render() {
			that.render(runCallbacks);
		}

		this.dirty = true;

		if (this.auto) {
			that = this;
			setTimeoutZero(render);
		}
	};

	TargetNode.prototype.go = function (options) {
		if (options) {
			if (typeof options === 'function') {
				this.callbacks.push(options);
			} else if (options.callback && typeof options.callback === 'function') {
				this.callbacks.push(options.callback);
			}
		}

		this.auto = true;
		this.setDirty();
	};

	TargetNode.prototype.stop = function () {
		this.auto = false;
		this.callbacks.splice(0);
	};

	TargetNode.prototype.renderWebGL = function(callback) {
		var i;
		if (this.dirty) {
			if (!this.source) {
				return;
			}
			
			this.source.render();

			this.uniforms.source = this.source.texture;
			draw(baseShader, rectangleModel, this.uniforms, this.frameBuffer.frameBuffer, this);

			this.dirty = false;

			runCallbacks();
		}

		if (callback && typeof callback === 'function') {
			callback();
		}
	};

	TargetNode.prototype.renderSecondaryWebGL = function(callback) {
		if (this.dirty && this.source) {
			this.source.render();

			var width = this.source.width,
				height = this.source.height;

			if (!this.pixels || this.pixels.length !== width * height * 4) {
				this.pixels = new Uint8Array(width * height * 4);
			}

			this.source.readPixels(0, 0, this.source.width, this.source.height, this.pixels);

			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixels);

			this.uniforms.source = this.texture;
			draw(this.shader, this.model, this.uniforms, null, this);

			this.dirty = false;

			runCallbacks();
		}

		if (callback && typeof callback === 'function') {
			callback();
		}
	};

	TargetNode.prototype.render2D = function(callback) {
		//todo: make this actually do something

		runCallbacks();

		if (callback && typeof callback === 'function') {
			callback();
		}
	};

	TargetNode.prototype.removeSource = function (source) {
		if (this.source === source || this.source === source.pub) {
			this.source = null;
		}
	};

	TargetNode.prototype.destroy = function() {
		var i;
		
		//source
		if (this.source && this.source.removeTarget) {
			this.source.removeTarget(this);
		}
		delete this.source;
		delete this.target;
		delete this.pub;
		delete this.uniforms;
		delete this.pixels;
		delete this.auto;
		this.callbacks.splice(0);
		
		//remove self from master list of targets
		i = targets.indexOf(this);
		if (i >= 0) {
			targets.splice(i, 1);
		}
		
		Node.prototype.destroy.call(this);
	};

	/*
	Initialize Seriously object based on options
	*/

	if (options instanceof HTMLCanvasElement) {
		options = {
			canvas: options
		};
	} else {
		options = options || {};
	}

	if (options.canvas) {

	}

	/*
	priveleged methods
	*/
	this.effect = function(hook, options) {
		if (!seriousEffects[hook]) {
			throw 'Unknown effect: ' + hook;
		}

		var effectNode = new EffectNode(hook, options);
		return effectNode.pub;
	};

	this.source = function (source, options) {
		var sourceNode = findInputNode(source, options);
		//var sourceNode = new SourceNode(source, options);
		return sourceNode.pub;
	};

	this.target = function (target, options) {
		var targetNode, i;

		for (i = 0; i < targets.length; i++) {
			if (targets[i] === target || targets[i].target === target) {
				if (!!(options && options.renderToTexture) === !!targets[i].renderToTexture) {
					return targets[i].pub;
				}
			}
		}

		targetNode = new TargetNode(target, options);

		return targetNode.pub;
	};

	this.removeAlias = function (name) {
		if (aliases[name]) {
			delete this[name];
			delete aliases[name];
		}
	};

	this.go = function(options) {
		var i;

		if (options) {
			if (typeof options === 'function') {
				callbacks.push(options);
				options = {};
			} else if (options.callback && typeof options.callback === 'function') {
				callbacks.push(options.callback);
				options = extend({}, options);
				delete options.callback;
			}
		}

		auto = true;
		for (i = 0; i < targets.length; i++) {
			targets[i].go(options);
		}
	};

	this.stop = function(options) {
		var i;
		callbacks.splice(0);
		for (i = 0; i < targets.length; i++) {
			targets[i].stop(options);
		}
	};

	this.render = function(options) {
		var i;
		for (i = 0; i < targets.length; i++) {
			targets[i].render(options);
		}
	};

	this.destroy = function() {
		var i, node, nop = function() { };
		while (nodes.length) {
			node = nodes.shift();
			node.destroy();
		}
	
		if (baseShader) {
			baseShader.destroy();
			baseShader = null;
		}
		
		//clean up rectangleModel
		if (gl) {
			gl.deleteBuffer(rectangleModel.vertex);
			gl.deleteBuffer(rectangleModel.texCoord);
			gl.deleteBuffer(rectangleModel.index);
		}
		
		if (rectangleModel) {
			delete rectangleModel.vertex;
			delete rectangleModel.texCoord;
			delete rectangleModel.index;
		}
		
		for (i in this) {
			if (this.hasOwnProperty(i) && i !== 'isDestroyed') {
				if (this.__lookupGetter__(i) ||
					typeof this[i] !== 'function') {
					
					delete this[i];
				} else {
					this[i] = nop;
				}
			}
		}

		baseFragmentShader = null;
		baseVertexShader = null;
		rectangleModel = null;
		gl = null;
		seriously = null;
		sources = [];
		targets = null;
		effects = null;
		nodes = null;
		callbacks.splice(0);
		
		isDestroyed = true;
	};

	this.isDestroyed = function() {
		return isDestroyed;
	};
	
	this.incompatible = function (pluginHook) {
		var i,
			plugin,
			failure = false;

		failure = Seriously.incompatible(pluginHook);

		if (failure) {
			return failure;
		}
		
		if (!pluginHook) {
			for (i in allEffectsByHook) {
				if (allEffectsByHook[i].length) {
					plugin = seriousEffects[i];
					if (plugin && typeof plugin.compatible === 'function' &&
						!plugin.compatible.call(this)) {

						return 'plugin-' + i;
					}
				}
			}
		}
		
		return false;
	};

	//todo: load, save, find

	baseVertexShader = '#ifdef GL_ES\n' +
		'precision mediump float;\n' +
		'#endif \n' +
		'\n' +
		'attribute vec3 position;\n' +
		'attribute vec2 texCoord;\n' +
		'\n' +
		'uniform mat4 transform;\n' +
		'\n' +
		'varying vec2 vTexCoord;\n' +
		'varying vec4 vPosition;\n' +
		'\n' +
		'void main(void) {\n' +
		'	gl_Position = transform * vec4(position, 1.0);\n' +
//		'	gl_Position = vec4(position, 1.0);\n' +
		'	vTexCoord = vec2(texCoord.s, texCoord.t);\n' +
		'	vPosition = gl_Position;\n' +
		'}\n';

	baseFragmentShader = '#ifdef GL_ES\n\n' +
		'precision mediump float;\n\n' +
		'#endif\n\n' +
		'\n' +
		'varying vec2 vTexCoord;\n' +
		'varying vec4 vPosition;\n' +
		'\n' +
		'uniform sampler2D source;\n' +
		'\n' +
		'void main(void) {\n' +
		'	gl_FragColor = texture2D(source, vTexCoord);\n' +
		'}\n';

}

/*
	a utility to make sure we can run WebGL, and do it fast enough not to cause problems
*/
Seriously.prototype.benchmark = Seriously.benchmark = function (options, cb) {
	var callback = (typeof options === 'function') ? options : cb,
		opts = ( (typeof options !== 'function') && options ) || {},
		frameRate = isNaN(opts.frameRate) ? 10 : opts.frameRate,
		timeLimit = (opts.timeLimit || 2),
		start = Date.now(),
		canvas, gl, width, height, texture, i = 0, limit, frames, fps;

	if (!window.WebGLRenderingContext) {
		benchmarkResults = false;
		return false;
	}

	width = isNaN(opts.width) || opts.width <= 0 ? false : opts.width;
	height = isNaN(opts.height) || opts.height <= 0 ? false : opts.height;

	if (width) {
		if (!height) {
			height = width * 9 / 16;
		}
	} else if (height) {
		width = height * 16 / 9;
	} else {
		width = 640;
		height = 360;
	}

	function iterate() {
		if (i < frames && Date.now() - start < limit) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
			i++;

			setTimeoutZero(iterate);

			return;
		}

		fps = 1000 * i / (Date.now() - start);
		benchmarkResults = fps;

		callback(fps >= frameRate && fps);
	}

	try {
		canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		gl = canvas.getContext('experimental-webgl', {
			alpha: true,
			premultipliedAlpha: false,
			preserveDrawingBuffer: true
		});
	} catch(expError) {
		if (canvas) {
			try {
				gl = canvas.getContext('webgl', {
					alpha: true,
					premultipliedAlpha: false,
					preserveDrawingBuffer: true
				});
			} catch(webglError) {
			}
		}
	}

	if (!gl) {
		benchmarkResults = false;
		return false;
	}

	if (timeLimit) {
		try {
			texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
		} catch(error) {
		}

		limit = timeLimit * 1000;
		frames = isNaN(opts.frames) || opts.frames <= 0 ? Math.max(frameRate * timeLimit, 20) : opts.frames;

		if (callback) {
			iterate();
		} else {
			while (i < frames && Date.now() - start < limit) {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
				i++;
			}

			fps = 1000 * i / (Date.now() - start);
			benchmarkResults = fps;

			if (fps < frameRate) {
				return false;
			}
			return fps;
		}
	}

	return true;
};

Seriously.incompatible = function (pluginHook) {
	var canvas, gl, plugin;
	
	if (incompatibility === undefined) {
		canvas = document.createElement('canvas');
		if (!canvas || !canvas.getContext) {
			incompatibility = 'canvas';
		} else if (!window.WebGLRenderingContext) {
			incompatibility = 'webgl';
		} else {
			try {
				gl = canvas.getContext('experimental-webgl');
			} catch(expError) {
				try {
					gl = canvas.getContext('webgl');
				} catch(webglError) {
				}
			}
			
			if (!gl) {
				incompatibility = 'context';
			}
		}
	}
	
	if (incompatibility) {
		return incompatibility;
	}
	
	if (pluginHook) {
		plugin = seriousEffects[pluginHook];
		if (plugin && typeof plugin.compatible === 'function' &&
			!plugin.compatible(gl)) {

			return 'plugin-' + pluginHook;
		}
	}
	
	return false;
};

Seriously.plugin = function (hook, effect) {
	var reserved = ['render', 'initialize', 'original', 'width', 'height',
		'transform', 'translate', 'translateX', 'translateY', 'translateZ',
		'rotate', 'rotateX', 'rotateY', 'rotateZ', 'scale', 'scaleX', 'scaleY',
		'scaleZ', 'benchmark', 'plugin', 'alias', 'reset',
		'prototype', 'destroy', 'isDestroyed'],
		name, input;

	function nop(value) {
		return value;
	}

	if (seriousEffects[hook]) {
		console.log('Effect [' + hook + '] already loaded');
		return;
	}

	if (!effect) {
		return;
	}

	if (effect.inputs) {
		for (name in effect.inputs) {
			if (reserved.indexOf(name) >= 0 || Object.prototype[name]) {
				throw 'Reserved effect input name: ' + name;
			}

			input = effect.inputs[name];

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

			if (input.defaultValue === undefined || input.defaultValue === null) {
				if (input.type === 'number') {
					input.defaultValue = Math.min(Math.max(0, input.min), input.max);
				} else if (input.type === 'color') {
					input.defaultValue = [0, 0, 0, 0];
				} else if (input.type === 'enum') {
					if (input.options && input.options.length) {
						input.defaultValue = input.options[0];
					} else {
						input.defaultValue = '';
					}
				} else if (input.type === 'boolean') {
					input.defaultValue = false;
				} else {
					input.defaultValue = '';
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
				input.validate = Seriously.inputValidators[input.type] || nop;
			}

			if (!effect.defaultImageInput && input.type === 'image') {
				effect.defaultImageInput = name;
			}
		}
	}

	if (!effect.title) {
		effect.title = hook;
	}

	if (typeof effect.requires !== 'function') {
		effect.requires = false;
	}

	seriousEffects[hook] = effect;
	allEffectsByHook[hook] = [];

	return effect;
};

Seriously.removePlugin = function (hook) {
	var all, effect, plugin;
	
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
			effect = all[0];
			effect.destroy();
		}
		delete allEffectsByHook[hook];
	}
	
	delete seriousEffects[hook];
	
	return this;
};

Seriously.inputValidators = {
	color: function(value) {
		var s, a, i;
		if (typeof value === 'string') {
			//todo: support percentages, decimals
			s = (/^(rgb|hsl)a?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*(\d+(\.\d*)?)\s*)?\)/i).exec(value);
			if (s && s.length) {
				if (s.length < 3) {
					return [0,0,0,0];
				}

				a = [0,0,0,1];
				for (i = 0; i < 3; i++) {
					a[i] = parseFloat(s[i+2]) / 255;
				}
				if (!isNaN(s[6])) {
					a[3] = parseFloat(s[6]);
				}
				if (s[1].toLowerCase() === 'hsl') {
					return hslToRgb(a[0], a[1], a[2], a[3]);
				}
				return a;
			}

			s = (/^#(([0-9a-fA-F]{3,8}))/).exec(value);
			if (s && s.length) {
				s = s[1];
				if (s.length === 3) {
					a = [
						parseInt(s[0],16) / 15,
						parseInt(s[1],16) / 15,
						parseInt(s[2],16) / 15,
						1
					];
				} else if (s.length === 4) {
					a = [
						parseInt(s[0],16) / 15,
						parseInt(s[1],16) / 15,
						parseInt(s[2],16) / 15,
						parseInt(s[3],16) / 15
					];
				} else if (s.length === 6) {
					a = [
						parseInt(s.substr(0,2),16) / 255,
						parseInt(s.substr(2,2),16) / 255,
						parseInt(s.substr(4,2),16) / 255,
						1
					];
				} else if (s.length === 8) {
					a = [
						parseInt(s.substr(0,2),16) / 255,
						parseInt(s.substr(2,2),16) / 255,
						parseInt(s.substr(4,2),16) / 255,
						parseInt(s.substr(6,2),16) / 255
					];
				} else {
					a = [0,0,0,0];
				}
				return a;
			}

			a = colorNames[value.toLowerCase()];
			if (a) {
				return a;
			}

			return [0,0,0,0];
		}

		if (Array.isArray(value)) {
			a = value;
			if (a.length < 3) {
				return [0,0,0,0];
			}
			for (i = 0; i < 3; i++) {
				if (isNaN(a[i])) {
					return [0,0,0,0];
				}
			}
			if (a.length < 4) {
				a.push(1);
			}
			return a;
		}

		if (typeof value === 'number') {
			return [value, value, value, 1];
		//todo: } else if (type === 'Object') {
			//todo: r, g, b
		}

		return [0, 0, 0, 0];
	},
	number: function(value, input) {
		if (isNaN(value)) {
			return input.defaultValue || 0;
		}

		value = parseFloat(value);

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
	'enum': function(value, input) {
		var options = input.options || [],
			filtered;

		filtered = options.filter(function (opt) {
			return (Array.isArray(opt) && opt.length && opt[0] === value) || opt === value;
		});

		if (filtered.length) {
			return value;
		}

		return input.defaultValue || '';
	},
	vector: function(value) {
		var a, i, s, vectorFields = ['x','y','z','w'];

		if ( Array.isArray(value) ) {
			a = {};
			for (i = 0; i < 4; i++) {
				a[vectorFields[i]] = isNaN(value[i]) ? 0 : value[i];
			}
			return a;
		}

		if (typeof value === 'object') {
			a = {};
			for (i = 0; i < 4; i++) {
				s = vectorFields[i];
				a[s] = isNaN(value[s]) ? 0 : value[s];
			}
			return a;
		}

		return { x: 0, y: 0, z: 0, w: 0 };
	},
	'boolean': function(value) {
		if (!value) {
			return false;
		}

		if (value && value.toLowerCase && value.toLowerCase() === 'false') {
			return false;
		}

		return true;
	}
	//todo: date/time
};

Seriously.prototype.effects = Seriously.effects = function () {
	var name,
		effect,
		manifest,
		effects = {},
		input,
		i;

	for (name in seriousEffects) {
		effect = seriousEffects[name];
		manifest = {
			title: effect.title || name,
			description: effect.description || '',
			inputs: {}
		};

		for (i in effect.inputs) {
			input = effect.inputs[i];
			manifest.inputs[i] = {
				type: input.type,
				defaultValue: input.defaultValue,
				step: input.step,
				min: input.min,
				max: input.max,
				minCount: input.minCount,
				maxCount: input.maxCount,
				dimensions: input.dimensions,
				title: input.title || i,
				description: input.description || '',
				options: input.options || []
			};
		}

		effects[name] = manifest;
	}

	return effects;
};

if (window.Float32Array) {
	defaultTransform = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);
	//todo: set scale
	mat4.perspective(90, 1, 1, 100, defaultTransform);
}

//check for plugins loaded out of order
if (window.Seriously) {
	if (typeof window.Seriously === 'object') {
		(function() {
			var i;
			for (i in window.Seriously) {
				if (i !== 'plugin' &&
					window.Seriously.hasOwnProperty(i) &&
					typeof window.Seriously[i] === 'object') {

					Seriously.plugin(i, window.Seriously[i]);
				}
			}
		}());
	} else {
		//seriously has already been loaded, so don't replace it
		return;
	}
}

//expose Seriously to the global object
Seriously.util = {
	checkSource: checkSource,
	hslToRgb: hslToRgb,
	colors: colorNames,
	setTimeoutZero: setTimeoutZero,
	ShaderProgram: ShaderProgram,
	FrameBuffer: FrameBuffer,
	shader: {
		makeNoise: 'float makeNoise(float u, float v, float timer) {\n' +
					'	float x = u * v * mod(timer * 1000.0, 100.0);\n' +
					'	x = mod(x, 13.0) * mod(x, 127.0);\n' +
					'	float dx = mod(x, 0.01);\n' +
					'	return clamp(0.1 + dx * 100.0, 0.0,1.0);\n' +
					'}\n',
		random: '#ifndef RANDOM\n' +
			'#define RANDOM\n' +
			'float random(vec2 n) {\n' +
			'	return 0.5 + 0.5 * fract(sin(dot(n.xy, vec2(12.9898, 78.233)))* 43758.5453);\n' +
			'}\n' +
			'#endif\n'
	}
};

/*
 * simplex noise shaders
 * https://github.com/ashima/webgl-noise
 * Copyright (C) 2011 by Ashima Arts (Simplex noise)
 * Copyright (C) 2011 by Stefan Gustavson (Classic noise)
 */

Seriously.util.shader.noiseHelpers = '#ifndef NOISE_HELPERS\n' +
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

Seriously.util.shader.snoise2d = '#ifndef NOISE2D\n' +
	'#define NOISE2D\n' +
	'float snoise(vec2 v) {\n' +
	'	const vec4 C = vec4(0.211324865405187, // (3.0-sqrt(3.0))/6.0\n' +
	'		0.366025403784439, // 0.5*(sqrt(3.0)-1.0)\n' +
	'	   -0.577350269189626, // -1.0 + 2.0 * C.x\n' +
	'		0.024390243902439); // 1.0 / 41.0\n' +
	'	vec2 i = floor(v + dot(v, C.yy) );\n' +
	'	vec2 x0 = v - i + dot(i, C.xx);\n' +
	'	vec2 i1;\n' +
	'	//i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0\n' +
	'	//i1.y = 1.0 - i1.x;\n' +
	'	i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n' +
	'	// x0 = x0 - 0.0 + 0.0 * C.xx ;\n' +
	'	// x1 = x0 - i1 + 1.0 * C.xx ;\n' +
	'	// x2 = x0 - 1.0 + 2.0 * C.xx ;\n' +
	'	vec4 x12 = x0.xyxy + C.xxzz;\n' +
	'	x12.xy -= i1;\n' +
	'	i = mod289(i); // Avoid truncation effects in permutation\n' +
	'	vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));\n' +
	'	vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);\n' +
	'	m = m*m ;\n' +
	'	m = m*m ;\n' +
	'	vec3 x = 2.0 * fract(p * C.www) - 1.0;\n' +
	'	vec3 h = abs(x) - 0.5;\n' +
	'	vec3 ox = floor(x + 0.5);\n' +
	'	vec3 a0 = x - ox;\n' +
	'	m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );\n' +
	'	vec3 g;\n' +
	'	g.x = a0.x * x0.x + h.x * x0.y;\n' +
	'	g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n' +
	'	return 130.0 * dot(m, g);\n' +
	'}\n' +
	'#endif\n';

Seriously.util.shader.snoise3d = '#ifndef NOISE3D\n' +
	'#define NOISE3D\n' +
	'float snoise(vec3 v) {\n' +
	'	const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;\n' +
	'	const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);\n' +

	// First corner
	'	vec3 i = floor(v + dot(v, C.yyy) );\n' +
	'	vec3 x0 = v - i + dot(i, C.xxx) ;\n' +

	// Other corners
	'	vec3 g = step(x0.yzx, x0.xyz);\n' +
	'	vec3 l = 1.0 - g;\n' +
	'	vec3 i1 = min( g.xyz, l.zxy );\n' +
	'	vec3 i2 = max( g.xyz, l.zxy );\n' +

	'	// x0 = x0 - 0.0 + 0.0 * C.xxx;\n' +
	'	// x1 = x0 - i1 + 1.0 * C.xxx;\n' +
	'	// x2 = x0 - i2 + 2.0 * C.xxx;\n' +
	'	// x3 = x0 - 1.0 + 3.0 * C.xxx;\n' +
	'	vec3 x1 = x0 - i1 + C.xxx;\n' +
	'	vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n' +
	'	vec3 x3 = x0 - D.yyy; // -1.0+3.0*C.x = -0.5 = -D.y\n' +

	// Permutations
	'	i = mod289(i);\n' +
	'	vec4 p = permute( permute( permute(\n' +
	'						 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n' +
	'					 	+ i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n' +
	'					 	+ i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n' +

	// Gradients: 7x7 points over a square, mapped onto an octahedron.
	// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
	'	float n_ = 0.142857142857; // 1.0/7.0\n' +
	'	vec3 ns = n_ * D.wyz - D.xzx;\n' +

	'	vec4 j = p - 49.0 * floor(p * ns.z * ns.z); // mod(p,7*7)\n' +

	'	vec4 x_ = floor(j * ns.z);\n' +
	'	vec4 y_ = floor(j - 7.0 * x_ ); // mod(j,N)\n' +

	'	vec4 x = x_ *ns.x + ns.yyyy;\n' +
	'	vec4 y = y_ *ns.x + ns.yyyy;\n' +
	'	vec4 h = 1.0 - abs(x) - abs(y);\n' +

	'	vec4 b0 = vec4( x.xy, y.xy );\n' +
	'	vec4 b1 = vec4( x.zw, y.zw );\n' +

	'	//vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n' +
	'	//vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n' +
	'	vec4 s0 = floor(b0)*2.0 + 1.0;\n' +
	'	vec4 s1 = floor(b1)*2.0 + 1.0;\n' +
	'	vec4 sh = -step(h, vec4(0.0));\n' +

	'	vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n' +
	'	vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;\n' +

	'	vec3 p0 = vec3(a0.xy,h.x);\n' +
	'	vec3 p1 = vec3(a0.zw,h.y);\n' +
	'	vec3 p2 = vec3(a1.xy,h.z);\n' +
	'	vec3 p3 = vec3(a1.zw,h.w);\n' +

	//Normalise gradients
	'	vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n' +
	'	p0 *= norm.x;\n' +
	'	p1 *= norm.y;\n' +
	'	p2 *= norm.z;\n' +
	'	p3 *= norm.w;\n' +

	// Mix final noise value
	'	vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n' +
	'	m = m * m;\n' +
	'	return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),\n' +
	'							                  dot(p2,x2), dot(p3,x3) ) );\n' +
	'}\n' +
	'#endif\n';

Seriously.util.shader.snoise4d = '#ifndef NOISE4D\n' +
	'#define NOISE4D\n' +
	'vec4 grad4(float j, vec4 ip)\n' +
	'	{\n' +
	'	const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);\n' +
	'	vec4 p,s;\n' +
	'\n' +
	'	p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;\n' +
	'	p.w = 1.5 - dot(abs(p.xyz), ones.xyz);\n' +
	'	s = vec4(lessThan(p, vec4(0.0)));\n' +
	'	p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;\n' +
	'\n' +
	'	return p;\n' +
	'	}\n' +
	'\n' +
	// (sqrt(5) - 1)/4 = F4, used once below\n
	'#define F4 0.309016994374947451\n' +
	'\n' +
	'float snoise(vec4 v)\n' +
	'	{\n' +
	'	const vec4 C = vec4(0.138196601125011, // (5 - sqrt(5))/20 G4\n' +
	'						0.276393202250021, // 2 * G4\n' +
	'						0.414589803375032, // 3 * G4\n' +
	'						-0.447213595499958); // -1 + 4 * G4\n' +
	'\n' +
	// First corner
	'	vec4 i = floor(v + dot(v, vec4(F4)) );\n' +
	'	vec4 x0 = v - i + dot(i, C.xxxx);\n' +
	'\n' +
	// Other corners
	'\n' +
	// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
	'	vec4 i0;\n' +
	'	vec3 isX = step( x0.yzw, x0.xxx );\n' +
	'	vec3 isYZ = step( x0.zww, x0.yyz );\n' +
	// i0.x = dot( isX, vec3( 1.0 ) );
	'	i0.x = isX.x + isX.y + isX.z;\n' +
	'	i0.yzw = 1.0 - isX;\n' +
	// i0.y += dot( isYZ.xy, vec2( 1.0 ) );
	'	i0.y += isYZ.x + isYZ.y;\n' +
	'	i0.zw += 1.0 - isYZ.xy;\n' +
	'	i0.z += isYZ.z;\n' +
	'	i0.w += 1.0 - isYZ.z;\n' +
	'\n' +
		// i0 now contains the unique values 0,1,2,3 in each channel
	'	vec4 i3 = clamp( i0, 0.0, 1.0 );\n' +
	'	vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );\n' +
	'	vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );\n' +
	'\n' +
	'	vec4 x1 = x0 - i1 + C.xxxx;\n' +
	'	vec4 x2 = x0 - i2 + C.yyyy;\n' +
	'	vec4 x3 = x0 - i3 + C.zzzz;\n' +
	'	vec4 x4 = x0 + C.wwww;\n' +
	'\n' +
	// Permutations
	'	i = mod289(i);\n' +
	'	float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);\n' +
	'	vec4 j1 = permute( permute( permute( permute (\n' +
	'						 i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))\n' +
	'					 + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))\n' +
	'					 + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))\n' +
	'					 + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));\n' +
	'\n' +
	// Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
	// 7*7*6 = 294, which is close to the ring size 17*17 = 289.
	'	vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;\n' +
	'\n' +
	'	vec4 p0 = grad4(j0, ip);\n' +
	'	vec4 p1 = grad4(j1.x, ip);\n' +
	'	vec4 p2 = grad4(j1.y, ip);\n' +
	'	vec4 p3 = grad4(j1.z, ip);\n' +
	'	vec4 p4 = grad4(j1.w, ip);\n' +
	'\n' +
	// Normalise gradients
	'	vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n' +
	'	p0 *= norm.x;\n' +
	'	p1 *= norm.y;\n' +
	'	p2 *= norm.z;\n' +
	'	p3 *= norm.w;\n' +
	'	p4 *= taylorInvSqrt(dot(p4,p4));\n' +
	'\n' +
	// Mix contributions from the five corners
	'	vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);\n' +
	'	vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4) ), 0.0);\n' +
	'	m0 = m0 * m0;\n' +
	'	m1 = m1 * m1;\n' +
	'	return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))\n' +
	'							 + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;\n' +
	'}\n' +
	'#endif\n';

window.Seriously = Seriously;

}(window));
