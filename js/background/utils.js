/**
  * @param String input  A match pattern
  * @returns  null if input is invalid
  * @returns  String to be passed to the RegExp constructor */
function parse_match_pattern(input) {
    if (typeof input !== 'string') return null;
    var match_pattern = '(?:^'
      , regEscape = function(s) {return s.replace(/[[^$.|?*+(){}\\]/g, '\\$&');}
      , result = /^(\*|https?|file|ftp|chrome-extension):\/\//.exec(input);

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
}

function extrapolateUrlFromCookie(cookie) {
    var prefix = cookie.secure ? "https://" : "http://";
    if (cookie.domain.charAt(0) == ".")
        prefix += "www";

    return prefix + cookie.domain + cookie.path;
}

function extrapolateDomainFromMatchURL(matchURL) {
    var matches = matchURL.match(".*://(.*)/.*");
    var domain = matches[1];
    if (domain[0] === "*") domain = domain.slice(2);
    return domain;
}

function getCookiesForDomain(domain, cb) {
    chrome.cookies.getAll(
        { domain: extrapolateDomainFromMatchURL(domain) },
        function(cookies) {
            cb(cookies)
        }
    );
}

function isEmpty(obj) {
    for(var key in obj) {
        if (obj.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
}
