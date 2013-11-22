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
        'css/waltz.css': 'scss/waltz.scss',
        'css/options.css': 'scss/options.scss',
        'css/tutorial.css': 'scss/tutorial.scss'
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
  "build-config": {
    "go": {
      src: 'site_configs',
      dest: 'build/site_configs.json'
    }
  }
});

grunt.task.registerMultiTask('build-config', 'Concatenates site configs.', function() {
  var len = this.filesSrc.length,
      siteConfig,
      outputDir = this.data.dest.split('/').slice(0, -1).join('/'),
      merged = {};

  var jsonMerge = function(object1, object2) {
    var key, a1, a2;
    for (key in object2) {
      if (object2.hasOwnProperty(key)) {
        object1[key] = object2[key];
      }
    }

    return object1;
  };

  var iterateTroughFiles = function(abspath, rootdir, subdir, filename){
    outputFile = outputDir + '/' + filename;

    siteConfig = grunt.file.readJSON(abspath);

    for (domain in siteConfig) {
      siteConfig[domain]['key'] = filename.split('.')[0];
    }

    merged = jsonMerge(merged, siteConfig);
  };


  for (var x = 0; x < len; x++) {
    grunt.file.recurse(this.data.src, iterateTroughFiles);
  }

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
