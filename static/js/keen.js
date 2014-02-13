(function($) {

    var Keen=Keen||{configure:function(e){this._cf=e},addEvent:function(e,t,n,i){this._eq=this._eq||[],this._eq.push([e,t,n,i])},setGlobalProperties:function(e){this._gp=e},onChartsReady:function(e){this._ocrq=this._ocrq||[],this._ocrq.push(e)}};(function(){var e=document.createElement("script");e.type="text/javascript",e.async=!0,e.src=("https:"==document.location.protocol?"https://":"http://")+"dc8na2hxrj29i.cloudfront.net/code/keen-2.1.0-min.js";var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t)})();

    window.Keen = Keen;

    // Configure the Keen object with your Project ID and (optional) access keys.
    Keen.configure({
        projectId: "52aa2fc873f4bb0891000000",
        readKey: "3df095450e9223137abdc8e8a74ae8dc470b130b9e2658a17b846c4d420b196bf98e860e70966186795b472ff9f81e52b9c00044a3c395295a2576420a3f41b6ef040dd0a3490a34690f171afbea35bcaa84fa511431a59c1cb431f2c87016c45d11d3b806c2ad051e92133451a1bc84"    // required for doing analysis
    });


    $(document).ready(function() {
    	var seriesChart = document.getElementById("keen-series");
    	var seriesContainer = document.getElementsByClassName("analytics")[0];

		Keen.onChartsReady(function() {
			var clicksPerDay = new Keen.Series("widget_clicked", {
				analysisType: "count",
				timeframe: "previous_7_days",
				interval: "daily"
			});

			var clicksTotal = new Keen.Metric("widget_clicked", {
				analysisType: "count",
				timeframe: "this_7_days"
			});

			var chartOptions = {
				width: seriesContainer.offsetWidth,
				height: 300,
				chartAreaWidth: seriesContainer.offsetWidth,
				chartAreaHeight: 300,
				showLegend: false,
				color: "#f50380",
				override: {
					enableInteractivity: false,
					tooltip: {
						trigger: false
					},
					vAxis: {
						gridlines: {
							color: 'transparent'
						},
						baselineColor: 'transparent'
					},
					hAxis: {
					    textPosition: 'none'
					}
				}
			};

			clicksPerDay.getResponse(function(resp) {
				clicksPerDay.draw(seriesChart, chartOptions)

				$(window).resize(function() {
					chartOptions.chartAreaWidth = seriesContainer.offsetWidth;
					chartOptions.width = seriesContainer.offsetWidth;
					clicksPerDay.draw(seriesChart, chartOptions);
				});
			});

			clicksTotal.getResponse(function(resp) {
				$("#keen-count").find("h3").children("span").text(resp.result);
			});

		});
	});

})(jQuery)
