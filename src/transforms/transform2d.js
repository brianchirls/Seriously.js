import Seriously from '../seriously';

const mat4 = Seriously.util.mat4;

/*
 *	Default transform - 2D
 *	Affine transforms
 *	- translate
 *	- rotate (degrees)
 *	- scale
 *	- skew
 */
Seriously.transform('2d', function (options) {
	let me = this,
		degrees = !(options && options.radians),

		centerX = 0,
		centerY = 0,
		scaleX = 1,
		scaleY = 1,
		translateX = 0,
		translateY = 0,
		rotation = 0,
		skewX = 0,
		skewY = 0;

	//todo: skew order
	//todo: invert?

	function recompute() {
		var matrix = me.matrix,
			angle,
			s, c,
			m00,
			m01,
			m02,
			m03,
			m10,
			m11,
			m12,
			m13;

		function translate(x, y) {
			matrix[12] = matrix[0] * x + matrix[4] * y + matrix[12];
			matrix[13] = matrix[1] * x + matrix[5] * y + matrix[13];
			matrix[14] = matrix[2] * x + matrix[6] * y + matrix[14];
			matrix[15] = matrix[3] * x + matrix[7] * y + matrix[15];
		}

		if (!translateX &&
			!translateY &&
			!rotation &&
			!skewX &&
			!skewY &&
			scaleX === 1 &&
			scaleY === 1
		) {
			me.transformed = false;
			return;
		}

		//calculate transformation matrix
		mat4.identity(matrix);

		translate(translateX + centerX, translateY + centerY);

		//skew
		if (skewX) {
			matrix[4] = skewX / me.width;
		}
		if (skewY) {
			matrix[1] = skewY / me.height;
		}

		if (rotation) {
			m00 = matrix[0];
			m01 = matrix[1];
			m02 = matrix[2];
			m03 = matrix[3];
			m10 = matrix[4];
			m11 = matrix[5];
			m12 = matrix[6];
			m13 = matrix[7];

			//rotate
			angle = -(degrees ? rotation * Math.PI / 180 : rotation);
			//...rotate
			s = Math.sin(angle);
			c = Math.cos(angle);
			matrix[0] = m00 * c + m10 * s;
			matrix[1] = m01 * c + m11 * s;
			matrix[2] = m02 * c + m12 * s;
			matrix[3] = m03 * c + m13 * s;
			matrix[4] = m10 * c - m00 * s;
			matrix[5] = m11 * c - m01 * s;
			matrix[6] = m12 * c - m02 * s;
			matrix[7] = m13 * c - m03 * s;
		}

		//scale
		if (scaleX !== 1) {
			matrix[0] *= scaleX;
			matrix[1] *= scaleX;
			matrix[2] *= scaleX;
			matrix[3] *= scaleX;
		}
		if (scaleY !== 1) {
			matrix[4] *= scaleY;
			matrix[5] *= scaleY;
			matrix[6] *= scaleY;
			matrix[7] *= scaleY;
		}

		translate(-centerX, -centerY);

		me.transformed = true;
	}

	return {
		inputs: {
			reset: {
				method: function () {
					centerX = 0;
					centerY = 0;
					scaleX = 1;
					scaleY = 1;
					translateX = 0;
					translateY = 0;
					rotation = 0;
					skewX = 0;
					skewY = 0;

					if (me.transformed) {
						me.transformed = false;
						return true;
					}

					return false;
				}
			},
			translate: {
				method: function (x, y) {
					if (isNaN(x)) {
						x = translateX;
					}

					if (isNaN(y)) {
						y = translateY;
					}

					if (x === translateX && y === translateY) {
						return false;
					}

					translateX = x;
					translateY = y;

					recompute();
					return true;
				},
				type: [
					'number',
					'number'
				]
			},
			translateX: {
				get: function () {
					return translateX;
				},
				set: function (x) {
					if (x === translateX) {
						return false;
					}

					translateX = x;

					recompute();
					return true;
				},
				type: 'number'
			},
			translateY: {
				get: function () {
					return translateY;
				},
				set: function (y) {
					if (y === translateY) {
						return false;
					}

					translateY = y;

					recompute();
					return true;
				},
				type: 'number'
			},
			rotation: {
				get: function () {
					return rotation;
				},
				set: function (angle) {
					if (angle === rotation) {
						return false;
					}

					//todo: fmod 360deg or Math.PI * 2 radians
					rotation = parseFloat(angle);

					recompute();
					return true;
				},
				type: 'number'
			},
			center: {
				method: function (x, y) {
					if (isNaN(x)) {
						x = centerX;
					}

					if (isNaN(y)) {
						y = centerY;
					}

					if (x === centerX && y === centerY) {
						return false;
					}

					centerX = x;
					centerY = y;

					recompute();
					return true;
				},
				type: [
					'number',
					'number'
				]
			},
			centerX: {
				get: function () {
					return centerX;
				},
				set: function (x) {
					if (x === centerX) {
						return false;
					}

					centerX = x;

					recompute();
					return true;
				},
				type: 'number'
			},
			centerY: {
				get: function () {
					return centerY;
				},
				set: function (y) {
					if (y === centerY) {
						return false;
					}

					centerY = y;

					recompute();
					return true;
				},
				type: 'number'
			},
			skew: {
				method: function (x, y) {
					if (isNaN(x)) {
						x = skewX;
					}

					if (isNaN(y)) {
						y = skewY;
					}

					if (x === skewX && y === skewY) {
						return false;
					}

					skewX = x;
					skewY = y;

					recompute();
					return true;
				},
				type: [
					'number',
					'number'
				]
			},
			skewX: {
				get: function () {
					return skewX;
				},
				set: function (x) {
					if (x === skewX) {
						return false;
					}

					skewX = x;

					recompute();
					return true;
				},
				type: 'number'
			},
			skewY: {
				get: function () {
					return skewY;
				},
				set: function (y) {
					if (y === skewY) {
						return false;
					}

					skewY = y;

					recompute();
					return true;
				},
				type: 'number'
			},
			scale: {
				method: function (x, y) {
					var newX, newY;

					if (isNaN(x)) {
						newX = scaleX;
					} else {
						newX = x;
					}

					/*
                        if only one value is specified, set both x and y to the same scale
                        */
					if (isNaN(y)) {
						if (isNaN(x)) {
							return false;
						}

						newY = newX;
					} else {
						newY = y;
					}

					if (newX === scaleX && newY === scaleY) {
						return false;
					}

					scaleX = newX;
					scaleY = newY;

					recompute();
					return true;
				},
				type: [
					'number',
					'number'
				]
			},
			scaleX: {
				get: function () {
					return scaleX;
				},
				set: function (x) {
					if (x === scaleX) {
						return false;
					}

					scaleX = x;

					recompute();
					return true;
				},
				type: 'number'
			},
			scaleY: {
				get: function () {
					return scaleY;
				},
				set: function (y) {
					if (y === scaleY) {
						return false;
					}

					scaleY = y;

					recompute();
					return true;
				},
				type: 'number'
			}
		}
	};
}, {
	title: '2D Transform',
	description: 'Translate, Rotate, Scale, Skew'
});
