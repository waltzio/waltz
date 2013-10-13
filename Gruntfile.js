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
        'css/clef.css': 'scss/clef.scss'
      }
    }
  },
  compress: {
    zip:{ 
      options: {
        archive: '../waltz.zip'
      },
      files: [
        {expand: true, src: ['**/*']}
      ]
    }
  }
});

grunt.loadNpmTasks('grunt-contrib-sass');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-contrib-compress');

grunt.registerTask('default', ['watch']);
