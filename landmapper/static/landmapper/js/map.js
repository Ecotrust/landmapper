app.init = function () {

    //to turn basemap indicator off (hide the plus sign)
    //see email from Matt on 7/26 2:24pm with list of controls
    var map = new OpenLayers.Map(null, {
        //allOverlays: true,
        displayProjection: new OpenLayers.Projection("EPSG:4326"),
        projection: "EPSG:3857"
    });

    map.addControl(new P97.Controls.LayerLoadProgress({
        map: map,
        element: null,
        onStartLoading: function() {
            this.element.show();
        },
        onLoading: function(num, max, percentStr) {
            this.element.text(percentStr);
        },
        onFinishLoading: function() {
            this.element.hide();
        }
    }));

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

    map.addLayers([openStreetMap, googleStreet, googleTerrain, googleSatellite, googleHybrid]);

    map.addControl(new SimpleLayerSwitcher());

    //Scale Bar
    var scalebar = new OpenLayers.Control.ScaleBar( {
        displaySystem: "english",
        minWidth: 100, //default
        maxWidth: 150, //default
        divisions: 2, //default
        subdivisions: 2, //default
        showMinorMeasures: false //default
    });

    map.addControl(scalebar);

    //enables zooming to a given extent on the map by holding down shift key while dragging the mouse
    map.zoomBox = new OpenLayers.Control.ZoomBox({});

    map.addControl(map.zoomBox);

    map.events.register("moveend", null, function () {
        // update the url when we move
        app.updateUrl();
    });

    app.map = map;
    app.map.attributes = [];
    app.map.clickOutput = { time: 0, attributes: {} };

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
            var lonlat = map.getLonLatFromPixel(e.xy);
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
    map.addControl(app.map.UTFControl);

    app.map.utfGridClickHandling = function(infoLookup, lonlat, xy) {
        var clickAttributes = {};

        for (var idx in infoLookup) {
            $.each(app.viewModel.visibleLayers(), function (layer_index, potential_layer) {
              if (potential_layer.type !== 'Vector') {
                var new_attributes,
                    info = infoLookup[idx];
                //debugger;
                if (info && info.data) {
                    var newmsg = '',
                        hasAllAttributes = true,
                        parentHasAllAttributes = false;
                    // if info.data has all the attributes we're looking for
                    // we'll accept this layer as the attribution layer
                    //if ( ! potential_layer.attributes.length ) {
                    if (potential_layer.attributes.length) {
                        hasAllAttributes = true;
                    } else {
                        hasAllAttributes = false;
                    }
                    //}
                    $.each(potential_layer.attributes, function (attr_index, attr_obj) {
                        if ( !(attr_obj.field in info.data) ) {
                            hasAllAttributes = false;
                        }
                    });
                    if ( !hasAllAttributes && potential_layer.parent) {
                        parentHasAllAttributes = true;
                        if ( ! potential_layer.parent.attributes.length ) {
                            parentHasAllAttributes = false;
                        }
                        $.each(potential_layer.parent.attributes, function (attr_index, attr_obj) {
                            if ( !(attr_obj.field in info.data) ) {
                                parentHasAllAttributes = false;
                            }
                        });
                    }
                    if (hasAllAttributes) {
                        new_attributes = potential_layer.attributes;
                    } else if (parentHasAllAttributes) {
                        new_attributes = potential_layer.parent.attributes;
                    }

                    if (new_attributes) {
                        var attribute_objs = [];
                        $.each(new_attributes, function(index, obj) {
                            if ( potential_layer.compress_attributes ) {
                                var display = obj.display + ': ' + info.data[obj.field];
                                attribute_objs.push({'display': display, 'data': ''});
                            } else {
                                /*** SPECIAL CASE FOR ENDANGERED WHALE DATA ***/
                                var value = info.data[obj.field];
                                if (value === 999999) {
                                    attribute_objs.push({'display': obj.display, 'data': 'No Survey Effort'});
                                } else {
                                    try {
                                        //set the precision and add any necessary commas
                                        value = value.toFixed(obj.precision).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                    }
                                    catch (e) {
                                        //keep on keeping on
                                    }
                                    attribute_objs.push({'display': obj.display, 'data': value});
                                }
                            }
                        });
                        var title = potential_layer.featureAttributionName,
                            text = attribute_objs;
                        clickAttributes[title] = text;
                        //app.viewModel.aggregatedAttributes(app.map.clickOutput.attributes);
                    }
                }
              }
            });

            $.extend(app.map.clickOutput.attributes, clickAttributes);
            app.viewModel.aggregatedAttributes(app.map.clickOutput.attributes);

        }
        app.viewModel.updateMarker(lonlat);
        //app.marker.display(true);

    }; //end utfGridClickHandling

    app.map.events.register(layerModel && "featureclick", null, function(e, test) {
        var layer = e.feature.layer.layerModel || e.feature.layer.scenarioModel;
        if (layer) {
            var text = [],
                title = layer.featureAttributionName;

            if ( layer.scenarioAttributes && layer.scenarioAttributes.length ) {
                var attrs = layer.scenarioAttributes;
                for (var i=0; i<attrs.length; i++) {
                    text.push({'display': attrs[i].title, 'data': attrs[i].data});
                }
            } else if ( layer.attributes.length ) {
                var attrs = layer.attributes;

                for (var i=0; i<attrs.length; i++) {
                    if ( e.feature.data[attrs[i].field] ) {
                        text.push({'display': attrs[i].display, 'data': e.feature.data[attrs[i].field]});
                    }
                }
            }

            // the following delay prevents the #map click-event-attributes-clearing from taking place after this has occurred
            setTimeout( function() {
                if (text.length) {
                    app.map.clickOutput.attributes[layer.featureAttributionName] = text;
                    app.viewModel.aggregatedAttributes(app.map.clickOutput.attributes);
                    app.viewModel.updateMarker(app.map.getLonLatFromViewPortPx(e.event.xy));
                }
                // if (app.marker) {
                    // app.marker.display(true);
                // }
            }, 100);

        }

    });//end featureclick event registration

    //mouseover events
    app.map.events.register("featureover", null, function(e, test) {
        var feature = e.feature,
            layerModel = e.feature.layer.layerModel;

        if (layerModel && layerModel.attributeEvent === 'mouseover') {
                if (app.map.popups.length) {

                    if ( feature.layer.getZIndex() >= app.map.currentPopupFeature.layer.getZIndex() ) {
                        app.map.currentPopupFeature.popup.hide();
                        app.map.createPopup(feature);
                        app.map.currentPopupFeature = feature;
                    } else {
                        app.map.createPopup(feature);
                        feature.popup.hide();
                    }

                } else {
                    app.map.createPopup(feature);
                    app.map.currentPopupFeature = feature;
                }
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


    //mouseout events
    app.map.events.register("featureout", null, function(e, test) {
        var feature = e.feature,
            layerModel = e.feature.layer.layerModel;

        if (layerModel && layerModel.attributeEvent === 'mouseover') {
            //app.map.destroyPopup(feature);
            app.map.removePopup(feature.popup);
            if (app.map.popups.length && !app.map.anyVisiblePopups()) {
                var hiddenPopup = app.map.popups[app.map.popups.length-1];
                hiddenPopup.show();
                app.map.currentPopupFeature = hiddenPopup.feature;
            }
        }

    });

    app.map.createPopup = function(feature) {
        var mouseoverAttribute = feature.layer.layerModel.mouseoverAttribute,
            attributeValue = mouseoverAttribute ? feature.attributes[mouseoverAttribute] : feature.layer.layerModel.name,
            location = feature.geometry.getBounds().getCenterLonLat();

        if ( ! app.map.getExtent().containsLonLat(location) ) {
            location = app.map.center;
        }
        var popup = new OpenLayers.Popup.FramedCloud(
            "",
            location,
            new OpenLayers.Size(100,100),
            "<div>" + attributeValue + "</div>",
            null,
            false,
            null
        );
        popup.feature = feature;
        feature.popup = popup;
        app.map.addPopup(popup);
    };

    app.map.anyVisiblePopups = function() {
        for (var i=0; i<app.map.popups.length; i+=1) {
            if (app.map.popups[0].visible()) {
                return true;
            }
        }
        return false;
    };

    // app.map.destroyPopup = function(feature) {
    //     // remove tooltip
    //     app.map.removePopup(feature.popup);
    //     //feature.popup.destroy();
    //     //feature.popup=null;
    // }

    app.markers = new OpenLayers.Layer.Markers( "Markers" );
    var size = new OpenLayers.Size(16,25);
    var offset = new OpenLayers.Pixel(-(size.w/2), -size.h);
    app.markers.icon = new OpenLayers.Icon('/static/visualize/img/red-pin.png', size, offset);
    app.map.addLayer(app.markers);


    //no longer needed?
    //replaced with #map mouseup and move events in app.js?
    //place the marker on click events
    app.map.events.register("click", app.map , function(e){
        //app.viewModel.updateMarker(app.map.getLonLatFromViewPortPx(e.xy));
        //the following is in place to prevent flash of marker appearing on what is essentially no feature click
        //display is set to true in the featureclick and utfgridclick handlers (when there is actually a hit)
        //app.marker.display(false);

        //the following ensures that the location of the marker is not displaced while waiting for web services
        app.map.clickLocation = app.map.getLonLatFromViewPortPx(e.xy);
    });

    app.map.removeLayerByName = function(layerName) {
        for (var i=0; i<app.map.layers.length; i++) {
            if (app.map.layers[i].name === layerName) {
                app.map.removeLayer(app.map.layers[i]);
                i--;
            }
        }
    };

    app.utils = {};
    app.utils.isNumber = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
    app.utils.numberWithCommas = function(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    app.utils.isInteger = function(n) {
        return app.utils.isNumber(n) && (Math.floor(n) === n);
    }
    app.utils.formatNumber = function(n) {
        var number = Number(n);
        if (app.utils.isInteger(number)) {
            var preciseNumber = number.toFixed(0);
        } else {
            var preciseNumber = number.toFixed(1);
        }
        return app.utils.numberWithCommas(preciseNumber);
    }
    app.utils.trim = function(str) {
        return str.replace(/^\s+|\s+$/g,'');
    }
    app.utils.getObjectFromList = function(list, field, value) {
        for (var i=0; i<list.length; i+=1) {
            if (list[i][field] === value) {
                return list[i];
            }
        }
        return undefined;
    }

    setTimeout( function() {
        if (app.mafmc) {
            map.removeLayer(openStreetMap);
            map.removeLayer(googleStreet);
            map.removeLayer(googleTerrain);
            map.removeLayer(googleSatellite);
        }
    }, 1000);


    app.menus = {}
    app.menus.bookmark = [
        new ContextualMenu.Item("Share Bookmark", app.viewModel.bookmarks.showSharingModal, 'fa fa-link'),
        new ContextualMenu.Divider(),
        new ContextualMenu.Item("Delete Bookmark", app.viewModel.bookmarks.removeBookmark, 'fa fa-times-circle red')
    ];

    app.menus.sharedDrawing = [
        new ContextualMenu.Item("Zoom To", app.viewModel.scenarios.zoomToDrawing, 'fa fa-search-plus'),
        new ContextualMenu.Divider(),
        new ContextualMenu.Item("Create Copy", app.viewModel.scenarios.createCopyOfDrawing, 'fa fa-copy')
    ];

    app.menus.drawing = [
        new ContextualMenu.Item("Edit", app.viewModel.scenarios.editDrawing, 'fa fa-edit'),
        new ContextualMenu.Item("Zoom To", app.viewModel.scenarios.zoomToDrawing, 'fa fa-search-plus'),
        new ContextualMenu.Divider(),
        new ContextualMenu.Item("Share…", app.viewModel.scenarios.shareDrawing, 'fa fa-share-alt'),
        new ContextualMenu.Item("Export…", app.viewModel.exportGeometry.showDialog.bind(app.viewModel.exportGeometry), 'fa fa-file-o'),
        new ContextualMenu.Divider(),
        new ContextualMenu.Item("Delete Drawing", app.viewModel.scenarios.deleteDrawing, 'fa fa-times-circle red')
    ];

    app.menus.sharedLeaseBlockCollection = [
        new ContextualMenu.Item("Zoom To", app.viewModel.scenarios.zoomToLeaseBlockCollection, 'fa fa-search-plus'),
        new ContextualMenu.Divider(),
        new ContextualMenu.Item("Create Copy", app.viewModel.scenarios.createCopyOfLeaseBlockCollection, 'fa fa-copy')
    ];

    app.menus.leaseBlockCollection = [
        new ContextualMenu.Item("Edit", app.viewModel.scenarios.editLeaseBlockCollection, 'fa fa-edit'),
        new ContextualMenu.Item("Zoom To", app.viewModel.scenarios.zoomToLeaseBlockCollection, 'fa fa-search-plus'),
        new ContextualMenu.Divider(),
        new ContextualMenu.Item("Share", app.viewModel.scenarios.shareLeaseBlockCollection, 'fa fa-share-alt'),
        new ContextualMenu.Item("Export…", app.viewModel.exportGeometry.showDialog.bind(app.viewModel.exportGeometry), 'fa fa-file-o'),
        new ContextualMenu.Divider(),
        new ContextualMenu.Item("Delete Lease Block Collection", app.viewModel.scenarios.deleteLeaseBlockCollection, 'fa fa-times-circle red')
    ];

    app.menus.sharedWindEnergySiting = [
        new ContextualMenu.Item("Zoom To", function(){console.info("sharedWindEnergySiting: Zoom To")}, 'fa fa-search-plus'),
        new ContextualMenu.Divider(),
        new ContextualMenu.Item("Create Copy", app.viewModel.scenarios.createCopyOfWindEnergySiting, 'fa fa-copy')
    ];

    app.menus.windEnergySiting = [
        new ContextualMenu.Item("Edit", app.viewModel.scenarios.editWindEnergySiting, 'fa fa-edit'),
        new ContextualMenu.Item("Zoom To", app.viewModel.scenarios.zoomToWindEnergySiting, 'fa fa-search-plus'),
        new ContextualMenu.Divider(),
        new ContextualMenu.Item("Share", app.viewModel.scenarios.shareWindEnergySiting, 'fa fa-share-alt'),
        new ContextualMenu.Item("Export…", app.viewModel.exportGeometry.showDialog.bind(app.viewModel.exportGeometry), 'fa fa-file-o'),
        new ContextualMenu.Divider(),
        new ContextualMenu.Item("Delete Wind Energy Siting", app.viewModel.scenarios.deleteWindEnergySiting, 'fa fa-times-circle red')
    ];

    $(function() {
        // manually bind up the context menu here, otherwise ko will complain
        // that we're binding the same element twice (MP's viewmodel applies
        // to the entire page
        //ContextualMenu.Init(app.menus, document.querySelector('#context-menu'))
        app.menuModel = new ContextualMenu.Model(app.menus, document.querySelector('#context-menu'));
        // fix for top nav's negative margin
        app.menuModel.setCorrectionOffset(0, 0);
        ko.applyBindings(app.menuModel, document.querySelector('#context-menu'));
    });
};

app.addLayerToMap = function(layer) {
    if (!layer.layer) {
        if (layer.utfurl || (layer.parent && layer.parent.utfurl)) {
            app.addUtfLayerToMap(layer);
        } else if (layer.type === 'Vector') {
            app.addVectorLayerToMap(layer);
        } else if (layer.type === 'ArcRest') {
            app.addArcRestLayerToMap(layer);
        } else if (layer.type === 'WMS') {
            app.addWmsLayerToMap(layer);
        } else { //if XYZ with no utfgrid
            app.addXyzLayerToMap(layer);
        }
    }
    app.map.addLayer(layer.layer);
    layer.layer.opacity = layer.opacity();
    layer.layer.setVisibility(true);
};

// add XYZ layer with no utfgrid
app.addXyzLayerToMap = function(layer) {
    var opts = { displayInLayerSwitcher: false };

    // adding layer to the map for the first time
    layer.layer = new OpenLayers.Layer.XYZ(layer.name,
        layer.url,
        $.extend({}, opts,
            {
                sphericalMercator: true,
                isBaseLayer: false //previously set automatically when allOverlays was set to true, must now be set manually
            }
        )
    );
};

app.addWmsLayerToMap = function(layer) {
    layer.layer = new OpenLayers.Layer.WMS(
        layer.name,
        layer.url,
        {
            layers: layer.wms_slug,
            transparent: "true",
            format: "image/png"
        }
    );
};

app.addArcRestLayerToMap = function(layer) {
    var identifyUrl = layer.url.replace('export', layer.arcgislayers + '/query');

    layer.arcIdentifyControl = new OpenLayers.Control.ArcGisRestIdentify(
    {
        eventListeners: {
            arcfeaturequery: function() {
                //if ( ! layer.attributesFromWebServices || layer.utfurl ) {
                if ( layer.utfurl ) { // || layer.name === 'Offshore Wind Compatibility Assessments' ) {
                    return false;
                }
            },
            //the handler for the return click data
            resultarrived : function(responseText) {
                var clickAttributes = {},
                    jsonFormat = new OpenLayers.Format.JSON(),
                    returnJSON = jsonFormat.read(responseText.text);

                //data manager opted to disable via DAI
                if (layer.disable_click) {
                    return false;
                }

                if(returnJSON['features'] && returnJSON['features'].length) {
                    var attributeObjs = [];

                    $.each(returnJSON['features'], function(index, feature) {
                        if(index == 0) {
                            var attributeList = feature['attributes'];

                            if('fields' in returnJSON) {
                                if (layer.attributes.length) {
                                    for (var i=0; i<layer.attributes.length; i+=1) {
                                        if (attributeList[layer.attributes[i].field]) {
                                            var data = attributeList[layer.attributes[i].field],
                                                field_obj = app.utils.getObjectFromList(returnJSON['fields'], 'name', layer.attributes[i].field);
                                            if (field_obj && field_obj.type === 'esriFieldTypeDate') {
                                                data = new Date(data).toDateString();
                                            } else if (app.utils.isNumber(data)) {
                                                data = app.utils.formatNumber(data);
                                            }
                                            if (data && app.utils.trim(data) !== "") {
                                                attributeObjs.push({
                                                    'display': layer.attributes[i].display,
                                                    'data': data
                                                });
                                            }
                                        }
                                    }
                                } else {
                                    $.each(returnJSON['fields'], function(fieldNdx, field) {
                                        if (field.name.indexOf('OBJECTID') === -1 && field.name.indexOf('CFR_id') === -1) {
                                            var data = attributeList[field.name]
                                            if (field.type === 'esriFieldTypeDate') {
                                                data = new Date(data).toDateString();
                                            } else if (app.utils.isNumber(data)) {
                                                data = app.utils.formatNumber(data);
                                            }
                                            if (data && app.utils.trim(data) !== "") {
                                                attributeObjs.push({
                                                    'display': field.alias,
                                                    'data': data
                                                });
                                            }
                                        }
                                    });
                                }
                            }
                            return;
                        }
                    });
                    if ( layer.name === 'Aids to Navigation' ) {
                        app.viewModel.adjustAidsToNavigationAttributes(attributeObjs);
                    }
                }

                if (attributeObjs && attributeObjs.length) {
                    clickAttributes[layer.featureAttributionName] = attributeObjs;
                    $.extend(app.map.clickOutput.attributes, clickAttributes);
                    app.viewModel.aggregatedAttributes(app.map.clickOutput.attributes);
                    //app.viewModel.updateMarker(app.map.getLonLatFromViewPortPx(responseText.xy));
                    //the following ensures that the location of the marker has not been displaced while waiting for web services
                    app.viewModel.updateMarker(app.map.clickLocation);
                }
            }
        },
        url : identifyUrl,
        layerid : layer.arcgislayers,
        sr : 3857,
        clickTolerance: 2,
        outFields: '*'
    });
    app.map.addControl(layer.arcIdentifyControl);

    layer.layer = new OpenLayers.Layer.ArcGIS93Rest(
        layer.name,
        layer.url,
        {
            layers: "show:"+layer.arcgislayers,
            srs: 'EPSG:3857',
            transparent: true
        },
        {
            isBaseLayer: false
        }
    );
};

app.addVectorLayerToMap = function(layer) {
    if (layer.annotated) { // such as the canyon labels in the mafmc project
        var styleMap = new OpenLayers.StyleMap( {
            label: "${NAME}",
            fontColor: "#333",
            fontSize: "12px",
            fillColor: layer.color,
            fillOpacity: layer.fillOpacity,
            //strokeDashStyle: "dash",
            //strokeOpacity: 1,
            strokeColor: layer.color,
            strokeOpacity: layer.defaultOpacity,
            //strokeLinecap: "square",
            //http://dev.openlayers.org/apidocs/files/OpenLayers/Feature/Vector-js.html
            //title: 'testing'
            pointRadius: layer.point_radius,
            externalGraphic: layer.graphic,
            graphicWidth: 8,
            graphicHeight: 8,
            graphicOpacity: layer.defaultOpacity
        });
    } else {
        var styleMap = new OpenLayers.StyleMap( {
            fillColor: layer.color,
            fillOpacity: layer.fillOpacity,
            //strokeDashStyle: "dash",
            //strokeOpacity: 1,
            strokeColor: layer.outline_color,
            strokeOpacity: layer.outline_opacity,
            //strokeLinecap: "square",
            //http://dev.openlayers.org/apidocs/files/OpenLayers/Feature/Vector-js.html
            //title: 'testing'
            pointRadius: layer.point_radius,
            externalGraphic: layer.graphic,
            graphicWidth: 8,
            graphicHeight: 8,
            graphicOpacity: layer.defaultOpacity
        });
    }
    if (layer.lookupField) {
        var mylookup = {};
        $.each(layer.lookupDetails, function(index, details) {
            var fillOp = 0.5;
            mylookup[details.value] = {
                strokeColor: details.color,
                strokeDashstyle: details.dashstyle,
                fill: details.fill,
                fillColor: details.color,
                fillOpacity: fillOp,
                externalGraphic: details.graphic
            };
        });
        styleMap.addUniqueValueRules("default", layer.lookupField, mylookup);
        //styleMap.addUniqueValueRules("select", layer.lookupField, mylookup);
    }
    layer.layer = new OpenLayers.Layer.Vector(
        layer.name,
        {
            projection: new OpenLayers.Projection('EPSG:3857'),
            displayInLayerSwitcher: false,
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP({
                url: layer.url,
                format: new OpenLayers.Format.GeoJSON()
            }),
            styleMap: styleMap,
            layerModel: layer,
            // set minZoom to 9 for annotated layers, set minZoom to some much smaller zoom level for non-annotated layers
            scales: layer.annotated ? [1000000, 1] : [90000000, 1],
            units: 'm'
        }
    );

};

app.addUtfLayerToMap = function(layer) {
    var opts = { displayInLayerSwitcher: false };
    layer.utfgrid = new OpenLayers.Layer.UTFGrid({
        layerModel: layer,
        url: layer.utfurl ? layer.utfurl : layer.parent.utfurl,
        sphericalMercator: true,
        //events: {fallThrough: true},
        utfgridResolution: 4, // default is 2
        displayInLayerSwitcher: false,
        useJSONP: false
    });

    app.map.addLayer(layer.utfgrid);

    if (layer.type === 'ArcRest') {
        app.addArcRestLayerToMap(layer);
    } else if (layer.type === 'XYZ') {
        //maybe just call app.addXyzLayerToMap(layer)
        app.addXyzLayerToMap(layer);
        /*
        layer.layer = new OpenLayers.Layer.XYZ(
            layer.name,
            layer.url,
            $.extend({}, opts,
                {
                    sphericalMercator: true,
                    isBaseLayer: false //previously set automatically when allOverlays was set to true, must now be set manually
                }
            )
        );
        */
    } else {
        //debugger;
    }
};

app.setLayerVisibility = function(layer, visibility) {
    // if layer is in openlayers, hide/show it
    if (layer.layer) {
        layer.layer.setVisibility(visibility);
    }
};

app.setLayerZIndex = function(layer, index) {
    layer.layer.setZIndex(index);
};


app.reCenterMap = function () {
    app.map.setCenter(new OpenLayers.LonLat(app.state.x, app.state.y).transform(
        new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913")), 10);
};
