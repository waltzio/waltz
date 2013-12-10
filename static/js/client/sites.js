function Sites() {
    var configURL = chrome.extension.getURL("build/site_configs.json")

    this.storage = new Storage();

    $.getJSON(configURL, this.init.bind(this));
}

Sites.prototype.init = function(data) {
    var _this = this,
        $siteContainer = $('.sites-list'),
        uncompleted = [],
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
                    completed.push($siteHTML);
                } else {
                    uncompleted.push($siteHTML);
                }

                if (--count) (function() { 
                    function sorter(a, b) {
                        var aName = a.find('.name').text(), bName = b.find('.name').text();
                        if (aName > bName) return 1;
                        if (aName < bName) return -1;
                        return 0
                    }

                    $siteContainer.prepend(uncompleted.sort(sorter), completed.sort(sorter)); 
                })();
            });
        }
    });

    

    _this.attachHandlers();
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

var sites = new Sites();