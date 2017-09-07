import { getElement, isInstance } from './utilities/dom';
import Node from './node';
import FrameBuffer from './helpers/framebuffer';
import logger from './logger';

const nop = function () {};

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
					this[i] = nop;
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
	gl = this.gl;

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
	let gl = this.gl,
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
	if (this.gl) {
		this.frameBuffer = new FrameBuffer(this.gl, this.width, this.height, {
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

SourceNode.prototype.update = nop;

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
	let media = this.source;

	if (!this.gl || !media && media !== 0 || !this.ready) {
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
		this.plugin.render.call(this, this.gl, this.seriously.draw, this.seriously.rectangleModel, this.seriously.baseShader)) {

		this.dirty = false;
		this.emit('render');
	}
};

SourceNode.prototype.renderImageCanvas = function () {
	let gl = this.gl,
		media = this.source;

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

	if (this.gl && this.texture) {
		this.gl.deleteTexture(this.texture);
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
		if (this.hasOwnProperty(key) && key !== 'id') {
			delete this[key];
		}
	}
};

export {
	Source,
	SourceNode
};
