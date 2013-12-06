module.exports = function(grunt) {
 
    // Project configuration.
    grunt.initConfig({
 
        //Read the package.json (optional)
        pkg: grunt.file.readJSON('package.json'),
 
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %> ',
 
        // Task configuration.
        sass: {
            dist: {
                files: {
                    'static/css/main.css': 'static/scss/main.scss'
                }
            }
        },
 
        watch: {
            connect: {
                options: {
                    livereload: true
                },
                files: [
                    'static/scss/**/*.scss'
                ],
                tasks: ['sass'],
            }
        },

        connect: {
            all: {
                options: {
                    port: 3000,
                    hostname: 'localhost',
                    keepalive: true
                }
            }
        },

        open: {
            all: {
                path: 'http://localhost:<%= connect.all.options.port %>'
            }
        }
 
    });
 
    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-open');
    grunt.loadNpmTasks('grunt-concurrent');
 
    // Default task.
    grunt.registerTask('default', ['watch']);
 
};