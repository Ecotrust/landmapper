app.local_init = function () {

    openStreetMap = new OpenLayers.Layer.OSM(
        "Open Street Map",
        [
          "http://a.tile.openstreetmap.org/${z}/${x}/${y}.png",
          "http://b.tile.openstreetmap.org/${z}/${x}/${y}.png",
          "http://c.tile.openstreetmap.org/${z}/${x}/${y}.png"
        ],
        {
            sphericalMercator: true,
            isBaseLayer: true,
            textColor: "black",
            numZoomLevels: 20,
            minZoomLevel: 0,
            maxZoomLevel: 19
        });

    MapBoxHybrid = new OpenLayers.Layer.XYZ(
      "Hybrid",
      [
        "http://a.tiles.mapbox.com/v4/mapbox.streets-satellite/${z}/${x}/${y}@2x.png?access_token=pk.eyJ1IjoiZWNvdHJ1c3RkZXYiLCJhIjoiY2o1aXE1dmp2MWxjZjJ3bG16MHQ1YnBlaiJ9.tnv1SK2iNlFXHN_78mx5oA",
        "http://b.tiles.mapbox.com/v4/mapbox.streets-satellite/${z}/${x}/${y}@2x.png?access_token=pk.eyJ1IjoiZWNvdHJ1c3RkZXYiLCJhIjoiY2o1aXE1dmp2MWxjZjJ3bG16MHQ1YnBlaiJ9.tnv1SK2iNlFXHN_78mx5oA",
        "http://c.tiles.mapbox.com/v4/mapbox.streets-satellite/${z}/${x}/${y}@2x.png?access_token=pk.eyJ1IjoiZWNvdHJ1c3RkZXYiLCJhIjoiY2o1aXE1dmp2MWxjZjJ3bG16MHQ1YnBlaiJ9.tnv1SK2iNlFXHN_78mx5oA",
        "http://d.tiles.mapbox.com/v4/mapbox.streets-satellite/${z}/${x}/${y}@2x.png?access_token=pk.eyJ1IjoiZWNvdHJ1c3RkZXYiLCJhIjoiY2o1aXE1dmp2MWxjZjJ3bG16MHQ1YnBlaiJ9.tnv1SK2iNlFXHN_78mx5oA"
      ], {
          attribution: "<div style='background-color:#CCC; padding: 3px 8px; margin-bottom: 2px;'>Tiles &copy; <a href='http://mapbox.com/'>MapBox</a></div>",
          sphericalMercator: true,
          wrapDateLine: true,
          numZoomLevels: 20,
      });

    MapBoxSat = new OpenLayers.Layer.XYZ(
      "Satellite",
      [
        "http://a.tiles.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}@2x.png?access_token=pk.eyJ1IjoiZWNvdHJ1c3RkZXYiLCJhIjoiY2o1aXE1dmp2MWxjZjJ3bG16MHQ1YnBlaiJ9.tnv1SK2iNlFXHN_78mx5oA",
        "http://b.tiles.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}@2x.png?access_token=pk.eyJ1IjoiZWNvdHJ1c3RkZXYiLCJhIjoiY2o1aXE1dmp2MWxjZjJ3bG16MHQ1YnBlaiJ9.tnv1SK2iNlFXHN_78mx5oA",
        "http://c.tiles.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}@2x.png?access_token=pk.eyJ1IjoiZWNvdHJ1c3RkZXYiLCJhIjoiY2o1aXE1dmp2MWxjZjJ3bG16MHQ1YnBlaiJ9.tnv1SK2iNlFXHN_78mx5oA",
        "http://d.tiles.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}@2x.png?access_token=pk.eyJ1IjoiZWNvdHJ1c3RkZXYiLCJhIjoiY2o1aXE1dmp2MWxjZjJ3bG16MHQ1YnBlaiJ9.tnv1SK2iNlFXHN_78mx5oA"
      ], {
          attribution: "<div style='background-color:#CCC; padding: 3px 8px; margin-bottom: 2px;'>Tiles &copy; <a href='http://mapbox.com/'>MapBox</a></div>",
          sphericalMercator: true,
          wrapDateLine: true,
          numZoomLevels: 20,
      });

    ESRITopo = new OpenLayers.Layer.XYZ(
      "Terrain",
      "http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}",
      {
          sphericalMercator: true,
          attribution: "<div style='background-color:#CCC; padding: 3px 8px; margin-bottom: 2px;'>Basemap by ESRI, USGS</div>"
      }
    );

    app.map.layers = [];
    app.map.addLayers([MapBoxHybrid, openStreetMap, ESRITopo, MapBoxSat]);
    app.map.setBaseLayer(MapBoxHybrid);

    //UTF Attribution
    app.map.UTFControl = new OpenLayers.Control.UTFGrid({
        //attributes: layer.attributes,
        layers: [],
        //events: {fallThrough: true},
        handlerMode: 'click',
        callback: function(infoLookup, lonlat, xy) {
            app.map.utfGridClickHandling(infoLookup, lonlat, xy);
        }
    });
    app.map.addControl(app.map.UTFControl);

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
                      if (! feature) {
                        // For some reason, we get GeoJSON back instead of WKT
                        // Clearly a bug in Madrona, but for now, just go with it.
                        format = new OpenLayers.Format.GeoJSON();
                        feature = format.read(wkt)[0];
                      }
                    }
                    //Add feature to vector layer
                    app.viewModel.scenarios.drawingFormModel.polygonLayer.addFeatures([feature]);
                    app.viewModel.scenarios.drawingFormModel.consolidatePolygonLayerFeatures();
                    app.viewModel.scenarios.drawingFormModel.hasShape(true);
                },
                error: function(error) {
                    window.alert('Error retrieving taxlot - please draw instead.');
                    console.log('error in map.js: Click Control trigger');
                }
            });
        }

    });

    app.map.addControl(
        new OpenLayers.Control.MousePosition({
            prefix: 'Lat: ',
            separator: ', Long: ',
            numDigits: 3,
            emptyString: '',
            //OL-2 likes to spit out lng THEN lat
            //lets reformat that
            formatOutput: function(lonLat) {
                var digits = parseInt(this.numDigits);
                var newHtml =
                    this.prefix +
                    lonLat.lat.toFixed(digits) +
                    this.separator +
                    lonLat.lon.toFixed(digits) +
                    this.suffix;
                return newHtml;
            },
        })
    );

    if (app.isAuthenticated) {
      app.menus.drawing = [
        new ContextualMenu.Item("Edit", app.viewModel.scenarios.editDrawing, 'fa fa-edit'),
        new ContextualMenu.Item("Zoom To", app.viewModel.scenarios.zoomToDrawing, 'fa fa-search-plus'),
        new ContextualMenu.Divider(),
        // new ContextualMenu.Item("Share…", app.viewModel.scenarios.shareDrawing, 'fa fa-share-alt'),
        new ContextualMenu.Item("Download…", app.viewModel.exportGeometry.showDialog.bind(app.viewModel.exportGeometry), 'fa fa-file-o'),
        new ContextualMenu.Divider(),
        new ContextualMenu.Item("Delete Drawing", app.viewModel.scenarios.deleteDrawing, 'fa fa-times-circle red')
      ];
    } else {
      app.menus.drawing = [
          new ContextualMenu.Item("Zoom To", app.viewModel.scenarios.zoomToDrawing, 'fa fa-search-plus'),
          new ContextualMenu.Divider(),
          new ContextualMenu.Item("Delete Drawing", app.viewModel.scenarios.deleteDrawing, 'fa fa-times-circle red')
      ];
    }

};
