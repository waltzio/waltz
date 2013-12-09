function Sites() {
    var configURL = chrome.extension.getURL("build/site_configs.json")

    this.storage = new Storage();

    $.getJSON(configURL, this.init.bind(this));
}

Sites.prototype.init = function(data) {
    var _this = this,
        $siteContainer = $('.sites-list'),
        site,
        siteHTML;

    this.siteConfigs = data;

    for (k in data) {
        site = data[k];
        if (!site.ignore) {
            $siteHTML = $([
            "<a class='go-to-site' data-site-key='" + site.key + "' href='" + site.login.urls[0] + "'>",
                "<li>",
                    "<h4 class='name'>" + site.name + "</h4>",
                    "<img src='/static/img/site_images/" + site.key + ".png'/>",
                "</li>",
            "</a>"].join(""));

            _this.storage.getOnboardingSiteData(site.key, function(data) {
                if (data.loginAttempts.success >= 1) {
                    $siteHTML.addClass('completed');
                }
            });


            $siteContainer.prepend($siteHTML);
        }
    }

    _this.attachHandlers();
};

Sites.prototype.attachHandlers = function() {
    $('a.go-to-site').click(this.redirectToSite.bind(this));
};

Sites.prototype.redirectToSite = function(e) {
    e.preventDefault();

    var $a = $(e.currentTarget), 
        siteKey = $a.data('site-key');

    chrome.runtime.sendMessage({
        method: 'forceTutorial',
        key: siteKey
    }, function() {
        window.location = $a.attr('href');
    });
};

var sites = new Sites();