// eslint-disable-next-line no-undef
module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    'json-replace': {
      options: {
        space: '\t',
        replace: {
          version: '<%= pkg.version %>',
        },
      },
      firefox: {
        files: [
          {
            src: 'manifest.<%= grunt.task.current.target %>.json',
            dest: 'manifest.<%= grunt.task.current.target %>.json',
          },
        ],
      },
      chrome: {
        files: [
          {
            src: 'manifest.<%= grunt.task.current.target %>.json',
            dest: 'manifest.<%= grunt.task.current.target %>.json',
          },
        ],
      },
      edge: {
        files: [
          {
            src: 'manifest.<%= grunt.task.current.target %>.json',
            dest: 'manifest.<%= grunt.task.current.target %>.json',
          },
        ],
      },
      opera: {
        files: [
          {
            src: 'manifest.<%= grunt.task.current.target %>.json',
            dest: 'manifest.<%= grunt.task.current.target %>.json',
          },
        ],
      },
    },
    eslint: {
      target: ['**.js', 'interface/**/*.js', '!Gruntfile.js'],
    },
    clean: {
      firefox: ['build/firefox'],
      chrome: ['build/chrome'],
      edge: ['build/edge'],
      opera: ['build/opera'],
    },
    copy: {
      firefox: {
        files: [
          {
            expand: true,
            src: ['cookie-editor.js'],
            dest: 'build/<%= grunt.task.current.target %>/',
            filter: 'isFile',
          },
          {
            expand: true,
            src: ['interface/**'],
            dest: 'build/<%= grunt.task.current.target %>/',
          },
          {
            expand: true,
            src: ['icons/**'],
            dest: 'build/<%= grunt.task.current.target %>/',
          },
          {
            expand: true,
            src: 'manifest.<%= grunt.task.current.target %>.json',
            dest: 'build/<%= grunt.task.current.target %>/',
            filter: 'isFile',
            rename: function (dest, src) {
              return dest + src.replace('.' + grunt.task.current.target, '');
            },
          },
        ],
      },
      chrome: {
        files: [
          {
            expand: true,
            src: ['cookie-editor.js'],
            dest: 'build/<%= grunt.task.current.target %>/',
            filter: 'isFile',
          },
          {
            expand: true,
            src: ['interface/**'],
            dest: 'build/<%= grunt.task.current.target %>/',
          },
          {
            expand: true,
            src: ['icons/**'],
            dest: 'build/<%= grunt.task.current.target %>/',
          },
          {
            expand: true,
            src: 'manifest.<%= grunt.task.current.target %>.json',
            dest: 'build/<%= grunt.task.current.target %>/',
            filter: 'isFile',
            rename: function (dest, src) {
              return dest + src.replace('.' + grunt.task.current.target, '');
            },
          },
        ],
      },
      edge: {
        files: [
          {
            expand: true,
            src: ['cookie-editor.js'],
            dest: 'build/<%= grunt.task.current.target %>/',
            filter: 'isFile',
          },
          {
            expand: true,
            src: ['interface/**'],
            dest: 'build/<%= grunt.task.current.target %>/',
          },
          {
            expand: true,
            src: ['icons/**'],
            dest: 'build/<%= grunt.task.current.target %>/',
          },
          {
            expand: true,
            src: 'manifest.<%= grunt.task.current.target %>.json',
            dest: 'build/<%= grunt.task.current.target %>/',
            filter: 'isFile',
            rename: function (dest, src) {
              return dest + src.replace('.' + grunt.task.current.target, '');
            },
          },
        ],
      },
      opera: {
        files: [
          {
            expand: true,
            src: ['cookie-editor.js'],
            dest: 'build/<%= grunt.task.current.target %>/',
            filter: 'isFile',
          },
          {
            expand: true,
            src: ['interface/**'],
            dest: 'build/<%= grunt.task.current.target %>/',
          },
          {
            expand: true,
            src: ['icons/**'],
            dest: 'build/<%= grunt.task.current.target %>/',
          },
          {
            expand: true,
            src: 'manifest.<%= grunt.task.current.target %>.json',
            dest: 'build/<%= grunt.task.current.target %>/',
            filter: 'isFile',
            rename: function (dest, src) {
              return dest + src.replace('.' + grunt.task.current.target, '');
            },
          },
        ],
      },
    },
    replace: {
      options: {
        patterns: [
          {
            match: 'browser_name',
            replacement: '<%= grunt.task.current.target %>',
          },
        ],
      },
      firefox: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['interface/lib/env.js'],
            dest: 'build/<%= grunt.task.current.target %>/interface/lib/',
          },
        ],
      },
      chrome: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['interface/lib/env.js'],
            dest: 'build/<%= grunt.task.current.target %>/interface/lib/',
          },
        ],
      },
      edge: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['interface/lib/env.js'],
            dest: 'build/<%= grunt.task.current.target %>/interface/lib/',
          },
        ],
      },
      opera: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['interface/lib/env.js'],
            dest: 'build/<%= grunt.task.current.target %>/interface/lib/',
          },
        ],
      },
    },
    removelogging: {
      dist: {
        src: 'build/**/*.js',
      },
    },
    compress: {
      firefox: {
        options: {
          archive:
            'dist/<%= pkg.name %>-<%= grunt.task.current.target %>-<%= pkg.version %>.zip',
        },
        files: [
          {
            expand: true,
            cwd: 'build/<%= grunt.task.current.target %>/',
            src: ['**'],
            dest: '/',
          },
        ],
      },
      chrome: {
        options: {
          archive:
            'dist/<%= pkg.name %>-<%= grunt.task.current.target %>-<%= pkg.version %>.zip',
        },
        files: [
          {
            expand: true,
            cwd: 'build/<%= grunt.task.current.target %>/',
            src: ['**'],
            dest: '/',
          },
        ],
      },
      edge: {
        options: {
          archive:
            'dist/<%= pkg.name %>-<%= grunt.task.current.target %>-<%= pkg.version %>.zip',
        },
        files: [
          {
            expand: true,
            cwd: 'build/<%= grunt.task.current.target %>/',
            src: ['**'],
            dest: '/',
          },
        ],
      },
      opera: {
        options: {
          archive:
            'dist/<%= pkg.name %>-<%= grunt.task.current.target %>-<%= pkg.version %>.zip',
        },
        files: [
          {
            expand: true,
            cwd: 'build/<%= grunt.task.current.target %>/',
            src: ['**'],
            dest: '/',
          },
        ],
      },
    },
  });

  grunt.loadNpmTasks('grunt-json-replace');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-replace');
  grunt.loadNpmTasks('grunt-remove-logging');
  grunt.loadNpmTasks('grunt-contrib-compress');

  // Default task(s).
  grunt.registerTask('default', [
    'json-replace',
    'eslint',
    'clean',
    'copy',
    'replace',
    'removelogging',
    'compress',
  ]);
};
