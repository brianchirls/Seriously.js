import Seriously from '../seriously';
import { mat4 } from '../utilities/math';

/*
 * There is currently no way to resize a THREE.WebGLRenderTarget,
 * so we won't allow resizing of this kind of target node until that gets fixed
 */

const identity = new Float32Array([
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1
]);

Seriously.target('three', function (target, options) {
	let me = this,
		gl,
		frameBuffer;

	function initialize() {
		if (!frameBuffer || !gl || me.initialized) {
			// not ready yet
			return;
		}

		me.initialized = true;
		me.allowRefresh = true;
		me.setReady();
	}

	if (THREE && target instanceof THREE.WebGLRenderTarget) {
		/*
		if not passed a canvas or gl by options and we don't have one already,
		throw an error
		*/
		if (me.gl) {
			gl = me.gl;
		} else if (options) {
			if (options.gl) {
				gl = options.gl;
			} else if (options.canvas && options.canvas.getContext) {
				try {
					gl = options.canvas.getContext('webgl');
				} catch (ignore) {
				}

				if (!gl) {
					try {
						gl = options.canvas.getContext('experimental-webgl');
					} catch (ignore) {
					}
				}
			}
		}

		if (!gl) {
			throw new Error('Failed to create Three.js target. Missing WebGL context');
		}

		this.ready = false;
		this.width = target.width;
		this.height = target.height;

		if (target.__webglFramebuffer) {
			if (!gl.isFramebuffer(target.__webglFramebuffer)) {
				throw new Error('Failed to create Three.js target. WebGL texture is from a different context');
			}
			frameBuffer = target.__webglFramebuffer;
			initialize();
		} else {
			Object.defineProperty(target, '__webglFramebuffer', {
				configurable: true,
				enumerable: true,
				get: function () {
					return frameBuffer;
				},
				set: function (fb) {
					if (fb) {
						frameBuffer = fb;
						initialize();
					}
				}
			});
		}

		this.setReady = function () {
			if (frameBuffer && this.source && this.source.ready && !this.ready) {
				this.emit('ready');
				this.ready = true;
			}
		};

		this.target = target;

		return {
			gl: gl,
			resize: function () {
				this.width = target.width;
				this.height = target.height;
			},
			render: function (draw, shader, model) {
				var matrix, x, y;
				if (gl && this.dirty && this.ready && this.source) {

					this.source.render();
					this.uniforms.source = this.source.texture;

					if (this.source.width === this.width && this.source.height === this.height) {
						this.uniforms.transform = this.source.cumulativeMatrix || identity;
					} else if (this.transformDirty) {
						matrix = this.transform;
						mat4.copy(matrix, this.source.cumulativeMatrix || identity);
						x = this.source.width / this.width;
						y = this.source.height / this.height;
						matrix[0] *= x;
						matrix[1] *= x;
						matrix[2] *= x;
						matrix[3] *= x;
						matrix[4] *= y;
						matrix[5] *= y;
						matrix[6] *= y;
						matrix[7] *= y;
						this.uniforms.transform = matrix;
						this.transformDirty = false;
					}

					draw(shader, model, this.uniforms, frameBuffer, this);

					this.emit('render');
					this.dirty = false;
					if (target.onUpdate) {
						target.onUpdate();
					}
				}
			},
			destroy: function () {
				Object.defineProperty(target, '__webglFramebuffer', {
					configurable: true,
					enumerable: true,
					value: frameBuffer
				});
			}
		};
	}
}, {
	title: 'THREE.js WebGLRenderTarget Target'
});
