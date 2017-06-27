//Override getState: change digits in x/y coords from 2 to 4 digits after decimal.
app.getState = function () {
    var center = app.map.getCenter().transform(
            new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326")),
                layers = $.map(app.viewModel.activeLayers(), function(layer) {
                    //return {id: layer.id, opacity: layer.opacity(), isVisible: layer.visible()};
                    return [ layer.id, layer.opacity(), layer.visible() ];
                });
    return {
        x: center.lon.toFixed(4),
        y: center.lat.toFixed(4),
        z: app.map.getZoom(),
        logo: app.viewModel.showLogo(),
        controls: app.viewModel.showZoomControls(),
        dls: layers.reverse(),
        basemap: app.map.baseLayer.name,
        themes: {ids: app.viewModel.getOpenThemeIDs()},
        tab: $('#myTab').find('li.active').data('tab'),
        legends: app.viewModel.showLegend() ? 'true': 'false',
        layers: app.viewModel.showLayers() ? 'true': 'false'
        //and active tab
    };
};

/*
// override on map-ready function - remove reference to disclaimer modal, remove call to getState().
$(document).on('map-ready', function () {
    //app.state = app.getState();
});
*/

/*
// override to set state.tab to 'data' rather than 'designs'
// load compressed state (the url was getting too long so we're compressing it
app.loadCompressedState = function(state) {
    // turn off active laters
    // create a copy of the activeLayers list and use that copy to iteratively deactivate
    var activeLayers = $.map(app.viewModel.activeLayers(), function(layer) {
        return layer;
    });
    $.each(activeLayers, function (index, layer) {
        layer.deactivateLayer();
    });
    // turn on the layers that should be active
    if (state.dls) {
        var unloadedDesigns = [];
        for (x=0; x < state.dls.length; x=x+3) {
            var id = state.dls[x+2],
                opacity = state.dls[x+1],
                isVisible = state.dls[x];

            if (app.viewModel.layerIndex[id]) {
                app.viewModel.layerIndex[id].activateLayer();
                app.viewModel.layerIndex[id].opacity(opacity);
                //obviously not understanding something here...
                if (isVisible || !isVisible) {
                    if (isVisible !== 'true' && isVisible !== true) {
                        app.viewModel.layerIndex[id].toggleVisible();
                    }
                }
            } else {
                unloadedDesigns.push({id: id, opacity: opacity, isVisible: isVisible});
            }
       }
       if ( unloadedDesigns.length ) {
            app.viewModel.unloadedDesigns = unloadedDesigns;
            $('#designsTab').tab('show'); //to activate the loading of designs
       }
    }

    if (state.logo === 'false') {
        app.viewModel.hideLogo();
    }

    if (state.controls === 'false') {
        app.viewModel.hideZoomControls();
    }

    if (state.print === 'true') {
        app.printMode();
    }
    if (state.borderless === 'true') {
        app.borderLess();
    }

    if (state.basemap) {
        if (state.basemap.toLowerCase() === 'tilestream') {
            tilestream = new OpenLayers.Layer.OSM("TileStream", "http://tilestream.apps.ecotrust.org/v2/magrish/${z}/${x}/${y}.png", {
                sphericalMercator: true,
                isBaseLayer: true,
                numZoomLevels: 8,
                attribution: ''
            });
            app.map.addLayers([tilestream]);
            app.map.setBaseLayer(tilestream);
        } else {
            app.map.setBaseLayer(app.map.getLayersByName(state.basemap)[0]);
        }
    }

    app.establishLayerLoadState();
    // data tab and open themes
    if (state.themes) {
        //$('#dataTab').tab('show');
        if (state.themes) {
            $.each(app.viewModel.themes(), function (i, theme) {
                if ( $.inArray(theme.id, state.themes.ids) !== -1 || $.inArray(theme.id.toString(), state.themes.ids) !== -1 ) {
                    if ( app.viewModel.openThemes.indexOf(theme) === -1 ) {
                        //app.viewModel.openThemes.push(theme);
                        theme.setOpenTheme();
                    }
                } else {
                    if ( app.viewModel.openThemes.indexOf(theme) !== -1 ) {
                        app.viewModel.openThemes.remove(theme);
                    }
                }
            });
        }
    }

    //if (app.embeddedMap) {
    if ( $(window).width() < 768 || app.embeddedMap ) {
        state.tab = "designs";
    }

    // active tab -- the following prevents theme and data layers from loading in either tab (not sure why...disbling for now)
    // it appears the dataTab show in state.themes above was causing the problem...?
    // timeout worked, but then realized that removing datatab show from above worked as well...
    // now reinstating the timeout which seems to fix the toggling between tours issue (toggling to ActiveTour while already in ActiveTab)
    if (state.tab && state.tab === "active") {
        //$('#activeTab').tab('show');
        setTimeout( function() { $('#activeTab').tab('show'); }, 200 );
    } else if (state.tab && state.tab === "designs") {
        setTimeout( function() { $('#designsTab').tab('show'); }, 200 );
    } else {
        setTimeout( function() { $('#dataTab').tab('show'); }, 200 );
    }

    if ( state.legends && state.legends === 'true' ) {
        app.viewModel.showLegend(true);
    } else {
        app.viewModel.showLegend(false);
    }

    if (state.layers && state.layers === 'false') {
        app.viewModel.showLayers(false);
        app.map.render('map');
    } else {
        app.viewModel.showLayers(true);
    }

    // map title for print view
    if (state.title) {
        app.viewModel.mapTitle(state.title);
    }

    // Google.v3 uses EPSG:900913 as projection, so we have to
    // transform our coordinates
    app.setMapPosition(state.x, state.y, state.z);
    //app.map.setCenter(
    //    new OpenLayers.LonLat(state.x, state.y).transform(
    //        new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913") ), state.z);

    // is url is indicating a login request then show the login modal
    // /visualize/#login=true
//    if (!app.is_authenticated && state.login) { // not sure
//        $('#sign-in-modal').modal('show');
//    }

};
*/
