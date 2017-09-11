import { colorNames, baseVertexShader, baseFragmentShader,
	vectorFields, colorFields, colorRegex, hexColorRegex,
	reservedTransformProperties, reservedEffectProperties } from './constants';
import { extend, isArrayLike } from './utilities/logic';
import { mat4, hslToRgb } from './utilities/math';
import { checkSource, buildRectangleModel } from './utilities/webgl';
import { setTimeoutZero, requestAnimationFrame, cancelAnimFrame,
	isInstance, getWebGlContext, getElement, getTestContext } from './utilities/dom';
import logger from './logger';
import FrameBuffer from './helpers/framebuffer';
import ShaderProgram from './helpers/shaderprogram';
import { Source, SourceNode } from './source-node';
import { Effect, EffectNode } from './effect-node';
import { Transform, TransformNode } from './transform-node';
import { Target, TargetNode } from './target-node';

const document = window.document,
	allSourcesByHook = {
		canvas: [],
		image: [],
		video: []
	},
	seriousEffects = {},
	seriousTransforms = {},
	seriousSources = {},
	seriousTargets = {},
	allTargetsByHook = {},
	allTransformsByHook = {},
	allEffectsByHook = {},
	allTargets = window.WeakMap && new WeakMap(),
	nop  = function () {};

let maxSeriouslyId = 0,
	colorCtx,
	incompatibility;


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
				input.validate = Seriously.inputValidators[input.type] || passThrough;
			}

			if (!plugin.defaultImageInput && input.type === 'image') {
				plugin.defaultImageInput = name;
			}
		}
	}
}

function Seriously(options) {

	//if called without 'new', make a new object and return that
	if (window === this || !(this instanceof Seriously) || this.id !== undefined) {
		return new Seriously(options);
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
			element = document.querySelector(hook);
		}

		if (typeof hook !== 'string' || !target && target !== 0 || element) {
			if (!options || typeof options !== 'object') {
				options = target;
			}
			target = element || hook;
			hook = null;
		}

		if (typeof target === 'string' && isNaN(target)) {
			target = document.querySelector(target);
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
				Seriously.logger.warn(
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
		} else if (typeof hook === 'string') {
			return defaultInputs[hook];
		}

		if (options === null) {
			delete defaultInputs[hook];
		} else if (typeof options === 'object') {
			defaultInputs[hook] = extend({}, options);
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
			failure = Seriously.incompatible(hook);

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
Seriously.traceSources = function traceSources (node, original) {
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

Seriously.incompatible = function (hook) {
	let canvas, gl, plugin;

	if (incompatibility === undefined) {
		canvas = document.createElement('canvas');
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

Seriously.plugin = function (hook, definition, meta) {
	let effect;

	if (seriousEffects[hook]) {
		Seriously.logger.warn('Effect [' + hook + '] already loaded');
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

Seriously.removePlugin = function (hook) {
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

Seriously.source = function (hook, definition, meta) {
	let source;

	if (seriousSources[hook]) {
		Seriously.logger.warn('Source [' + hook + '] already loaded');
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

Seriously.removeSource = function (hook) {
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

Seriously.transform = function (hook, definition, meta) {
	let transform;

	if (seriousTransforms[hook]) {
		Seriously.logger.warn('Transform [' + hook + '] already loaded');
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

Seriously.removeTransform = function (hook) {
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

Seriously.target = function (hook, definition, meta) {
	let target;

	if (seriousTargets[hook]) {
		Seriously.logger.warn('Target [' + hook + '] already loaded');
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

Seriously.removeTarget = function (hook) {
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

Seriously.sourcePlugin = function (node, hook, source, options, force) {
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

Seriously.getTarget = function (hook) {
	return seriousTargets[hook];
};

Seriously.forEachSource = function (fn) {
	for (let key in seriousSources) {
		if (seriousSources.hasOwnProperty(key) && seriousSources[key]) {
			if (fn(key, seriousSources[key]) === false) {
				break;
			}
		}
	}
};

Seriously.forEachTarget = function (fn) {
	for (let key in seriousTargets) {
		if (seriousTargets.hasOwnProperty(key) && seriousTargets[key]) {
			if (fn(key, seriousSources[key]) === false) {
				break;
			}
		}
	}
};

//todo: validators should not allocate new objects/arrays if input is valid
Seriously.inputValidators = {
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
				colorCtx = document.createElement('canvas').getContext('2d');
			}
			colorCtx.fillStyle = value;
			s = colorCtx.fillStyle;
			if (s && s !== '#000000') {
				return Seriously.inputValidators.color(s, input, defaultValue, oldValue);
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

Seriously.validateInputSpecs = validateInputSpecs;

Seriously.prototype.effects = Seriously.effects = function () {
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

Seriously.prototype.getTarget = function (hook) {
	return seriousTargets[hook];
};

Seriously.prototype.hasTarget = function (hook) {
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

					Seriously.plugin(i, window.Seriously[i]);
				}
			}
		}());
	}
}

Seriously.logger = logger;

Seriously.util = {
	mat4: mat4,
	checkSource: function (source) {
		return checkSource(source, incompatibility);
	},
	hslToRgb: hslToRgb,
	colors: colorNames,
	setTimeoutZero: setTimeoutZero,
	ShaderProgram: ShaderProgram,
	FrameBuffer: FrameBuffer,
	requestAnimationFrame: requestAnimationFrame,
	shader: {
		makeNoise: 'float makeNoise(float u, float v, float timer) {\n' +
		'	float x = u * v * mod(timer * 1000.0, 100.0);\n' +
		'	x = mod(x, 13.0) * mod(x, 127.0);\n' +
		'	float dx = mod(x, 0.01);\n' +
		'	return clamp(0.1 + dx * 100.0, 0.0, 1.0);\n' +
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
 *	todo: additional transform node types
 *	- perspective
 *	- matrix
 */

export default Seriously;
