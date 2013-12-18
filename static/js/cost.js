(function($) {

this.Cost = (function() {

    Cost.prototype.sliderSelector = '.slider';
    Cost.prototype.countDisplaySelector = '.count-display';
    Cost.prototype.sliderHandleSelector = '.ui-slider-handle';
    Cost.prototype.totalSelector = '.total';
    Cost.prototype.sliders = [];
    Cost.prototype.startingValue = 10;
    Cost.prototype.MAX = 30;
    Cost.prototype.MIN = 0;
    Cost.prototype.total = 0;
    Cost.prototype.categories = {
        corporate: {
            multiplier: 104,
            total: 0,
        },
        banking: {
            multiplier: 104,
            total: 0
        },
        personal: {
            multiplier: 12,
            total: 0
        },
        other: {
            multiplier: 7,
            total: 0
        }
    }

    function Cost(opts) {
        var cat, k;
        for (k in this.categories) {
            cat = this.categories[k];
            cat.total = cat.multiplier * this.startingValue;
        }

        this.render();
        this.attachHandlers();
    }

    Cost.prototype.render = function() {
        var _this = this;
        $(this.sliderSelector).each(function() {
            _this.sliders.push($(this).slider({
                animate: "fast",
                max: _this.MAX,
                min: _this.MIN,
                value: _this.startingValue,
                change: _this.handleSlide.bind(_this),
                test: true
            }));
        });
        this.$twitter = $('.twitter-share-button');
        this.renderTotal();
    }

    Cost.prototype.attachHandlers = function() {
        var _this = this;
        $('.share').click(function() {
            if ($(this).hasClass('fi-social-twitter')) {
                var url = "http://twitter.com/intent/tweet?text=";
            }

            window.open(url);
        });
    }

    Cost.prototype.handleSlide = function(e, ui) {
        var $slider = $(e.currentTarget.activeElement).parent(),
            $handle = $slider.find(this.sliderHandleSelector),
            $countDisplay = $slider.find(this.countDisplaySelector),
            category = $slider.data('category');


        $countDisplay.css({left: $handle[0].style.left });
        if (ui.value === this.MAX) {
            $countDisplay.text(this.MAX + "+");
        } else {
            $countDisplay.text(ui.value);
        }

        this.categories[category].total = parseInt(ui.value) * this.categories[category].multiplier;

        this.renderTotal();
    }

    Cost.prototype.renderTotal = function() {
        var k,
            formatted,
            total = 0;

        for (k in this.categories) {
            total += this.categories[k].total;
        }

        formatted = '$' + numberWithCommas(total);
        $(this.totalSelector).text(formatted);
    }

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }


    return Cost;
})();

$(document).ready(function() {
    var cost = new Cost();
})

}).call(this, jQuery)