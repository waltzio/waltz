(function() {
    Sharer.prototype.twitterBase = 'https://twitter.com/intent/tweet';
    Sharer.prototype.facebookBase = "https://www.facebook.com/dialog/feed?app_id=1383429211907692&display=popup";
    Sharer.prototype.waltzLink = encodeURIComponent("http://getwaltz.com");

    Sharer.prototype.shareSelector = ".waltz-share";

    Sharer.prototype.messages = {
        setupSuccess: {
            twitter: "I just setup @getwaltz on <%= name %> - getting rid of more passwords!",
            facebook: "I just setup Waltz on <%= name %>. You probably should too, yo."
        },
        requestSite: {
            twitter: "Hey @getwaltz, I'd love to get rid of my passwords on <%= site %>. Can you help?"
        }
    };

    Sharer.prototype.shareDefaults = {

    };

    function Sharer(waltz) {

    this.waltz = waltz;

    this.templater = new Templater();

    // $(window).click(this.shareToTwitter.bind(this));

    this.attachHandlers();
    }

    Sharer.prototype.attachHandlers = function() {
    $(this.shareSelector).click(this.share.bind(this));
    };

    Sharer.prototype.share = function(e) {
    e.stopPropagation();
    e.preventDefault();

    var _this = this,
        $el = $(e.currentTarget),
        data = $el.data(),
        message,
        type = "twitter";

    if ($el.hasClass('facebook') || data.type === "facebook") {
        type = "facebook";
    }

    _.defaults(data, this.shareDefaults);

    this.templater.template({
        name: null,
        context: data,
        html: this.messages[data.shareType].twitter
    }, function(message) {
        data.message = encodeURIComponent(message);
        _this[type](data);
    });
    };

    Sharer.prototype.shareSetupSuccess = function() {

    }

    Sharer.prototype.twitter = function(opts) {
    var url = this.sharedShare(this.twitterBase, opts);

    if (opts.message) {
        url = Utils.addURLParam(url, "text", opts.message);
    }


    url = Utils.addURLParam(url, "u", this.waltzLink);

    this.open(url);
    }

    Sharer.prototype.facebook = function(opts) {
    var url = this.sharedShare(this.facebookBase, opts);

    if (opts.message) {
        url = Utils.addURLParam(url, "caption", opts.message);
    }

    url = Utils.addURLParam(url, "link", this.waltzLink);
    url = Utils.addURLParam(url, "redirect_uri", this.waltzLink);

    this.open(url);
    }

    Sharer.prototype.open = function(url) {
    window.open(url, "popup", "height=400px,width=600px,top=100px,left=100px");
    }

    Sharer.prototype.sharedShare = function(url, opts) {
    return url;
    }

    this.Sharer = Sharer;
}).call(this);