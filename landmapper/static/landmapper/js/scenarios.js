
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
            app.viewModel.propertySelection(true);
        });

        $form.closest('.panel').on('click', '.submit_button', function(e) {
            e.preventDefault();
            var name = $('#id_name').val();
            if ($.trim(name) === "") {
                $('#invalid-name-message').show();
                return false;
            }
            //submitted = true;
            submitForm($form);
            $form.closest('.panel').off('click', '.submit_button');
        });

        //no longer needed...? (if it was going here it meant there was a problem)
        /*
        $form.submit( function() {
            var name = $('#id_name').val();
            if ($.trim(name) === "") {
                $('#invalid-name-message').show();
                return false;
            }
            if (!submitted) {
                submitForm($form);
            }
        });
        */
        submitForm = function($form) {
            //var $form = $(this).closest('.panel').find('form'),
            var url = $form.attr('action'),
                $bar = $form.closest('.tab-pane').find('.bar'),
                data = {},
                barTimer;

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
        };

    }
}; // end madrona init

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
            //console.log('group position = ' + groupPosition);
            //console.log('container position = ' + containerPosition);
            //console.log('actual position = ' + actualPosition);
            if (actualPosition > 140) {
                //console.log('scroll to ' + (groupPosition-120));
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
    // open new drawing for anonomous user
    self.openDrawingAnonomous = function() {
      self.openDrawings();
      self.anonomousForm();
      self.createAnonomousPolygonDesign();
    }

    // on draw boundary button click
    // user is logged in. open new drawing for logged in users.
    self.openDrawingAuth = function() {
      self.openDrawings();
      self.createPolygonDesign();
    }

    self.select_tax_lot = function() {
      app.viewModel.propertySelection(true);
      //show left panel if hidden
      if (!app.viewModel.showLayers()){
        app.viewModel.toggleLayers();
      }
      //show designs page with drawing form
      self.toggleDrawingsOpen('open');
    }

    self.enable_taxlot_selection = function() {
      self.createPolygonDesign();
      self.click = new OpenLayers.Control.Click();
      app.map.addControl(self.click);
      self.click.activate();
      taxlot_layer = app.viewModel.layerSearchIndex['Tax Lots'];
      taxlot_layer.layer.deactivateLayer();
      taxlot_layer.layer.activateLayer();
    }

    self.disable_taxlot_selection = function() {
      self.click.deactivate();
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

        //remove the key/value pair from aggregatedAttributes
        app.viewModel.removeFromAggregatedAttributes(self.leaseblockLayer().name);
        app.viewModel.updateAttributeLayers();
    };

    self.removeDrawingForm = function(obj) {
        self.drawingFormModel.cleanUp();
        self.drawingForm(false);
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
                  app.viewModel.scenarios.setDrawingFormModel(data)
                }
            },
            error: function (result) {
                //debugger;
            }
        });
    };

    self.createAnonomousPolygonDesign = function() {
        app.viewModel.scenarios.setDrawingFormModel(self.anonomousDesignForm)
        // app.viewModel.scenarios.drawingForm(true);
        // $('#drawing-form').html(self.anonomousDesignForm);
        // app.viewModel.scenarios.drawingFormModel = new polygonFormModel();
        // ko.applyBindings(app.viewModel.scenarios.drawingFormModel, document.getElementById('drawing-form'));
    };

    // landmapper aoi form hack to allow anonomous drawing without login
    self.anonomousDesignForm = '\
    <form id="design-form" action="/landmapper/anonomous/" method="post">\
      <input type="hidden" name="user" id="id_user" />\
      <input type="hidden" name="manipulators" id="id_manipulators" />\
      <script class="point" id="geometry_orig_kml" type="application/vnd.google-earth.kml+xml"></script>\
      <input type="hidden" name="geometry_orig" id="id_geometry_orig" />\
      <script class="point" id="geometry_final_kml" type="application/vnd.google-earth.kml+xml"></script>\
      <input type="hidden" name="geometry_final" id="id_geometry_final" />\
      <div id="error_bar"></div>\
      <div id="step1" class="step">\
        <p class="step-text"><i>Step 1 of 2 </i></p>\
        <div data-bind="visible: ! showEdit()">\
          <p id="click-to-begin-drawing" class="instructions">Click the button below to begin drawing your polygon.</p>\
          <a class="btn btn-warning" style="margin-top:10px" data-bind="click: startSketch, css: { disabled: isDrawing() }">\
            <span>Draw Shape</span>\
          </a>\
        </div>\
        <div data-bind="visible: showEdit()">\
          <p class="instructions">Click <strong>Next</strong> if you are satisfied with your shape.</p>\
          <p class="instructions">Click <b>Edit Shape</b> if you would like to make changes to your shape.</p>\
          <p class="instructions">Click <b>Add Shape</b> if you would like to add more shapes to your drawing (multipolygon).</p>\
          <a class="btn btn-default" style="margin-top: 10px" data-bind="click: startEdit,css:{disabled: (isEditing() || isDrawing()) }">\
            <span>Edit Shape</span>\
          </a>\
          <a class="btn btn-default" style="margin-top: 10px" data-bind="click: startSketch, css: { disabled: (isEditing() || isDrawing()) }">\
            <span>Add Shape</span>\
          </a>\
          <div data-bind="visible: isEditing()">\
            <p class="instructions">Click and drag the handles or vertices of the shape.</p>\
            <p class="instructions">When you are done, click <b>Done Editing</b> below.</p>\
            <a class="btn btn-warning" style="margin-top: 10px" data-bind="click: completeEdit">\
              <span>Done Editing</span>\
            </a>\
          </div>\
        </div>\
        <div data-bind="visible: isDrawing()" style="padding-top:20px" >\
          <div class="well">\
            <div>Click on the map to add the points that make up your polygon.</div>\
            <div id="double-click-instructions" style="padding-top:10px">Double-click to finish drawing.</div>\
          </div>\
        </div>\
        <div id="PanelGeometry"></div>\
      </div>\
      <div class="step" id="step2">\
        <p class="step-text"><i>Step 2 of 2 </i></p>\
        <p class="instructions">Provide a <b>Name</b> to identify your Drawing </p>\
        <div class="step3-inputs">\
          <div class="step3-param">\
            <input type="text" name="name" id="id_name" maxlength="255" required />\
            <div id="invalid-name-message" class="control-group error" style="display: none;">\
              <span class="help-inline">The <b>Name</b> field is required.</span>\
            </div>\
            <div id="invalid-name-message" class="control-group error" style="display: none;">\
              <span class="help-inline">The <b>Name</b> field is required.</span>\
            </div>\
          </div>\
          <p class="instructions">Optionally, you may add a <b>Description</b> <!--and/or attach a file--> </p>\
          <div class="step3-param">\
            <textarea name="description" rows="3" id="id_description" cols="30"></textarea>\
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
    </form>';

    // landmapper aoi form hack to allow anonomous drawing without login
    self.anonomousLotSelectionForm = '\
    <form id="lot-selection-form" action="/landmapper/anonomous/" method="post">\
      <input type="hidden" name="user" id="id_user" />\
      <input type="hidden" name="manipulators" id="id_manipulators" />\
      <script class="point" id="geometry_orig_kml" type="application/vnd.google-earth.kml+xml"></script>\
      <input type="hidden" name="geometry_orig" id="id_geometry_orig" />\
      <script class="point" id="geometry_final_kml" type="application/vnd.google-earth.kml+xml"></script>\
      <input type="hidden" name="geometry_final" id="id_geometry_final" />\
      <div id="error_bar"></div>\
      <div id="step1" class="step">\
        <p class="step-text"><i>Step 1 of 2 </i></p>\
        <div data-bind="visible: ! showEdit()">\
          <p id="click-to-begin-drawing" class="instructions">Click the button below to begin drawing your polygon.</p>\
          <a class="btn btn-warning" style="margin-top:10px" data-bind="click: startSketch, css: { disabled: isDrawing() }">\
            <span>Draw Shape</span>\
          </a>\
        </div>\
        <div data-bind="visible: showEdit()">\
          <p class="instructions">Click <strong>Next</strong> if you are satisfied with your shape.</p>\
          <p class="instructions">Click <b>Edit Shape</b> if you would like to make changes to your shape.</p>\
          <p class="instructions">Click <b>Add Shape</b> if you would like to add more shapes to your drawing (multipolygon).</p>\
          <a class="btn btn-default" style="margin-top: 10px" data-bind="click: startEdit,css:{disabled: (isEditing() || isDrawing()) }">\
            <span>Edit Shape</span>\
          </a>\
          <a class="btn btn-default" style="margin-top: 10px" data-bind="click: startSketch, css: { disabled: (isEditing() || isDrawing()) }">\
            <span>Add Shape</span>\
          </a>\
          <div data-bind="visible: isEditing()">\
            <p class="instructions">Click and drag the handles or vertices of the shape.</p>\
            <p class="instructions">When you are done, click <b>Done Editing</b> below.</p>\
            <a class="btn btn-warning" style="margin-top: 10px" data-bind="click: completeEdit">\
              <span>Done Editing</span>\
            </a>\
          </div>\
        </div>\
        <div data-bind="visible: isDrawing()" style="padding-top:20px" >\
          <div class="well">\
            <div>Click on the map to add the points that make up your polygon.</div>\
            <div id="double-click-instructions" style="padding-top:10px">Double-click to finish drawing.</div>\
          </div>\
        </div>\
        <div id="PanelGeometry"></div>\
      </div>\
      <div class="step" id="step2">\
        <p class="step-text"><i>Step 2 of 2 </i></p>\
        <p class="instructions">Provide a <b>Name</b> to identify your Drawing </p>\
        <div class="step3-inputs">\
          <div class="step3-param">\
            <input type="text" name="name" id="id_name" maxlength="255" required />\
            <div id="invalid-name-message" class="control-group error" style="display: none;">\
              <span class="help-inline">The <b>Name</b> field is required.</span>\
            </div>\
            <div id="invalid-name-message" class="control-group error" style="display: none;">\
              <span class="help-inline">The <b>Name</b> field is required.</span>\
            </div>\
          </div>\
          <p class="instructions">Optionally, you may add a <b>Description</b> <!--and/or attach a file--> </p>\
          <div class="step3-param">\
            <textarea name="description" rows="3" id="id_description" cols="30"></textarea>\
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
    </form>';

    self.anonomousForm = function() {
      madrona.onShow(function(){
          madrona.setupForm($('#design-form'));
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
    //
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
        //perhaps much of this is not necessary once a scenario has been added to app.map.layers initially...?
        //(add check for scenario.layer, reset the style and move on?)
        $.ajax( {
            url: '/features/generic-links/links/geojson/' + scenarioId + '/',
            type: 'GET',
            dataType: 'json',
            success: function(feature) {
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

            },
            error: function(result) {
                //debugger;
                app.viewModel.scenarios.errorMessage(result.responseText.split('\n\n')[0]);
            }
        });
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
        //console.log('loading lease block layer');
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
        drawing.deleteScenario();
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
    //if ( app.viewModel.scenarios.reports && app.viewModel.scenarios.reports.showingReport() ) {
    //    app.viewModel.scenarios.reports.updateChart();
    //}
    if ( !app.viewModel.scenarios.scenariosLoaded || !app.viewModel.scenarios.selectionsLoaded) {
        // load the scenarios
        app.viewModel.scenarios.loadScenariosFromServer();

        // load the selections
        app.viewModel.scenarios.loadSelectionsFromServer();

        // load the drawing
        app.viewModel.scenarios.loadDrawingsFromServer();

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
