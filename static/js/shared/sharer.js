(function() {
    Sharer.prototype.twitterBase = 'https://twitter.com/intent/tweet';
    Sharer.prototype.facebookBase = "https://www.facebook.com/dialog/feed?app_id=1383429211907692&display=popup";
    Sharer.prototype.shareSelector = ".waltz-share";

    Sharer.prototype.messages = {
        setupSuccess: {
            twitter: "Someone finally fixed my password problem, if you're tired of remembering too much, check it out. <%= link %>",
            facebook: "Someone finally fixed my password problem, if you're tired of remembering too much, check it out. <%= link %>"
        },
        waitlist: {
            twitter: "I found something to get rid of my passwords! 8,000 people are in line, but we get in early if you join me: <%= link %>!",
            facebook: "I found something to get rid of my passwords! 8,000 people are in line for access, but we get in early if you join me!",
            email: "test"
        },
        requestSite: {
            twitter: "Hey @getwaltz, I'd love to get rid of my passwords on <%= site %>. Can you help?"
        }
    };

    Sharer.prototype.shareDefaults = {};

    function Sharer(waltz) {
        this.waltz = waltz;

        this.templater = new Templater();

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
            type = "twitter",
            name;

        if ($el.hasClass('facebook') || data.type === "facebook") {
            type = "facebook";
        } else if ($el.hasClass('email') || data.type) {
            type = "email";
            name = "email-" + data.shareType;
        }

        _.defaults(data, this.shareDefaults);
        data.link = data.link || this.waltzLink;

        this.templater.template({
            name: name,
            context: data,
            html: this.messages[data.shareType][type]
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

        url = Utils.addURLParam(url, "u", opts.link);

        this.open(url);
    }

    Sharer.prototype.facebook = function(opts) {
        var url = this.sharedShare(this.facebookBase, opts);

        if (opts.message) {
            url = Utils.addURLParam(url, "caption", opts.message);
        }

        url = Utils.addURLParam(url, "link", opts.link);
        url = Utils.addURLParam(url, "redirect_uri", this.waltzLink);

        this.open(url);
    }

    Sharer.prototype.email = function(opts) {
        var url = "mailto:?subject=" + opts.subject;

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
