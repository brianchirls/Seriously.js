import progress from 'rollup-plugin-progress';
import filesize from 'rollup-plugin-filesize';

export default {
	entry: 'test/index.js',
	targets: [{
		dest: 'test/seriously.js',
		format: 'umd',
		name: 'Seriously',
		amd: {
			id: 'seriously'
		}
	}],
	plugins: [
		progress({
			clearLine: false
		}),
		filesize()
	]
};
