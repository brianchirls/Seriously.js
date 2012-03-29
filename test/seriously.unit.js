/*jslint devel: true, bitwise: true, browser: true, white: true, nomen: true, plusplus: true, maxerr: 50, indent: 4 */
/* global module, test, asyncTest, expect, ok, equal, start, stop, Seriously */
(function() {
	"use strict";

	module('Core');
	test('Core', function() {
		var p, props = 0,
			newGlobals = [],
			s;
		
		expect(5);

		ok(window.Seriously, 'Seriously exists');
		
		equal(typeof window.Seriously, 'function', 'Seriously is a function');
		
		for (p in window) {
			props++;
			if (window.globalProperties.indexOf(p) < 0) {
				console.log('new property: ' + p);
				newGlobals.push(p);
			}
		}
		
		props -= window.globalProperties.length;
		p = props + (props === 1 ? ' property' : ' properties') + ' added to global: [' +
			newGlobals.join(', ') + ']';
		equal(props, 1, p);
		
		s = new Seriously();
		ok(s instanceof Seriously, 'Create Seriously instance with new');
		s.destroy();

		s = Seriously();
		ok(s instanceof Seriously, 'Create Seriously instance without new');
		s.destroy();
	});

	test('Incompatible', function() {
		var s, e, msg;

		expect(2);

		Seriously.plugin('removeme', {
			compatible: function(gl) {
				return false;
			}
		});

		s = Seriously();

		msg = s.incompatible('removeme');
		equal(msg, 'plugin-removeme', 'Incompatibity test on plugin');

		e = s.effect('removeme');
		msg = s.incompatible();
		equal(msg, 'plugin-removeme', 'Incompatibity test on network with incompatible plugin');

		//clean up
		s.destroy();
		Seriously.removePlugin('removeme');
	});

	module('Plugin');
	/*
	 * define plugin
	*/

	test('Remove Plugin', function() {
		var p, s, error, e, allEffects;

		expect(3);

		p = Seriously.plugin('removeme', {});
		ok(p && p.title === 'removeme', 'First plugin loaded');
		
		s = Seriously();
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

	test('Define plugin with duplicate name', function() {
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

	test('Define plugin with reserved input name', function() {
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
			s = Seriously();
			s.effect('badPlugin');
		} catch (ee) {
			error2 = true;
		}

		ok(error2, 'Plugin doesn\'t exist; using throws error');
		
		s.destroy();
		Seriously.removePlugin('badPlugin');
	});

	asyncTest('Plugin loaded before Seriously', function() {
		var iframe;

		expect(3);

		iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		iframe.addEventListener('load', function() {
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
			script.addEventListener('load', function() {
				var s, e;

				ok(typeof win.Seriously === 'function', 'Seriously is a function');

				s = win.Seriously();

				ok(s instanceof win.Seriously, 'Created Seriously instance');

				e = s.effect('test');

				ok(typeof e === 'object' && e.id !== undefined, 'Created effect');

				s.destroy();
				document.body.removeChild(iframe);
				win.Seriously.removePlugin('test');
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

	module('Source');
	/*
	 * create source: all different types
	 * destroy source before img loaded
	 * checkSource on cross-origin image, dirty canvas
	*/
	
	test('Create two Source objects on identical sources', function() {
		var img, seriously, source1, source2;

		seriously = Seriously();
		img = document.getElementById('colorbars');
		source1 = seriously.source(img);
		source2 = seriously.source('#colorbars');

		ok(source1 === source2, 'Source objects are the same');
		
		seriously.destroy();
	});

	test('Create Source object implicitly', function() {
		var seriously, source1, source2, effect;

		Seriously.plugin('test', {
			inputs: {
				source: {
					type: 'image'
				}
			}
		});

		seriously = Seriously();
		effect = seriously.effect('test');
		effect.source = '#colorbars';
		source1 = effect.source;
		source2 = seriously.source('#colorbars');

		ok(source1 === source2, 'Source objects are the same');
		
		seriously.destroy();
		Seriously.removePlugin('test');
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
	test('Number', function() {
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
		
		s = Seriously();
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

	test('Color', function() {
		var e, s, val;

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

		expect(12);
		
		Seriously.plugin('testColorInput', {
			inputs: {
				color: {
					type: 'color',
					defaultValue: [0, 0.5, 0, 1]
				}
			}
		});
		
		s = Seriously();
		e = s.effect('testColorInput');
		
		e.color = 'rgb(10, 20, 30)';
		val = e.color;
		ok( compare(val, [10/255, 20/255, 30/255, 1]), 'Set color by rgb');
		
		e.color = 'rgba(30, 20, 10, 0.8)';
		val = e.color;
		ok( compare(val, [30/255, 20/255, 10/255, 0.8]), 'Set color by rgba');
		
		//todo: test rgb percentages
		//todo: test hsl/hsla
		
		e.color = '#123';
		val = e.color;
		ok( compare(val, [1/15, 2/15, 3/15, 1]), 'Set color by 3-character hex');
		
		e.color = '#1234';
		val = e.color;
		ok( compare(val, [0x1/15, 0x2/15, 0x3/15, 0x4/15]), 'Set color by 4-character hex');
		
		e.color = '#123456';
		val = e.color;
		ok( compare(val, [0x12/255, 0x34/255, 0x56/255, 1]), 'Set color by 6-character hex');
		
		e.color = '#654321AA';
		val = e.color;
		ok( compare(val, [0x65/255, 0x43/255, 0x21/255, 0xAA/255]), 'Set color by 8-character hex');
		
		e.color = '#fffff';
		val = e.color;
		ok( compare(val, [0, 0, 0, 0]), 'Set color by bad hex is transparent black');
		
		e.color = 'lightcyan';
		val = e.color;
		ok( compare(val, [224/255,1,1,1]), 'Set color by name');
		
		e.color = 'garbage';
		val = e.color;
		ok( compare(val, [0, 0, 0, 0]), 'Set color by unknown name is transparent black');
		
		e.color = 0.3;
		val = e.color;
		ok( compare(val, [0.3, 0.3, 0.3, 1]), 'Set color by single number');

		e.color = [0.1, 0.2, 0.3];
		val = e.color;
		ok( compare(val, [0.1, 0.2, 0.3, 1]), 'Set color by 3-array');

		e.color = [0.2, 0.3, 0.4, 0.5];
		val = e.color;
		ok( compare(val, [0.2, 0.3, 0.4, 0.5]), 'Set color by 4-array');

		//todo: set color by object

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
		
		s = Seriously();
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

	module('Destroy');
	test('Destroy things', function() {
		var seriously, source, target, effect, canvas;
		
		expect(12);
		
		Seriously.plugin('test', {});
		
		canvas = document.createElement('canvas');

		seriously = new Seriously();		
		source = seriously.source('#colorbars');
		effect = seriously.effect('test');
		target = seriously.target(canvas);
		
		ok(!seriously.isDestroyed(), 'New Seriously instance is not destroyed');
		ok(!source.isDestroyed(), 'New source is not destroyed');
		ok(!effect.isDestroyed(), 'New effect is not destroyed');
		ok(!target.isDestroyed(), 'New target is not destroyed');

		source.destroy();
		effect.destroy();
		target.destroy();

		ok(source.isDestroyed(), 'Destroyed source is destroyed');
		ok(effect.isDestroyed(), 'Destroyed effect is destroyed');
		ok(target.isDestroyed(), 'Destroyed target is destroyed');

		source = seriously.source('#colorbars');
		effect = seriously.effect('test');
		target = seriously.target(canvas);

		seriously.destroy();
		ok(seriously.isDestroyed(), 'Destroyed Seriously instance is destroyed');

		ok(source.isDestroyed(), 'Destroy Seriously instance destroys source');
		ok(effect.isDestroyed(), 'Destroy Seriously instance destroys effect');
		ok(target.isDestroyed(), 'Destroy Seriously instance destroys target');

		ok(seriously.effect() === undefined, 'Attempt to create effect with destroyed Seriously does nothing');
		
		Seriously.removePlugin('test');
	});

	test('Connect after nodes destroyed', function() {
		var source, target, seriously,
			canvas;

		expect(2);

		seriously = Seriously();
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
}());
