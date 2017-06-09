(function(){
/**
LayerLoadProgress - Control that attempts to compute layer loading progress
for tiled layers. Basically, it counts the number of loading tiles in every
layer (according to OL), then produces a percentage based on the maximum number
of tiles there are (based on previous calculations).

SRH 12-Sep-2014
 */

var LayerLoadProgress = OpenLayers.Class(OpenLayers.Control, {
    CLASS_NAME: "LayerLoadProgress",
    autoActivate: true, // OL will call activate()
    element: null,
    maxTiles: 1,
    loadingStr: 'Loading … {PERCENT}',
    finishedLoadingStr: '&nbsp;',
    counterRunning: false,
    isLoading: false,
    /* Callback - notify caller that loading is in progress
       Parameters:
           cur - current number loaded
           max - maximum number to load (guessed)
           percentStr - a string that replaces {PERCENT} with the current
                        percentage loaded as an integer+% from 1%-100%, or
                        the string "waiting" if loading has started by no tiles
                        have been received yet. */
    onLoading: function(cur, max, percentStr) {},
    /* Callback - used to notify caller that loading has started */
    onStartLoading: function() {},
    /* Callback - used to notify caller that loading has finished */
    onFinishLoading: function() {},

    initialize: function(options) {
        OpenLayers.Control.prototype.initialize.apply(this, arguments);

        // TODO: This is a hack waiting for a style guide that tells us where
        // the message should go .
        if (!this.element) {
            var styles = {
                position: 'absolute',
                bottom: '10%',
                left: '50%',
                'margin-left': '-128px',
                height: '50px',
                width: '224px',
                padding: '8px',
                overflow: 'hidden',
                border: '8px solid #fff',
                'border-radius': '16px',
                'background-color': 'rgba(255,255,255, 0.75)',
                color: 'black',
                opacity: '0.75',
                'text-align': 'center',
                'z-index': 1000
            }
            this.element = $('<div id="__msg"></div>').css(styles);
            $('body').append(this.element);
        }

    },
    activate: function() {
        if (OpenLayers.Control.prototype.activate.apply(this, arguments)) {
            this.map.events.register('move', this,
                this.startCountingLoadingTiles);
            return true;
        }
        else {
            return false;
        }
    },
    deactivate: function() {
        if (OpenLayers.Control.prototype.deactivate.apply(this, arguments)) {
            this.map.events.unregister('move', this,
                this.startCountingLoadingTiles);
            return true;
        }
        else {
            return false;
        }
    },
    getNumLoadingTiles: function() {
        var sum = 0;
        for (var i = 0; i < this.map.layers.length; i++) {
            // only grid layers have 'numLoadingTiles'
            if (typeof(this.map.layers[i].numLoadingTiles) != "undefined") {
                sum += this.map.layers[i].numLoadingTiles;
            }
        }
        return sum;
    },

    startCountingLoadingTiles: function() {
        if (this.counterRunning) {
            return;
        }

        this.countLoadingTiles();
    },

    countLoadingTiles: function() {
        var percentStr = '';
        var num = this.getNumLoadingTiles();

        if (!this.isLoading && num > 0) {
            this.isLoading = true;
            this.onStartLoading();
        }


        // we auto adjust the max up (for example, when new layers are shown)
        // but don't know how to auto adjust down yet. Maybe we can ask
        // OpenLayers how many tiles there are in all the layers?
        if (num > this.maxTiles) {
            this.maxTiles = num;
        }

        var percent = (100 * (1 - num / this.maxTiles)).toFixed(0);
        if (percent == "0") {
            percent = "waiting"
        }
        else {
            percent = percent + '%';
        }

        if (num > 0) {
            this.counterRunning = setTimeout(this.countLoadingTiles.bind(this),
                                             50);
            percentStr = this.loadingStr.replace('{PERCENT}', percent);

            this.onLoading(num, this.maxTiles, percentStr);
            if (this.element) {
                this.element.html(percentStr);
            }
        }
        else {
            this.counterRunning = false;
            percentStr = 'Loaded';

            this.isLoading = false;

            this.onFinishLoading();
            if (this.element) {
                this.element.html(this.finishedLoadingStr);
            }
        }
    }
});

window['P97'] = window.P97 || {};
window['P97']['Controls'] = window.P97.Controls || {};
window['P97']['Controls']['LayerLoadProgress'] = LayerLoadProgress;

})();
