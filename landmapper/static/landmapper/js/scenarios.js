
var madrona = {
    onShow: function(callback) { callback(); },
    setupForm: function($form) {
        //var submitted = false;

        $form.find('.btn-submit').hide();

        $form.find('label').each(function (i, label) {
            if ($(label).find('input[type="checkbox"]').length) {
                $(label).addClass('checkbox');
            }
        });

        $form.closest('.panel').on('click', '.cancel_button', function(e) {
            app.viewModel.scenarios.reset({cancel: true});
        });

        $form.closest('.panel').on('click', '.submit_button', function(e) {
            e.preventDefault();
            var name = $('#id_name').val();
            if ($.trim(name) === "") {
                $('#invalid-name-message').show();
                return false;
            }
            //submitted = true;
            if (app.isAuthenticated) {
              submitForm($form);
            } else {
              //Hacky hack but for some reason $form always points at first instance
              submitForm($('#polygon-design-form'));
            }
            $form.closest('.panel').off('click', '.submit_button');
        });

        submitForm = function($form) {
            //var $form = $(this).closest('.panel').find('form'),
            var url = $form.attr('action'),
                $bar = $form.closest('.tab-pane').find('.bar'),
                data = {},
                barTimer;

            if (app.isAuthenticated) {
                //progress bar
                barTimer = setInterval(function () {
                    var width = parseInt($bar.css('width').replace('px', ''), 10) + 5,
                        barWidth = parseInt($bar.parent().css('width').replace('px',''), 10);

                    if (width < barWidth) {
                        $bar.css('width', width + "px");
                    } else {
                        clearInterval(barTimer);
                    }
                }, 500);
            }

            $form.find('input,select,textarea').each( function(index, input) {
                var $input = $(input);
                if ($input.attr('type') === 'checkbox') {
                    if ($input.attr('checked')) {
                        data[$input.attr('name')] = 'True';
                    } else {
                        data[$input.attr('name')] = 'False';
                    }
                } else {
                    data[$input.attr('name')] = $input.val();
                }
            });

            app.viewModel.scenarios.scenarioForm(false);
            app.viewModel.scenarios.loadingMessage("Creating Design");

            if (app.isAuthenticated) {
              $.ajax( {
                  url: url,
                  data: data,
                  type: 'POST',
                  dataType: 'json',
                  success: function(result) {
                      app.viewModel.scenarios.addScenarioToMap(null, {uid: result['X-Madrona-Show']});
                      app.viewModel.scenarios.loadingMessage(false);
                      clearInterval(barTimer);
                  },
                  error: function(result) {
                      app.viewModel.scenarios.loadingMessage(null);
                      clearInterval(barTimer);
                      if (result.status === 400) {
                          $('#scenario-form').append(result.responseText);
                          app.viewModel.scenarios.scenarioForm(true);
                      } else {
                          app.viewModel.scenarios.errorMessage(result.responseText.split('\n\n')[0]);
                      }
                  }
              });
            } else {
              feat_len = app.viewModel.scenarios.drawingFormModel.polygonLayer.features.length;
              drawn_feature = app.viewModel.scenarios.drawingFormModel.polygonLayer.features[feat_len-1];
              feature_geojson = new OpenLayers.Format.GeoJSON().write(drawn_feature);
              feature_geojson_obj = JSON.parse(feature_geojson)
              feature_date = new Date();
              feature_uid = 'drawing_aoi_' + Math.floor(Date.now() / 1000);
              feature_geojson_obj.properties = {
                "uid":feature_uid,
                "user":1,
                "sharing_groups":[],
                "manipulators":"",
                "name":data.name,
                "date_created":feature_date.toDateString(),
                "date_modified":feature_date.toDateString(),
                "description":data.description
              }
              feature = {
                "type":"FeatureCollection",
                "crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::3857"}},
                "features":[ feature_geojson_obj ]
              }
              app.viewModel.scenarios.addScenarioToMap(null, {
                uid: feature_uid,
                geojson: feature
              });
              app.viewModel.scenarios.loadingMessage(false);
              clearInterval(barTimer);
            }
        };

    }
}; // end madrona init

if ( ! app.isAuthenticated ) {
  app.anonDrawings = ko.observableArray();
}
function scenarioFormModel(options) {
    var self = this;

    var initial_leaseblocks_left = app.viewModel.scenarios.leaseblockList.length || 3426;
    self.leaseblocksLeft = ko.observable(initial_leaseblocks_left);
    self.showLeaseblockSpinner = ko.observable(false);

    self.isLeaseblockLayerVisible = ko.observable(false);
    self.isLeaseblockLayerVisible.subscribe( function() {
        if ( self.isLeaseblockLayerVisible() ) {
            self.showRemainingBlocks();
        } else {
            self.hideLeaseblockLayer();
        }
    });
    //self.isLeaseblockButtonActivated = ko.observable(false);

    //not sure how best to tie the width of the show/hide leaseblocks button to the width of the form...
    //self.showLeaseblockButtonWidth = ko.observable($('#scenario-form').width());

    self.activateLeaseblockLayer = function() {
        self.isLeaseblockLayerVisible(true);
        //self.showRemainingBlocks();
    };

    self.deactivateLeaseblockLayer = function() {
        self.isLeaseblockLayerVisible(false);
        //remove from attribute list (if it's there)
        app.viewModel.removeFromAggregatedAttributes(app.viewModel.scenarios.scenarioLeaseBlocksLayerName);
        app.viewModel.updateAggregatedAttributesOverlayWidthAndScrollbar();
        //self.hideLeaseblockLayer();
    };

    self.lastChange = (new Date()).getTime();

    //Parameters
    self.windSpeedParameter = ko.observable(false);
    self.distanceToShoreParameter = ko.observable(false);
    self.depthRangeParameter = ko.observable(false);
    self.distanceToSubstationParameter = ko.observable(false);
    self.distanceToAWCParameter = ko.observable(false);
    self.distanceToShippingParameter = ko.observable(false);
    self.shipTrafficDensityParameter = ko.observable(false);
    self.uxoParameter = ko.observable(false);

    self.toggleWindSpeedWidget = function() {
        if ( self.windSpeedParameter() ) {
            self.windSpeedParameter(false);
            $('#id_input_parameter_wind_speed').removeAttr('checked');
            $('#wind_speed_widget').css('display', 'none');
        } else {
            var value = $('#id_input_avg_wind_speed')[0].value;
            $('#id_input_parameter_wind_speed').attr('checked', 'checked');
            self.windSpeedParameter(true);
            self.change_wind_message(value);
            $('#wind_speed_widget').css('display', 'block');
        }
        //Update Remaining Leaseblocks
        self.updateFiltersAndLeaseBlocks();
        self.updateRemainingBlocks();
    };

    self.toggleDistanceToShoreWidget = function() {
        if ( self.distanceToShoreParameter() ) {
            self.distanceToShoreParameter(false);
            $('#id_input_parameter_distance_to_shore').removeAttr('checked');
            $('#distance_to_shore_widget').css('display', 'none');
        } else {
            var minValue = $('#id_input_min_distance_to_shore')[0].value,
                maxValue = $('#id_input_max_distance_to_shore')[0].value;
            $('#id_input_parameter_distance_to_shore').attr('checked', 'checked');
            self.distanceToShoreParameter(true);
            $('#distance_to_shore_widget').css('display', 'block');
        }
        //Update Remaining Leaseblocks
        self.updateFiltersAndLeaseBlocks();
        self.updateRemainingBlocks();
    };

    self.toggleDepthWidget = function() {
        if ( self.depthRangeParameter() ) {
            self.depthRangeParameter(false);
            $('#id_input_parameter_depth').removeAttr('checked');
            $('#depth_widget').css('display', 'none');
        } else {
            var minValue = $('#id_input_min_depth')[0].value,
                maxValue = $('#id_input_max_depth')[0].value;
            $('#id_input_parameter_depth').attr('checked', 'checked');
            self.depthRangeParameter(true);
            $('#depth_widget').css('display', 'block');
        }
        //Update Remaining Leaseblocks
        self.updateFiltersAndLeaseBlocks();
        self.updateRemainingBlocks();
    };

    self.toggleSubstationWidget = function() {
        if ( self.distanceToSubstationParameter() ) {
            $('#id_input_parameter_distance_to_substation').removeAttr('checked');
            self.distanceToSubstationParameter(false);
            $('#distance_to_substation_widget').css('display', 'none');
        } else {
            var value = $('#id_input_distance_to_substation')[0].value;
            $('#id_input_parameter_distance_to_substation').attr('checked', 'checked');
            self.distanceToSubstationParameter(true);
            $('#distance_to_substation_widget').css('display', 'block');
        }
        //Update Remaining Leaseblocks
        self.updateFiltersAndLeaseBlocks();
        self.updateRemainingBlocks();
    };

    self.toggleAWCWidget = function() {
        if ( self.distanceToAWCParameter() ) {
            $('#id_input_parameter_distance_to_awc').removeAttr('checked');
            self.distanceToAWCParameter(false);
            $('#distance_to_awc_widget').css('display', 'none');
        } else {
            var value = $('#id_input_distance_to_awc')[0].value;
            $('#id_input_parameter_distance_to_awc').attr('checked', 'checked');
            self.distanceToAWCParameter(true);
            $('#distance_to_awc_widget').css('display', 'block');
        }
        //Update Remaining Leaseblocks
        self.updateFiltersAndLeaseBlocks();
        self.updateRemainingBlocks();
    };

    self.toggleShippingLanesWidget = function() {
        if ( self.distanceToShippingParameter() ) {
            $('#id_input_filter_distance_to_shipping').removeAttr('checked');
            self.distanceToShippingParameter(false);
            $('#distance_to_shipping_widget').css('display', 'none');
        } else {
            var value = $('#id_input_distance_to_shipping')[0].value;
            $('#id_input_filter_distance_to_shipping').attr('checked', 'checked');
            self.distanceToShippingParameter(true);
            $('#distance_to_shipping_widget').css('display', 'block');
        }
        //Update Remaining Leaseblocks
        self.updateFiltersAndLeaseBlocks();
        self.updateRemainingBlocks();
    };

    self.toggleShipTrafficWidget = function() {
        if ( self.shipTrafficDensityParameter() ) {
            self.shipTrafficDensityParameter(false);
            $('#id_input_filter_ais_density').removeAttr('checked');
        } else {
            var value = 1;
            self.shipTrafficDensityParameter(true);
            $('#id_input_filter_ais_density').attr('checked', 'checked');
        }
        //Update Remaining Leaseblocks
        self.updateFiltersAndLeaseBlocks();
        self.updateRemainingBlocks();
    };

    self.toggleUXOWidget = function() {
        if ( self.uxoParameter() ) {
            self.uxoParameter(false);
            $('#id_input_filter_uxo').removeAttr('checked');
        } else {
            self.uxoParameter(true);
            $('#id_input_filter_uxo').attr('checked', 'checked');
        }
        //Update Remaining Leaseblocks
        self.updateFiltersAndLeaseBlocks();
        self.updateRemainingBlocks();
    };

    self.change_wind_message = function(value) {
        var $text = $('#wind_speed_text'),
            $label = $text.closest('.label');
            $label.css('color', 'black');
        if (value < 7.0) {
            $text.html('Fair');
            $label.css('background', "#377EB8");
        } else if (value < 7.25) {
            $text.html('Good');
            $label.css('background', "#377EB8");
        } else if (value < 7.5) {
            $text.html('Good');
            $label.css('background', "#377EB8");
        } else if (value < 7.75) {
            $text.html('Excellent');
            $label.css('background', "#40B3A7");
        } else if (value < 8.0) {
            $text.html('Excellent');
            $label.css('background', "#45B06C");
        } else if (value < 8.25) {
            $text.html('Outstanding');
            $label.css('background', "#84D439");
        } else if (value < 8.5) {
            $text.html('Outstanding');
            $label.css('background', "#CCED26");
        } else if (value < 8.75) {
            $text.html('Outstanding');
            $label.css('background', "#FFFF12");
        } else if (value < 9.0) {
            $text.html('Superb');
            $label.css('background', "#FFE712");
        } else if (value < 9.25) {
            $text.html('Superb');
            $label.css('background', "#FCA326");
        } else if (value < 9.5) {
            $text.html('Superb');
            $label.css('background', "#F07224");
        } else {
            $text.html('Superb');
            $label.css('background', "#E35539");
        }
        //Poor       < 12.5      (< 5.6)     ffff00
        //Fair       14.3-15.7   (6.4-7.0)   ff0000
        //Good       15.7-16.8   (7.0-7.5)   ff0077
        //Excellent  16.8-17.9   (7.5-8.0)   ff00ff
        //Oustanding 17.9-19.7   (8.0-8.8)   7700ff
        //Superb     > 19.7      (> 8.8)     0000ff
    }

    self.filters = {};

    self.updateFilters = function(object) {
        self.filters[object.key] = object.value;
        //self.isLeaseblockButtonActivated(true);
    };
    self.removeFilter = function(key) {
        delete self.filters[key];
        //if ( $.isEmptyObject(self.filters) ) {
        //    self.isLeaseblockButtonActivated(false);
        //}
    };

    self.updateFiltersAndLeaseBlocks = function() {
        if ( self.depthRangeParameter() ) {
            self.updateFilters({'key': 'min_depth', 'value': $('#id_input_min_depth')[0].value});
            self.updateFilters({'key': 'max_depth', 'value': $('#id_input_max_depth')[0].value});
        } else {
            self.removeFilter('min_depth');
            self.removeFilter('max_depth');
        }
        if ( self.windSpeedParameter() ) {
            self.updateFilters({'key': 'wind', 'value': $('#id_input_avg_wind_speed')[0].value});
        } else {
            self.removeFilter('wind');
        }
        if ( self.distanceToShoreParameter() ) {
            self.updateFilters({'key': 'min_distance', 'value': $('#id_input_min_distance_to_shore')[0].value});
            self.updateFilters({'key': 'max_distance', 'value': $('#id_input_max_distance_to_shore')[0].value});
        } else {
            self.removeFilter('min_distance');
            self.removeFilter('max_distance');
        }
        if ( self.distanceToSubstationParameter() ) {
            self.updateFilters({'key': 'substation', 'value': $('#id_input_distance_to_substation')[0].value});
        } else {
            self.removeFilter('substation');
        }
        if ( self.distanceToAWCParameter() ) {
            self.updateFilters({'key': 'awc', 'value': $('#id_input_distance_to_awc')[0].value});
        } else {
            self.removeFilter('awc');
        }
        if ( self.distanceToShippingParameter() ) {
            self.updateFilters({'key': 'tsz', 'value': $('#id_input_distance_to_shipping')[0].value});
        } else {
            self.removeFilter('tsz');
        }
        if ( self.shipTrafficDensityParameter() ) {
            self.updateFilters({'key': 'ais', 'value': 1});
        } else {
            self.removeFilter('ais');
        }
        if ( self.uxoParameter() ) {
            self.updateFilters({'key': 'uxo', 'value': 1});
        } else {
            self.removeFilter('uxo');
        }
        self.updateLeaseblocksLeft();

    };

    self.updateLeaseblocksLeft = function() {
        //self.leaseblocksLeft(23);
        var list = app.viewModel.scenarios.leaseblockList,
            count = 0;

        for ( var i=0; i<list.length; i++ ) {
            var addOne = true;
            if (self.filters['wind'] && list[i].min_wind_speed < self.filters['wind'] ) {
                addOne = false;
            }
            if (self.filters['max_distance'] && list[i].avg_distance > self.filters['max_distance'] ||
                self.filters['min_distance'] && list[i].avg_distance < self.filters['min_distance'] ) {
                addOne = false;
            }
            if (self.filters['max_depth'] && list[i].avg_depth > self.filters['max_depth'] ||
                self.filters['min_depth'] && list[i].avg_depth < self.filters['min_depth'] ) {
                addOne = false;
            }
            if (self.filters['substation'] &&
                (list[i].substation_min_distance > self.filters['substation'] || list[i].substation_min_distance === null) ) {
                addOne = false;
            }
            if (self.filters['awc'] && list[i].awc_min_distance > self.filters['awc'] ||
                list[i].awc_min_distance === null ) {
                addOne = false;
            }
            if (self.filters['tsz'] && list[i].tsz_min_distance < self.filters['tsz'] ) {
                addOne = false;
            }
            if (self.filters['ais'] && list[i].ais_mean_density > 1 ) {
                addOne = false;
            }
            if (self.filters['uxo'] && list[i].uxo !== 0 ) {
                addOne = false;
            }
            if (addOne) {
                count += 1;
            }
        }
        self.leaseblocksLeft(count);
        //self.showRemainingBlocks();
    };

    self.updateRemainingBlocks = function() {
        self.lastChange = (new Date()).getTime();
        setTimeout(function() {
            var newTime = (new Date()).getTime();
            if ( newTime - self.lastChange > 100 ) {
                self.showRemainingBlocks();
            }
        }, 200);
    };

    self.showRemainingBlocks = function() {
        if ( self.isLeaseblockLayerVisible() ) {
            self.showLeaseblockSpinner(true);
            if ( ! app.viewModel.scenarios.leaseblockLayer()) {
                app.viewModel.scenarios.loadLeaseblockLayer();
            }
            var blockLayer = app.viewModel.scenarios.leaseblockLayer();
            var filter = new OpenLayers.Filter.Logical({
                type: OpenLayers.Filter.Logical.AND,
                filters: []
            });
            if ( self.windSpeedParameter() ) {
                filter.filters.push(
                    new OpenLayers.Filter.Comparison({ // if WINDREV_MI >= self.filters['wind']
                        type: OpenLayers.Filter.Comparison.GREATER_THAN_OR_EQUAL_TO,
                        property: "WINDREV_MI",
                        value: self.filters['wind']
                    })
                );
            }
            if ( self.distanceToShoreParameter() ) {
                filter.filters.push(
                    new OpenLayers.Filter.Comparison({ // if MI_MAX >= self.filters['min_distance']
                        type: OpenLayers.Filter.Comparison.GREATER_THAN_OR_EQUAL_TO,
                        property: "MI_MEAN",
                        value: self.filters['min_distance']
                    }),
                    new OpenLayers.Filter.Comparison({ // if MI_MAX <= self.filters['max_distance']
                        type: OpenLayers.Filter.Comparison.LESS_THAN_OR_EQUAL_TO,
                        property: "MI_MEAN",
                        value: self.filters['max_distance']
                    })
                );
            }
            if ( self.depthRangeParameter() ) {
                filter.filters.push(
                    new OpenLayers.Filter.Comparison({ // if DEPTHM_MAX >= self.filters['min_distance']
                        type: OpenLayers.Filter.Comparison.LESS_THAN_OR_EQUAL_TO,
                        property: "DEPTH_MEAN",
                        value: (-self.filters['min_depth'])
                    }),
                    new OpenLayers.Filter.Comparison({ // if DEPTHM_MIN <= self.filters['max_distance']
                        type: OpenLayers.Filter.Comparison.GREATER_THAN_OR_EQUAL_TO,
                        property: "DEPTH_MEAN",
                        value: (-self.filters['max_depth'])
                    })
                );
            }
            if ( self.distanceToSubstationParameter() ) {
                filter.filters.push(
                    new OpenLayers.Filter.Comparison({ // if SUBSTAMIN <= self.filters['substation']
                        type: OpenLayers.Filter.Comparison.LESS_THAN_OR_EQUAL_TO,
                        property: "SUBSTAMIN",
                        value: self.filters['substation']
                    }),
                    new OpenLayers.Filter.Comparison({ // if SUBSTAMIN <= self.filters['substation']
                        type: OpenLayers.Filter.Comparison.NOT_EQUAL_TO,
                        property: "SUBSTAMIN",
                        value: 0
                    })
                );
            }
            if ( self.distanceToAWCParameter() ) {
                filter.filters.push(
                    new OpenLayers.Filter.Comparison({ // if AWCMI_MIN <= self.filters['awc']
                        type: OpenLayers.Filter.Comparison.LESS_THAN_OR_EQUAL_TO,
                        property: "AWCMI_MIN",
                        value: self.filters['awc']
                    })
                );
            }
            if ( self.distanceToShippingParameter() ) {
                filter.filters.push(
                    new OpenLayers.Filter.Comparison({ // if TRSEP_MIN >= self.filters['tsz']
                        type: OpenLayers.Filter.Comparison.GREATER_THAN_OR_EQUAL_TO,
                        property: "TRAFFCMIN",
                        value: self.filters['tsz']
                    })
                );
            }
            if ( self.shipTrafficDensityParameter() ) {
                filter.filters.push(
                    new OpenLayers.Filter.Comparison({ // if AIS7_MEAN <= 1
                        type: OpenLayers.Filter.Comparison.LESS_THAN_OR_EQUAL_TO,
                        property: "ALLVES_MAJ",
                        value: "1"
                    })
                );
            }
            if ( self.uxoParameter() ) {
                filter.filters.push(
                    new OpenLayers.Filter.Comparison({ // if UXO == 0
                        type: OpenLayers.Filter.Comparison.EQUAL_TO,
                        property: "UXO",
                        value: 0
                    })
                );
            }
            blockLayer.styleMap.styles['default'].rules[0] = new OpenLayers.Rule({
                filter: filter,
                symbolizer: { strokeColor: '#fff' }
            });

            self.showLeaseblockLayer(blockLayer);
        }

    };

    self.showLeaseblockLayer = function(layer) {
        if ( ! app.map.getLayersByName(app.viewModel.scenarios.leaseblockLayer().name).length ) {
            app.map.addLayer(app.viewModel.scenarios.leaseblockLayer());
        }
        //layer.layerModel.setVisible();
        layer.setVisibility(true);
        app.viewModel.updateAttributeLayers();
        //layer.refresh();
        layer.redraw();
    }

    self.hideLeaseblockLayer = function() {
        app.viewModel.scenarios.leaseblockLayer().setVisibility(false);
        //if ( app.map.getLayersByName(app.viewModel.scenarios.leaseblockLayer().name).length ) {
        //    app.map.removeLayer(app.viewModel.scenarios.leaseblockLayer());
        //}
        //remove the key/value pair from aggregatedAttributes
        app.viewModel.removeFromAggregatedAttributes(app.viewModel.scenarios.leaseblockLayer().name);
        app.viewModel.updateAttributeLayers();
    }

    self.windSpeedLayer = app.viewModel.getLayerById(7);
    self.toggleWindSpeedLayer = function(formModel, event) {
        if ( self.windSpeedLayer.active() ) {
            self.windSpeedLayer.deactivateLayer();
        } else {
            self.windSpeedLayer.activateLayer();
        }
        return true;
    };
    self.toggleWindSpeedDescription = function(formModel) {
        if ( self.windSpeedLayer.infoActive() ) {
            self.windSpeedLayer.hideDescription(self.windSpeedLayer);
        } else {
            self.windSpeedLayer.showDescription(self.windSpeedLayer);
        }
        return true;
    };

    self.awcLayer = app.viewModel.getLayerById(65);
    self.toggleAWCLayer = function(formModel, event) {
        if ( self.awcLayer.active() ) {
            self.awcLayer.deactivateLayer();
        } else {
            self.awcLayer.activateLayer();
        }
        return true;
    };
    self.toggleAWCDescription = function(formModel) {
        if ( self.awcLayer.infoActive() ) {
            self.awcLayer.hideDescription(self.awcLayer);
        } else {
            self.awcLayer.showDescription(self.awcLayer);
        }
        return true;
    };

    self.depthZonesLayer = app.viewModel.getLayerById(96);
    self.toggleDepthZonesLayer = function(formModel, event) {
        if ( self.depthZonesLayer.active() ) {
            self.depthZonesLayer.deactivateLayer();
        } else {
            self.depthZonesLayer.activateLayer();
        }
        return true;
    };
    self.toggleDepthZonesDescription = function(formModel) {
        if ( self.depthZonesLayer.infoActive() ) {
            self.depthZonesLayer.hideDescription(self.depthZonesLayer);
        } else {
            self.depthZonesLayer.showDescription(self.depthZonesLayer);
        }
        return true;
    };

    self.shippingLanesLayer = app.viewModel.getLayerById(64); // original shipping lanes layer (geojson)
    //self.shippingLanesLayer = app.viewModel.getLayerById(103); // mmc (wms) shipping lanes layer
    self.toggleShippingLanesLayer = function(formModel, event) {
        if ( self.shippingLanesLayer.active() ) {
            self.shippingLanesLayer.deactivateLayer();
        } else {
            self.shippingLanesLayer.activateLayer();
        }
        return true;
    };
    self.toggleShippingLanesDescription = function(formModel) {
        if ( self.shippingLanesLayer.infoActive() ) {
            self.shippingLanesLayer.hideDescription(self.shippingLanesLayer);
        } else {
            self.shippingLanesLayer.showDescription(self.shippingLanesLayer);
        }
        return true;
    };

    return self;
} // end scenarioFormModel

function selectionModel(options) {
    var self = this;

    self.name = 'Selected Lease Blocks';

    var ret = scenarioModel.apply(this, arguments);

    self.isSelectionModel = true;

    self.edit = function() {
        var selection = this;
        app.viewModel.scenarios.zoomToScenario(selection);
        return $.ajax({
            url: '/features/leaseblockselection/' + selection.uid + '/form/',
            success: function(data) {
                app.viewModel.scenarios.selectionForm(true);
                $('#selection-form').html(data);
                if ($.browser.msie && $.browser.version < 9) {
                    app.viewModel.scenarios.selectionFormModel = new IESelectionFormModel();
                } else {
                    app.viewModel.scenarios.selectionFormModel = new selectionFormModel();
                }
                ko.applyBindings(app.viewModel.scenarios.selectionFormModel, document.getElementById('selection-form'));
                //particular for paintbrush selection form
                app.viewModel.scenarios.selectionFormModel.edit = true;
                app.viewModel.scenarios.selectionFormModel.selection = selection;
                app.viewModel.scenarios.selectionFormModel.selectedLeaseBlocks($('#id_leaseblock_ids').val().split(','));
                //particular for IE selection form, another ajax call to retrieve the leaseblocks
                //app.viewModel.scenarios.selectionFormModel.selectedLeaseBlocks($('#id_leaseblock_ids').val().split(','));
                //app.viewModel.scenarios.scenarioFormModel.updateFiltersAndLeaseBlocks();
            },
            error: function (result) {
                //debugger;
            }
        });
    };

    self.createCopy = function() {
        var selection = this;

        //create a copy of this shape to be owned by the user
        $.ajax({
            url: '/scenario/copy_design/' + selection.uid + '/',
            type: 'POST',
            dataType: 'json',
            success: function(data) {
                //app.viewModel.scenarios.loadSelectionsFromServer();
                app.viewModel.scenarios.addScenarioToMap(null, {uid: data[0].uid});
            },
            error: function (result) {
                //debugger;
            }
        })
    };

    self.deleteScenario = function() {
        var selection = this;

        //first deactivate the layer
        selection.deactivateLayer();

        //remove from activeLayers
        app.viewModel.activeLayers.remove(selection);
        //remove from app.map
        if (selection.layer) {
            app.map.removeLayer(selection.layer);
        }
        //remove from selectionList
        app.viewModel.scenarios.selectionList.remove(selection);

        if (app.isAuthenticated){
            //remove from server-side db (this should provide error message to the user on fail)
            $.ajax({
                url: '/scenario/delete_design/' + selection.uid + '/',
                type: 'POST',
                error: function (result) {
                    //debugger;
                }
            })
        }
    };

    // identical to drawingModel functions
    self.shapefileDownloadLink = function() {
        var url = "/scenario/export/shp/" + self.id + ".zip";
        return url;
    }
    self.geojsonDownloadLink = function() {
        var url = "/scenario/export/geojson/" + self.id + ".geojson";
        return url;
    }
    self.wktDownloadLink = function() {
        var url = "/scenario/export/wkt/" + self.id + "-wkt.txt";
        return url;
    }
    self.kmlDownloadLink = function() {
        var url = "/scenario/export/kml/" + self.id + ".kml";
        return url;
    }

    return ret;
} // end selectionModel

function selectionFormModel(options) {
    var self = this;

    self.IE = false;

    self.leaseBlockLayer = app.viewModel.getLayerById(6);
    if (self.leaseBlockLayer.active()) {
        self.leaseBlockLayerWasActive = true;
        if ( !self.leaseBlockLayer.visible() ) {
            self.leaseBlockLayer.setVisible();
        }
    } else {
        self.leaseBlockLayer.activateLayer();
    }


    self.leaseBlockSelectionLayer = new layerModel({
        name: 'Selectable OCS Lease Blocks Layer',
        type: 'Vector',
        url: '/static/data_manager/geojson/OCSBlocks20130920.json',
        opacity: .5
    });

    self.leaseBlockSelectionLayerIsLoaded = false;

    self.selectingLeaseBlocks = ko.observable(false);

    self.selectedLeaseBlocksLayerName = 'Selected Lease Blocks';

    self.selectedLeaseBlocks = ko.observableArray();

    self.loadLeaseBlockSelectionLayer = function() {
        var defaultStyle = new OpenLayers.Style({
            //display: 'none'
            fillOpacity: 0,
            strokeColor: '#000',
            strokeOpacity: 0
        });
        var selectStyle = new OpenLayers.Style({
            strokeColor: '#00467F',
            strokeOpacity: .8
        });
        var styleMap = new OpenLayers.StyleMap( {
            'default': defaultStyle,
            'select': selectStyle
        });

        self.leaseBlockSelectionLayer.layer = new OpenLayers.Layer.Vector(
            self.leaseBlockSelectionLayer.name,
            {
                projection: new OpenLayers.Projection('EPSG:3857'),
                displayInLayerSwitcher: false,
                strategies: [new OpenLayers.Strategy.Fixed()],
                protocol: new OpenLayers.Protocol.HTTP({
                    url: self.leaseBlockSelectionLayer.url,
                    format: new OpenLayers.Format.GeoJSON()
                }),
                styleMap: styleMap,
                layerModel: self.leaseBlockSelectionLayer
            }
        );
        app.map.addLayer(self.leaseBlockSelectionLayer.layer);


        /* PAINTBRUSH CONTROLS*/

        self.leaseBlockSelectionLayerBrushControl = new OpenLayers.Control.SelectFeature(
            self.leaseBlockSelectionLayer.layer, {
                multiple: true,
                hover: true,
                callbacks: {
                    out: function(event){}
                }
            }
        );
        app.map.addControl(self.leaseBlockSelectionLayerBrushControl);

        self.leaseBlockSelectionLayerClickControl = new OpenLayers.Control.SelectFeature(
            self.leaseBlockSelectionLayer.layer, {
                multiple: true,
                toggle: true,
            }
        );
        app.map.addControl(self.leaseBlockSelectionLayerClickControl);

        self.navigationControl = app.map.getControlsByClass('OpenLayers.Control.Navigation')[0];

        $('#map').mousedown( function() {
            if (self.selectingLeaseBlocks()) {
                //self.navigationControl.deactivate();
                self.leaseBlockSelectionLayerClickControl.deactivate();
                self.leaseBlockSelectionLayerBrushControl.activate();
            }
        });

        $('#map').mouseup( function() {
            if (self.selectingLeaseBlocks()) {
                //self.navigationControl.activate();
                self.leaseBlockSelectionLayerClickControl.activate();
                self.leaseBlockSelectionLayerBrushControl.deactivate();
            }
        });

        /* END PAINTBRUSH CONTROLS */

        self.leaseBlockSelectionLayerIsLoaded = true;
    }

    self.toggleSelectionProcess = function() {
        if ( ! self.selectingLeaseBlocks() ) { // if not currently in the selection process, enable selection process
            self.enableSelectionProcess();
        } else { // otherwise, disable selection process
            self.disableSelectionProcess();
        }
    };

    self.enableSelectionProcess = function() {
        // if lease block selection layer has not yet been loaded...
        if ( ! self.leaseBlockSelectionLayerIsLoaded ) {
            self.loadLeaseBlockSelectionLayer();
        } else {
            self.leaseBlockSelectionLayer.layer.setVisibility(true);
            self.selectedLeaseBlocksLayer.removeAllFeatures();
        }

        if (self.edit) {
            self.selection.deactivateLayer();
            self.leaseBlockSelectionLayer.layer.events.register("loadend", self.leaseBlockSelectionLayer.layer, function() {
                for (var i=0; i<self.leaseBlockSelectionLayer.layer.features.length; i+=1) {
                    var id = self.leaseBlockSelectionLayer.layer.features[i].data['PROT_NUMB'];
                    for (var j=0; j<self.selectedLeaseBlocks().length; j+=1) {
                        if (id === self.selectedLeaseBlocks()[j]) {
                            self.leaseBlockSelectionLayerClickControl.select(self.leaseBlockSelectionLayer.layer.features[i]);
                        }
                    }
                }
            });
        }

        self.navigationControl.deactivate();
        //activate the lease block feature selection
        self.leaseBlockSelectionLayerClickControl.activate();
        //app.addUtfLayerToMap(self.leaseBlockLayer);
        //disable feature attribution
        app.viewModel.disableFeatureAttribution();
        //change button text
        self.selectingLeaseBlocks(true);
    };

    self.disableSelectionProcess = function() {
        self.navigationControl.activate();
        //deactivate lease block feature selection
        self.leaseBlockSelectionLayerClickControl.deactivate();
        //enable feature attribution
        app.viewModel.enableFeatureAttribution();
        //change button text
        self.selectingLeaseBlocks(false);

        //re-create selectedLeaseBlocksLayer
        if ( self.selectedLeaseBlocksLayer && app.map.getLayer(self.selectedLeaseBlocksLayer.id) ) {
            app.map.removeLayer(self.selectedLeaseBlocksLayer);
        }
        self.selectedLeaseBlocksLayer = new OpenLayers.Layer.Vector(
            "Selected Lease Blocks Layer", {
                projection: new OpenLayers.Projection('EPSG:3857'),
                styleMap: new OpenLayers.StyleMap({
                    fillColor: '#00467F',
                    strokeColor: '#888888'
                })
            }
        );
        self.leaseBlockSelectionLayer.layer.setVisibility(false);
        for (var i=0; i<self.leaseBlockSelectionLayer.layer.selectedFeatures.length; i+=1) {
            self.selectedLeaseBlocksLayer.addFeatures([self.leaseBlockSelectionLayer.layer.selectedFeatures[i].clone()]);
        }
        app.map.addLayer(self.selectedLeaseBlocksLayer);

        //assign leaseblock ids to hidden leaseblock ids form field
        self.selectedLeaseBlocks([]);
        for (var i=0; i<self.selectedLeaseBlocksLayer.features.length; i++) {
            self.selectedLeaseBlocks().push(self.selectedLeaseBlocksLayer.features[i].data.PROT_NUMB);
        }
        $('#id_leaseblock_ids').val(self.selectedLeaseBlocks().join(","));

    };

    self.toggleLeaseBlockLayer = function(formModel, event) {
        if ( event.target.type === "checkbox" ) {
            if ($('#lease-blocks-layer-toggle input').is(":checked")) {
                self.leaseBlockLayer.activateLayer();
            } else {
                self.leaseBlockLayer.deactivateLayer();
            }
        }
        return true;
    };

    return self;
}; // end selectionFormModel

/* This is the "parent" class for the "Selection" model aka Lease block
collections, and the "Drawing" model aka Drawings. */
function scenarioModel(options) {
    var self = this;

    self.id = options.uid || null;
    self.uid = options.uid || null;
    self.name = options.name;
    self.featureAttributionName = self.name;
    self.description = options.description;
    self.shared = ko.observable();
    self.sharedByName = options.sharedByName || null;
    self.sharedByUsername = options.sharedByUsername;
    if (self.sharedByName && $.trim(self.sharedByName) !== '') {
        self.sharedByWho = self.sharedByName + ' (' + self.sharedByUsername + ')';
    } else {
        self.sharedByWho = self.sharedByUsername;
    }
    self.sharedBy = ko.observable();
    if (options.shared) {
        self.shared(true);
        self.sharedBy('Shared by ' + self.sharedByWho);
    } else {
        self.shared(false);
        self.sharedBy(false);
    }
    self.selectedGroups = ko.observableArray();
    self.sharedGroupsList = [];
    if (options.sharingGroups && options.sharingGroups.length) {
        self.selectedGroups(options.sharingGroups);
    }
    self.sharedWith = ko.observable();
    self.updateSharedWith = function() {
        if (self.selectedGroups().length) {
            var groupNames = "Shared with " + self.selectedGroups()[0];
            for(var i=1; i<self.selectedGroups().length; i+=1) {
                groupNames += ", " + self.selectedGroups()[i];
            }
            self.sharedWith(groupNames);
        }
    };
    self.updateSharedWith();
    self.selectedGroups.subscribe( function() {
        self.updateSharedWith();
    });
    self.temporarilySelectedGroups = ko.observableArray();

    self.attributes = [];
    self.scenarioAttributes = options.attributes ? options.attributes.attributes : [];

    self.showingLayerAttribution = ko.observable(true);
    self.toggleLayerAttribution = function() {
        var layerID = '#' + app.viewModel.convertToSlug(self.name);
        if ( self.showingLayerAttribution() ) {
            self.showingLayerAttribution(false);
            $(layerID).css('display', 'none');
        } else {
            self.showingLayerAttribution(true);
            $(layerID).css('display', 'block');
        }
        //update scrollbar
        // app.viewModel.updateAggregatedAttributesOverlayScrollbar();
    };

    //self.overview = self.description || 'no description was provided';
    self.constructInfoText = function() {
        var attrs = self.scenarioAttributes,
            output = '';
        if (self.description && self.description !== '') {
            output = self.description + '\n\n';
        }
        for (var i=0; i< attrs.length; i++) {
            output += attrs[i].title + ': ' + attrs[i].data + '\n';
        }
        return output;
    };
    self.overview = self.constructInfoText();

    self.scenarioReportValues = options.attributes ? options.attributes.report_values : [];

    self.features = options.features;

    self.active = ko.observable(false);
    self.visible = ko.observable(false);
    self.defaultOpacity = options.opacity || 0.8;
    self.opacity = ko.observable(self.defaultOpacity);
    self.type = 'Vector';

    self.opacity.subscribe( function(newOpacity) {
        if ( self.layer ) {
            self.layer.styleMap.styles['default'].defaultStyle.strokeOpacity = newOpacity;
            self.layer.styleMap.styles['default'].defaultStyle.fillOpacity = newOpacity;
            self.layer.redraw();
        } else {
            //debugger;
        }
    });

    self.toggleActive = function(self, event) {
        var scenario = this;

        // start saving restore state again and remove restore state message from map view
        app.saveStateMode = true;
        app.viewModel.error(null);
        //app.viewModel.unloadedDesigns = [];

        //app.viewModel.activeLayer(layer);
        if (scenario.active()) { // if layer is active, then deactivate
            scenario.deactivateLayer();
        } else { // otherwise layer is not currently active, so activate
            scenario.activateLayer();
            //app.viewModel.scenarios.addScenarioToMap(scenario);
        }
    };

    self.activateLayer = function() {
        var scenario = this;
        app.viewModel.scenarios.addScenarioToMap(scenario);
        if (scenario.isDrawingModel ) {

        } else if ( scenario.isSelectionModel ) {
            for (var i=0; i < app.viewModel.scenarios.activeSelections().length; i=i+1) {
                if(app.viewModel.scenarios.activeSelections()[i].id === scenario.id) {
                    app.viewModel.scenarios.activeSelections().splice(i,1);
                    i = i-1;
                }
            }
            app.viewModel.scenarios.activeSelections().push(scenario);
        }
    };

    self.deactivateLayer = function() {
        var scenario = this;

        scenario.active(false);
        scenario.visible(false);

        if ( scenario.isSelectionModel ) {
            var index = app.viewModel.scenarios.activeSelections().indexOf(scenario);
            app.viewModel.scenarios.activeSelections().splice(index, 1);
            app.viewModel.scenarios.reports.updateChart();
        }

        scenario.opacity(scenario.defaultOpacity);
        app.setLayerVisibility(scenario, false);
        app.viewModel.activeLayers.remove(scenario);

        app.viewModel.removeFromAggregatedAttributes(scenario.name);
        /*
        //remove the key/value pair from aggregatedAttributes
        delete app.viewModel.aggregatedAttributes()[scenario.name];
        //if there are no more attributes left to display, then remove the overlay altogether
        if ($.isEmptyObject(app.viewModel.aggregatedAttributes())) {
            app.viewModel.aggregatedAttributes(false);
        }
        */
    };

    self.edit = function() {
        var scenario = this;
        return $.ajax({
            url: '/features/scenario/' + scenario.uid + '/form/',
            success: function(data) {
                //$('#scenario-form').append(data);
                app.viewModel.scenarios.scenarioForm(true);
                $('#scenario-form').html(data);
                app.viewModel.scenarios.scenarioFormModel = new scenarioFormModel();
                ko.applyBindings(app.viewModel.scenarios.scenarioFormModel, document.getElementById('scenario-form'));
                app.viewModel.scenarios.scenarioFormModel.updateFiltersAndLeaseBlocks();

                if ($('#id_input_parameter_wind_speed').is(':checked')) {
                    //app.viewModel.scenarios.scenarioFormModel.windSpeedParameter(true);
                    app.viewModel.scenarios.scenarioFormModel.toggleWindSpeedWidget();
                }
                if ($('#id_input_parameter_depth').is(':checked')) {
                    app.viewModel.scenarios.scenarioFormModel.toggleDepthWidget();
                }
                if ($('#id_input_parameter_distance_to_shore').is(':checked')) {
                    app.viewModel.scenarios.scenarioFormModel.toggleDistanceToShoreWidget();
                }
                if ($('#id_input_parameter_distance_to_substation').is(':checked')) {
                    app.viewModel.scenarios.scenarioFormModel.toggleSubstationWidget();
                }
                if ($('#id_input_parameter_distance_to_awc').is(':checked')) {
                    app.viewModel.scenarios.scenarioFormModel.toggleAWCWidget();
                }
                if ($('#id_input_filter_distance_to_shipping').is(':checked')) {
                    app.viewModel.scenarios.scenarioFormModel.toggleShippingLanesWidget();
                }
                if ($('#id_input_filter_ais_density').is(':checked')) {
                    app.viewModel.scenarios.scenarioFormModel.toggleShipTrafficWidget();
                }
                if ($('#id_input_filter_uxo').is(':checked')) {
                    app.viewModel.scenarios.scenarioFormModel.toggleUXOWidget();
                }
                app.viewModel.scenarios.scenarioFormModel.updateFiltersAndLeaseBlocks();
            },
            error: function (result) {
                //debugger;
            }
        });
    };

    self.createCopy = function() {
        var scenario = this;

        //create a copy of this shape to be owned by the user
        $.ajax({
            url: '/scenario/copy_design/' + scenario.uid + '/',
            type: 'POST',
            dataType: 'json',
            success: function(data) {
                //app.viewModel.scenarios.loadSelectionsFromServer();
                app.viewModel.scenarios.addScenarioToMap(null, {uid: data[0].uid});
            },
            error: function (result) {
                //debugger;
            }
        });
    };

    self.deleteScenario = function() {
        var scenario = this;

        //first deactivate the layer
        scenario.deactivateLayer();

        //remove from activeLayers
        app.viewModel.activeLayers.remove(scenario);
        //remove from app.map
        if (scenario.layer) {
            app.map.removeLayer(scenario.layer);
        }
        //remove from scenarioList
        app.viewModel.scenarios.scenarioList.remove(scenario);

        //remove from server-side db (this should provide error message to the user on fail)
        $.ajax({
            url: '/scenario/delete_design/' + scenario.uid + '/',
            type: 'POST',
            error: function (result) {
                //debugger;
            }
        });
    };

    self.visible = ko.observable(false);

    // bound to click handler for layer visibility switching in Active panel
    self.toggleVisible = function() {
        var scenario = this;

        if (scenario.visible()) { //make invisible
            scenario.visible(false);
            app.setLayerVisibility(scenario, false);

            app.viewModel.removeFromAggregatedAttributes(scenario.name);

        } else { //make visible
            scenario.visible(true);
            app.setLayerVisibility(scenario, true);
        }
    };

    // is description active
    self.infoActive = ko.observable(false);
    // display descriptive text below the map
    self.toggleDescription = function(scenario) {
        if ( ! scenario.infoActive() ) {
            self.showDescription(scenario);
        } else {
            self.hideDescription(scenario);
        }
    };

    self.showDescription = function(scenario) {
        self.infoActive(true);
    };

    self.hideDescription = function(scenario) {
        self.infoActive(false);
    };

    // identical to drawingModel functions
    self.shapefileDownloadLink = function() {
        var url = "/scenario/export/shp/" + self.id + ".zip";
        return url;
    }
    self.geojsonDownloadLink = function() {
        var url = "/scenario/export/geojson/" + self.id + ".geojson";
        return url;
    }
    self.wktDownloadLink = function() {
        var url = "/scenario/export/wkt/" + self.id + "-wkt.txt";
        return url;
    }
    self.kmlDownloadLink = function() {
        var url = "/scenario/export/kml/" + self.id + ".kml";
        return url;
    }
    return self;
} // end scenarioModel


function scenariosModel(options) {
    var self = this;

    self.scenarioList = ko.observableArray();
    self.scenarioForm = ko.observable(false);

    self.activeSelections = ko.observableArray();
    self.selectionList = ko.observableArray();
    self.selectionForm = ko.observable(false);

    self.drawingList = ko.observableArray();
    self.drawingForm = ko.observable(false);

    /** return true if normal MyPlanner content should be shown, false
        otherwise (when a form is active and assuming control of MyPlanner's
        space).
     */
    self.showMyPlanner = function() {
        // How about: when a form becomes active, it sets a variable called
        // anyFormActive(true)
        return !(self.scenarioForm() ||
                 self.reportsVisible() ||
                 self.drawingForm() ||
                 // This is awkward, but bookmarks aren't really scenarios,
                 // and they live in their own place.
                 app.viewModel.addBookmarksDialogVisible() ||
                 self.selectionForm());
    }


    self.getSelectionById = function(id) {
        var selections = self.selectionList();
        for (var i=0; i<selections.length; i++) {
            if ( selections[i].id === id ) {
                return selections[i];
            }
        }
        return false;
    };


    self.reportsVisible = ko.observable(false);
    self.showComparisonReports = function() {
        setTimeout(function() {
            $('#designs-slide').hide('slide', {direction: 'left'}, 300);
        }, 100);
        setTimeout(function() {
            self.reportsVisible(true);
            $('#designs-slide').show('slide', {direction: 'right'}, 300);
            if (self.activeSelections().length > 0) {
                self.reports.noActiveCollections(false);
                app.viewModel.scenarios.reports.updateChart();
            } else {
                self.reports.noActiveCollections(true);
            }
        }, 420);
    };

    self.returnToDesigns = function() {
        setTimeout(function() {
            $('#designs-slide').hide('slide', {direction: 'right'}, 300);
        }, 100);
        setTimeout(function() {
            app.viewModel.scenarios.reportsVisible(false);
            $('#designs-slide').show('slide', {direction: 'left'}, 300);
        }, 420);
    };


    self.leaseblockLayer = ko.observable(false);

    self.leaseblockLayer.subscribe( function() {
        app.viewModel.updateAttributeLayers();
    });

    self.scenarioLeaseBlocksLayerName = 'Selected OCS Blocks';

    // loading message for showing spinner
    // false for normal operation
    self.loadingMessage = ko.observable(false);
    self.errorMessage = ko.observable(false);

    self.sharingGroups = ko.observableArray();
    self.hasSharingGroups = ko.observable(false);

    self.sharingLayer = ko.observable();
    self.showSharingModal = function(scenario) {
        self.sharingLayer(scenario);
        self.sharingLayer().temporarilySelectedGroups(self.sharingLayer().selectedGroups().slice(0));
        $('#share-modal').modal('show');
    };

    self.showExportModal = function(object) {
        self.sharingLayer(object);
        $('#export-geometry').modal('show');
    }

    self.groupMembers = function(groupName) {
        var memberList = "";
        for (var i=0; i<self.sharingGroups().length; i++) {
            var group = self.sharingGroups()[i];
            if (group.group_name === groupName) {
                for (var m=0; m<group.members.length; m++) {
                    var member = group.members[m];
                    memberList += member + '<br>';
                }
            }
        }
        return memberList;
    };

    self.toggleGroup = function(obj) {
        var groupName = obj.group_name,
            indexOf = self.sharingLayer().temporarilySelectedGroups.indexOf(groupName);
        if ( indexOf === -1 ) {  //add group to list
            self.sharingLayer().temporarilySelectedGroups.push(groupName);
        } else { //remove group from list
            self.sharingLayer().temporarilySelectedGroups.splice(indexOf, 1);
        }
    };

    self.initSharingModal = function() {
        for (var i=0; i<self.sharingGroups().length; i++) {
            var groupID = '#' + self.sharingGroups()[i].group_slug;
            $(groupID).collapse( { toggle: false } );
        }
    };

    //TODO:  Fix the problem in which the first group toggled open will not toggle open again, once it's closed
    self.lastMembersClickTime = 0;
    self.toggleGroupMembers = function(obj, e) {
        var groupName = obj.group_name,
            groupID = '#' + obj.group_slug,
            clickTime = new Date().getTime();
        if (clickTime - self.lastMembersClickTime > 800) {
            self.lastMembersClickTime = clickTime;
            if ( ! $(groupID).hasClass('in') ) {  //toggle on and add group to list
                $(groupID).css("display", "none"); //allows the fade effect to display as expected
                if ( $.browser.msie ) {
                    $(groupID).fadeIn(0, function() {});
                } else {
                    $(groupID).fadeIn('slow', function() {});
                }
                $(groupID).collapse('show');
            } else { //toggle off and remove group from list
                if ( $.browser.msie ) {
                    $(groupID).fadeOut(0, function() {});
                } else {
                    $(groupID).fadeOut('slow', function() {});
                }
                $(groupID).collapse('hide');
                //set .modal-body background to eliminate residue that appears when the last Group is opened and then closed?
            }
            setTimeout(function() { self.updateSharingScrollBar(groupID); }, 300);
        }
    };

    self.groupIsSelected = function(groupName) {
        if (self.sharingLayer()) {
            var indexOf = self.sharingLayer().temporarilySelectedGroups.indexOf(groupName);
            return indexOf !== -1;
        }
        return false;
    };

    self.zoomToScenario = function(scenario) {
        if (scenario.layer) {
            var layer = scenario.layer;
            if (!scenario.active()) {
                scenario.activateLayer();
            }
            app.map.zoomToExtent(layer.getDataExtent());
            if (scenario.uid.indexOf('leaseblockselection') !== -1) {
                app.map.zoomOut();
                app.map.zoomOut();
            } else if (scenario.uid.indexOf('drawing') !== -1) {
                app.map.zoomOut();
                app.map.zoomOut();
            }
        } else {
            self.addScenarioToMap(scenario, {zoomTo: true});
        }
    };

    self.updateSharingScrollBar = function(groupID) {
        var sharingScrollpane = $('#sharing-groups').data('jsp');
        if (sharingScrollpane === undefined) {
            $('#sharing-groups').jScrollPane( {animateScroll: true});
        } else {
            sharingScrollpane.reinitialise();
            var groupPosition = $(groupID).position().top,
                containerPosition = $('#sharing-groups .jspPane').position().top,
                actualPosition = groupPosition + containerPosition;
            if (actualPosition > 140) {
                sharingScrollpane.scrollToY(groupPosition-120);
            }
        }
    };

    // scenariosLoaded will be set to true after they have been loaded
    self.scenariosLoaded = false;
    self.selectionsLoaded = false;

    self.isScenariosOpen = ko.observable(false);
    self.toggleScenariosOpen = function(force) {
        // ensure designs tab is activated
        $('#designsTab').tab('show');

        if (force === 'open') {
            self.isScenariosOpen(true);
        } else if (force === 'close') {
            self.isScenariosOpen(false);
        } else {
            if ( self.isScenariosOpen() ) {
                self.isScenariosOpen(false);
            } else {
                self.isScenariosOpen(true);
            }
        }
    };
    self.isCollectionsOpen = ko.observable(false);
    self.toggleCollectionsOpen = function(force) {
        // ensure designs tab is activated
        $('#designsTab').tab('show');

        if (force === 'open') {
            self.isCollectionsOpen(true);
        } else if (force === 'close') {
            self.isCollectionsOpen(false);
        } else {
            if ( self.isCollectionsOpen() ) {
                self.isCollectionsOpen(false);
            } else {
                self.isCollectionsOpen(true);
            }
        }
    };
    self.isDrawingsOpen = ko.observable(false);
    self.toggleDrawingsOpen = function(force) {
        // ensure designs tab is activated
        $('#designsTab').tab('show');

        if (force === 'open') {
            self.isDrawingsOpen(true);
        } else if (force === 'close') {
            self.isDrawingsOpen(false);
        } else {
            if ( self.isDrawingsOpen() ) {
                self.isDrawingsOpen(false);
            } else {
                self.isDrawingsOpen(true);
            }
        }
    };

    // on draw boundary button click
    self.openDrawings = function() {
      //hide button bar
      app.viewModel.propertySelection(false);
      app.viewModel.showLMHeader(false);
      //show left panel if hidden
      if (!app.viewModel.showLayers()){
        app.viewModel.toggleLayers();
      }
      //show designs page with drawing form
      self.toggleDrawingsOpen('open');
    }

    // on draw boundary button click
    // open new drawing for anonymous user
    self.openDrawingAnonymous = function() {
      app.viewModel.propertySelection(false);
      self.createAnonymousPolygonDesign();
      self.anonymousForm();
      //show left panel if hidden
      if (!app.viewModel.showLayers()){
        app.viewModel.toggleLayers();
      }
      //show designs page with drawing form
      self.toggleDrawingsOpen('open');
    }

    // on draw boundary button click
    // user is logged in. open new drawing for logged in users.
    self.openDrawingAuth = function() {
      self.openDrawings();
      self.createPolygonDesign();
    }

    self.select_tax_lot = function() {
      app.viewModel.propertySelection(true);
      if (! app.isAuthenticated ) {
        self.createAnonymousPolygonDesign();
        self.anonymousForm();
      }
      //show left panel if hidden
      if (!app.viewModel.showLayers()){
        app.viewModel.toggleLayers();
      }
      //show designs page with drawing form
      self.toggleDrawingsOpen('open');
    }

    self.enable_taxlot_selection = function() {
      if (app.isAuthenticated) {
        self.createPolygonDesign();
      } else {
        self.createAnonymousPolygonDesign();
      }

      // self.featureClick = new OpenLayers.Events.featureclick
      // self.click = new OpenLayers.Control.Click();
      // app.map.addControl(self.click);
      // self.click.activate();
      taxlot_layer = app.viewModel.layerSearchIndex['Tax Lots'];
      taxlot_layer.layer.deactivateLayer();
      taxlot_layer.layer.activateLayer();
    }

    self.disable_taxlot_selection = function() {
      app.viewModel.scenarios.reset();
    }

    //restores state of Designs tab to the initial list of designs
    self.reset = function (obj) {
        self.loadingMessage(false);
        self.errorMessage(false);

        //clean up scenario form
        if (self.scenarioForm() || self.scenarioFormModel) {
            self.removeScenarioForm();
        }

        //clean up selection form
        if (self.selectionForm() || self.selectionFormModel) {
            self.removeSelectionForm(obj);
        }

        //clean up drawing form
        if (self.drawingForm() || self.drawingFormModel) {
            self.removeDrawingForm(obj);
        }
        app.viewModel.propertySelection(false);

        //remove the key/value pair from aggregatedAttributes
        app.viewModel.removeFromAggregatedAttributes(self.leaseblockLayer().name);
        app.viewModel.updateAttributeLayers();
    };

    self.removeDrawingForm = function(obj) {
        self.drawingFormModel.cleanUp();
        self.drawingForm(false);
        $('#polygon-design-form').remove();
        var drawingForm = document.getElementById('drawing-form');
        $(drawingForm).empty();
        ko.cleanNode(drawingForm);
        //in case of canceled edit
        if ( obj && obj.cancel && self.drawingFormModel.originalDrawing ) {
            self.drawingFormModel.originalDrawing.deactivateLayer();
            self.drawingFormModel.originalDrawing.activateLayer();
        }
        delete self.drawingFormModel;
    };

    self.removeSelectionForm = function(obj) {
        self.selectionForm(false);
        var selectionForm = document.getElementById('selection-form');
        $(selectionForm).empty();
        ko.cleanNode(selectionForm);
        if (self.selectionFormModel.IE) {
            if (self.selectionFormModel.selectedLeaseBlocksLayer) {
                app.map.removeLayer(self.selectionFormModel.selectedLeaseBlocksLayer);
            }
        } else {
            app.map.removeControl(self.selectionFormModel.leaseBlockSelectionLayerClickControl);
            app.map.removeControl(self.selectionFormModel.leaseBlockSelectionLayerBrushControl);
            if (self.selectionFormModel.selectedLeaseBlocksLayer) {
                app.map.removeLayer(self.selectionFormModel.selectedLeaseBlocksLayer);
            }
            if (self.selectionFormModel.leaseBlockSelectionLayer.layer) {
                app.map.removeLayer(self.selectionFormModel.leaseBlockSelectionLayer.layer);
            }
            if (self.selectionFormModel.navigationControl) {
                self.selectionFormModel.navigationControl.activate();
            }
        }
        if ( ! self.selectionFormModel.leaseBlockLayerWasActive ) {
            if ( self.selectionFormModel.leaseBlockLayer.active() ) {
                self.selectionFormModel.leaseBlockLayer.deactivateLayer();
            }
        }
        if ( (obj && obj.cancel) && self.selectionFormModel.selection && !self.selectionFormModel.selection.active() ) {
            self.selectionFormModel.selection.activateLayer();
        }
        delete self.selectionFormModel;
        app.viewModel.enableFeatureAttribution();
    };

    self.removeScenarioForm = function() {
        self.scenarioForm(false);
        var scenarioForm = document.getElementById('scenario-form');
        $(scenarioForm).empty();
        ko.cleanNode(scenarioForm);
        delete self.scenarioFormModel;
        //hide remaining leaseblocks
        if ( self.leaseblockLayer() && app.map.getLayersByName(self.leaseblockLayer().name).length ) {
            app.map.removeLayer(self.leaseblockLayer());
        }
    };

    self.createWindScenario = function() {
        //hide designs tab by sliding left
        return $.ajax({
            url: '/features/scenario/form/',
            success: function(data) {
                self.scenarioForm(true);
                $('#scenario-form').html(data);
                self.scenarioFormModel = new scenarioFormModel();
                ko.applyBindings(self.scenarioFormModel, document.getElementById('scenario-form'));
                if (!self.leaseblockLayer()) {
                    self.loadLeaseblockLayer();
                }
            },
            error: function (result) {
                //debugger;
            }
        });
    };

    self.createSelectionDesign = function() {
        return $.ajax({
            url: '/features/leaseblockselection/form/',
            success: function(data) {
                self.selectionForm(true);
                $('#selection-form').html(data);
                self.selectionFormModel = new selectionFormModel();
                ko.applyBindings(self.selectionFormModel, document.getElementById('selection-form'));
            },
            error: function (result) {
                //debugger;
            }
        });
    };

    self.setDrawingFormModel = function(form) {
      app.viewModel.scenarios.drawingForm(true);
      var element = document.getElementById('drawing-form');
      ko.cleanNode(element);
      $('#drawing-form').html(form);
      app.viewModel.scenarios.drawingFormModel = new polygonFormModel();
      app.viewModel.scenarios.drawingFormModel.toggleSketch = function() {
        app.viewModel.propertySelection(!app.viewModel.propertySelection());
      };

      ko.applyBindings(app.viewModel.scenarios.drawingFormModel, element);

    }

    self.createPolygonDesign = function() {
        return $.ajax({
            url: '/features/aoi/form/',
            success: function(data) {
                if (!app.viewModel.scenarios.drawingForm() && !app.viewModel.scenarios.drawingFormModel) {
                  app.viewModel.scenarios.setDrawingFormModel(data);
                }
            },
            error: function (result) {
                //debugger;
            }
        });
    };

    self.createAnonymousPolygonDesign = function() {
        if (! self.drawingForm()) {
          app.viewModel.scenarios.setDrawingFormModel(self.anonymousCombinedForm)
        }
    };

    // landmapper aoi form hack to allow anonymous drawing without login
    self.anonymousCombinedForm = '\
    <div class="featurepanel">\
        <h4 data-bind="visible: app.viewModel.propertySelection()">Taxlot Selection</h4>\
        <h4 data-bind="visible: !app.viewModel.propertySelection()">Drawing</h4>\
        <form id="polygon-design-form" action="/landmapper/anonymous/" method="post">\
                <div style="display:none;">\
                </div>\
                <input type="hidden" name="user" id="id_user" />\
                <div style="display:none;">\
                </div>\
                <input type="hidden" name="manipulators" id="id_manipulators" />\
                <div style="display:none;">\
                </div>\
            <script class="point" id="geometry_orig_kml" type="application/vnd.google-earth.kml+xml">\
            </script>\
            <input type="hidden" name="geometry_orig" id="id_geometry_orig" />\
                <div style="display:none;">\
                </div>\
            <script class="point" id="geometry_final_kml" type="application/vnd.google-earth.kml+xml">\
            </script>\
            <input type="hidden" name="geometry_final" id="id_geometry_final" />\
            <div id="error_bar"></div>\
            <div id="step1" class="step">\
                <p class="step-text"><i>Step 1 of 2 </i></p>\
                <div data-bind="visible: ! showEdit()">\
                  <div data-bind="visible: ! app.viewModel.propertySelection()">\
                    <p id="click-to-begin-drawing" class="instructions">Click the button below to begin drawing your property.</p>\
                    <a class="btn btn-warning" style="margin-top: 10px" data-bind="click: startSketch, css: { disabled: isDrawing() }">\
                        <span>Draw Property</span>\
                    </a>\
                    <div data-bind="visible: isDrawing()" style="padding-top: 20px" >\
                        <div class="well">\
                            <div>\
                                Click on the map to add the points that make up your polygon.\
                            </div>\
                            <div id="double-click-instructions" style="padding-top: 10px">\
                                Double-click to finish drawing.\
                            </div>\
                        </div>\
                    </div>\
                    <p id="click-on-taxlots" class="instructions">If you would like to select your property by parcel:</p>\
                    <a class="btn btn-warning" style="margin-top: 10px" data-bind="click: toggleSketch">\
                        <span>Select by parcel</span>\
                    </a>\
                  </div>\
                  <div data-bind="visible: app.viewModel.propertySelection()">\
                    <p id="click-on-taxlots" class="instructions">Click on your propety to highlight all included parcels.</p>\
                    <p id="click-on-taxlots" class="instructions">If your parcel is not available, draw it by hand:</p>\
                    <a class="btn btn-warning" style="margin-top: 10px" data-bind="click: toggleSketch">\
                        <span>Hand Draw</span>\
                    </a>\
                  </div>\
                </div>\
                <div data-bind="visible: showEdit()">\
                    <p class="instructions">Click <b>Next</b> if you are satisfied with your shape.</p>\
                    <p class="instructions">Click <b>Edit Shape</b> if you would like to make changes to your shape.</p>\
                    <p class="instructions">Click <b>Add Shape</b> if you would like to add more shapes to your drawing (multipolygon).</p>\
                    <a class="btn btn-default" style="margin-top: 10px" data-bind="click: startEdit, css: { disabled: (isEditing() || isDrawing()) }">\
                        <span>Edit Shape</span>\
                    </a>\
                    <a class="btn btn-default" style="margin-top: 10px" data-bind="click: startSketch, css: { disabled: (isEditing() || isDrawing()) }">\
                        <span>Add Shape</span>\
                    </a>\
                    <div data-bind="visible: isEditing()">\
                        <p class="instructions">\
                            Click and drag the handles or vertices of the shape.\
                        </p>\
                        <p class="instructions">\
                            When you are done, click <b>Done Editing</b> below.\
                        </p>\
                        <a class="btn btn-warning" style="margin-top: 10px" data-bind="click: completeEdit">\
                            <span>Done Editing</span>\
                        </a>\
                    </div>\
                </div>\
                <div id="PanelGeometry"></div>\
            </div>\
            <div class="step" id="step2">\
                <p class="step-text"><i>Step 2 of 2 </i></p>\
                <p class="instructions">Provide a <b>Name</b> to identify your Drawing </p>\
                <div class="step3-inputs">\
                    <div class="step3-param">\
                        <input type="text" name="name" maxlength="255" id="id_name" required />\
                        <div id="invalid-name-message" class="control-group error" style="display: none;">\
                            <span class="help-inline">The <b>Name</b> field is required.</span>\
                        </div>\
                    </div>\
                    <p class="instructions">Optionally, you may add a <b>Description</b> <!--and/or attach a file--> </p>\
                    <div class="step3-param">\
                        <textarea name="description" id="id_description" cols="30" rows="3"></textarea>\
                    </div>\
                </div>\
            </div>\
            <div class="wizard_nav">\
                <div class="btn-group pull-right">\
                    <a href="#" class="btn btn-default" onclick="this.blur(); return false;" id="button_prev"><span>&lt; Previous</span></a>\
                    <a href="#" class="btn btn-primary"  onclick="this.blur(); return false;" id="button_next"><span>Next &gt;</span></a>\
                    <a href="#" class="submit_button btn btn-primary" onclick="this.blur(); return false;"><span>Save</span></a>\
                </div>\
            </div>\
            <div>\
                <div class="btn-group pull-left">\
                    <a href="#" class="cancel_button btn btn-default"><span>Cancel</span></a>\
                </div>\
            </div>\
        </form>\
    </div>\
    '

    self.anonymousForm = function() {
      madrona.onShow(function(){
          madrona.setupForm($('#polygon-design-form'));
          var max_step = 2;
          var step = 1;
          function validate(step) {
              return_value = true;
              if (step == 1) {
                  if ( app.viewModel.scenarios.drawingFormModel.isDrawing()) {
                      $('#double-click-instructions').effect("highlight", {}, 1000);
                      return_value = false;
                  } else if ( ! app.viewModel.scenarios.drawingFormModel.hasShape() ) {
                      $('#click-to-begin-drawing').effect("highlight", {}, 1000);
                      return_value = false;
                  }
              } else if (step == max_step) {
              }
              return return_value;
          };
          function wizard(action) {
              if (step == 1 && action == 'next') {
                  app.viewModel.scenarios.drawingFormModel.consolidatePolygonLayerFeatures();
                  if (validate(step)) {
                      step += 1;
                      app.viewModel.scenarios.drawingFormModel.completeEdit();
                      $('#id_geometry_orig')[0].value = 'SRID=3857;' + new OpenLayers.Format.WKT().write(app.viewModel.scenarios.drawingFormModel.polygonLayer.features[0]);
                  }
              } else if (step > 1 && action == 'prev') {
                  step -= 1;
              }
              $('div.step').each(function(index) {
                  $(this).hide();
              });
              $('div#step' + step).show();
              if (step == 1) {
                  $('#button_prev').hide();
                  $('#button_submit').hide();
              } else {
                  $('#button_prev').show();
              }
              if (step == max_step) {
                  $('#button_next').hide();
                  $('.submit_button').show();
              } else {
                  $('#button_next').show();
                  $('.submit_button').hide();
              }
          };
          $('#button_prev').click( function() { wizard('prev'); });
          $('#button_next').click( function() { wizard('next'); });
          step = 1;
          wizard();
          $('#id_name').keypress(function (e) {
              if (e.which === 13) {
                  $('#drawing-form .submit_button').click();
                  return false;
              } else {
                  $('#invalid-name-message').hide();
              }
          });
      });
    }

    self.createLineDesign = function() {};

    self.createPointDesign = function() {};

    self.setDrawingScenarioEdit = function(scenario) {
      // Override visualize.drawings.js drawingModel.edit()
      scenario.edit = function() {
          self.drawing = this;
          if ( ! self.drawing.active() ) {
              self.drawing.activateLayer();
          }
          return $.ajax({
              url: '/features/aoi/' + self.drawing.uid + '/form/',
              success: function(data) {
                  app.viewModel.scenarios.setDrawingFormModel(data)
                  var oldLayer = app.viewModel.scenarios.drawingFormModel.polygonLayer;
                  app.viewModel.scenarios.drawingFormModel.originalDrawing = self.drawing;
                  app.viewModel.scenarios.drawingFormModel.polygonLayer = self.drawing.layer;
                  app.map.zoomToExtent(self.drawing.layer.getDataExtent());
                  app.map.zoomOut();
                  app.viewModel.scenarios.drawingFormModel.showEdit(true);
                  app.viewModel.scenarios.drawingFormModel.hasShape(true);
              },
              error: function (result) {
                  console.log('Error in scenarios.js setDrawingScenarioEdit');
              }
          });
      };
    }
    self.addNewFeatureToMap = function(feature, feature_options) {
      scenario = feature_options.scenario
      scenarioId = feature_options.scenarioId
      isDrawingModel = feature_options.isDrawingModel
      isSelectionModel = feature_options.isSelectionModel
      isScenarioModel = feature_options.isScenarioModel
      opacity = feature_options.opacity
      stroke = feature_options.stroke
      fillColor = feature_options.fillcolor
      strokeColor = feature_options.strokeColor
      zoomTo = feature_options.zoomTo

      if ( scenario ) {
          opacity = scenario.opacity();
          stroke = scenario.opacity();
      }
      if ( isDrawingModel ) {
          fillColor = "#C9BE62";
          strokeColor = "#A99E42";
          //fillColor = "#EBE486";
          //strokeColor = "#CBC466";
      } else if ( isSelectionModel ) {
          fillColor = "#00467F";
          strokeColor = "#00265F";
      }
      var layer = new OpenLayers.Layer.Vector(
          scenarioId,
          {
              projection: new OpenLayers.Projection('EPSG:3857'),
              displayInLayerSwitcher: false,
              styleMap: new OpenLayers.StyleMap({
                  fillColor: fillColor,
                  fillOpacity: opacity,
                  strokeColor: strokeColor,
                  strokeOpacity: stroke
              }),
              //style: OpenLayers.Feature.Vector.style['default'],
              scenarioModel: scenario
          }
      );

      layer.addFeatures(new OpenLayers.Format.GeoJSON().read(feature));

      if ( scenario ) {
          //reasigning opacity here, as opacity wasn't 'catching' on state load for scenarios
          scenario.opacity(opacity);
          scenario.layer = layer;
          if (isDrawingModel) {
            self.setDrawingScenarioEdit(scenario);
          }
      } else { //create new scenario
          //only do the following if creating a scenario
          var properties = feature.features[0].properties;
          if (isDrawingModel) {
              scenario = new drawingModel({
                  id: properties.uid,
                  uid: properties.uid,
                  name: properties.name,
                  description: properties.description,
                  features: layer.features
              });
              self.toggleDrawingsOpen('open');
              self.zoomToScenario(scenario);
              self.setDrawingScenarioEdit(scenario);
          } else if (isSelectionModel) {
              scenario = new selectionModel({
                  id: properties.uid,
                  uid: properties.uid,
                  name: properties.name,
                  description: properties.description,
                  features: layer.features
              });
              self.toggleCollectionsOpen('open');
              self.zoomToScenario(scenario);
          } else {
              scenario = new scenarioModel({
                  id: properties.uid,
                  uid: properties.uid,
                  name: properties.name,
                  description: properties.description,
                  features: layer.features
              });
              self.toggleScenariosOpen('open');
              self.zoomToScenario(scenario);
          }
          scenario.layer = layer;
          scenario.layer.scenarioModel = scenario;
          scenario.active(true);
          scenario.visible(true);

          if (app.isAuthenticated){
              //get attributes
              $.ajax( {
                  url: '/scenario/get_attributes/' + scenarioId + '/',
                  type: 'GET',
                  dataType: 'json',
                  success: function(result) {
                      scenario.scenarioAttributes = result.attributes;
                      if (isSelectionModel) {
                          scenario.scenarioReportValues = result.report_values;
                      }
                  },
                  error: function (result) {
                      //debugger;
                  }

              });
          }

          //in case of edit, removes previously stored scenario
          //self.scenarioList.remove(function(item) { return item.uid === scenario.uid } );

          if ( isDrawingModel ) {
              var previousDrawing = ko.utils.arrayFirst(self.drawingList(), function(oldDrawing) {
                  return oldDrawing.uid === scenario.uid;
              });
              if ( previousDrawing ) {
                  self.drawingList.replace( previousDrawing, scenario );
              } else {
                  self.drawingList.push(scenario);
              }
              self.drawingList.sort(self.alphabetizeByName);
          } else if ( isSelectionModel ) {
              var previousSelection = ko.utils.arrayFirst(self.selectionList(), function(oldSelection) {
                  return oldSelection.uid === scenario.uid;
              });
              if ( previousSelection ) {
                  self.selectionList.replace( previousSelection, scenario );
              } else {
                  self.selectionList.push(scenario);
              }
              self.activeSelections().push(scenario);
              self.selectionList.sort(self.alphabetizeByName);
          } else {
              var previousScenario = ko.utils.arrayFirst(self.scenarioList(), function(oldScenario) {
                  return oldScenario.uid === scenario.uid;
              });
              if ( previousScenario ) {
                  self.scenarioList.replace( previousScenario, scenario );
              } else {
                  self.scenarioList.push(scenario);
              }
              self.scenarioList.sort(self.alphabetizeByName);
          }

          //self.scenarioForm(false);
          self.reset();
      }

      //app.addVectorAttribution(layer);
      //in case of edit, removes previously displayed scenario
      for (var i=0; i<app.map.layers.length; i++) {
          if (app.map.layers[i].name === scenario.uid) {
              app.map.removeLayer(app.map.layers[i]);
              i--;
          }
      }
      app.map.addLayer(scenario.layer);
      //add scenario to Active tab
      app.viewModel.activeLayers.remove(function(item) { return item.uid === scenario.uid; } );
      app.viewModel.activeLayers.unshift(scenario);

      if (zoomTo) {
          self.zoomToScenario(scenario);
      }
    };

    self.addScenarioToMap = function(scenario, options) {
        var scenarioId,
            opacity = .8,
            stroke = 1,
            fillColor = "#2F6A6C",
            strokeColor = "#1F4A4C",
            zoomTo = (options && options.zoomTo) || false;

        if ( scenario ) {
            scenarioId = scenario.uid;
            scenario.active(true);
            scenario.visible(true);
        } else {
            scenarioId = options.uid;
        }

        var isDrawingModel = false,
            isSelectionModel = false,
            isScenarioModel = false;
        if (scenarioId.indexOf('drawing') !== -1) {
            isDrawingModel = true;
        }
        else if (scenarioId.indexOf('leaseblockselection') !== -1) {
            isSelectionModel = true;
        } else {
            isScenarioModel = true;
        }
        if (self.scenarioFormModel) {
            self.scenarioFormModel.isLeaseblockLayerVisible(false);
        }

        feature_options = {
          'scenario': scenario,
          'scenarioId': scenarioId,
          'isDrawingModel': isDrawingModel,
          'isSelectionModel': isSelectionModel,
          'isScenarioModel': isScenarioModel,
          'opacity': opacity,
          'stroke': stroke,
          'fillColor': fillColor,
          'strokeColor': strokeColor,
          'zoomTo': zoomTo
        }

        if (app.isAuthenticated) {

            //perhaps much of this is not necessary once a scenario has been added to app.map.layers initially...?
            //(add check for scenario.layer, reset the style and move on?)
            $.ajax( {
                url: '/features/generic-links/links/geojson/' + scenarioId + '/',
                type: 'GET',
                dataType: 'json',
                success: function(feature) {
                    self.addNewFeatureToMap(feature, feature_options);
                },
                error: function(result) {
                    //debugger;
                    app.viewModel.scenarios.errorMessage(result.responseText.split('\n\n')[0]);
                }
            });
        } else {
          if (options && options.hasOwnProperty('geojson')) {
            feature = options.geojson;
          } else {
            feature = JSON.parse(new OpenLayers.Format.GeoJSON().write(scenario.features));
            feature.crs = {
                "type":"name",
                "properties":{"name":"urn:ogc:def:crs:EPSG::3857"}}
          }
          if (feature) {
              self.addNewFeatureToMap(feature, feature_options);
          }
        }
    }; // end addScenarioToMap

    self.alphabetizeByName = function(a, b) {
        var name1 = a.name.toLowerCase(),
            name2 = b.name.toLowerCase();
        if (name1 < name2) {
            return -1;
        } else if (name1 > name2) {
            return 1;
        }
        return 0;
    };

    // activate any lingering designs not shown during loadCompressedState
    self.showUnloadedDesigns = function() {
        var designs = app.viewModel.unloadedDesigns;

        if (designs && designs.length) {
            //the following delay might help solve what appears to be a race condition
            //that prevents the design in the layer list from displaying the checked box icon after loadin
            setTimeout( function() {
                for (var x=0; x < designs.length; x=x+1) {
                    var id = designs[x].id,
                        opacity = designs[x].opacity,
                        isVisible = designs[x].isVisible;

                    if (app.viewModel.layerIndex[id]) {
                        app.viewModel.layerIndex[id].opacity(opacity);
                        app.viewModel.layerIndex[id].activateLayer();
                        for (var i=0; i < app.viewModel.unloadedDesigns.length; i=i+1) {
                            if(app.viewModel.unloadedDesigns[i].id === id) {
                                app.viewModel.unloadedDesigns.splice(i,1);
                                i = i-1;
                            }
                        }
                    }
                }
            }, 400);
        }
    };

    self.loadScenariosFromServer = function() {
        $.ajax({
            url: '/scenario/get_scenarios',
            type: 'GET',
            dataType: 'json',
            success: function (scenarios) {
                self.loadScenarios(scenarios);
                self.scenariosLoaded = true;
                self.showUnloadedDesigns();
            },
            error: function (result) {
                //debugger;
            }
        });
    };

    //populates scenarioList
    self.loadScenarios = function (scenarios) {
        self.scenarioList.removeAll();
        $.each(scenarios, function (i, scenario) {
            var scenarioViewModel = new scenarioModel({
                id: scenario.uid,
                uid: scenario.uid,
                name: scenario.name,
                description: scenario.description,
                attributes: scenario.attributes,
                shared: scenario.shared,
                sharedByUsername: scenario.shared_by_username,
                sharedByName: scenario.shared_by_name,
                sharingGroups: scenario.sharing_groups
            });
            self.scenarioList.push(scenarioViewModel);
            app.viewModel.layerIndex[scenario.uid] = scenarioViewModel;
        });
        self.scenarioList.sort(self.alphabetizeByName);
    };

    self.loadSelectionsFromServer = function() {
        $.ajax({
            url: '/scenario/get_selections',
            type: 'GET',
            dataType: 'json',
            success: function (selections) {
                self.loadSelections(selections);
                self.selectionsLoaded = true;
                self.showUnloadedDesigns();
            },
            error: function (result) {
                //debugger;
            }
        });
    };
    //populates selectionList
    self.loadSelections = function (selections) {
        self.selectionList.removeAll();
        $.each(selections, function (i, selection) {
            var selectionViewModel = new selectionModel({
                id: selection.uid,
                uid: selection.uid,
                name: selection.name,
                description: selection.description,
                attributes: selection.attributes,
                shared: selection.shared,
                sharedByUsername: selection.shared_by_username,
                sharedByName: selection.shared_by_name,
                sharingGroups: selection.sharing_groups
            });
            self.selectionList.push(selectionViewModel);
            app.viewModel.layerIndex[selection.uid] = selectionViewModel;
        });
        self.selectionList.sort(self.alphabetizeByName);
    };

    self.loadDrawingsFromServer = function() {
        $.ajax({
            url: '/drawing/get_drawings',
            type: 'GET',
            dataType: 'json',
            success: function (drawings) {
                self.loadDrawings(drawings);
                self.drawingsLoaded = true;
                self.showUnloadedDesigns();
            },
            error: function (result) {
                //debugger;
            }
        });
    };
    //populates selectionList
    self.loadDrawings = function (drawings) {
        self.drawingList.removeAll();
        $.each(drawings, function (i, drawing) {
            var drawingViewModel = new drawingModel({
                id: drawing.uid,
                uid: drawing.uid,
                name: drawing.name,
                description: drawing.description,
                attributes: drawing.attributes,
                shared: drawing.shared,
                sharedByUsername: drawing.shared_by_username,
                sharedByName: drawing.shared_by_name,
                sharingGroups: drawing.sharing_groups
            });
            self.setDrawingScenarioEdit(drawingViewModel);
            self.drawingList.push(drawingViewModel);
            app.viewModel.layerIndex[drawing.uid] = drawingViewModel;
        });
        self.drawingList.sort(self.alphabetizeByName);
    };

    self.loadLeaseblockLayer = function() {
        var leaseBlockLayer = new OpenLayers.Layer.Vector(
            self.scenarioLeaseBlocksLayerName,
            {
                projection: new OpenLayers.Projection('EPSG:3857'),
                displayInLayerSwitcher: false,
                strategies: [new OpenLayers.Strategy.Fixed()],
                protocol: new OpenLayers.Protocol.HTTP({
                    //url: '/static/data_manager/geojson/LeaseBlockWindSpeedOnlySimplifiedNoDecimal.json',
                    url: '/static/data_manager/geojson/OCSBlocks20130920.json',
                    format: new OpenLayers.Format.GeoJSON()
                }),
                //styleMap: new OpenLayers.StyleMap( {
                //    "default": new OpenLayers.Style( { display: "none" } )
                //})
                layerModel: new layerModel({
                    name: self.scenarioLeaseBlocksLayerName
                })
            }
        );
        self.leaseblockLayer(leaseBlockLayer);

        self.leaseblockLayer().events.register("loadend", self.leaseblockLayer(), function() {
            if (self.scenarioFormModel && ! self.scenarioFormModel.IE) {
                self.scenarioFormModel.showLeaseblockSpinner(false);
            }
        });
    };

    self.leaseblockList = [];

    //populates leaseblockList
    self.loadLeaseblocks = function (ocsblocks) {
        self.leaseblockList = ocsblocks;
    };

    self.cancelShare = function() {
        self.sharingLayer().temporarilySelectedGroups.removeAll();
    };

    //SHARING DESIGNS
    self.submitShare = function() {
        self.sharingLayer().selectedGroups(self.sharingLayer().temporarilySelectedGroups().slice(0));
        var data = { 'scenario': self.sharingLayer().uid, 'groups': self.sharingLayer().selectedGroups() };
        $.ajax( {
            url: '/scenario/share_design',
            data: data,
            type: 'POST',
            dataType: 'json',
            error: function(result) {
                //debugger;
            }
        });
    };


    // External interface to objects for menus
    self.editDrawing = function(drawing) {
        drawing.edit();
    };
    self.createCopyOfDrawing = function(drawing) {
        drawing.createCopy();
    };
    self.shareDrawing = function(drawing) {
        self.showSharingModal(drawing);
    };
    self.exportDrawing = function(drawing) {
        self.showExportModal(drawing);
    }
    self.zoomToDrawing = function(drawing) {
        self.zoomToScenario(drawing);
    };
    self.deleteDrawing = function(drawing) {
        if (app.isAuthenticated) {
          drawing.deleteScenario();
        } else {
          //remove from activeLayers
          app.viewModel.activeLayers.remove(drawing);
          //remove from app.map
          if (drawing.layer) {
              app.map.removeLayer(drawing.layer);
          }
          //remove from selectionList
          app.viewModel.scenarios.drawingList.remove(drawing);
        }
    };


    self.editLeaseBlockCollection = function(leaseBlockCollection) {
        leaseBlockCollection.edit();
    };
    self.createCopyOfLeaseBlockCollection = function(leaseBlockCollection) {
        leaseBlockCollection.createCopy();
    };
    self.shareLeaseBlockCollection = function(leaseBlockCollection) {
        self.showSharingModal(leaseBlockCollection);
    };
    self.zoomToLeaseBlockCollection = function(leaseBlockCollection) {
        self.zoomToScenario(leaseBlockCollection);
    };
    self.deleteLeaseBlockCollection = function(leaseBlockCollection) {
        leaseBlockCollection.deleteScenario();
    };

    self.editWindEnergySiting = function(windEnergySiting) {
        windEnergySiting.edit();
    };
    self.createCopyOfWindEnergySiting = function(windEnergySiting) {
        windEnergySiting.createCopy();
    };
    self.shareWindEnergySiting = function(windEnergySiting) {
        self.showSharingModal(windEnergySiting);
    };
    self.zoomToWindEnergySiting = function(windEnergySiting) {
        self.zoomToScenario(windEnergySiting);
    };
    self.deleteWindEnergySiting = function(windEnergySiting) {
        windEnergySiting.deleteScenario();
    };



    return self;
} // end scenariosModel

$('#designsTab').on('show.bs.tab', function (e) {
    if ( !app.viewModel.scenarios.scenariosLoaded || !app.viewModel.scenarios.selectionsLoaded) {
        // load the scenarios
        app.viewModel.scenarios.loadScenariosFromServer();

        // load the selections
        app.viewModel.scenarios.loadSelectionsFromServer();

        if (app.isAuthenticated) {
          // load the drawing
          app.viewModel.scenarios.loadDrawingsFromServer();
        } else {
          if (app.viewModel.scenarios){
              app.viewModel.scenarios.drawingsLoaded = true;
              app.viewModel.scenarios.showUnloadedDesigns();
          }
        }

        // load the leaseblocks
        $.ajax({
            url: '/scenario/get_leaseblocks',
            type: 'GET',
            dataType: 'json',
            success: function (ocsblocks) {
                app.viewModel.scenarios.loadLeaseblocks(ocsblocks);
            },
            error: function (result) {
                //debugger;
            }
        });

        $.jsonrpc('get_sharing_groups', [], {
            success: function(result) {
                app.viewModel.scenarios.sharingGroups(result);
                if (result.length) {
                    app.viewModel.scenarios.hasSharingGroups(true);
                }
            }
        });
    }
});
