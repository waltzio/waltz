
Sharer.prototype.twitterBase = 'https://twitter.com/intent/tweet';
Sharer.prototype.facebookBase = "https://www.facebook.com/sharer/sharer.php";
Sharer.prototype.link = encodeURIComponent("http://getwaltz.com");

function Sharer(waltz) {

    this.waltz = waltz;

    this.facebookLink = this.facebookBase + "?u=" + this.link;
    this.twitterLink = this.twitterBase + "?url=" + this.link;

    // $(window).click(this.shareToTwitter.bind(this));
}

Sharer.prototype.shareToTwitter = function(opts) {
    window.open(this.twitterLink);
}

Sharer.prototype.shareToFacebook = function(opts) {

}