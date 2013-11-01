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
    },
    'merge-json': {
      files: ['site_configs/*.json'],
      tasks: ['merge-json'],
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
  },
  'chrome-extension': {
    options: {
        name: "Waltz",
        version: "0.1.1",
        id: "obhibkfopclldmnoohabnbimocpgdine",
        chrome: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        clean: true,
        certDir: 'cert',
        buildDir: 'build',
        resources: [
            "js/**",
            "images/**",
            "html/**",
	          "css/**"
        ]
    }
  },
      "merge-json": {
        "en": {
            src: [ "site_configs/*.json" ],
            dest: "build/site_configs.json"
        }
    }
});

grunt.loadNpmTasks('grunt-contrib-sass');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-chrome-compile');
grunt.loadNpmTasks('grunt-merge-json');

grunt.registerTask('default', ['watch']);