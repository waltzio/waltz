    var Keen=Keen||{configure:function(e){this._cf=e},addEvent:function(e,t,n,i){this._eq=this._eq||[],this._eq.push([e,t,n,i])},setGlobalProperties:function(e){this._gp=e},onChartsReady:function(e){this._ocrq=this._ocrq||[],this._ocrq.push(e)}};
    
    // Configure the Keen object with your Project ID and (optional) access keys.
    Keen.configure({
        projectId: "52aa2fc873f4bb0891000000",
        writeKey: "8db1acc35090cdfb509873070281e2a840333cec2de43f73c2e0add591baecd34bd81eab2da13a4c9210f8d4f225d6ff398c6eba2efbf4b5cc164940522079bc79382f3ecb90dfdeaa709d517e838921f391cc1258df321411de86f6d08081e034219b475ac3e52ab817cdab48b4eb9d", // required for sending events
    });

    KEEN_UUID_KEY = "keen-uuid"