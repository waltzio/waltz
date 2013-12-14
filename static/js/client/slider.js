(function() {

    this.Slider = (function() {

        Slider.prototype.slideSelector = '.slide';
        Slider.prototype.nextButtonSelector = '.next';
        Slider.prototype.previousButtonSelector = '.previous';
        Slider.prototype.siteStartSelector = ".site-start";

        function Slider() {

            this.$slides = $(this.slideSelector);
            this.storage = new Storage();

            this.$slides.each(function() {
                $('.tutorial-slides').addClass($(this).attr('id'));
            })

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
            $('.tutorial-slides').removeClass($slide.attr('id'));
        };

        Slider.prototype.previousSlide = function(e) {
            e.preventDefault();
            var $previous = $(e.currentTarget).parents(this.slideSelector).next()
            $previous.removeClass('removed');
            $('.tutorial-slides').addClass($previous.attr('id'));
        }

        Slider.prototype.startSiteSetup = function(e) {
            e.preventDefault();

            var $a = $(e.currentTarget), 
                siteKey = $a.text().toLowerCase();

            chrome.runtime.sendMessage({
                method: 'forceTutorial',
                key: siteKey
            }, function() {
                window.location = $a.attr('href');
            });
        }

        Slider.prototype.trackKeenEvent = function(evnt, data) {
            var _this = this;

            if(typeof(KEEN_UUID) !== "undefined") {
                Keen.addEvent(evnt, data);
            } else {
                this.initiateKeen(evnt, data);
            }
        }

        Slider.prototype.initiateKeen = function(evnt, data) {
            var _this = this;

            _this.storage.getOptions(function(options) {
                KEEN_UUID = options[KEEN_UUID_KEY];
                Keen.setGlobalProperties(_this.getKeenGlobals);
                if(evnt) {
                    _this.trackKeenEvent(evnt, data);
                }
            });
        };

        Slider.prototype.getKeenGlobals = function(eventCollection) {
            // setup the global properties we'll use
            var globalProperties = {
                UUID: KEEN_UUID,
                has_network_connection: navigator.onLine,
                chrome_version: window.navigator.appVersion
            };

            return globalProperties;
        };

        return Slider;
    })();

    var slider = new Slider();
    slider.trackKeenEvent("start_tutorial")

}).call(this);