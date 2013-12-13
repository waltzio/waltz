var grunt = require('grunt'),
  http = require('http');

grunt.initConfig({
  watch: {
    sass: {
      files: ['static/scss/*.scss'],
      tasks: ['sass'],
      options: {
        debounceDelay: 500
      }
    },
    'build-config': {
      files: ['site_configs/*.json'],
      tasks: ['build-config'],
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
        'static/css/waltz.css': 'static/scss/waltz.scss',
        'static/css/options.css': 'static/scss/options.scss',
        'static/css/popup.css': 'static/scss/popup.scss',
        'static/css/tutorial.css': 'static/scss/tutorial.scss',
        'static/css/sites.css': 'static/scss/sites.scss'
      }
    }
  },
  'chrome-extension': {
    options: {
        name: "Waltz",
        version: "0.2.1.3",
        id: "obhibkfopclldmnoohabnbimocpgdine",
        chrome: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        clean: true,
        certDir: 'cert',
        buildDir: 'build',
        resources: [
           'static/**',
           'html/**',
           'site_configs/**'
        ]
    }
  },
  "build-config": {
    "go": {
      src: 'site_configs',
      dest: 'build/site_configs.json'
    }
  }
});

grunt.task.registerMultiTask('build-config', 'Concatenates site configs.', function() {
  var siteConfig,
      outputDir = this.data.dest.split('/').slice(0, -1).join('/'),
      merged = {},
      _this = this;

  var jsonMerge = function(object1, object2) {
    var key, a1, a2;
    for (key in object2) {
      if (object2.hasOwnProperty(key)) {
        object1[key] = object2[key];
      }
    }

    return object1;
  };

  var iterateThroughFiles = function(filename){
    var relativePath = _this.data.src + '/' + filename;
    siteConfig = grunt.file.readJSON(relativePath);

    for (domain in siteConfig) {
      siteConfig[domain]['key'] = filename.split('.')[0];
    }

    merged = jsonMerge(merged, siteConfig);
  };

  grunt.file.expand({ matchBase: true, cwd: this.data.src }, ['*.json']).map(iterateThroughFiles);

  // If output dir doesnt exists, then create it
  if (!grunt.file.exists(outputDir)) {
    grunt.file.mkdir(outputDir);
  }

  grunt.file.write(this.data.dest, JSON.stringify(merged));
});

grunt.loadNpmTasks('grunt-contrib-sass');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-chrome-compile');
grunt.loadNpmTasks('grunt-merge-json');

grunt.registerTask('default', ['watch']);
