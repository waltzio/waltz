(function() {
    Sharer.prototype.twitterBase = 'https://twitter.com/intent/tweet';
    Sharer.prototype.facebookBase = "https://www.facebook.com/dialog/feed?app_id=1383429211907692&display=popup";
    Sharer.prototype.shareSelector = ".waltz-share";
    Sharer.prototype.waltzLink = "http://getwaltz.com";

    Sharer.prototype.messages = {
        // the default
        def: {
            twitter: "Someone finally fixed my password problem, if you're tired of remembering too much, check it out: <%= link %>.",
            facebook: "Someone finally fixed my password problem, if you're tired of remembering too much, check it out!"
        },
        requestSite: {
            twitter: "Hey @getwaltz, I'd love to get rid of my passwords on <%= site %>. Can you help?"
        }
    };

    Sharer.prototype.shareDefaults = {};

    function Sharer(waltz) {
        this.waltz = waltz;

        if (this.waltz && this.waltz.templater) {
            this.templater = this.waltz.templater;
        } else {
            this.templater = new Templater();
        }

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
        } else if ($el.hasClass('email') || data.type === "email") {
            type = "email";
            name = "email-" + data.shareType;
        }

        _.defaults(data, this.shareDefaults);
        data.link = data.link || this.waltzLink;

        html = (this.messages[data.shareType] || this.messages.def)[type];

        this.templater.template({
            named: name,
            context: data,
            html: html
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
            url = Utils.addURLParam(url, "description", opts.message);
        } else {
            url = Utils.addURLParam(url, "description", "Waltz is a modern account manager, making it easier and safer for you to browse the web. Waltz lets you use Clef (getclef.com) to log in and out of all of your favorite sites without out a password. There's nothing for you to remember or type, and Waltz lets you log in (and out) everywhere at once.");
        }

        url = Utils.addURLParam(url, "link", opts.link);
        url = Utils.addURLParam(url, "redirect_uri", this.waltzLink);
        url = Utils.addURLParam(url, "name", "Waltz | A modern account manager for the web");
        url = Utils.addURLParam(url, "picture", "http://getwaltz.com/static/img/waltz-full.png");

        this.open(url);
    }

    Sharer.prototype.email = function(opts) {
        var url = "mailto:";

        if(typeof(opts.to) === "string") {
            url += opts.to;
        }

        url = Utils.addURLParam(url, "subject", opts.subject);
        url = Utils.addURLParam(url, "body", opts.message);

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
