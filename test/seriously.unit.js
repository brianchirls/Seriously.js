(function() {
	module('Core');
	test('Core', function() {
		var p, props = 0,
			s;
		
		expect(5);

		ok(window.Seriously, 'Seriously exists');
		
		equal(typeof window.Seriously, 'function', 'Seriously is a function');
		
		for (p in window) {
			props++;
			if (window.globalProperties.indexOf(p) < 0) {
				console.log('new property: ' + p);
			}
		}
		
		equal(props - window.globalProperties.length, 1, 'Only 1 property added to global');
		
		s = new Seriously();
		ok(s instanceof Seriously, 'Create Seriously instance with new');
		s.destroy();

		s = Seriously();
		ok(s instanceof Seriously, 'Create Seriously instance without new');
		s.destroy();
	});

	module('Destroy');
	/*
	 * todo: need way to detect destroyed
	 */

	module('Plugin');
	/*
	 * define plugin
	*/

	test('Remove Plugin', function() {
		var p, s, error, e;

		expect(2);

		p = Seriously.plugin('removeme', {});
		ok(p && p.title === 'removeme', 'First plugin loaded');
		
		s = Seriously();
		e = s.effect('removeme');

		Seriously.removePlugin('removeme');

		/*
		 * todo: get list of plugins from Seriously and compare title
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
		var p;

		expect(2);

		p = Seriously.plugin('pluginDuplicate', {});
		ok(p && p.title === 'pluginDuplicate', 'First plugin loaded');

		p = Seriously.plugin('pluginDuplicate', {});
		
		/*
		 * todo: get list of plugins from Seriously and compare title
		 */
		
		ok(p === undefined, 'Duplicate plugin ignored');
		
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
		var s, e, val;
		expect(5);
		
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
				enum: {
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

		equal(e.enum, 'foo', 'Default value');

		e.enum = 'bar';
		val = e.enum;
		equal(val, 'bar', 'Simply set a value');

		e.enum = 'baz';
		val = e.enum;
		equal(val, 'baz', 'Set a different value');

		e.enum = 'biddle';
		val = e.enum;
		equal(val, 'foo', 'Set unknown value reverts to default');

		s.destroy();
		Seriously.removePlugin('testEnumInput');
	});

	module('Alias');

	module('Utilities');
}());
