/*jslint devel: true, bitwise: true, browser: true, white: true, nomen: true, plusplus: true, maxerr: 50, indent: 4 */
/* global module, test, asyncTest, expect, ok, equal, start, Seriously, require */
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

	module('Core');
	test('Core', function () {
		var p, props = 0,
			newGlobals = [],
			skipIds = false,
			s;

		expect(5);

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

		s = new Seriously();
		ok(s instanceof Seriously, 'Create Seriously instance with new');
		s.destroy();

		/*jshint ignore:start*/
		s = Seriously();
		/*jshint ignore:end*/
		ok(s instanceof Seriously, 'Create Seriously instance without new');
		s.destroy();
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

	test('Remove Plugin', function () {
		var p, s, error, e, allEffects;

		expect(3);

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
			error = true;
		}

		ok(error, 'Plugin doesn\'t exist; using throws error');

		s.destroy();
	});

	test('Define plugin with duplicate name', function () {
		var p, allEffects;

		expect(3);

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

		Seriously.removePlugin('pluginDuplicate');
	});

	test('Define plugin with reserved input name', function () {
		var p, s, error1 = false, error2 = false;

		expect(2);

		try {
			p = Seriously.plugin('badPlugin', {
				inputs: {
					initialize: {
						type: 'number'
					}
				}
			});
		} catch (e) {
			error1 = true;
		}

		ok(error1, 'Defining plugin throws error');

		try {
			s = new Seriously();
			s.effect('badPlugin');
		} catch (ee) {
			error2 = true;
		}

		ok(error2, 'Plugin doesn\'t exist; using throws error');

		s.destroy();
		Seriously.removePlugin('badPlugin');
	});

	test('Effect definition function', function () {
		var seriously,
			effect1,
			effect2,
			canvas,
			target;

		expect(4);

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

	asyncTest('Plugin loaded before Seriously', function () {
		var iframe;

		expect(3);

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

	test('Effect alias', function () {
		var seriously,
			effect;

		expect(2);

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
			error = true;
		}

		ok(error, 'Setting effect source to itself throws an error');

		seriously.destroy();
		Seriously.removePlugin('removeme');
	});

	module('Source');
	/*
	 * create source: all different types
	 * destroy source before img loaded
	 * checkSource on cross-origin image, dirty canvas
	*/

	asyncTest('Source Types', function () {
		var seriously, source, target,
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

		expect(11);

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
			source = seriously.source(img);
			ok(source, 'Created source from image');
			pixels = source.readPixels(0, 0, 2, 2);
			ok(pixels && compare(pixels, comparison), 'Image source rendered accurately.');
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
		pixels = source.readPixels(0, 0, 2, 2);
		ok(pixels && compare(pixels, comparison), 'Canvas source rendered accurately.');

		ctx.fillRect(0, 0, 2, 2);
		source.update();
		pixels = source.readPixels(0, 0, 2, 2);
		ok(pixels && compare(pixels, [ //image is upside down
			255, 255, 255, 255,
			255, 255, 255, 255,
			255, 255, 255, 255,
			255, 255, 255, 255
		]), 'Canvas source updated and rendered accurately.');

		source = seriously.source(imagedata);
		ok(source, 'Created source from ImageData');
		pixels = source.readPixels(0, 0, 2, 2);
		ok(pixels && compare(pixels, comparison), 'ImageData source rendered accurately.');
		source.destroy();

		source = seriously.source(new Uint8Array(comparison), {
			width: 2,
			height: 2
		});
		ok(source, 'Created source from Typed Array');
		pixels = source.readPixels(0, 0, 2, 2);
		ok(pixels && compare(pixels, comparison), 'Typed Array source rendered accurately.');
		source.destroy();

		source = seriously.source(comparison, {
			width: 2,
			height: 2
		});
		ok(source, 'Created source from Array');
		pixels = source.readPixels(0, 0, 2, 2);
		ok(pixels && compare(pixels, comparison), 'Array source rendered accurately.');
		source.destroy();

		//todo: implement and test WebGLTexture source

		syncDone = true;
		if (asyncDone) {
			seriously.destroy();
			start();
		}
		return;
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

	test('Source Plugins', 7, function () {
		var seriously,
			funcSource,
			objSource,
			altSource1,
			altSource2,
			effect,
			canvas,
			target;

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

	module('Target');
	/*
	 * create target
	*/

	module('Inputs');
	/*
	 * all different types
	 * test html elements as inputs (with overwriting)
	 */
	test('Number', function () {
		var s, e, val, input;
		expect(6);

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

	test('Color', function () {
		var e, s, val;

		expect(18);

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
		ok(compare(val, [10/255, 20/255, 30/255, 1]), 'Set color by rgb');

		e.color = 'rgba(30, 20, 10, 0.8)';
		val = e.color;
		ok(compare(val, [30/255, 20/255, 10/255, 0.8]), 'Set color by rgba');

		//todo: test rgb percentages
		//todo: test hsl/hsla

		e.color = '#123';
		val = e.color;
		ok(compare(val, [1/15, 2/15, 3/15, 1]), 'Set color by 3-character hex');

		e.color = '#1234';
		val = e.color;
		ok(compare(val, [0x1/15, 0x2/15, 0x3/15, 0x4/15]), 'Set color by 4-character hex');

		e.color = '#123456';
		val = e.color;
		ok(compare(val, [0x12/255, 0x34/255, 0x56/255, 1]), 'Set color by 6-character hex');

		e.color = '#654321AA';
		val = e.color;
		ok(compare(val, [0x65/255, 0x43/255, 0x21/255, 0xAA/255]), 'Set color by 8-character hex');

		e.color = '#fffff';
		val = e.color;
		ok(compare(val, [0, 0, 0, 0]), 'Set color by bad hex is transparent black');

		e.color = 'lightcyan';
		val = e.color;
		ok(compare(val, [224/255, 1, 1, 1]), 'Set color by name (lightcyan)');

		e.color = 'lightblue';
		val = e.color;
		ok(compare(val, [173/255, 216/255, 230/255, 1]), 'Set color by name (lightblue)');

		e.color = 'red';
		val = e.color;
		ok(compare(val, [1, 0, 0, 1]), 'Set color by name (red)');

		e.color = 'white';
		val = e.color;
		ok(compare(val, [1, 1, 1, 1]), 'Set color by name (white)');

		e.color = 'transparent';
		val = e.color;
		ok(compare(val, [0, 0, 0, 0]), 'Set color by name (transparent)');

		e.color = 'garbage';
		val = e.color;
		ok(compare(val, [0, 0, 0, 0]), 'Set color by unknown name is transparent black');

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

	test('Enum', function() {
		var s, e, val;
		expect(4);

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
	test('Basic Transformations', function () {
		var seriously, source, target,
			transform,
			flip,
			sourceCanvas, targetCanvas,
			ctx,
			pixels = new Uint8Array(16);

		expect(4);

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
		target.readPixels(0, 0, 2, 2, pixels);
		ok(compare(pixels, [
			255, 0, 0, 255,
			0, 0, 255, 255,
			0, 255, 0, 255,
			255, 255, 255, 255
		]), 'Rotate 90 degrees counter-clockwise');
		transform.reset();

		target.source = flip;
		flip.direction = 'vertical';
		target.readPixels(0, 0, 2, 2, pixels);
		ok(compare(pixels, [ //image is upside down
			255, 0, 0, 255,
			0, 255, 0, 255,
			0, 0, 255, 255,
			255, 255, 255, 255
		]), 'Flip Vertical');

		target.source = flip;
		flip.direction = 'horizontal';
		target.readPixels(0, 0, 2, 2, pixels);
		ok(compare(pixels, [ //image is upside down
			255, 255, 255, 255,
			0, 0, 255, 255,
			0, 255, 0, 255,
			255, 0, 0, 255
		]), 'Flip Horizontal');

		target.source = transform;
		transform.translate(1, 0);
		target.render();
		target.readPixels(0, 0, 2, 2, pixels);
		ok(compare(pixels, [ //image is upside down
			0, 0, 0, 0,
			0, 0, 255, 255,
			0, 0, 0, 0,
			255, 0, 0, 255
		]), 'Translate 1 pixel to the right');

		seriously.destroy();
		return;
	});

	test('Transform definition function', function () {
		var seriously,
			transform1,
			transform2,
			canvas,
			target;

		expect(5);

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

	test('Transform alias', function () {
		var seriously,
			transform;

		expect(5);

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

	module('Destroy');
	test('Destroy things', function() {
		var seriously, source, target, effect, transform, canvas;

		expect(15);

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

	test('Connect after nodes destroyed', function() {
		var source, target, seriously,
			canvas;

		expect(2);

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

	module('Alias');

	module('Utilities');

	asyncTest('setTimeoutZero', function() {
		var countdown = 2, startTime = Date.now();

		expect(2);

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

		expect(4);

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

			ok(!Seriously.util.checkSource(img), 'Cross-origin image checks false');

			canvas = document.createElement('canvas');
			ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0);
			ok(!Seriously.util.checkSource(canvas), 'Cross-origin canvas checks false');

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
	});

	/*
	use require for loading plugins
	*/
	module('Effect Plugins');
	asyncTest('invert', 2, function () {
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
				pixels;

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

			pixels = target.readPixels(0, 0, 1, 1);
			ok(pixels && compare(pixels, [0, 127, 155, 200]), 'Invert effect rendered accurately.');

			seriously.destroy();
			Seriously.removePlugin('invert');

			start();
		});
	});
}());
