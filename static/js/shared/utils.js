var Utils = {
    /**
      * @param String input  A match pattern
      * @returns  null if input is invalid
      * @returns  String to be passed to the RegExp constructor */
    parse_match_pattern: function (input) {
        if (typeof input !== 'string') return null;
        var match_pattern = '(?:^',
            regEscape = function(s) {return s.replace(/[[^$.|?*+(){}\\]/g, '\\$&');},
            result = /^(\*|https?|file|ftp|chrome-extension):\/\//.exec(input);

        // Parse scheme
        if (!result) return null;
        input = input.substr(result[0].length);
        match_pattern += result[1] === '*' ? 'https?://' : result[1] + '://';

        // Parse host if scheme is not `file`
        if (result[1] !== 'file') {
            if (!(result = /^(?:\*|(\*\.)?([^\/*]+))(?=\/)/.exec(input))) return null;
            input = input.substr(result[0].length);
            if (result[0] === '*') {    // host is '*'
                match_pattern += '[^/]+';
            } else {
                if (result[1]) {         // Subdomain wildcard exists
                    match_pattern += '(?:[^/]+\\.)?';
                }
                // Append host (escape special regex characters)
                match_pattern += regEscape(result[2]);
            }
        }
        // Add remainder (path)
        match_pattern += input.split('*').map(regEscape).join('.*');
        match_pattern += '$)';
        return match_pattern;
    },
    urlsAreEqual: function (urlString1, urlString2) {
        var url1 = Utils.url(urlString1);
        var url2 = Utils.url(urlString2);

        return url1.hostname === url2.hostname &&
               url1.pathname === url2.pathname;
    },
    extrapolateUrlFromCookie: function (cookie) {
        var prefix = cookie.secure ? "https://" : "http://";
        if (cookie.domain.charAt(0) == ".")
            prefix += "www";

        return prefix + cookie.domain + cookie.path;
    },
    extrapolateDomainFromMatchURL: function(matchURL) {
        var matches = matchURL.match(".*://(.*)/.*");
        var domain = matches[1];
        if (domain[0] === "*") domain = domain.slice(2);
        return domain;
    },
    getCookiesForDomain: function (domain, cb) {
        if (domain.match(/\:\/\//)) domain = Utils.extrapolateDomainFromMatchURL(domain);
        var attempts = 0;
        (function getCookies() {
            chrome.cookies.getAll(
                { domain: domain },
                function (cookies) {
                    if (chrome.extension.lastError && attempts < 10) {
                        attempts++;
                        return setTimeout(getCookies, 500);
                    } else {
                        return cb(cookies);
                    }
                }
            );
        })();
    },
    getURLParams: function () {
        var vars = {};
        var parts = window.location.href.replace(
            /[?&]+([^=&]+)=([^&]*)/gi,
            function(m,key,value) {
                vars[key] = decodeURIComponent(value);
            });
        return vars;
    },
    addURLParam: function(url, parameterName, parameterValue) {
        var cl;
        replaceDuplicates = true;

        if(url.indexOf('#') > 0){
            cl = url.indexOf('#');
            urlhash = url.substring(url.indexOf('#'),url.length);
        } else {
            urlhash = '';
            cl = url.length;
        }

        sourceUrl = url.substring(0,cl);



        var urlParts = sourceUrl.split("?");
        var newQueryString = "";

        if (urlParts.length > 1)
        {
            var parameters = urlParts[1].split("&");
            for (var i=0; (i < parameters.length); i++)
            {
                var parameterParts = parameters[i].split("=");
                if (!(replaceDuplicates && parameterParts[0] == parameterName))
                {
                    if (newQueryString === "") newQueryString = "?";
                    else newQueryString += "&";
                    newQueryString += parameterParts[0] + "=" + parameterParts[1];
                }
            }
        }
        if (newQueryString === "") newQueryString = "?";
        else newQueryString += "&";
        newQueryString += parameterName + "=" + parameterValue;

        return urlParts[0] + newQueryString + urlhash;
    },
    triggerLoading: function (el, opts) {
        var $el = $(el),
            saveText = $el.text(),
            promise;

        $el.addClass('loading');
        $el.text('loading..');

        if (opts && opts.promise) {
            promise = $.Deferred();
            $.when(promise)
             .then(unload);
            return promise;
        } else {
            setTimeout(unload, 1000);
        }

        function unload() {
            $el.removeClass('loading');
            $el.text(saveText);
        }
    },
    isEmail: function(email) {
        var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        return regex.test(email);
    },
    url: function(urlString) {
        return $('<a>', { href: urlString })[0];
    },
    pseudoUniqueID: function() {
        return Math.random().toString(36).substring(2, 16);
    },
    isCSPHeader: function(headerName) {
      return (headerName == 'CONTENT-SECURITY-POLICY') || (headerName == 'X-WEBKIT-CSP');
    },
    isDevMode: function() {
        var _this = this,
            promise = $.Deferred();

        if (this.devMode) return promise.resolve(this.devMode);

        $.getJSON(
            chrome.runtime.getURL('manifest.json'),
            function(data) {
                _this.devMode = !('update_url' in data);
                promise.resolve(_this.devMode);
            }
        );

        return promise;
    },
    settings: {}
};

if(typeof(module) === "object" && typeof(module.exports) === "object") {
    module.exports = Utils;
}
