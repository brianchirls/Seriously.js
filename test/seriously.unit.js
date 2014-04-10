/*jslint devel: true, bitwise: true, browser: true, white: true, nomen: true, plusplus: true, maxerr: 50, indent: 4 */
/* global module, test, asyncTest, expect, ok, equal, start, Seriously, require, WebGLDebugUtils */
(function () {
	'use strict';

	function compare(a, b) {
		var i;

		if (a.length !== b.length) {
			return false;
		}

		for (i = 0; i < a.length; i++) {
			if (a[i] !== b[i]) {
				return false;
			}
		}

		return true;
	}

	function nop() {}

	Seriously.logger = {
		log: nop,
		info: nop,
		warn: nop,
		error: nop
	};

	module('Core');
	test('Core', 6, function () {
		var p, props = 0,
			newGlobals = [],
			skipIds = false,
			s1,
			s2,
			s3;

		ok(window.Seriously, 'Seriously exists');

		equal(typeof window.Seriously, 'function', 'Seriously is a function');

		// workaround: https://github.com/jquery/qunit/issues/212
		p = document.createElement('div');
		p.id = 'foobarbazbiddle83274';
		document.body.appendChild(p);
		if (window[p.id] === p) {
			skipIds = true;
		}
		document.body.removeChild(p);

		window.globalProperties.push('requirejs', 'require', 'define');

		for (p in window) {
			if (!skipIds || document.getElementById(p) !== window[p] &&
				document.getElementById('qunit-urlconfig-' + p) !== window[p]) {
				if (window.globalProperties.indexOf(p) < 0) {
					props++;
					if (p !== 'Seriously') {
						console.log('new property: ' + p, window[p]);
					}
					newGlobals.push(p);
				}
			}
		}

		p = props + (props === 1 ? ' property' : ' properties') + ' added to global: [' +
			newGlobals.join(', ') + ']';
		equal(props, 1, p);

		s1 = new Seriously();
		ok(s1 instanceof Seriously, 'Create Seriously instance with new');

		/*jshint ignore:start*/
		s2 = Seriously();
		/*jshint ignore:end*/
		ok(s2 instanceof Seriously && s2 !== s1, 'Create Seriously instance without new');

		//not sure why this would ever happen, but couldn't hurt to have the safety check
		/*jshint ignore:start*/
		s3 = Seriously.bind(s2)();
		/*jshint ignore:end*/
		ok(s3 instanceof Seriously && s3 !== s2, 'Create Seriously instance without new, `this` bound to another instance');

		s1.destroy();
		s2.destroy();
		s3.destroy();
	});

	test('Incompatible', 4, function () {
		var seriously,
			effect,
			source,
			msg,
			expected,
			gl,
			canvas;

		Seriously.plugin('incompatibleeffect', {
			compatible: function () {
				return false;
			}
		});

		Seriously.source('incompatiblesource', {
			compatible: function () {
				return false;
			},
			title: 'delete me'
		});

		seriously = new Seriously();

		canvas = document.createElement('canvas');
		if (!canvas) {
			expected = 'canvas';
		} else if (!window.WebGLRenderingContext) {
			expected = 'webgl';
		} else {
			try {
				gl = canvas.getContext('webgl');
			} catch (webglError) {
			}

			if (!gl) {
				try {
					gl = canvas.getContext('experimental-webgl');
				} catch (expError) {
				}
			}

			if (!gl) {
				expected = 'context';
			}
		}

		//test effect plugin
		msg = seriously.incompatible('incompatibleeffect');
		equal(msg, expected || 'plugin-incompatibleeffect', 'Incompatibity test on effect');

		effect = seriously.effect('incompatibleeffect');
		msg = seriously.incompatible();
		equal(msg, expected || 'plugin-incompatibleeffect', 'Incompatibity test on network with incompatible effect plugin');
		effect.destroy();

		//test source plugin
		msg = seriously.incompatible('incompatiblesource');
		equal(msg, expected || 'source-incompatiblesource', 'Incompatibity test on source');

		source = seriously.source('incompatiblesource');
		msg = seriously.incompatible();
		equal(msg, expected || 'source-incompatiblesource', 'Incompatibity test on network with incompatible source plugin');

		//clean up
		seriously.destroy();
		Seriously.removePlugin('incompatibleeffect');
		Seriously.removeSource('incompatiblesource');
	});

	module('Plugin');
	/*
	 * define plugin
	*/

	test('Remove Plugin', 3, function () {
		var p, s, error, e, allEffects;

		p = Seriously.plugin('removeme', {});
		ok(p && p.title === 'removeme', 'First plugin loaded');

		s = new Seriously();
		e = s.effect('removeme');

		Seriously.removePlugin('removeme');

		allEffects = Seriously.effects();
		ok(allEffects.removeme === undefined, 'Plugin no longer listed.');

		/*
		 * todo: test that created effect is destroyed
		 */

		try {
			s.effect('removeme');
		} catch (ee) {
			error = ee;
		}

		equal(error && error.message, 'Unknown effect: removeme', 'Plugin doesn\'t exist; throws error');

		s.destroy();
	});

	test('Define plugin with duplicate name', 4, function () {
		var p, allEffects;

		Seriously.logger.warn = function (s) {
			equal(s, 'Effect [pluginDuplicate] already loaded', 'Warning logged to console');
		};
		p = Seriously.plugin('pluginDuplicate', {
			title: 'Original'
		});
		ok(p && p.title === 'Original', 'First plugin loaded');

		p = Seriously.plugin('pluginDuplicate', {
			title: 'Duplicate'
		});

		ok(p === undefined, 'Duplicate plugin ignored');

		allEffects = Seriously.effects();
		equal(allEffects.pluginDuplicate.title, 'Original', 'Original plugin remains');

		Seriously.logger.warn = nop;
		Seriously.removePlugin('pluginDuplicate');
	});

	test('Define plugin with reserved input name', 2, function () {
		var p, s, error1 = false, error2 = false;

		try {
			p = Seriously.plugin('badPlugin', {
				inputs: {
					initialize: {
						type: 'number'
					}
				}
			});
		} catch (e) {
			error1 = e;
		}

		equal(error1 && error1.message, 'Reserved effect input name: initialize', 'Defining plugin throws error');

		try {
			s = new Seriously();
			s.effect('badPlugin');
		} catch (ee) {
			error2 = ee;
		}

		equal(error2 && error2.message, 'Unknown effect: badPlugin', 'Plugin doesn\'t exist; using throws error');

		s.destroy();
		Seriously.removePlugin('badPlugin');
	});

	test('Effect definition function', function () {
		var seriously,
			effect1,
			effect2,
			canvas,
			target;

		expect(Seriously.incompatible() ? 2 : 4);

		Seriously.plugin('removeme', function (options) {
			var id = options.id;

			ok(!!seriously, 'Definition function runs after seriously created #' + id);

			return {
				initialize: function () {
					equal(this.effect.title, 'removeme' + id, 'Title property #' + id + ' overwritten');
				},
				title: 'removeme' + id
			};
		},
		{
			title: 'removeme'
		});

		seriously = new Seriously();
		effect1 = seriously.effect('removeme', {
			id: 1
		});
		effect2 = seriously.effect('removeme', {
			id: 2
		});

		canvas = document.createElement('canvas');
		target = seriously.target(canvas);

		target.source = effect1;
		target.render();
		target.source = effect2;
		target.render();

		seriously.destroy();
		Seriously.removePlugin('removeme');
	});

	asyncTest('Plugin loaded before Seriously', 3, function () {
		var iframe;

		iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		iframe.addEventListener('load', function () {
			var iframe = this,
				win = this.contentWindow,
				doc = this.contentDocument,
				script;

			//first load plugin
			win.Seriously = win.Seriously ||
				{ plugin: function (name, opt) { this[name] = opt; } };

			win.Seriously.plugin('test', {});

			//then load Seriously
			script = doc.createElement('script');
			script.src = '../seriously.js';
			script.addEventListener('load', function () {
				var s, e;

				ok(typeof win.Seriously === 'function', 'Seriously is a function');

				s = win.Seriously();

				ok(s instanceof win.Seriously, 'Created Seriously instance');

				e = s.effect('test');

				ok(typeof e === 'object' && e.id !== undefined, 'Created effect');

				s.destroy();
				win.Seriously.removePlugin('test');
				document.body.removeChild(iframe);
				start();
			}, false);
			doc.head.appendChild(script);

		});
		document.body.appendChild(iframe);
	});

	module('Effect');
	/*
	 * create effect
	*/

	test('Effect Polygon Matte', function () {
		var seriously, effect;

		//todo: expects

		Seriously.plugin('removeme', {});
		seriously = new Seriously();
		effect = seriously.effect('removeme');

		ok(typeof effect.matte === 'function', 'matte method exists');

		effect.matte([
			[0, 0],
			[1, 0],
			[0, 1],
			[1, 1]
		]);

		effect.matte([
			[
				[0, 0],
				[1, 0],
				[0, 1],
				[1, 1]
			]
		]);

		seriously.destroy();
		Seriously.removePlugin('removeme');
	});

	test('Effect alias', 2, function () {
		var seriously,
			effect;

		Seriously.plugin('removeme', {
			inputs: {
				input: {
					type: 'number'
				}
			}
		});
		seriously = new Seriously();
		effect = seriously.effect('removeme');

		effect.alias('input', 'input');
		seriously.input = 5;
		equal(effect.input, 5, 'Effect alias sets value');

		effect.destroy();
		ok(!seriously.hasOwnProperty('input'), 'Effect alias removed');

		seriously.destroy();
		Seriously.removePlugin('removeme');
	});

	test('Graph Loop', 1, function () {
		var seriously,
			effect,
			error = false;

		Seriously.plugin('removeme', {
			inputs: {
				source: {
					type: 'image'
				}
			}
		});
		seriously = new Seriously();
		effect = seriously.effect('removeme');

		try {
			effect.source = effect;
		} catch (e) {
			error = e;
		}

		equal(error && error.message, 'Attempt to make cyclical connection.', 'Setting effect source to itself throws an error');

		seriously.destroy();
		Seriously.removePlugin('removeme');
	});

	test('Effect Info', 17, function () {
		var inputs,
			seriously,
			effect;

		Seriously.plugin('test', {
			inputs: {
				number: {
					type: 'number',
					min: -4,
					max: 100,
					step: 2,
					defaultValue: 8,
					description: 'this is a number',
					title: 'Number'
				},
				vector: {
					type: 'vector',
					dimensions: 3
				},
				e: {
					type: 'enum',
					options: [
						['one', 'One'],
						['two', 'Two']
					]
				}
			},
			title: 'Test'
		});

		seriously = new Seriously();
		effect = seriously.effect('test');

		equal(effect.effect, 'test', 'Effect name reported');
		equal(effect.title, 'Test', 'Effect title reported');
		ok(effect.id >= 0, 'Effect id reported');

		//Check inputs
		inputs = effect.inputs();
		ok(inputs.number && inputs.vector && inputs.e, 'All inputs are present');
		equal(Object.keys(inputs).length, 3, 'No extra properties');

		equal(inputs.number.type, 'number', 'Number type reported');
		equal(inputs.number.min, -4, 'Number minimum reported');
		equal(inputs.number.max, 100, 'Number maximum reported');
		equal(inputs.number.step, 2, 'Number step reported');
		equal(inputs.number.defaultValue, 8, 'Number default value reported');
		equal(inputs.number.title, 'Number', 'Node title reported');
		equal(inputs.number.description, 'this is a number', 'Node description reported');

		equal(inputs.vector.type, 'vector', 'Vector type reported');
		equal(inputs.vector.dimensions, 3, 'Vector dimensions reported');

		equal(inputs.e.type, 'enum', 'Enum type reported');
		ok(Array.isArray(inputs.e.options), 'Enum options reported');

		inputs.e.options[1][0] = 'three';
		equal(effect.inputs('e').options[1][0], 'two', 'Enum options fully copied, cannot be tampered with');

		seriously.destroy();
		Seriously.removePlugin('test');
	});

	module('Source');
	/*
	 * create source: all different types
	 * destroy source before img loaded
	 * checkSource on cross-origin image, dirty canvas
	*/

	asyncTest('Source Types', 17, function () {
		var seriously, source, target,
			incompatible,
			error,
			sourceCanvas, targetCanvas, img,
			ctx,
			pixels, imagedata,
			asyncDone = false, syncDone = false,
			comparison = [ //image is upside down
				0, 0, 255, 255,
				255, 255, 255, 255,
				255, 0, 0, 255,
				0, 255, 0, 255
			];

		incompatible = Seriously.incompatible();

		targetCanvas = document.createElement('canvas');
		targetCanvas.width = 2;
		targetCanvas.height = 2;

		sourceCanvas = document.createElement('canvas');
		sourceCanvas.width = 2;
		sourceCanvas.height = 2;

		ctx = sourceCanvas.getContext && sourceCanvas.getContext('2d');
		ctx.fillStyle = '#f00'; //red
		ctx.fillRect(0, 0, 1, 1);
		ctx.fillStyle = '#0f0'; //green
		ctx.fillRect(1, 0, 1, 1);
		ctx.fillStyle = '#00f'; //blue
		ctx.fillRect(0, 1, 1, 1);
		ctx.fillStyle = '#fff'; //white
		ctx.fillRect(1, 1, 1, 1);
		imagedata = ctx.getImageData(0, 0, 2, 2);

		seriously = new Seriously();
		target = seriously.target(targetCanvas);

		img = document.createElement('img');
		img.addEventListener('load', function () {
			var error;
			source = seriously.source(img);
			ok(source, 'Created source from image');
			try {
				pixels = source.readPixels(0, 0, 2, 2);
			} catch (e) {
				error = e;
			}
			ok(incompatible ? error : !error, 'readPixels throws error iff incompatible');
			ok(incompatible || pixels && compare(pixels, comparison), 'Image source rendered accurately.');
			source.destroy();

			asyncDone = true;
			if (syncDone) {
				seriously.destroy();
				start();
			}
		});
		img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVQIW2P8z8DwnxFIMAJpIGBgAAA8/Qb9DqS16QAAAABJRU5ErkJggg== ';

		source = seriously.source(sourceCanvas);
		ok(source, 'Created source from canvas');
		error = false;
		try {
			pixels = source.readPixels(0, 0, 2, 2);
		} catch (e) {
			error = e;
		}
		ok(incompatible ? error : !error, 'readPixels throws error iff incompatible');
		ok(incompatible || pixels && compare(pixels, comparison), 'Canvas source rendered accurately.');

		ctx.fillRect(0, 0, 2, 2);
		source.update();
		error = false;
		try {
			pixels = source.readPixels(0, 0, 2, 2);
		} catch (e) {
			error = e;
		}
		ok(incompatible ? error : !error, 'readPixels throws error iff incompatible');
		ok(incompatible || pixels && compare(pixels, [ //image is upside down
			255, 255, 255, 255,
			255, 255, 255, 255,
			255, 255, 255, 255,
			255, 255, 255, 255
		]), 'Canvas source updated and rendered accurately.');

		source = seriously.source(imagedata);
		ok(source, 'Created source from ImageData');
		error = false;
		try {
			pixels = source.readPixels(0, 0, 2, 2);
		} catch (e) {
			error = e;
		}
		ok(incompatible ? error : !error, 'readPixels throws error iff incompatible');
		ok(incompatible || pixels && compare(pixels, comparison), 'ImageData source rendered accurately.');
		source.destroy();

		source = seriously.source(new Uint8Array(comparison), {
			width: 2,
			height: 2
		});
		ok(source, 'Created source from Typed Array');
		error = false;
		try {
			pixels = source.readPixels(0, 0, 2, 2);
		} catch (e) {
			error = e;
		}
		ok(incompatible ? error : !error, 'readPixels throws error iff incompatible');
		ok(incompatible || pixels && compare(pixels, comparison), 'Typed Array source rendered accurately.');
		source.destroy();

		source = seriously.source(comparison, {
			width: 2,
			height: 2
		});
		ok(source, 'Created source from Array');
		error = false;
		try {
			pixels = source.readPixels(0, 0, 2, 2);
		} catch (e) {
			error = e;
		}
		ok(incompatible ? error : !error, 'readPixels throws error iff incompatible');
		ok(incompatible || pixels && compare(pixels, comparison), 'Array source rendered accurately.');
		source.destroy();

		//todo: implement and test WebGLTexture source

		syncDone = true;
		if (asyncDone) {
			seriously.destroy();
			start();
		}
	});

	test('Create two Source objects on identical sources', function () {
		var img, seriously, source1, source2;

		seriously = new Seriously();
		img = document.getElementById('colorbars');
		source1 = seriously.source(img);
		source2 = seriously.source('#colorbars');

		ok(source1 === source2, 'Source objects are the same');

		seriously.destroy();
	});

	test('Create Source object implicitly', function () {
		var seriously, source1, source2, effect;

		Seriously.plugin('test', {
			inputs: {
				source: {
					type: 'image'
				}
			}
		});

		seriously = new Seriously();
		effect = seriously.effect('test');
		effect.source = '#colorbars';
		source1 = effect.source;
		source2 = seriously.source('#colorbars');

		ok(source1 === source2, 'Source objects are the same');

		seriously.destroy();
		Seriously.removePlugin('test');
	});

	test('Source Plugins', function () {
		var seriously,
			funcSource,
			objSource,
			altSource1,
			altSource2,
			effect,
			canvas,
			target;

		//render methods don't run without WebGL
		expect(Seriously.incompatible() ? 5 : 7);

		Seriously.plugin('temp', {
			inputs: {
				a: {
					type: 'image'
				},
				b: {
					type: 'image'
				}
			},
			title: 'delete me'
		});

		Seriously.source('func', function (source) {
			if (!source) {
				ok(true, 'Source definition function runs');
			}
			return {
				compare: function (source) {
					return this.source === source;
				},
				render: function () {
					if (!this.source) {
						ok(true, 'Source render function runs (func)');
					}
				},
				destroy: function () {
					if (!this.source) {
						ok(true, 'Source destroy function runs (func)');
					}
				}
			};
		}, {
			title: 'delete me'
		});

		Seriously.source('obj', {
			render: function () {
				ok(true, 'Source render function runs (obj)');
			},
			destroy: function () {
				ok(true, 'Source destroy function runs (obj)');
			},
			title: 'delete me'
		});

		seriously = new Seriously();

		canvas = document.createElement('canvas');
		target = seriously.target(canvas);

		funcSource = seriously.source('func', 0);
		objSource = seriously.source('obj');

		altSource1 = seriously.source('func', 1);
		altSource2 = seriously.source('func', 1);

		equal(altSource1, altSource2, 'Matching source objects are the same');
		ok(funcSource !== altSource1, 'Different source objects are not the same');

		effect = seriously.effect('temp');
		effect.a = funcSource;
		effect.b = objSource;

		target.source = effect;
		target.render();

		seriously.destroy();
		Seriously.removePlugin('temp');
		Seriously.removeSource('func');
		Seriously.removeSource('obj');
	});

	module('Inputs');
	/*
	 * all different types
	 * test html elements as inputs (with overwriting)
	 */
	test('Number', 6, function () {
		var s, e, val, input;

		Seriously.plugin('testNumberInput', {
			inputs: {
				number: {
					type: 'number',
					defaultValue: 42
				},
				minmax: {
					type: 'number',
					min: -35,
					max: 12
				},
				step: {
					type: 'number',
					step: 7
				}
			}
		});

		s = new Seriously();
		e = s.effect('testNumberInput');

		e.number = Math.PI;
		val = e.number;
		equal(val, Math.PI, 'Simply set a number');

		e.minmax = -275;
		val = e.minmax;
		equal(val, -35, 'Set a number against minimum');

		e.minmax = Infinity;
		val = e.minmax;
		equal(val, 12, 'Set a number against maximum');

		e.step = 82;
		val = e.step;
		equal(val, 84, 'Step rounds up');

		e.number = 'not a number';
		val = e.number;
		equal(val, 42, 'Bad number reverts to default value');

		input = document.createElement('input');
		input.setAttribute('type', 'text');
		input.value = 75;
		e.number = input;
		equal(e.number, 75, 'Set to value of input element');

		//todo: make test for changing value of input

		s.destroy();
		Seriously.removePlugin('testNumberInput');
	});

	test('Color', 159, function () {
		var e, s, val,
			name,
			colorNames = {
				black: [0 / 255, 0 / 255, 0 / 255, 1],
				silver: [192 / 255, 192 / 255, 192 / 255, 1],
				gray: [128 / 255, 128 / 255, 128 / 255, 1],
				white: [1, 1, 1, 1],
				maroon: [128 / 255, 0 / 255, 0 / 255, 1],
				red: [1, 0 / 255, 0 / 255, 1],
				purple: [128 / 255, 0 / 255, 128 / 255, 1],
				fuchsia: [1, 0 / 255, 1, 1],
				green: [0 / 255, 128 / 255, 0 / 255, 1],
				lime: [0 / 255, 1, 0 / 255, 1],
				olive: [128 / 255, 128 / 255, 0 / 255, 1],
				yellow: [1, 1, 0 / 255, 1],
				navy: [0 / 255, 0 / 255, 128 / 255, 1],
				blue: [0 / 255, 0 / 255, 1, 1],
				teal: [0 / 255, 128 / 255, 128 / 255, 1],
				aqua: [0 / 255, 1, 1, 1],
				orange: [1, 165 / 255, 0 / 255, 1],
				aliceblue: [240 / 255, 248 / 255, 1, 1],
				antiquewhite: [250 / 255, 235 / 255, 215 / 255, 1],
				aquamarine: [127 / 255, 1, 212 / 255, 1],
				azure: [240 / 255, 1, 1, 1],
				beige: [245 / 255, 245 / 255, 220 / 255, 1],
				bisque: [1, 228 / 255, 196 / 255, 1],
				blanchedalmond: [1, 235 / 255, 205 / 255, 1],
				blueviolet: [138 / 255, 43 / 255, 226 / 255, 1],
				brown: [165 / 255, 42 / 255, 42 / 255, 1],
				burlywood: [222 / 255, 184 / 255, 135 / 255, 1],
				cadetblue: [95 / 255, 158 / 255, 160 / 255, 1],
				chartreuse: [127 / 255, 1, 0 / 255, 1],
				chocolate: [210 / 255, 105 / 255, 30 / 255, 1],
				coral: [1, 127 / 255, 80 / 255, 1],
				cornflowerblue: [100 / 255, 149 / 255, 237 / 255, 1],
				cornsilk: [1, 248 / 255, 220 / 255, 1],
				crimson: [220 / 255, 20 / 255, 60 / 255, 1],
				darkblue: [0 / 255, 0 / 255, 139 / 255, 1],
				darkcyan: [0 / 255, 139 / 255, 139 / 255, 1],
				darkgoldenrod: [184 / 255, 134 / 255, 11 / 255, 1],
				darkgray: [169 / 255, 169 / 255, 169 / 255, 1],
				darkgreen: [0 / 255, 100 / 255, 0 / 255, 1],
				darkgrey: [169 / 255, 169 / 255, 169 / 255, 1],
				darkkhaki: [189 / 255, 183 / 255, 107 / 255, 1],
				darkmagenta: [139 / 255, 0 / 255, 139 / 255, 1],
				darkolivegreen: [85 / 255, 107 / 255, 47 / 255, 1],
				darkorange: [1, 140 / 255, 0 / 255, 1],
				darkorchid: [153 / 255, 50 / 255, 204 / 255, 1],
				darkred: [139 / 255, 0 / 255, 0 / 255, 1],
				darksalmon: [233 / 255, 150 / 255, 122 / 255, 1],
				darkseagreen: [143 / 255, 188 / 255, 143 / 255, 1],
				darkslateblue: [72 / 255, 61 / 255, 139 / 255, 1],
				darkslategray: [47 / 255, 79 / 255, 79 / 255, 1],
				darkslategrey: [47 / 255, 79 / 255, 79 / 255, 1],
				darkturquoise: [0 / 255, 206 / 255, 209 / 255, 1],
				darkviolet: [148 / 255, 0 / 255, 211 / 255, 1],
				deeppink: [1, 20 / 255, 147 / 255, 1],
				deepskyblue: [0 / 255, 191 / 255, 1, 1],
				dimgray: [105 / 255, 105 / 255, 105 / 255, 1],
				dimgrey: [105 / 255, 105 / 255, 105 / 255, 1],
				dodgerblue: [30 / 255, 144 / 255, 1, 1],
				firebrick: [178 / 255, 34 / 255, 34 / 255, 1],
				floralwhite: [1, 250 / 255, 240 / 255, 1],
				forestgreen: [34 / 255, 139 / 255, 34 / 255, 1],
				gainsboro: [220 / 255, 220 / 255, 220 / 255, 1],
				ghostwhite: [248 / 255, 248 / 255, 1, 1],
				gold: [1, 215 / 255, 0 / 255, 1],
				goldenrod: [218 / 255, 165 / 255, 32 / 255, 1],
				greenyellow: [173 / 255, 1, 47 / 255, 1],
				grey: [128 / 255, 128 / 255, 128 / 255, 1],
				honeydew: [240 / 255, 1, 240 / 255, 1],
				hotpink: [1, 105 / 255, 180 / 255, 1],
				indianred: [205 / 255, 92 / 255, 92 / 255, 1],
				indigo: [75 / 255, 0 / 255, 130 / 255, 1],
				ivory: [1, 1, 240 / 255, 1],
				khaki: [240 / 255, 230 / 255, 140 / 255, 1],
				lavender: [230 / 255, 230 / 255, 250 / 255, 1],
				lavenderblush: [1, 240 / 255, 245 / 255, 1],
				lawngreen: [124 / 255, 252 / 255, 0 / 255, 1],
				lemonchiffon: [1, 250 / 255, 205 / 255, 1],
				lightblue: [173 / 255, 216 / 255, 230 / 255, 1],
				lightcoral: [240 / 255, 128 / 255, 128 / 255, 1],
				lightcyan: [224 / 255, 1, 1, 1],
				lightgoldenrodyellow: [250 / 255, 250 / 255, 210 / 255, 1],
				lightgray: [211 / 255, 211 / 255, 211 / 255, 1],
				lightgreen: [144 / 255, 238 / 255, 144 / 255, 1],
				lightgrey: [211 / 255, 211 / 255, 211 / 255, 1],
				lightpink: [1, 182 / 255, 193 / 255, 1],
				lightsalmon: [1, 160 / 255, 122 / 255, 1],
				lightseagreen: [32 / 255, 178 / 255, 170 / 255, 1],
				lightskyblue: [135 / 255, 206 / 255, 250 / 255, 1],
				lightslategray: [119 / 255, 136 / 255, 153 / 255, 1],
				lightslategrey: [119 / 255, 136 / 255, 153 / 255, 1],
				lightsteelblue: [176 / 255, 196 / 255, 222 / 255, 1],
				lightyellow: [1, 1, 224 / 255, 1],
				limegreen: [50 / 255, 205 / 255, 50 / 255, 1],
				linen: [250 / 255, 240 / 255, 230 / 255, 1],
				mediumaquamarine: [102 / 255, 205 / 255, 170 / 255, 1],
				mediumblue: [0 / 255, 0 / 255, 205 / 255, 1],
				mediumorchid: [186 / 255, 85 / 255, 211 / 255, 1],
				mediumpurple: [147 / 255, 112 / 255, 219 / 255, 1],
				mediumseagreen: [60 / 255, 179 / 255, 113 / 255, 1],
				mediumslateblue: [123 / 255, 104 / 255, 238 / 255, 1],
				mediumspringgreen: [0 / 255, 250 / 255, 154 / 255, 1],
				mediumturquoise: [72 / 255, 209 / 255, 204 / 255, 1],
				mediumvioletred: [199 / 255, 21 / 255, 133 / 255, 1],
				midnightblue: [25 / 255, 25 / 255, 112 / 255, 1],
				mintcream: [245 / 255, 1, 250 / 255, 1],
				mistyrose: [1, 228 / 255, 225 / 255, 1],
				moccasin: [1, 228 / 255, 181 / 255, 1],
				navajowhite: [1, 222 / 255, 173 / 255, 1],
				oldlace: [253 / 255, 245 / 255, 230 / 255, 1],
				olivedrab: [107 / 255, 142 / 255, 35 / 255, 1],
				orangered: [1, 69 / 255, 0 / 255, 1],
				orchid: [218 / 255, 112 / 255, 214 / 255, 1],
				palegoldenrod: [238 / 255, 232 / 255, 170 / 255, 1],
				palegreen: [152 / 255, 251 / 255, 152 / 255, 1],
				paleturquoise: [175 / 255, 238 / 255, 238 / 255, 1],
				palevioletred: [219 / 255, 112 / 255, 147 / 255, 1],
				papayawhip: [1, 239 / 255, 213 / 255, 1],
				peachpuff: [1, 218 / 255, 185 / 255, 1],
				peru: [205 / 255, 133 / 255, 63 / 255, 1],
				pink: [1, 192 / 255, 203 / 255, 1],
				plum: [221 / 255, 160 / 255, 221 / 255, 1],
				powderblue: [176 / 255, 224 / 255, 230 / 255, 1],
				rosybrown: [188 / 255, 143 / 255, 143 / 255, 1],
				royalblue: [65 / 255, 105 / 255, 225 / 255, 1],
				saddlebrown: [139 / 255, 69 / 255, 19 / 255, 1],
				salmon: [250 / 255, 128 / 255, 114 / 255, 1],
				sandybrown: [244 / 255, 164 / 255, 96 / 255, 1],
				seagreen: [46 / 255, 139 / 255, 87 / 255, 1],
				seashell: [1, 245 / 255, 238 / 255, 1],
				sienna: [160 / 255, 82 / 255, 45 / 255, 1],
				skyblue: [135 / 255, 206 / 255, 235 / 255, 1],
				slateblue: [106 / 255, 90 / 255, 205 / 255, 1],
				slategray: [112 / 255, 128 / 255, 144 / 255, 1],
				slategrey: [112 / 255, 128 / 255, 144 / 255, 1],
				snow: [1, 250 / 255, 250 / 255, 1],
				springgreen: [0 / 255, 1, 127 / 255, 1],
				steelblue: [70 / 255, 130 / 255, 180 / 255, 1],
				tan: [210 / 255, 180 / 255, 140 / 255, 1],
				thistle: [216 / 255, 191 / 255, 216 / 255, 1],
				tomato: [1, 99 / 255, 71 / 255, 1],
				turquoise: [64 / 255, 224 / 255, 208 / 255, 1],
				violet: [238 / 255, 130 / 255, 238 / 255, 1],
				wheat: [245 / 255, 222 / 255, 179 / 255, 1],
				whitesmoke: [245 / 255, 245 / 255, 245 / 255, 1],
				yellowgreen: [154 / 255, 205 / 255, 50 / 255, 1]
			};

		Seriously.plugin('testColorInput', {
			inputs: {
				color: {
					type: 'color',
					defaultValue: [0, 0.5, 0, 1]
				}
			}
		});

		s = new Seriously();
		e = s.effect('testColorInput');

		e.color = 'rgb(10, 20, 30)';
		val = e.color;
		ok(compare(val, [10 / 255, 20 / 255, 30 / 255, 1]), 'Set color by rgb');

		e.color = 'rgba(30, 20, 10, 0.8)';
		val = e.color;
		ok(compare(val, [30 / 255, 20 / 255, 10 / 255, 0.8]), 'Set color by rgba');

		//todo: test rgb percentages
		//todo: test hsl/hsla

		e.color = '#123';
		val = e.color;
		ok(compare(val, [1 / 15, 2 / 15, 3 / 15, 1]), 'Set color by 3-character hex');

		e.color = '#1234';
		val = e.color;
		ok(compare(val, [0x1 / 15, 0x2 / 15, 0x3 / 15, 0x4 / 15]), 'Set color by 4-character hex');

		e.color = '#123456';
		val = e.color;
		ok(compare(val, [0x12 / 255, 0x34 / 255, 0x56 / 255, 1]), 'Set color by 6-character hex');

		e.color = '#654321AA';
		val = e.color;
		ok(compare(val, [0x65 / 255, 0x43 / 255, 0x21 / 255, 0xAA/255]), 'Set color by 8-character hex');

		e.color = '#fffff';
		val = e.color;
		ok(compare(val, [0, 0, 0, 0]), 'Set color by bad hex is transparent black');

		e.color = 'transparent';
		val = e.color;
		ok(compare(val, [0, 0, 0, 0]), 'Set color by name (transparent)');

		e.color = 'garbage';
		val = e.color;
		ok(compare(val, [0, 0, 0, 0]), 'Set color by unknown name is transparent black');

		for (name in colorNames) {
			if (colorNames.hasOwnProperty(name)) {
				e.color = name;
				val = e.color;
				ok(compare(val, colorNames[name]), 'Set color by name (' + name + ')');
				if (!compare(val, colorNames[name])) {
					console.log(name + ': ' + JSON.stringify(colorNames[name].map(function (val) { return val * 255; })) + ',');
				}
			}
		}

		e.color = 0.3;
		val = e.color;
		ok(compare(val, [0.3, 0.3, 0.3, 1]), 'Set color by single number');

		e.color = [0.1, 0.2, 0.3];
		val = e.color;
		ok(compare(val, [0.1, 0.2, 0.3, 1]), 'Set color by 3-array');

		e.color = [0.2, 0.3, 0.4, 0.5];
		val = e.color;
		ok(compare(val, [0.2, 0.3, 0.4, 0.5]), 'Set color by 4-array');

		e.color = {
			r: 0.1,
			g: 0.2,
			b: 0.3
		};
		val = e.color;
		ok(compare(val, [0.1, 0.2, 0.3, 1]), 'Set RGB by object');

		e.color = {
			r: 0.2,
			g: 0.3,
			b: 0.4,
			a: 0.5
		};
		val = e.color;
		ok(compare(val, [0.2, 0.3, 0.4, 0.5]), 'Set RGBA by object');

		s.destroy();
		Seriously.removePlugin('testColorInput');
	});

	test('Enum', 4, function() {
		var s, e, val;

		Seriously.plugin('testEnumInput', {
			inputs: {
				input: {
					type: 'enum',
					defaultValue: 'foo',
					options: [
						['foo', 'Foo'],
						['bar', 'Bar'],
						'baz'
					]
				}
			}
		});

		s = new Seriously();
		e = s.effect('testEnumInput');

		equal(e.input, 'foo', 'Default value');

		e.input = 'bar';
		val = e.input;
		equal(val, 'bar', 'Simply set a value');

		e.input = 'baz';
		val = e.input;
		equal(val, 'baz', 'Set a different value');

		e.input = 'biddle';
		val = e.input;
		equal(val, 'foo', 'Set unknown value reverts to default');

		s.destroy();
		Seriously.removePlugin('testEnumInput');
	});

	test('Vector', 7, function() {
		var s, e, val;

		Seriously.plugin('testVectorInput', {
			inputs: {
				vec2: {
					type: 'vector',
					defaultValue: [1, 2],
					dimensions: 2
				},
				vec4: {
					type: 'vector',
					defaultValue: [1, 2, 3, 4],
					dimensions: 4
				}
			}
		});

		s = new Seriously();
		e = s.effect('testVectorInput');

		ok(compare(e.vec2, [1, 2]), 'Default value #1');
		ok(compare(e.vec4, [1, 2, 3, 4]), 'Default value #2');

		e.vec2 = 3;
		val = e.vec2;
		ok(compare(val, [3, 3]), 'Set all to a single value');

		e.vec4 = {
			x: 4,
			y: 5,
			z: 6,
			w: 7,
			blah: 9
		};
		val = e.vec4;
		ok(compare(val, [4, 5, 6, 7]), 'Set by object');

		e.vec4 = {
			r: 0.1,
			g: 0.2,
			b: 0.3,
			a: 0.4
		};
		val = e.vec4;
		ok(compare(val, [0.1, 0.2, 0.3, 0.4]), 'Set by object with color names');

		e.vec4 = [8, 9, 10, 11];
		val = e.vec4;
		ok(compare(val, [8, 9, 10, 11]), 'Set by array');

		e.vec2 = 'foo';
		val = e.vec2;
		ok(compare(val, [0, 0]), 'Bad value becomes zero vector');

		s.destroy();
		Seriously.removePlugin('testVectorInput');
	});

	module('Transform');
	test('Basic Transformations', 8, function () {
		var seriously, source, target,
			transform,
			flip,
			sourceCanvas, targetCanvas,
			ctx,
			pixels = new Uint8Array(16),
			incompatible,
			error;

		incompatible = Seriously.incompatible();

		targetCanvas = document.createElement('canvas');
		targetCanvas.width = 2;
		targetCanvas.height = 2;

		sourceCanvas = document.createElement('canvas');
		sourceCanvas.width = 2;
		sourceCanvas.height = 2;

		ctx = sourceCanvas.getContext && sourceCanvas.getContext('2d');
		ctx.fillStyle = '#f00'; //red
		ctx.fillRect(0, 0, 1, 1);
		ctx.fillStyle = '#0f0'; //green
		ctx.fillRect(1, 0, 1, 1);
		ctx.fillStyle = '#00f'; //blue
		ctx.fillRect(0, 1, 1, 1);
		ctx.fillStyle = '#fff'; //white
		ctx.fillRect(1, 1, 1, 1);

		seriously = new Seriously();
		source = seriously.source(sourceCanvas);
		target = seriously.target(targetCanvas);
		transform = seriously.transform();
		flip = seriously.transform('flip');
		transform.source = source;
		flip.source = source;
		target.source = transform;

		transform.rotation = -90; //90 degrees counter-clockwise
		error = false;
		try {
			target.readPixels(0, 0, 2, 2, pixels);
		} catch (e) {
			error = e;
		}
		ok(incompatible ? error : !error, 'readPixels throws error iff incompatible');
		ok(incompatible || compare(pixels, [
			255, 0, 0, 255,
			0, 0, 255, 255,
			0, 255, 0, 255,
			255, 255, 255, 255
		]), 'Rotate 90 degrees counter-clockwise');
		transform.reset();

		target.source = flip;
		flip.direction = 'vertical';
		error = false;
		try {
			target.readPixels(0, 0, 2, 2, pixels);
		} catch (e) {
			error = e;
		}
		ok(incompatible ? error : !error, 'readPixels throws error iff incompatible');
		ok(incompatible || compare(pixels, [ //image is upside down
			255, 0, 0, 255,
			0, 255, 0, 255,
			0, 0, 255, 255,
			255, 255, 255, 255
		]), 'Flip Vertical');

		target.source = flip;
		flip.direction = 'horizontal';
		error = false;
		try {
			target.readPixels(0, 0, 2, 2, pixels);
		} catch (e) {
			error = e;
		}
		ok(incompatible ? error : !error, 'readPixels throws error iff incompatible');
		ok(incompatible || compare(pixels, [ //image is upside down
			255, 255, 255, 255,
			0, 0, 255, 255,
			0, 255, 0, 255,
			255, 0, 0, 255
		]), 'Flip Horizontal');

		target.source = transform;
		transform.translate(1, 0);
		target.render();
		error = false;
		try {
			target.readPixels(0, 0, 2, 2, pixels);
		} catch (e) {
			error = e;
		}
		ok(incompatible ? error : !error, 'readPixels throws error iff incompatible');
		ok(incompatible || compare(pixels, [ //image is upside down
			0, 0, 0, 0,
			0, 0, 255, 255,
			0, 0, 0, 0,
			255, 0, 0, 255
		]), 'Translate 1 pixel to the right');

		seriously.destroy();
		return;
	});

	test('Transform definition function', 5, function () {
		var seriously,
			transform1,
			transform2,
			canvas,
			target;

		Seriously.transform('removeme', function (options) {
			var id = options.id,
				prop = 0;

			ok(!!seriously, 'Definition function runs after seriously created #' + id);

			return {
				inputs: {
					property: {
						get: function() {
							return prop;
						},
						set: function(x) {
							prop = x;
							equal(prop, id, 'Transform setter runs successfully #' + id);
							return true;
						}
					},
					method: {
						method: function(x) {
							prop = x;
							equal(prop, id, 'Transform method runs successfully #' + id);
							return true;
						}
					}
				},
				title: 'removeme' + id
			};
		},
		{
			title: 'removeme'
		});

		seriously = new Seriously();
		transform1 = seriously.transform('removeme', {
			id: 1
		});
		transform2 = seriously.transform('removeme', {
			id: 2
		});

		transform1.property = 1;
		transform2.method(2);
		equal(transform2.property, 2, 'Transform getter runs successfully');

		canvas = document.createElement('canvas');
		target = seriously.target(canvas);

		//render makes sure transforms don't crash without a source
		target.source = transform1;
		target.render();
		target.source = transform2;
		target.render();

		seriously.destroy();
		Seriously.removePlugin('removeme');
	});

	test('Transform Info', 17, function () {
		var inputs,
			seriously,
			transform;

		Seriously.transform('test', {
			inputs: {
				number: {
					type: 'number',
					min: -4,
					max: 100,
					step: 2,
					defaultValue: 8,
					description: 'this is a number',
					title: 'Number'
				},
				vector: {
					type: 'vector',
					dimensions: 3
				},
				e: {
					type: 'enum',
					options: [
						['one', 'One'],
						['two', 'Two']
					]
				}
			},
			title: 'Test'
		});

		seriously = new Seriously();
		transform = seriously.transform('test');

		equal(transform.transform, 'test', 'Transform name reported');
		equal(transform.title, 'Test', 'Transform title reported');
		ok(transform.id >= 0, 'Transform id reported');

		//Check inputs
		inputs = transform.inputs();
		ok(inputs.number && inputs.vector && inputs.e, 'All inputs are present');
		equal(Object.keys(inputs).length, 3, 'No extra properties');

		equal(inputs.number.type, 'number', 'Number type reported');
		equal(inputs.number.min, -4, 'Number minimum reported');
		equal(inputs.number.max, 100, 'Number maximum reported');
		equal(inputs.number.step, 2, 'Number step reported');
		equal(inputs.number.defaultValue, 8, 'Number default value reported');
		equal(inputs.number.title, 'Number', 'Node title reported');
		equal(inputs.number.description, 'this is a number', 'Node description reported');

		equal(inputs.vector.type, 'vector', 'Vector type reported');
		equal(inputs.vector.dimensions, 3, 'Vector dimensions reported');

		equal(inputs.e.type, 'enum', 'Enum type reported');
		ok(Array.isArray(inputs.e.options), 'Enum options reported');

		inputs.e.options[1][0] = 'three';
		equal(transform.inputs('e').options[1][0], 'two', 'Enum options fully copied, cannot be tampered with');

		seriously.destroy();
		Seriously.removeTransform('test');
	});

	test('Transform alias', 5, function () {
		var seriously,
			transform;

		seriously = new Seriously();
		transform = seriously.transform('2d');

		transform.alias('translateX', 'translateX');
		seriously.translateX = 5;
		equal(transform.translateX, 5, 'Transform alias works for property');

		transform.alias('scale', 'scale');
		seriously.scale(3, 4);
		equal(transform.scaleX, 3, 'Transform alias works for method');
		equal(transform.scaleY, 4, 'Transform alias works for method, second parameter');

		transform.destroy();
		ok(!seriously.hasOwnProperty('translateX'), 'Transform property alias removed');
		ok(!seriously.hasOwnProperty('scale'), 'Transform method alias removed');

		seriously.destroy();
	});

	module('Target');
	test('Canvas Target', 6, function () {
		var seriously,
			canvas,
			target;

		seriously = new Seriously();
		canvas = document.createElement('canvas');
		canvas.width = 17;
		canvas.height = 19;
		target = seriously.target(canvas);

		equal(target.width, 17, 'target.width');
		equal(target.height, 19, 'target.height');
		equal(target.original, canvas, 'target.original');
		equal(target.inputs.source.type, 'image', 'target.inputs.source');

		target.width = 29;
		ok(canvas.width === 29 && canvas.height === 19, 'target.width modifies canvas width, but not height');
		target.height = 31;
		ok(canvas.width === 29 && canvas.height === 31, 'target.height modifies canvas height, but not width');

		seriously.destroy();
	});

	asyncTest('WebGL Context Lost', function () {
		var seriously,
			canvas,
			source,
			effect,
			target,

			gl,
			ext,

			lost = false,
			lostFired = false,
			restored = false,
			restoredFired = false,
			renderCount = 0;

		function loseContext() {
			lost = true;
			ext.loseContext();
		}

		function restoreContext() {
			lost = false;
			restored = true;
			ext.restoreContext();
		}

		function resume() {
			Seriously.logger.warn = nop;
			Seriously.logger.log = nop;
			seriously.destroy();
			Seriously.removePlugin('test');
			start();
		}

		expect(0);

		canvas = document.createElement('canvas');
		try {
			gl = canvas.getContext('webgl');
		} catch (e1) {
		}

		if (!gl) {
			try {
				gl = canvas.getContext('experimental-webgl');
			} catch (e2) {
			}
		}

		if (!gl) {
			start();
			return;
		}

		ext = gl.getExtension('WEBGL_lose_context') ||
			gl.getExtension('MOZ_WEBGL_lose_context') ||
			gl.getExtension('WEBKIT_WEBGL_lose_context');

		if (!ext) {
			/*
			We can't run this test in internet explorer for now,
			since IE11 doesn't support the `vertexAttrib1f` method,
			which is requried by WebGLDebugUtils
			*/
			if (!gl.vertexAttrib1f) {
				start();
				return;
			}
			canvas = WebGLDebugUtils.makeLostContextSimulatingCanvas(canvas);
			ext = canvas;
		}

		//every test should run once,
		//except the render loop should run twice
		expect(11);

		Seriously.logger.log = function (s) {
			console.log(s);
			equal(s, 'WebGL context restored', 'context lost warning');
		};

		Seriously.logger.warn = function (s) {
			console.log(s);
			equal(s, 'WebGL context lost', 'context lost warning');
		};

		Seriously.plugin('test', {
			title: 'Test Effect',
			lostContext: function () {
				ok(true, 'context lost callback fired');
			},
			inputs: {
				source: {
					type: 'image'
				}
			}
		});

		seriously = new Seriously();

		source = seriously.source('#colorbars');

		effect = seriously.effect('test');
		effect.source = source;

		target = seriously.target(canvas);
		target.source = effect;

		source.on('webglcontextlost', function () {
			lostFired = true;
			ok(lost, 'webglcontextlost event fired on source node');
		});
		effect.on('webglcontextlost', function () {
			lostFired = true;
			ok(lost, 'webglcontextlost event fired on effect node');
		});
		target.on('webglcontextlost', function () {
			lostFired = true;
			ok(lost, 'webglcontextlost event fired on target node');
			setTimeout(restoreContext, 50);
		});

		source.on('webglcontextrestored', function () {
			restoredFired = true;
			ok(!lost && restored, 'webglcontextrestored event fired on source node');
		});
		effect.on('webglcontextrestored', function () {
			restoredFired = true;
			ok(!lost && restored, 'webglcontextrestored event fired on effect node');
		});
		target.on('webglcontextrestored', function () {
			restoredFired = true;
			ok(!lost && restored, 'webglcontextrestored event fired on target node');
		});

		seriously.go(function () {
			renderCount++;
			console.log('rendering', renderCount);

			//sometimes it takes a while for webglcontextlost event to fire in Firefox
			//don't need to run this so many times
			if (renderCount <= 1 || lostFired) {
				ok(!lostFired || restored, 'render loop only runs when context is not lost');
			}
		}, function () {
			if (renderCount === 1) {
				loseContext();
			} else if (restored) {
				resume();
			}
		});
	});

	/*
	todo: May not be a bad idea to have another test here that removes
	primary WebGL target node and creates a new one
	*/

	module('Destroy');
	test('Destroy things', 15, function() {
		var seriously, source, target, effect, transform, canvas;

		Seriously.plugin('test', {});

		canvas = document.createElement('canvas');

		seriously = new Seriously();
		source = seriously.source('#colorbars');
		effect = seriously.effect('test');
		transform = seriously.transform('2d');
		target = seriously.target(canvas);

		ok(!seriously.isDestroyed(), 'New Seriously instance is not destroyed');
		ok(!source.isDestroyed(), 'New source is not destroyed');
		ok(!effect.isDestroyed(), 'New effect is not destroyed');
		ok(!transform.isDestroyed(), 'New transform is not destroyed');
		ok(!target.isDestroyed(), 'New target is not destroyed');

		source.destroy();
		effect.destroy();
		transform.destroy();
		target.destroy();

		ok(source.isDestroyed(), 'Destroyed source is destroyed');
		ok(effect.isDestroyed(), 'Destroyed effect is destroyed');
		ok(transform.isDestroyed(), 'Destroyed transform is destroyed');
		ok(target.isDestroyed(), 'Destroyed target is destroyed');

		source = seriously.source('#colorbars');
		effect = seriously.effect('test');
		transform = seriously.transform('2d');
		target = seriously.target(canvas);

		seriously.destroy();
		ok(seriously.isDestroyed(), 'Destroyed Seriously instance is destroyed');

		ok(source.isDestroyed(), 'Destroy Seriously instance destroys source');
		ok(effect.isDestroyed(), 'Destroy Seriously instance destroys effect');
		ok(transform.isDestroyed(), 'Destroy Seriously instance destroys transform');
		ok(target.isDestroyed(), 'Destroy Seriously instance destroys target');

		ok(seriously.effect() === undefined, 'Attempt to create effect with destroyed Seriously does nothing');

		Seriously.removePlugin('test');
	});

	test('Connect after nodes destroyed', 2, function() {
		var source, target, seriously,
			canvas;

		seriously = new Seriously();
		//create and destroy source twice
		source = seriously.source('#colorbars');
		source.destroy();
		source = seriously.source('#colorbars');
		source.destroy();

		//id should be 2
		source = seriously.source('#colorbars');
		equal(source.id, 2, 'Third node created should have id=2');

		canvas = document.createElement('canvas');
		target = seriously.target(canvas);

		//should have two nodes, highest index should be 1
		target.source = source;
		ok(true, 'Can still create new source after multiple sources deleted.');

		seriously.destroy();
	});

	module('Events');
	asyncTest('ready/unready events', 9, function () {
		var seriously,
			effect,
			canvas,
			target,
			immediate,
			deferred,
			proceeded = false;

		function fail() {
			ok(false, 'Removed callback should not run');
		}

		function finish() {
			if (!effect.ready && !target.ready && !seriously.isDestroyed()) {
				//clean up
				seriously.destroy();
				Seriously.removePlugin('testReady');
				Seriously.removeSource('deferred');
				Seriously.removeSource('immediate');
				start();
			}
		}

		function proceed() {
			if (effect.isReady() && deferred.isReady() && target.isReady() && !proceeded) {
				proceeded = true;
				setTimeout(function () {
					effect.compare = seriously.source('deferred', 1);
				}, 10);
			}
		}

		Seriously.source('deferred', function (source) {
			var me = this;
			if (!proceeded) {
				setTimeout(function () {
					me.setReady();
				}, 0);
			}

			return {
				deferTexture: true,
				source: source,
				render: function () {}
			};
		}, {
			title: 'delete me'
		});

		Seriously.source('immediate', function () {
			return {
				render: function () {}
			};
		}, {
			title: 'delete me'
		});

		Seriously.plugin('testReady', {
			inputs: {
				source: {
					type: 'image'
				},
				compare: {
					type: 'image',
				}
			},
			title: 'testReady'
		});

		seriously = new Seriously();

		immediate = seriously.source('immediate');
		deferred = seriously.source('deferred', 0);

		effect = seriously.effect('testReady');
		effect.source = immediate;
		effect.compare = deferred;

		canvas = document.createElement('canvas');
		target = seriously.target(canvas);
		target.source = effect;

		ok(immediate.isReady(), 'Immediately ready source is ready');
		ok(!deferred.isReady(), 'Deferred source is not yet ready');
		ok(!effect.isReady(), 'Connected effect is not yet ready');
		ok(!target.isReady(), 'Connected target is not yet ready');

		deferred.on('ready', fail);
		deferred.off('ready', fail);
		deferred.on('ready', function () {
			ok(deferred.isReady(), 'Deferred source becomes ready');
			proceed();
		});
		effect.on('ready', function () {
			ok(effect.isReady(), 'Connected effect becomes ready');
			proceed();
		});
		target.on('ready', function () {
			ok(target.isReady(), 'Connected target becomes ready');
			proceed();
		});
		effect.on('unready', function () {
			ok(!effect.isReady(), 'Connected effect is no longer ready');
			finish();
		});
		target.on('unready', function () {
			ok(!target.isReady(), 'Connected target is no longer ready');
			finish();
		});
	});

	asyncTest('resize event', 4, function () {
		var seriously,
			source,
			deferred,
			effect,
			transform,
			target,

			deferredResized = false,
			effectResized = false,
			transformResized = false,
			targetResized = false;

		function proceed() {
			if (deferredResized && effectResized && transformResized && targetResized) {
				seriously.destroy();
				Seriously.removeSource('size');
				start();
			}
		}

		function fail() {
			ok(false, 'Removed event listener should not run');
		}

		Seriously.source('immediate', function (source) {
			this.width = source.width;
			this.height = source.height;
			return {
				render: function () {}
			};
		}, {
			title: 'delete me'
		});

		Seriously.source('deferred', function (source) {
			var that = this;
			this.width = 1;
			this.height = 1;
			setTimeout(function () {
				that.width = source.width;
				that.height = source.height;
				that.resize();
			}, 0);

			return {
				render: function () {}
			};
		}, {
			title: 'delete me'
		});

		Seriously.plugin('test', {
			title: 'Test Effect',
			inputs: {
				source: {
					type: 'image'
				}
			}
		});

		seriously = new Seriously();
		source = seriously.source('size', {
			width: 17,
			height: 19
		});

		effect = seriously.effect('test');
		effect.on('resize', function () {
			effectResized = true;
			ok(true, 'Effect resize event runs when connected to a source');
			proceed();
		});
		effect.source = source;

		transform = seriously.transform('2d');
		transform.on('resize', function () {
			transformResized = true;
			ok(true, 'Transform resize event runs when connected to a source');
			proceed();
		});
		transform.source = effect;

		target = seriously.target(document.createElement('canvas'));
		target.on('resize', function () {
			targetResized = true;
			ok(true, 'Target resize event runs when dimensions changed explicitly');
			proceed();
		});
		target.width = 60;

		deferred = seriously.source('deferred', {
			width: 17,
			height: 19
		});
		deferred.on('resize', function () {
			deferredResized = true;
			ok(true, 'Source resize event runs when set by internal asynchronous code');
			proceed();
		});
		deferred.on('resize', fail);
		deferred.off('resize', fail);
	});

	module('Alias');

	module('Utilities');

	asyncTest('setTimeoutZero', 2, function() {
		var countdown = 2, startTime = Date.now();

		Seriously.util.setTimeoutZero(function() {
			countdown--;
			ok(countdown === 1, 'First callback runs first after ' + (Date.now() - startTime) + 'ms');
		});

		Seriously.util.setTimeoutZero(function() {
			countdown--;
			ok(countdown === 0, 'Second callback runs second after ' + (Date.now() - startTime) + 'ms');
			start();
		});
	});

	asyncTest('checkSource', function() {
		var pass, fail,
			tests = 2;

		expect(6);

		function checkImagePass(img) {
			var canvas, ctx;

			ok(Seriously.util.checkSource(img), 'Same-origin image checks true');

			canvas = document.createElement('canvas');
			ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0);
			ok(Seriously.util.checkSource(canvas), 'Same-origin canvas checks true');

			tests--;
			if (!tests) {
				start();
			}

		}

		function checkImageFail(img) {
			var canvas, ctx;

			Seriously.logger.log = function (s) {
				equal(s, 'Unable to access cross-domain image', 'Warning logged to console');
			};

			Seriously.logger.warn = function (s) {
				equal(s, 'Image not loaded', 'Warning logged to console');
			};

			ok(!Seriously.util.checkSource(img), 'Cross-origin image checks false');

			canvas = document.createElement('canvas');
			ctx = canvas.getContext('2d');
			if (img.naturalWidth) {
				ctx.drawImage(img, 0, 0);
				ok(!Seriously.util.checkSource(canvas), 'Cross-origin canvas checks false');
			} else {
				expect(4);
			}

			Seriously.logger.log = nop;
			Seriously.logger.warn = nop;

			tests--;
			if (!tests) {
				start();
			}
		}

		pass = document.getElementById('colorbars');
		if (pass.width) {
			checkImagePass.call(pass, pass);
		} else {
			pass.addEventListener('load', function() {
				checkImagePass(this);
			}, false);
		}

		fail = document.createElement('img');
		fail.src = 'http://www.mozilla.org/images/template/screen/logo_footer.png';
		fail.addEventListener('load', function() {
			checkImageFail(this);
		}, false);
		fail.addEventListener('error', function() {
			checkImageFail(this);
		}, false);
	});

	/*
	use require for loading plugins
	*/
	module('Effect Plugins');
	asyncTest('invert', 3, function () {
		require([
			'seriously',
			'effects/seriously.invert',
			'sources/seriously.array'
		], function (Seriously) {
			var seriously,
				effect,
				target,
				canvas,
				source,
				pixels,
				error,
				incompatible;

			incompatible = Seriously.incompatible();

			seriously = new Seriously();
			source = seriously.source([255, 128, 100, 200], {
				width: 1,
				height: 1
			});

			canvas = document.createElement('canvas');
			canvas.width = canvas.height = 1;
			target = seriously.target(canvas);

			effect = seriously.effect('invert');

			ok(effect, 'Invert effect successfully created');

			target.source = effect;
			effect.source = source;

			try {
				pixels = target.readPixels(0, 0, 1, 1);
			} catch (e) {
				error = e;
			}
			ok(incompatible ? error : !error, 'readPixels throws error iff incompatible');
			ok(incompatible || pixels && compare(pixels, [0, 127, 155, 200]), 'Invert effect rendered accurately.');

			seriously.destroy();
			Seriously.removePlugin('invert');

			start();
		});
	});
}());
