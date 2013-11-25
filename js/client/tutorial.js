function Tutorial() {
    var configURL = chrome.extension.getURL("build/site_configs.json"),
        $siteContainer = $('.sites-list'),
        site,
        siteHTML;

    $.getJSON(configURL, function(data) {
        for (k in data) {
            site = data[k];
            siteHTML = [
            "<a href='" + site.login.url + "'>",
                "<li>",
                    "<h4 class='name'>" + site.name + "</h4>",
                    "<img src='/img/site_images/" + site.key + ".png'/>",
                "</li>",
            "</a>"].join("");
            $siteContainer.prepend(siteHTML);
        }
    })
}

var tutorial = new Tutorial();