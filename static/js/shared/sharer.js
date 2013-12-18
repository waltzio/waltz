(function() {
    Sharer.prototype.twitterBase = 'https://twitter.com/intent/tweet';
    Sharer.prototype.facebookBase = "https://www.facebook.com/dialog/feed?app_id=1383429211907692&display=popup";
    Sharer.prototype.shareSelector = ".waltz-share";
    Sharer.prototype.waltzLink = "http://getwaltz.com";

    Sharer.prototype.messages = {
        // the default
        def: {
            twitter: "Someone finally fixed my password problem, if you're tired of remembering too much, check it out: <%= link %>.",
            facebook: "Someone finally fixed my password problem, if you're tired of remembering too much, check it out: <%= link %>."
        },
        waitlist: {
            twitter: "I found something to get rid of my passwords! <%= waitListLength %> people are in line, but we get in early if you join me: <%= link %>",
            facebook: "I found something to get rid of my passwords! <%= waitListLength %> people are in line for access, but we get in early if you join me: <%= link %>."
        },
        requestSite: {
            twitter: "Hey @getwaltz, I'd love to get rid of my passwords on <%= site %>. Can you help?"
        },
        invite: {
            twitter: "Found @getwaltz to get rid of all of my passwords. There's a long wait list, but you can skip it with this link: <%= link %>.",
            facebook: "Found Waltz to get rid of all of my passwords. There's a long wait list, but you can skip it with this link: <%= link %>."
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
            url = Utils.addURLParam(url, "caption", opts.message);
        }

        url = Utils.addURLParam(url, "link", opts.link);
        url = Utils.addURLParam(url, "redirect_uri", this.waltzLink);

        this.open(url);
    }

    Sharer.prototype.email = function(opts) {
        var url = "mailto:";
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
