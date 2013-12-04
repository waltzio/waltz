function Tutorial() {
    var configURL = chrome.extension.getURL("build/site_configs.json")

    this.storage = new Storage();

    $.getJSON(configURL, this.init.bind(this));
}

Tutorial.prototype.init = function(data) {
    var $siteContainer = $('.sites-list'),
        site,
        siteHTML;

    this.siteConfigs = data;

    for (k in data) {
        site = data[k];
        if (!site.ignore) {
            siteHTML = [
            "<a class='go-to-site' data-site-key='" + site.key + "' href='" + site.login.urls[0] + "'>",
                "<li>",
                    "<h4 class='name'>" + site.name + "</h4>",
                    "<img src='/img/site_images/" + site.key + ".png'/>",
                "</li>",
            "</a>"].join("");
            $siteContainer.prepend(siteHTML);
        }
    }

    this.attachHandlers();
};

Tutorial.prototype.attachHandlers = function() {
    $('a.go-to-site').click(this.redirectToSite.bind(this));
};

Tutorial.prototype.redirectToSite = function(e) {
    e.preventDefault();

    var $a = $(e.currentTarget), 
        siteKey = $a.data('site-key');

    this.storage.setOnboardingSiteData(siteKey, 'forceTutorial', true, function() {
        window.location = $a.attr('href');
    })
};

var tutorial = new Tutorial();