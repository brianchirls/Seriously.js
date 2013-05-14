module.exports = function(grunt) {
	'use strict';

	var banner = [
		'/**',
		' * @license',
		' * <%= pkg.name %> - v<%= pkg.version %>',
		' * Copyright (c) 2012, <%= pkg.author %>',
		' * <%= pkg.homepage %>',
		' *',
		' * Compiled: <%= grunt.template.today("yyyy-mm-dd") %>',
		' *',
		' * <%= pkg.name %> is licensed under the <%= pkg.license %> License.',
		' * <%= pkg.licenseUrl %>',
		' */',
		''
	].join('\n');

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		dirs: {
			build: 'build',
			examples: 'examples',
			test: 'test'
		},
		files: {
			build: '<%= dirs.build %>/seriously.dev.js',
			buildMin: '<%= dirs.build %>/seriously.min.js'
		},
		requirejs: {
			compile: {
				options: {
					baseUrl: '.',
					name: 'seriously',
					out: '<%= files.build %>',
					preserveLicenseComments: false,
					useStrict: true,
					optimize: 'none' //uglify after
				}
			}
		},
		/*
		concat: {
			options: {
				banner: banner
			},
			dist: {
				src: 'seriously.js',
				dest: '<%= files.build %>'
			}
		},
		*/
		uglify: {
			options: {
				banner: banner
			},
			build: {
				src: '<%= files.build %>',
				dest: '<%= files.buildMin %>'
			}
		},
		connect: {
			qunit: {
				options: {
					port: grunt.option('port-test') || 9002,
					base: './'
				}
			},
			test: {
				options: {
					port: grunt.option('port-test') || 9002,
					base: './',
					keepalive: true
				}
			}
		},
		qunit: {
			all: {
				options: {
					urls: ['http://localhost:' + (grunt.option('port-test') || 9002) + '/test/index.html'],
					inject: 'test/bridge.js'
				}
			}
		},
		jshint: {
			options: {
				devel: true,
				bitwise: true,
				browser: true,
				white: true,
				nomen: true,
				plusplus: true,
				maxerr: 50,
				indent: 4,
				immed: true,
				forin: true,
				globals: {
					Float32Array: true,
					Float64Array: true,
					Uint8Array: true,
					Uint16Array: true,
					WebGLTexture: true,
					HTMLInputElement: true,
					HTMLSelectElement: true,
					HTMLElement: true,
					WebGLFramebuffer: true,
					HTMLCanvasElement: true,
					WebGLRenderingContext: true,
					define: true,
					module: true
				}
			},
			files: [
				'seriously.js',
				'test/seriously.unit.js'
			]
		}
	});

	//grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-requirejs');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-qunit');

	// Default task(s).
	grunt.registerTask('default', ['requirejs', 'uglify']);
	grunt.registerTask('build', ['requirejs', 'uglify']);
	grunt.registerTask('test', ['jshint', 'connect:qunit', 'qunit']);
};