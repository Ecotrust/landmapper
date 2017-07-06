settings.drawing.polygonLayer.eventListeners = {
    featureclick: function(e) {
        if (app.viewModel.propertySelection()) {
            app.viewModel.scenarios.drawingFormModel.polygonLayer.removeFeatures(e.feature);
        }
    },
    nofeatureclick: function(e) {
        if (app.viewModel.propertySelection()) {

            // Hack: For some reason 'click' event triggers after 'nofeatureclick'
            // By setting timeout of 10ms click can set app.clickLocation first.
            // RDH 7/03/2017
            setTimeout(function(e){
              var lonlat = app.clickLocation;
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
                      if (wkt == [] || wkt == "") {
                        window.alert('Taxlot info unavailable at this location - please draw instead.');
                      } else {
                        feature = format.read(wkt);
                        if (! feature) {
                          // For some reason, we get GeoJSON back instead of WKT
                          // Clearly a bug in Madrona, but for now, just go with it.
                          format = new OpenLayers.Format.GeoJSON();
                          feature = format.read(wkt)[0];
                        }
                      }
                      //Add feature to vector layer
                      app.viewModel.scenarios.drawingFormModel.polygonLayer.addFeatures([feature]);
                      app.viewModel.scenarios.drawingFormModel.hasShape(true);
                  },
                  error: function(error) {
                      window.alert('Error retrieving taxlot - please draw instead.');
                  }
              });
            }, 10, e);
        }
    },
    click: function(e) {
        var lonlat = app.map.getLonLatFromPixel({'x': e.layerX, 'y': e.layerY });
        app.clickLocation = lonlat;
    }
};
