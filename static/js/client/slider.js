(function() {

    this.Slider = (function() {

        Slider.prototype.slideSelector = '.slide';
        Slider.prototype.nextButtonSelector = '.next';
        Slider.prototype.previousButtonSelector = '.previous';
        Slider.prototype.siteStartSelector = ".site-start";
        Slider.prototype.previous = [];

        function Slider() {
            var _this = this;

            this.$slides = $(this.slideSelector);
            this.storage = new Storage();
            this.analytics = new Analytics();
            this.analytics.trackEvent("start_tutorial");

            this.$slides.each(function() {
                $('.tutorial-slides').addClass($(this).attr('id'));
            });

            $(this.siteStartSelector).each(function() {
                var $this = $(this);
                _this.storage.getOnboardingSiteData($this.data('key'), function(data) {
                    if (data.loginAttempts.success >= 1) {
                        $this.addClass('completed');
                    }
                });
            });

            var params = Utils.getURLParams();
            if (params.id) {
                try {
                    var $slidesToHide = $(this.slideSelector + ':not(#' + params.id + ')');
                    if ($slidesToHide.length !== this.$slides.length) {
                        $slidesToHide.addClass('removed');
                        $($slidesToHide.get().reverse()).each(function() { _this.previous.push(this.id); });
                    }
                } catch (e) {}
            }

            this.attachHandlers();
        }

        Slider.prototype.attachHandlers = function() {
            this.$slides.find(this.nextButtonSelector).click(this.nextSlide.bind(this));
            this.$slides.find(this.previousButtonSelector).click(this.previousSlide.bind(this));
            $(this.siteStartSelector).click(this.startSiteSetup.bind(this));
        };

        Slider.prototype.nextSlide = function(e) {
            e.preventDefault();

            var $b = $(e.currentTarget),
                $slide = $b.parents(this.slideSelector),
                customNext = $b.data('next');

            if (customNext) {
                $slide.prevUntil('#' + customNext).addClass('removed');
            }
            
            $slide.addClass('removed');
            this.previous.push($slide.attr('id'));
            $('.tutorial-slides').removeClass($slide.attr('id'));
        };

        Slider.prototype.previousSlide = function(e) {
            e.preventDefault();

            var $b = $(e.currentTarget),
                $slide = $b.parents(this.slideSelector),
                customNext = $b;

            var $previous = $slide.nextAll('#' + this.previous.pop());
            $previous = $.merge($previous, $previous.prevUntil($slide));

            $previous.removeClass('removed');
            $('.tutorial-slides').addClass($previous.attr('id'));
        };

        Slider.prototype.startSiteSetup = function(e) {
            e.preventDefault();

            this.analytics.trackEvent('finish_tutorial');

            var $a = $(e.currentTarget), 
                siteKey = $a.text().toLowerCase();

            this.analytics.trackEvent('tutorial_site_setup', { siteKey: siteKey });

            if ($a.hasClass('completed')) return;

            chrome.runtime.sendMessage({
                method: 'forceTutorial',
                key: siteKey
            }, function() {
                window.location = $a.attr('href');
            });
        };

        return Slider;
    })();

    var slider = new Slider();

}).call(this);