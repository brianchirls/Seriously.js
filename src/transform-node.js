import { identity, reservedNames } from './constants'
import { extend } from './utilities/logic';
import { colorArrayToHex, mat4 } from './utilities/math';
import { isInstance, getElement } from './utilities/dom';
import FrameBuffer from './helpers/framebuffer';
import Node from './node';

const nop = function () {};

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

	Seriously.validateInputSpecs(this.plugin);

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

export {
	Transform,
	TransformNode
};
