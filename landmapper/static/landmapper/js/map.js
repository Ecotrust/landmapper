app.local_init = function () {

    openStreetMap = new OpenLayers.Layer.OSM("Open Street Map", "http://a.tile.openstreetmap.org/${z}/${x}/${y}.png", {
        sphericalMercator: true,
        isBaseLayer: true,
        textColor: "black",
        numZoomLevels: 20,
        minZoomLevel: 0,
        maxZoomLevel: 19
    });
    googleStreet = new OpenLayers.Layer.Google("Streets", {
        sphericalMercator: true,
        isBaseLayer: true,
        visibility: false,
        numZoomLevels: 18,
        MAX_ZOOM_LEVEL: 17,
        attribution: "Basemap by Google",
        textColor: "black"
    });
    googleTerrain = new OpenLayers.Layer.Google("Terrain", {
        type: google.maps.MapTypeId.TERRAIN,
        sphericalMercator: true,
        isBaseLayer: true,
        visibility: false,
        numZoomLevels: 18,
        MAX_ZOOM_LEVEL: 17,
        attribution: "Basemap by Google",
        textColor: "black"
    });
    googleSatellite = new OpenLayers.Layer.Google("Satellite", {
        type: google.maps.MapTypeId.SATELLITE,
        sphericalMercator: true,
        isBaseLayer: true,
        visibility: false,
        numZoomLevels: 18,
        MAX_ZOOM_LEVEL: 17,
        attribution: "Basemap by Google",
        textColor: "white"
    });
    googleHybrid = new OpenLayers.Layer.Google("Hybrid", {
        type: google.maps.MapTypeId.HYBRID,
        sphericalMercator: true,
        isBaseLayer: true,
        numZoomLevels: 18,
        MAX_ZOOM_LEVEL: 17,
        attribution: "Basemap by Google",
        visibility: false
    });

    app.map.layers = [];
    app.map.addLayers([googleHybrid, openStreetMap, googleStreet, googleTerrain, googleSatellite]);
    app.map.setBaseLayer(googleHybrid);

    app.map.events.remove("zoomend");

    OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {
        defaultHandlerOptions: {
            'single': true,
            'double': false,
            'pixelTolerance': 0,
            'stopSingle': false,
            'stopDouble': false
        },

        initialize: function(options) {
            this.handlerOptions = OpenLayers.Util.extend(
                {}, this.defaultHandlerOptions
            );
            OpenLayers.Control.prototype.initialize.apply(
                this, arguments
            );
            this.handler = new OpenLayers.Handler.Click(
                this, {
                    'click': this.trigger
                }, this.handlerOptions
            );
        },

        trigger: function(e) {
            var lonlat = app.map.getLonLatFromPixel(e.xy);
            $.ajax({
                dataType: "json",
                url: '/landmapper/get_taxlot_json',
                type: 'GET',
                data: {
                  'coords': [lonlat.lon, lonlat.lat]
                },
                success: function(data) {
                    var format = new OpenLayers.Format.WKT();
                    wkt = data.geometry;
                    if (wkt == []) {
                      window.alert('Taxlot info unavailable at this location - please draw instead.');
                    } else {
                      feature = format.read(wkt);
                    }
                    //Add feature to vector layer
                    app.viewModel.scenarios.drawingFormModel.polygonLayer.addFeatures([feature]);
                    app.viewModel.scenarios.drawingFormModel.hasShape(true);
                },
                error: function(error) {
                    window.alert('Error retrieving taxlot - please draw instead.');
                    console.log('error in map.js: Click Control trigger');
                }
            });
        }

    });

};
