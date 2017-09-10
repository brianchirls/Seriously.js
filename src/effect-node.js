import { baseVertexShader, baseFragmentShader, identity, shaderNameRegex, reservedNames } from './constants'
import { extend, validateInputSpecs } from './utilities/logic';
import { isInstance, getElement } from './utilities/dom';
import { colorArrayToHex } from './utilities/math';
import { makeGlModel } from './utilities/webgl';
import Node from './node';

const nop = function () {};

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
	validateInputSpecs(this.effect);

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

	if (this.gl) {
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
			}.bind(this), this.gl);
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
			}, Seriously.util);

			if (shader instanceof ShaderProgram) {
				this.shader = shader;
			} else if (shader && shader.vertex && shader.fragment) {
				this.shader = new ShaderProgram(
					this.gl,
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

	if (!this.gl) {
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
		m = 0;
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

export {
	Effect,
	EffectNode
};
