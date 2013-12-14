Sites.prototype.welcomeSelector = ".welcome";
Sites.prototype.congratulationsSelector = ".congratulations";

function Sites() {

    var params = Utils.getURLParams();

    if (params.success) {
        this.sharer = new Sharer();

        $(this.welcomeSelector).hide();
        var $congratsContainer = $(this.congratulationsSelector);
        $congratsContainer.find('span.name').text(params.success);
        $congratsContainer.find(this.sharer.shareSelector).data('name', params.success);
        $(this.congratulationsSelector).show();
    } 

    var configURL = chrome.extension.getURL("build/site_configs.json");

    this.storage = new Storage();

    $.getJSON(configURL, this.init.bind(this));
}

Sites.prototype.init = function(data) {
    var _this = this,
        $siteContainer = $('.sites-list'),
        completed = [],
        count;

    this.siteConfigs = data;

    count = Object.keys(data).length;

    $.each(data, function(key, site) {
        if (!site.ignore) {
            var $siteHTML = $([
            "<li class='go-to-site' data-site-key='" + site.key + "'>",
                "<a href='" + site.login.urls[0] + "'></a>",
                "<h4 class='name'>" + site.name + "</h4>",
                "<img src='/static/img/site_images/" + site.key + ".png'/>",
            "</li>"].join(""));

            (function() {

            })

            _this.storage.getOnboardingSiteData(site.key, function(data) {
                if (data.loginAttempts.success >= 1) {
                    $siteHTML.addClass('completed fi-check');
                }
                completed.push($siteHTML);

                if (--count) (function() { 
                    function sorter(a, b) {
                        var aName = a.find('.name').text(), bName = b.find('.name').text();
                        if (aName > bName) return 1;
                        if (aName < bName) return -1;
                        return 0
                    }

                    $siteContainer.prepend(completed.sort(sorter)); 
                })();
            });
        }
    });
    
    _this.attachHandlers();

    _this.trackKeenEvent("sites_list");
};

Sites.prototype.attachHandlers = function() {
    $('li.go-to-site').click(this.redirectToSite.bind(this));
};

Sites.prototype.redirectToSite = function(e) {
    e.preventDefault();

    var $li = $(e.currentTarget),
        $a = $li.find('a'), 
        siteKey = $li.data('site-key');

    chrome.runtime.sendMessage({
        method: 'forceTutorial',
        key: siteKey
    }, function() {
        window.location = $a.attr('href');
    });
};

Sites.prototype.trackKeenEvent = function(evnt, data) {
    var _this = this;

    if(typeof(KEEN_UUID) !== "undefined") {
        Keen.addEvent(evnt, data);
    } else {
        this.initiateKeen(evnt, data);
    }
}

Sites.prototype.initiateKeen = function(evnt, data) {
    var _this = this;

    _this.storage.getOptions(function(options) {
        KEEN_UUID = options[KEEN_UUID_KEY];
        Keen.setGlobalProperties(_this.getKeenGlobals);
        if(evnt) {
            _this.trackKeenEvent(evnt, data);
        }
    });
};

Sites.prototype.getKeenGlobals = function(eventCollection) {
    // setup the global properties we'll use
    var globalProperties = {
        UUID: KEEN_UUID,
        has_network_connection: navigator.onLine,
        chrome_version: window.navigator.appVersion
    };

    return globalProperties;
};

var sites = new Sites();