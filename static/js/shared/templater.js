(function() {
    Templater.prototype.templatesRendering = {};

    function Templater() {
        var $iframe = this.$iframe = $('<iframe>');

        $iframe.attr('src', chrome.extension.getURL('/html/templates.html'));
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

    Templater.prototype.template = function(opts, callback) {
        var _this = this,
            promise = $.Deferred();

        this.register(opts.named, callback, promise);

        $.when(this.iframeLoaded).then(function() {
            _this.$iframe[0].contentWindow.postMessage({
                method: 'template', 
                named: opts.named,
                context: opts.context,
                html: opts.html
            }, '*');
        });

        return promise;
    };

    Templater.prototype.register = function(named, callback, promise) {
        this.templatesRendering[named] = {
            callback: callback,
            promise: promise
        };
    };

    Templater.prototype.listen = function(promise, callback) {
        var _this = this;
        window.addEventListener('message', function(e) {
            if (e.data.method === "returnTemplate") {
                var registered = _this.templatesRendering[e.data.named];
                if (registered) {
                    if (typeof registered.callback === "function") registered.callback(e.data.html);
                    registered.promise.resolve(e.data.html);
                    delete(_this.templatesRendering[e.data.named]);
                }
            }
        });
    };

    Templater.prototype.stopListening = function() {
        window.removeEventListener('message');
    };

    this.Templater = Templater;

}).call(this);