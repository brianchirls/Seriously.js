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
	return  window.requestAnimationFrame       ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame    ||
			window.oRequestAnimationFrame      ||
			window.msRequestAnimationFrame     ||
			function(/* function */ callback, /* DOMElement */ element){
				window.setTimeout(callback, 1000 / 60);
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
	timeouts.push(fn);
	/*
	Workaround for postMessage bug in Firefox if the page is loaded from the file system
	https://bugzilla.mozilla.org/show_bug.cgi?id=740576
	Should run fine, but maybe a few milliseconds slower per frame.
	*/
	if (window.location.protocol === 'file:') {
		setTimeout(function() {
			console.log('using regular timeout');
			if (timeouts.length > 0) {
				var fn = timeouts.shift();
				fn();
			}
		}, 0);
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

	//todo: check float webgl extension
useFloat = false;
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
		glCanvas,
		gl,
		rectangleModel,
		baseShader,
		baseVertexShader, baseFragmentShader,
		Node, SourceNode, EffectNode, TargetNode,
		Effect, Source, Target,
		auto = false,
		isDestroyed = false;

	function buildModel(thisGl) {
		var vertex, index, texCoord;

		if (!thisGl) {
			return false;
		}

		vertex = thisGl.createBuffer();
		thisGl.bindBuffer(thisGl.ARRAY_BUFFER, vertex);
		thisGl.bufferData(thisGl.ARRAY_BUFFER, new Float32Array([
			-1, -1, -1,
			1, -1, -1,
			1, 1, -1,
			-1, 1, -1
		]), thisGl.STATIC_DRAW);
		vertex.size = 3;

		index = thisGl.createBuffer();
		thisGl.bindBuffer(thisGl.ELEMENT_ARRAY_BUFFER, index);
		thisGl.bufferData(thisGl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
		  0, 1, 2,      0, 2, 3    // Front face
		]), thisGl.STATIC_DRAW);

		texCoord = thisGl.createBuffer();
		thisGl.bindBuffer(thisGl.ARRAY_BUFFER, texCoord);
		thisGl.bufferData(thisGl.ARRAY_BUFFER, new Float32Array([
					0,0,
					1,0,
					1,1,
					0,1
		]), thisGl.STATIC_DRAW);
		texCoord.size = 2;

		return {
			vertex: vertex,
			index: index,
			texCoord: texCoord,
			length: 6,
			mode: thisGl.TRIANGLES
		};
	}

	function attachContext(context) {
		var i, node;

		gl = context;
		glCanvas = context.canvas;

		rectangleModel = buildModel(gl);

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
					node.lastRenderFrame !== media.mozPresentedFrames ||
					node.lastRenderTime !== media.currentTime) {
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

	function findInputNode(source) {
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

			node = new SourceNode(source);
		}

		return node;
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

		if (!this.dirty && this.targets) {
			this.dirty = true;
			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].setDirty();
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

		if (this instanceof SourceNode) {
			//todo: move this to SourceNode.render so it only runs when it changes
			this.uniforms.source = this.texture;
			draw(baseShader, rectangleModel, this.uniforms, this.frameBuffer.frameBuffer, this);
		}

		//todo: should we render here?

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

				} else if (effectInput.type === 'number') {
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

								oldValue = element.value;
								newValue = me.setInput(name, element.value);

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

		this.render = function() {
			me.render();
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
		Node.call(this);

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

			this.model = rectangleModel;

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

		this.setSize();
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
		if (effect.shader && this.shaderDirty) {
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

			this.shaderDirty = false;
		}
	};

	EffectNode.prototype.render = function () {
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

				value = findInputNode(value);

				if (value !== this.sources[name]) {
					if (this.sources[name]) {
						this.sources[name].removeTarget(this);
					}
					this.sources[name] = value;
					value.setTarget(this);
				}

				if ( traceSources(value, this) ) {
					throw 'Attempt to make cyclical connection.';
				}

				value = value.pub;

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

	EffectNode.prototype.destroy = function () {
		var i, item, hook = this.hook;
		
		//let effect destroy itself
		if (this.effect.destroy && typeof this.effect.destroy === 'function') {
			this.effect.destroy.call(this);
		}
		delete this.effect;
		
		//shader
		if (this.shader && this.shader.destroy) {
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

		this.render = function() {
			me.render();
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
			width = this.desiredWidth,
			height = this.desiredHeight,
			deferTexture = false,
			that = this,
			matchedType = false;

		Node.call(this);

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
//todo: typed arrays, use opposite default for flip
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
			this.render = function() { };
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

	SourceNode.prototype.renderVideo = function() {
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

		if (this.lastRenderFrame !== video.mozPresentedFrames ||
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
			this.lastRenderTime = video.currentTime;
			this.lastRenderFrame = video.mozPresentedFrames;

			this.dirty = false;
		}
	};

	SourceNode.prototype.renderImageCanvas = function() {
		var media = this.source;

		if (!gl || !media || !media.height || !media.width) {
			return;
		}

		if (!this.initialized) {
			this.initialize();
		}

		if (media.currentTime === undefined) {
			media.currentTime = 0;
		}
		this.currentTime = media.currentTime;

		if (!this.allowRefresh) {
			return;
		}

		if (this.lastRenderTime === undefined || this.lastRenderTime !== this.currentTime) {
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

			this.lastRenderTime = this.currentTime;

			this.dirty = false;
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

		this.render = function() {
			me.render();
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

		Node.call(this);

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
				this.model = buildModel.call(this, this.gl);

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
		this.dirty = true;

		if (this.auto) {
			//todo: test this, make sure we don't double-render if receiving from two updated sources
			//todo: or setTimeout for 0?
			/*
			requestAnimFrame(function() {
				this.render();
			});
			*/
			var that = this;
			setTimeoutZero(function() {
				that.render();
			});
		}
	};

	TargetNode.prototype.go = function (options) {
		if (options) {
			if (typeof options === 'function') {
				this.callback = options;
			} else if (options.callback && typeof options.callback === 'function') {
				this.callback = options.callback;
			} else {
				this.callback = false;
			}
		}

		this.auto = true;
		this.setDirty();
	};

	TargetNode.prototype.stop = function () {
		this.auto = false;
	};

	TargetNode.prototype.renderWebGL = function() {
		if (this.dirty) {
			if (!this.source) {
				return;
			}
			
			this.source.render();

			this.uniforms.source = this.source.texture;
			draw(baseShader, rectangleModel, this.uniforms, this.frameBuffer.frameBuffer, this);

			this.dirty = false;

			if (this.callback) {
				this.callback();
			}
		}
	};

	TargetNode.prototype.renderSecondaryWebGL = function() {
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

			if (this.callback) {
				this.callback();
			}
		}
	};

	TargetNode.prototype.render2D = function() {
		//todo: make this actually do something

		if (this.callback) {
			this.callback();
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
		
		//remove self from master list of targets
		i = targets.indexOf(this);
		if (i >= 0) {
			targets.splice(i, 1);
		}
		
		Node.prototype.destroy.call(this);
	};

	if (benchmarkResults === undefined) {
		this.benchmark({
			timeLimit: 0
		});
	}

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
		var sourceNode = findInputNode(source);
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
		auto = true;
		for (i = 0; i < targets.length; i++) {
			targets[i].go(options);
		}
	};

	this.stop = function(options) {
		var i;
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
					'}\n'
	}
};

window.Seriously = Seriously;

}(window));
