var grunt = require('grunt'),
  http = require('http');

grunt.initConfig({
  watch: {
    sass: {
      files: ['scss/*.scss'],
      tasks: ['sass'],
      options: {
        debounceDelay: 500
      }
    }
  },
  sass: {                              // Task
    dist: {                            // Target
      options: {                       // Target options
        style: 'expanded'
      },
      files: {                         // Dictionary of files
        'css/waltz.css': 'scss/waltz.scss'
      }
    }
  }
});

grunt.loadNpmTasks('grunt-contrib-sass');
grunt.loadNpmTasks('grunt-contrib-watch');

grunt.registerTask('default', ['watch']);