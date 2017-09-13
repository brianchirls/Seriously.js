import Seriously from '../seriously';

Seriously.source('three', function (source, options, force) {
	let width,
		height,
		typedArray,
		me = this,
		setDirty = this.setDirty;

	function initialize() {
		const texture = source.__webglTexture,
			gl = me.gl;

		if (!texture || !gl || me.initialized) {
			// not ready yet
			return;
		}

		if (!gl.isTexture(texture)) {
			throw new Error('Failed to create Three.js source. WebGL texture is from a different context');
		}

		me.texture = texture;
		me.initialized = true;
		me.allowRefresh = true;
		me.setReady();
	}

	if (THREE && source instanceof THREE.WebGLRenderTarget) {

		width = source.width;
		height = source.height;

		this.width = width;
		this.height = height;

		/*
		 * Three.js doesn't set up a WebGL texture until the first time it renders,
		 * and there's no way to be notified. So we place a hook on setDirty, which
		 * gets called by update or by renderDaemon
		 */
		initialize();
		if (!this.initialized) {
			this.setDirty = function () {
				initialize();
				if (this.initialized) {
					this.setDirty = setDirty;
				}
				setDirty.call(this);
			};
		}

		return {
			deferTexture: !this.initialized,
			//todo: compare?
			render: function (gl) {
				this.lastRenderTime = Date.now() / 1000;
				this.dirty = false;
				this.emit('render');
			}
		};
	}
}, {
	title: 'Three.js WebGLRenderTarget Source'
});
