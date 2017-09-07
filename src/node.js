import { isInstance, setTimeoutZero } from './utilities/dom';
import FrameBuffer from './helpers/framebuffer';

function Node (seriously) {
	this.ready = false;
	this.width = 1;
	this.height = 1;

	this.gl = seriously.gl;

	this.uniforms = {
		resolution: [this.width, this.height],
		transform: null
	};

	this.dirty = true;
	this.isDestroyed = false;

	this.seriously = seriously;

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
	if (this.gl) {
		this.frameBuffer = new FrameBuffer(this.gl, this.width, this.height, useFloat);
	}
};

Node.prototype.readPixels = function (x, y, width, height, dest) {
	if (!this.gl) {
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

	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer.frameBuffer);
	this.gl.readPixels(x, y, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, dest);

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

	delete this.gl;
	delete this.seriously;

	this.isDestroyed = true;
};

export default Node;
