(function() {
    Templater.prototype.templatesRendering = {};

    function Templater() {
        var $iframe = this.$iframe = $('<iframe>');

        $iframe.attr('src', '/html/templates.html');
        $iframe.css({
            display: 'none'
        });

        $('body').append($iframe);

        var _this = this;
        this.iframeLoaded = $.Deferred();
        this.$iframe.on('load', function() {
            _this.listen();
            _this.iframeLoaded.resolve();
        });
    }

    Templater.prototype.template = function(name, context, callback) {
        var _this = this,
            promise = $.Deferred();

        this.register(name, callback, promise);

        $.when(this.iframeLoaded).then(function() {
            _this.$iframe[0].contentWindow.postMessage({
                method: 'template', 
                name: name,
                context: context
            }, '*');
        });

        return promise;
    }

    Templater.prototype.register = function(name, callback, promise) {
        this.templatesRendering[name] = {
            callback: callback,
            promise: promise
        };
    };

    Templater.prototype.listen = function(promise, callback) {
        var _this = this;
        window.addEventListener('message', function(e) {
            if (e.data.method === "returnTemplate") {
                var registered = _this.templatesRendering[e.data.name];
                if (typeof registered.callback === "function") registered.callback(e.data.html);
                registered.promise.resolve(e.data.html);
            }
        })
    }

    Templater.prototype.stopListening = function() {
        window.removeEventListener('message');
    }

    this.Templater = Templater;

}).call(this);