/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		/*
		todo: build out-of-order loading for sources and transforms or remove this
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		*/
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	var mat4 = Seriously.util.mat4;

	/*
	3D transform
	- translate
	- rotate (degrees)
	- scale
	*/
	Seriously.transform('3d', function (options) {
		var me = this,
			degrees = !(options && options.radians),
			centerX = 0,
			centerY = 0,
			centerZ = 0,
			scaleX = 1,
			scaleY = 1,
			scaleZ = 1,
			translateX = 0,
			translateY = 0,
			translateZ = 0,
			rotationX = 0,
			rotationY = 0,
			rotationZ = 0,
			rotationOrder = 'XYZ';

		function recompute() {
			var matrix = me.matrix,
				s, c,
				m00,
				m01,
				m02,
				m03,
				m10,
				m11,
				m12,
				m13,
				m20,
				m21,
				m22,
				m23;

			function translate(x, y, z) {
				matrix[12] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
				matrix[13] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
				matrix[14] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
				matrix[15] = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
			}

			function rotateX() {
				var angle;

				if (!rotationX) {
					return;
				}

				angle = -(degrees ? rotationX * Math.PI / 180 : rotationX);

				s = Math.sin(angle);
				c = Math.cos(angle);

				m10 = matrix[4];
				m11 = matrix[5];
				m12 = matrix[6];
				m13 = matrix[7];
				m20 = matrix[8];
				m21 = matrix[9];
				m22 = matrix[10];
				m23 = matrix[11];

				matrix[4] = m10 * c + m20 * s;
				matrix[5] = m11 * c + m21 * s;
				matrix[6] = m12 * c + m22 * s;
				matrix[7] = m13 * c + m23 * s;
				matrix[8] = m20 * c - m10 * s;
				matrix[9] = m21 * c - m11 * s;
				matrix[10] = m22 * c - m12 * s;
				matrix[11] = m23 * c - m13 * s;
			}

			function rotateY() {
				var angle;

				if (!rotationY) {
					return;
				}

				angle = -(degrees ? rotationY * Math.PI / 180 : rotationY);

				s = Math.sin(angle);
				c = Math.cos(angle);

				m00 = matrix[0];
				m01 = matrix[1];
				m02 = matrix[2];
				m03 = matrix[3];
				m20 = matrix[8];
				m21 = matrix[9];
				m22 = matrix[10];
				m23 = matrix[11];

				matrix[0] = m00 * c - m20 * s;
				matrix[1] = m01 * c - m21 * s;
				matrix[2] = m02 * c - m22 * s;
				matrix[3] = m03 * c - m23 * s;
				matrix[8] = m00 * s + m20 * c;
				matrix[9] = m01 * s + m21 * c;
				matrix[10] = m02 * s + m22 * c;
				matrix[11] = m03 * s + m23 * c;
			}

			function rotateZ() {
				var angle;

				if (!rotationZ) {
					return;
				}

				angle = -(degrees ? rotationZ * Math.PI / 180 : rotationZ);

				s = Math.sin(angle);
				c = Math.cos(angle);

				m00 = matrix[0];
				m01 = matrix[1];
				m02 = matrix[2];
				m03 = matrix[3];
				m10 = matrix[4];
				m11 = matrix[5];
				m12 = matrix[6];
				m13 = matrix[7];

				matrix[0] = m00 * c + m10 * s;
				matrix[1] = m01 * c + m11 * s;
				matrix[2] = m02 * c + m12 * s;
				matrix[3] = m03 * c + m13 * s;
				matrix[4] = m10 * c - m00 * s;
				matrix[5] = m11 * c - m01 * s;
				matrix[6] = m12 * c - m02 * s;
				matrix[7] = m13 * c - m03 * s;
			}

			if (!translateX &&
					!translateY &&
					!translateZ &&
					!rotationX &&
					!rotationY &&
					!rotationZ &&
					scaleX === 1 &&
					scaleY === 1 &&
					scaleZ === 1
					) {
				me.transformed = false;
				return;
			}

			//calculate transformation matrix
			mat4.identity(matrix);

			translate(translateX + centerX, translateY + centerY, translateZ + centerZ);

			if (rotationOrder === 'XYZ') {
				rotateX();
				rotateY();
				rotateZ();
			} else if (rotationOrder === 'XZY') {
				rotateX();
				rotateZ();
				rotateY();
			} else if (rotationOrder === 'YXZ') {
				rotateY();
				rotateX();
				rotateZ();
			} else if (rotationOrder === 'YZX') {
				rotateY();
				rotateZ();
				rotateX();
			} else if (rotationOrder === 'ZXY') {
				rotateZ();
				rotateX();
				rotateY();
			} else { //ZYX
				rotateZ();
				rotateY();
				rotateX();
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
			if (scaleZ !== 1) {
				matrix[8] *= scaleZ;
				matrix[9] *= scaleZ;
				matrix[10] *= scaleZ;
				matrix[11] *= scaleZ;
			}

			translate(-centerX, -centerY, -centerZ);

			me.transformed = true;
		}

		return {
			inputs: {
				reset: {
					method: function () {
						centerX = 0;
						centerY = 0;
						centerZ = 0;
						scaleX = 1;
						scaleY = 1;
						scaleZ = 1;
						translateX = 0;
						translateY = 0;
						translateZ = 0;
						rotationX = 0;
						rotationY = 0;
						rotationZ = 0;

						if (me.transformed) {
							me.transformed = false;
							return true;
						}

						return false;
					}
				},
				translate: {
					method: function (x, y, z) {
						if (isNaN(x)) {
							x = translateX;
						}

						if (isNaN(y)) {
							y = translateY;
						}

						if (isNaN(z)) {
							z = translateZ;
						}

						if (x === translateX && y === translateY && z === translateZ) {
							return false;
						}

						translateX = x;
						translateY = y;
						translateZ = z;

						recompute();
						return true;
					},
					type: [
						'number',
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
				translateZ: {
					get: function () {
						return translateZ;
					},
					set: function (z) {
						if (z === translateZ) {
							return false;
						}

						translateZ = z;

						recompute();
						return true;
					},
					type: 'number'
				},
				rotationOrder: {
					get: function () {
						return rotationOrder;
					},
					set: function (order) {
						if (order === rotationOrder) {
							return false;
						}

						rotationOrder = order;

						recompute();
						return true;
					},
					type: 'number'
				},
				rotationX: {
					get: function () {
						return rotationX;
					},
					set: function (angle) {
						if (angle === rotationX) {
							return false;
						}

						//todo: fmod 360deg or Math.PI * 2 radians
						rotationX = angle;

						recompute();
						return true;
					},
					type: 'number'
				},
				rotationY: {
					get: function () {
						return rotationY;
					},
					set: function (angle) {
						if (angle === rotationY) {
							return false;
						}

						//todo: fmod 360deg or Math.PI * 2 radians
						rotationY = angle;

						recompute();
						return true;
					},
					type: 'number'
				},
				rotationZ: {
					get: function () {
						return rotationZ;
					},
					set: function (angle) {
						if (angle === rotationZ) {
							return false;
						}

						//todo: fmod 360deg or Math.PI * 2 radians
						rotationZ = angle;

						recompute();
						return true;
					},
					type: 'number'
				},
				center: {
					method: function (x, y, z) {
						if (isNaN(x)) {
							x = centerX;
						}

						if (isNaN(y)) {
							y = centerY;
						}

						if (isNaN(z)) {
							z = centerZ;
						}

						if (x === centerX && y === centerY && z === centerZ) {
							return false;
						}

						centerX = x;
						centerY = y;
						centerZ = z;

						recompute();
						return true;
					},
					type: [
						'number',
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
				centerZ: {
					get: function () {
						return centerZ;
					},
					set: function (z) {
						if (z === centerZ) {
							return false;
						}

						centerZ = z;

						recompute();
						return true;
					},
					type: 'number'
				},
				scale: {
					method: function (x, y, z) {
						var newX, newY, newZ;

						if (isNaN(x)) {
							newX = scaleX;
						} else {
							newX = x;
						}

						/*
						if only one value is specified, set all to the same scale
						*/
						if (isNaN(y)) {
							if (!isNaN(x) && isNaN(z)) {
								newY = newX;
								newZ = newX;
							} else {
								newY = scaleY;
							}
						} else {
							newY = y;
						}

						if (isNaN(z)) {
							if (newZ === undefined) {
								newZ = scaleZ;
							}
						} else {
							newZ = z;
						}

						if (newX === scaleX && newY === scaleY && newZ === scaleZ) {
							return false;
						}

						scaleX = newX;
						scaleY = newY;
						scaleZ = newZ;

						recompute();
						return true;
					},
					type: [
						'number',
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
				},
				scaleZ: {
					get: function () {
						return scaleZ;
					},
					set: function (z) {
						if (z === scaleZ) {
							return false;
						}

						scaleZ = z;

						recompute();
						return true;
					},
					type: 'number'
				}
			}
		};
	}, {
		title: '3D Transform',
		description: 'Translate, Rotate, Scale'
	});
}));