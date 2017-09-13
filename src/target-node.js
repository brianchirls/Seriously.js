import { identity, baseFragmentShader, baseVertexShader, outputRenderOptions } from './constants';
import { mat4 } from './utilities/math';
import { extend } from './utilities/logic';
import { isInstance } from './utilities/dom';
import { getWebGlContext } from './utilities/dom';
import { buildRectangleModel } from './utilities/webgl';
import FrameBuffer from './helpers/framebuffer';
import ShaderProgram from './helpers/shaderprogram';
import Node from './node';
import logger from './logger';

const nop = function () {};


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
					this[i] = nop;
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
			triedWebGl = true;
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

			this.render = nop;
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

export {
	Target,
	TargetNode
};
