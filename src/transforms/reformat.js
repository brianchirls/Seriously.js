import Seriously from '../seriously';

const mat4 = Seriously.util.mat4;

Seriously.transform('reformat', function () {
	let me = this,
		forceWidth,
		forceHeight,
		mode = 'contain';

	function recompute() {
		let matrix = me.matrix,
			width = forceWidth || me.width,
			height = forceHeight || me.height,
			scaleX,
			scaleY,
			source = me.source,
			sourceWidth = source && source.width || 1,
			sourceHeight = source && source.height || 1,
			aspectIn,
			aspectOut;

		if (mode === 'distort' || width === sourceWidth && height === sourceHeight) {
			me.transformed = false;
			return;
		}

		aspectIn = sourceWidth / sourceHeight;

		aspectOut = width / height;

		if (mode === 'none') {
			scaleX = sourceWidth / width;
			scaleY = sourceHeight / height;
		} else if (mode === 'width' || mode === 'contain' && aspectOut <= aspectIn) {
			scaleX = 1;
			scaleY = aspectOut / aspectIn;
		} else if (mode === 'height' || mode === 'contain' && aspectOut > aspectIn) {
			scaleX = aspectIn / aspectOut;
			scaleY = 1;
		} else {
			//mode === 'cover'
			if (aspectOut > aspectIn) {
				scaleX = 1;
				scaleY = aspectOut / aspectIn;
			} else {
				scaleX = aspectIn / aspectOut;
				scaleY = 1;
			}
		}

		if (scaleX === 1 && scaleY === 1) {
			me.transformed = false;
			return;
		}

		//calculate transformation matrix
		mat4.identity(matrix);

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
		me.transformed = true;
	}

	function getWidth() {
		return forceWidth || me.source && me.source.width || 1;
	}

	function getHeight() {
		return forceHeight || me.source && me.source.height || 1;
	}

	this.resize = function () {
		let width = getWidth(),
			height = getHeight(),
			i;

		if (this.width !== width || this.height !== height) {
			this.width = width;
			this.height = height;

			if (this.uniforms && this.uniforms.resolution) {
				this.uniforms.resolution[0] = width;
				this.uniforms.resolution[1] = height;
			}

			if (this.frameBuffer && this.frameBuffer.resize) {
				this.frameBuffer.resize(width, height);
			}

			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].resize();
			}
		}

		this.setTransformDirty();

		recompute();
	};

	return {
		inputs: {
			width: {
				get: getWidth,
				set: function (x) {
					x = Math.floor(x);
					if (x === forceWidth) {
						return false;
					}

					forceWidth = x;

					this.resize();

					//don't need to run setTransformDirty again
					return false;
				},
				type: 'number'
			},
			height: {
				get: getHeight,
				set: function (y) {
					y = Math.floor(y);
					if (y === forceHeight) {
						return false;
					}

					forceHeight = y;

					this.resize();

					//don't need to run setTransformDirty again
					return false;
				},
				type: 'number'
			},
			mode: {
				get: function () {
					return mode;
				},
				set: function (m) {
					if (m === mode) {
						return false;
					}

					mode = m;

					recompute();
					return true;
				},
				type: 'enum',
				options: [
					'cover',
					'contain',
					'distort',
					'width',
					'height',
					'none'
				]
			}
		}
	};
}, {
	title: 'Reformat',
	description: 'Change output dimensions'
});
