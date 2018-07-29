// Variables Declaration
var loader = $('#loader');
var basemaps,colors,nStations,refRoutesFreqUrl,eqIntBoroughs,eqIntStations,eqIntRefRoutesGlo,latestSelectedBorough, latestSelectedStation,heatmapStationsLayer,heatmapBoroughsLayer,sortedFreqArr = [], paneTop,paneIntermediate,paneBottom,groupLayer;
var map = null, stations = null, boroughs = null, routes = null;
const days = ['Monday', 'Tuesday', 'Wednesday','Thursday','Friday','Saturday','Sunday'];
var colRampGlo = {
	'stations' : 'YlGnBu',
	'boroughs' : 'Paired'
};
const freqUrl = $('#freq').attr('href');

// number of classes during the classification of the cloropleth maps
const nClasses = 6;
// makimarkers token
L.MakiMarkers.accessToken = "pk.eyJ1IjoibWFyaW9zc2ltb3UiLCJhIjoiY2pqOTlyMzYzMnFuZjNrbW5maW13MXIydCJ9.a7dn8rjCN9DQ65ly7NVgQw";
// link that refers on the routes
const refRoutesUrl =  $('#ref-routes').attr('href');// Assignment
const boroughsUrl = $('#boroughs').attr('href');
const stationsUrl = $('#stations').attr('href');
const stationsPairsRoutesUrl = $('#stations-pairs-routes').attr('href');

// Panels
const statsInfo = L.control({position: 'topright'});
const legend = L.control({position : 'bottomleft'});
const basicInfoTab = L.control({position : 'topleft'});
const boundariesRangeSlider = L.control({position: 'bottomright'});
const menuCommand = L.control({position : 'topleft'});

const cluster = L.markerClusterGroup(
	{
		showCoverageOnHover : false, // When you mouse over a cluster it shows the bounds of its markers
    	disableClusteringAtZoom : 11,
		maxClusterRadius: 40,
		spiderfyDistanceMultiplier: 1,
		chunkedLoading: true,
		chunkInterval: 100
	});

pointToLayerStations = function(geojson, latlng)
{
	return new L.circle(latlng, { radius : 200 });

};
const equalIntervals = (nClasses, url, model) =>
{
	var range = [];
	$.ajax({ url : url, async :false }).done((response)=>
		{
			arr = response[model];
			if (arr instanceof Array) {
            	var maxV = Math.max.apply(null, arr);
            	var minV = Math.min.apply(null, arr);
            	var diff = (maxV - minV)/nClasses;
        	}
        	for(var i=1; i < nClasses+1; i++){range.push(minV+ (i*diff));}
		});
	return range;
};

const changeColors = (e,feature, featureFunction, featureClassName, nClasses,eqInt,colRampGlo)=>{
	var colRamp = $(e.currentTarget).val();
	// updates the global variable
	colRampGlo[featureClassName] = colRamp;

	// updates the current selected color ramp
	feature.eachLayer((layer)=>{
		layer.setStyle({'fillColor' : featureFunction(layer.feature.properties.freq, colRamp, eqInt,nClasses)});
	});
	legend.update(featureClassName, colRamp,nClasses);

	return colRampGlo;
};

const getColor = (freq,colorRamp,featEqInt,nClasses)=>{
	var col = colors[colorRamp][nClasses];
	for(var i=0; i < featEqInt.length; i++){
		if(freq < featEqInt[i]){
			return col[i];
		}
	}
	// if their is no match then it means that its the maximum value
	return col[featEqInt.length-1];
};

const setBoroughStyle = (feature)=>
{
	return {
		    fillColor: getColor(feature.properties.freq,colRampGlo.boroughs,eqIntBoroughs,nClasses),
        	weight: 2,
        	opacity: 1,
        	color: 'white',
        	dashArray: '3',
        	fillOpacity: 0.7
		};
};
const highlightBorough = (e) =>
{
	props = e.target.feature.properties;
	basicInfoTab.update({'bname': props.name, 'bfreq' : props.freq }, e.latLng);
};

const onEachFeatureBoroughs = (feature,layer) =>
{
	layer.on({
		'mouseover': highlightBorough
	});
};

const setStationsStyle = (feature) =>
{
	return {
		color : getColor(feature.properties.freq, colRampGlo.stations, eqIntStations,nClasses),
		fillOpacity: 0.7,
		stroke : false,
	};
};
const highlightStation = (e) =>
{
	// gets the targeted station
	layer = e.target;
	// brings the targeted stations at the top
	layer.bringToFront();
	// sets a different style
	layer.setStyle({
		weight: 5,
		color: '#666',
		dashArray: '',
		fillOpacity: 0.7,
	});
	// updates the statsInfo label
	statsInfo.update(layer.feature.properties);
	// updates the basicInfoTab label
    basicInfoTab.update(
        {
			'bname' : latestSelectedBorough.bname,
			'bfreq' : latestSelectedBorough.bfreq,
			'sname' : layer.feature.properties.station_name,
			'sfreq' : layer.feature.properties.freq,
		},e.latLng);
};
const resetHighlightStation = (e) =>
{
	stations.resetStyle(e.target);
};
const zoomStation = (e) => // e corresponds to a mouse event object
{
	map.fitBounds(e.target.getBounds());
};
const onEachFeatureStations = (feature,layer) =>
{
	layer.on({
		mouseover : highlightStation,
		mouseout : resetHighlightStation,
		dblclick : zoomStation,
	});
};

// Refroutes layers
const setRefRoutesStyle = (feature) => {
	return {
		color : getColor(feature.properties.freq,'Paired', eqIntRefRoutesGlo ,7)
	};
};

const createDivElement = (element,classes) =>
{
	element.div = L.DomUtil.create('div', classes);
	element.update();
	return element.div;
};

const getCoords = (e) =>
{
	// updates the label at the top left part
	try {
		basicInfoTab.update(
            {
                'bname': (latestSelectedBorough.bname ? latestSelectedBorough.bname : '-'),
				'bfreq': (latestSelectedBorough.bfreq  ? latestSelectedBorough.bfreq : 0 ),
                'sname': (latestSelectedStation.sname ? latestSelectedStation.sname : '-'),
                'sfreq': (latestSelectedStation.sfreq ? latestSelectedStation.sfreq : '-' )
            }, e.latlng);

    }catch (e) {};
};

const freezeMap = (el) =>
{
	el.focus(()=>{
		map.dragging.disable();
		map.touchZoom.disable();
		map.doubleClickZoom.disable();
		map.scrollWheelZoom.disable();
		map.boxZoom.disable();
		map.keyboard.disable();
	});
	el.mouseleave(()=>{
		map.dragging.enable();
		map.doubleClickZoom.enable();
		map.touchZoom.enable();
		map.boxZoom.enable();
		map.scrollWheelZoom.enable();
		map.keyboard.enable();
	});
};

const configHeatmap = (response, hlayer,cfg) =>
{
		var data = {max: 8, data : response,};

		var hlayer = new HeatmapOverlay(cfg);
		hlayer.setData(data);
		return hlayer;
};
activateEl = (layer, el) =>
	{
		// main content of the layer
		elContent = el.html().replace('- (ON)','');
		// if the map has the specified layer
		if(map.hasLayer(layer)) {
			map.removeLayer(layer); // removes the layer
			el.html(elContent); // replace the content of the label
		}else {
			map.addLayer(layer);
			el.html(`${elContent} - (ON)`)
			}
		el.toggleClass('activate-layer');

	};
const sortByFreq = (a,b)=>{
	return parseInt(b.properties.freq) - parseInt(a.properties.freq)
};
const getAdjustedUrl = (url,id) =>{
	var rexp = new RegExp(`(${url.slice([url.lastIndexOf('/')+1])})$`);
	url = url.replace(rexp, id);
	return url
};
var refRoutes;
const callSpatialData = (map,refRoutesUrl,sid,freqUrl,mainContainer) =>{
		// if the map has staRoutes layer removes it
		(map.hasLayer(groupLayer) ? map.removeLayer(groupLayer.clearLayers()) : false);

        // calls the routes layer frequencies
		refRoutesFreqUrl = getAdjustedUrl(freqUrl,sid);
		// adjust the stations-pairs-routes layer
        refRoutesUrl = getAdjustedUrl(refRoutesUrl,sid);
		// finds the corresponded equal interval ranges - global
		eqIntRefRoutesGlo = equalIntervals(7,refRoutesFreqUrl,'refRoutes');
		// updates the staRoutes layer

        refRoutes = new L.GeoJSON.AJAX(refRoutesUrl ,{
        	style : setRefRoutesStyle,
        });

        // loads a POI of the station location
		var uniqStaUrl = getAdjustedUrl( $('#unique-station').attr('href') ,sid);
		var station = new L.GeoJSON.AJAX(uniqStaUrl, {
			pointToLayer: (geojson,latlng)=>{return L.marker(latlng, {icon: L.MakiMarkers.icon({icon: "bicycle", color: "#bb1d3b", size: "m"})})},
		});

		// appends the group layer
		groupLayer = L.layerGroup([refRoutes,station], {pane: paneIntermediate}).addTo(map);

		// hide the loader when the routes are loaded
		refRoutes.on('data:loaded', ()=>
			{
        		appendSpatialDataFilter($('#ref-routes-slider-container'), refRoutes, groupLayer, refRoutesUrl);
        		loader.hide();
			});
};
const appendTemporalGraph = (sid,graphContainer) => {
	// adjust the routes layer
	cusRoutesUrl = getAdjustedUrl(stationsPairsRoutesUrl,sid);
	// request the layer
	var routes;
	$.ajax({url: cusRoutesUrl, async: false}).done((response)=>{
		routes=response;
	});

	$('<h1>Hello World</h1>').appendTo(graphContainer);

	console.log(Object.keys(routes).length);
};
const appendSpatialDataFilter = (sliderContainer,refRoutes,groupLayer,refRoutesUrl)  =>{
	const refRoutesArr = refRoutes.toGeoJSON().features; // gets an array of the reference routes
	const nRefRoutes = refRoutesArr.length; // length

	// append the following content
	$(`<div class="row" id="ref-routes-slider-content">
					<div class="col-2"><strong>1</strong></div>
					<div class="col-8"><strong><em>Top N Routes</em></strong></div>
					<div class="col-2"><strong>${nRefRoutes}</strong></div>
			   </div>
			   <div class="row">
			   		<div class="col-12"><input id="slider-ref-routes" type="range" min="1" max="${nRefRoutes}" value="${nRefRoutes}" class="slider"></div>
			   </div>`).appendTo(sliderContainer);

	var slider = $('#slider-ref-routes');
	freezeMap(slider); // freeze the map when the slider is on the focus
	slider.on('change', (e)=>{

		var sliderVal = $(e.currentTarget).val();
		var sorrefRoutesArr = refRoutesArr.sort(sortByFreq);

		if (groupLayer.hasLayer(refRoutes)){
			ajaxStartLoader(); // enables loading
			groupLayer.removeLayer(refRoutes); // removes the previous refRoutes layer

			refRoutes = new L.GeoJSON.AJAX(refRoutesUrl,{
				style: setRefRoutesStyle,
				filter: (feature)=>{return (feature.properties.freq > sorrefRoutesArr[sliderVal].properties.freq ? true : false)},
			}).addTo(groupLayer);

			ajaxStopLoader(refRoutes); // ends loading
		}
	});
};
const ajaxStopLoader = (spatialStructure)=>{
	spatialStructure.on('data:loaded',()=>{
		loader.hide();
	});
};
const ajaxStartLoader = ()=>{
	loader.show();
};
const updateStaRoutesList = (map,refRoutesUrl,e, freqUrl)=> {
	// shows a loader
	ajaxStartLoader();

	if ($(e.currentTarget).attr('disabled') == undefined) {
        // local variables
        var sid = $(e.currentTarget).val();
        //var mainContainer= $('#main-container');
		//mainContainer.html(''); // empty the content

        // adds the spatial structure
        callSpatialData(map, refRoutesUrl, sid,freqUrl,$('#ref-routes-slider-container'));
        // analyse the routes and returns a temporal graph
        appendTemporalGraph(sid,$('#temp-graph-container'));
    }
};

//----------------------------------------------------------------------------------------------------------------------
// Panels
statsInfo.onAdd = function(map) {return createDivElement(this,'info info-stats col-10');};
statsInfo.update  = function(targetedStationProps) {};

const infoStatsDate = (el) => {
	var d = new Date();
	var dateTime = `${days[d.getDay()]} ${d.getDay()}/${d.getDate()}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
	el.find('h4 em').text(dateTime.toString());
};

const infoStatsUpdate = (el) =>{
	el.html('<h4><em></em></h4>'); // date
	html = el.html().toString(); // get the context
	try {
		html = html.concat(`<div class="container-fluid">
								<div class="row">
									<div class="btn-group-toggle col-4" data-toggle="buttons">
										<button class="mybtn active">Active</button>
									</div>
									<div class="col-8 form-group">
										<select id="station-routes" class="custom-select">
											<option value="">Select a Station Route</option>`
		);

        for (station of stations.toGeoJSON().features) {
            html = html.concat(`<option value="${station.properties.pk}">${station.properties.station_name}</option>`.toString());
        }
        html = html.concat(`</select></div></div>
								<div id="main-container">
									<div id="ref-routes-slider-container" class="col-12"></div>
									<div id="temp-graph-container" class="col-12"></div>
								</div>
							</div>`);
    }catch (e) {
		console.log(e)
    }
    // replace the html
	el.html(html);
};


// Custom control Button - Creation
basicInfoTab.onAdd = function(map){return createDivElement(this,'info basic-info-tab');};
// method that will use to update the control based on feature properties passed
basicInfoTab.update = function(props,coords){
	// if the mouse is over a POI, then its coordinates are gained	`
	this.div.innerHTML = (coords ? '<b>Latitude: </b>' + coords.lat.toFixed(4)+ '&#176\t<b>Longitude: </b>' + coords.lng.toFixed(4) + '&#176': 'Hover over the map');

	// Try-catch block of borough layer
	try {
		this.div.innerHTML += (props ? '<br><b>Borough: </b>' +  props.bname: '<br>Hover over the borough');
        this.div.innerHTML += `<br><b>Value of Borough Color: </b> ${((props.bfreq/nStations)*100).toFixed(2).toString()} %`;
        latestSelectedBorough = {
        	'bname' : props.bname,
        	'bfreq' : props.bfreq,
        };
	}catch (e){};
	// Try-catch block of stations layer
    try{
		this.div.innerHTML += (props ? '<br><b>Station: </b>' + props.sname : '<br>Hover over the station');
		this.div.innerHTML += '<br><b>Value of Station Color: </b>' + props.sfreq;
		latestSelectedStation = {
			'sname' : props.sname,
			'sfreq' : props.sfreq,
		}
	}catch(e){};
};

legend.onAdd = function(map)
{
	var div = L.DomUtil.create('div', 'info legend');
	var cBoroughs = equalIntervals(nClasses,freqUrl, 'boroughs');
	var cStations = equalIntervals(nClasses,freqUrl,'stations');

	cBoroughs.unshift(0);
	cStations.unshift(0);

	// content of BOROUGHS
	div.innerHTML = '<h4>Boroughs Color</h4><p>**the color corresponds to the number of stations within a borough</p>';

	// legend
	for(var i=0; i < cBoroughs.length-1;i++)
	{
		div.innerHTML += `<i class="boroughs" style="background: ${getColor(cBoroughs[i],colRampGlo.boroughs, eqIntBoroughs, nClasses)}"></i> ${cBoroughs[i].toFixed(2) + (cBoroughs[i+1] ? ' &ndash; ' + cBoroughs[i+1].toFixed(2) + '<br>' : '')}`;
	};
	// dropdown list
	div.innerHTML += `<select id='color-ramp-boroughs' class="color-ramp"><option value="YlGnBu">YlGnBu</option><option value="Reds">Reds</option><option value="YlGn">YlGn</option><option value="Paired" selected>Paired</option><option value="Pastel2">Pastel2</option><option value="Set3">Set3</option><option value="Accent">Accent</option></select>`;

	// content of STATIONS
	div.innerHTML += '<hr><h4>Stations Color</h4><p>**the color corresponds to the number of routes that either they have started or ended in a station</p>';
	// legend
	for(var i=0; i < cStations.length-1; i++)
	{
		div.innerHTML += `<i class="stations" style="background: ${getColor(cStations[i],colRampGlo.stations, eqIntStations, nClasses)}"></i> ${cStations[i].toFixed(0) + (cStations[i+1] ? ' &ndash; ' + cStations[i+1].toFixed(0) + '<br>' : '')}`;
	};
	// color-ramp of stations
	div.innerHTML += `<select id='color-ramp-stations' class="color-ramp"><option value="YlGnBu" selected>YlGnBu</option><option value="Reds">Reds</option><option value="YlGn">YlGn</option><option value="Paired">Paired</option><option value="Pastel2">Pastel2</option><option value="Set3">Set3</option><option value="Accent">Accent</option></select>`;

	return div;
};

// triggers whenever a user changes a coloramp
legend.update = function(option, colorRamp, nClasses){
	var iElements = $(`div i.${option}`);
	for(var i=0; i < iElements.length; i++)
	{
		iElements.eq(i).css('background', colors[colorRamp][nClasses][i]);
	}
};

boundariesRangeSlider.onAdd = function(map) {return createDivElement(this,'boundaries-range-slider');};
boundariesRangeSlider.update  = function()
{
	this.div.innerHTML = '<div class="borough-vis-container"><i class="fa fa-eye-slash" aria-hidden="true"></i><input type="range" min="1" max="100" value="70" id="borough-vis-slider" class="slider"><i class="fa fa-eye" aria-hidden="true"></i></div>';
};

menuCommand.onAdd = function(map){return createDivElement(this,'menuCommand');};
menuCommand.update = function()
{
	this.div.innerHTML = '<button type="button" id="sidebarCollapse" class="navbar-btn"><span></span><span></span><span></span></button>';
};

//---------------------------------------------------------------------------------------------------------------------

// event that is called when the map is initialised
$(window).on("map:init", function(event) {
	console.log('window-map--init');

	map = event.detail.map;

	// Call the basemap layers
	// CartoDB
	var cartoDBVouagerLabels = L.tileLayer.provider('CartoDB.VoyagerLabelsUnder');
	var cartoDBPositron = L.tileLayer.provider('CartoDB.Positron');
	var cartoDBDarkMatter = L.tileLayer.provider('CartoDB.DarkMatter');
	// OSM
	var osmMapnik = L.tileLayer.provider('OpenStreetMap.Mapnik');
	var osmBlackAndWhite = L.tileLayer.provider('OpenStreetMap.BlackAndWhite');
	var osmHot = L.tileLayer.provider('OpenStreetMap.HOT');
	// Esri
	var worldStreetMap = L.tileLayer.provider('Esri.WorldStreetMap');
	var worldTopoMap = L.tileLayer.provider('Esri.WorldTopoMap');
	var worldImagery = L.tileLayer.provider('Esri.WorldImagery');

	// Adds the cartoDBVouagerLabels layer on the initial map
	map.addLayer(cartoDBVouagerLabels);
	// basemaps array - GLOBAL variable
	basemaps = [cartoDBVouagerLabels, cartoDBPositron, cartoDBDarkMatter, osmMapnik,osmBlackAndWhite,osmHot,worldStreetMap,worldTopoMap,worldImagery];

	stations = new L.GeoJSON.AJAX(stationsUrl,
		{
			style : setStationsStyle,
			pointToLayer : pointToLayerStations,
			onEachFeature: onEachFeatureStations,
		});

    // equal-intervals of stations
	eqIntStations = equalIntervals(nClasses,freqUrl,'stations');

	stations.on('data:loaded', function(){
    		console.log('stations are loaded..');
    		// updates the info stats all
			infoStatsUpdate($('.info-stats'));
			// adds an event on the dropdown list of .info-stats
			$('#station-routes').on('change', (e) =>{
				updateStaRoutesList(map,refRoutesUrl, e, freqUrl);
			});

			$('div.info.info-stats.leaflet-control button').on('click', function(){
				if($(this).hasClass('active')){
						(map.hasLayer(groupLayer) ? map.removeLayer(groupLayer) : false);
						$('#station-routes').attr('disabled',true); // set the button as disable
                        $(this).text('Disable'); // change the text to disable
						$('#main-container').html(''); // removes the content of the main-container
				}else{
						$('#station-routes').attr('disabled', false); // se the button as active
						$(this).text("Active"); // change the text to active
				}
				$(this).toggleClass('active');
			});

    		// adds the cluster group on the map, containing a featureGroup
            cluster.addLayer(stations);
			// number of stations
			nStations = stations.toGeoJSON().features.length;

			// adds a slider bar in the legend
			$('div.legend.info').append( `
					<br>
					<br>
					<table id="table-sFilterSlider">
						<tr>
							<th>1</th>
							<th><em>Top N stations</em></th>
							<th>${nStations}</th>
						</tr>
					</table>
					<input type="range" class="slider" value="${nStations}" min="1" max="${nStations}" id="sFilterSlider">
			`);

			// add onfocus and on mouseLeave events on the sFilterSlider;
			freezeMap($('#sFilterSlider'));
			// populate the sortedFreqArr with the frequencies of each station
			for(feature of stations.toGeoJSON().features){sortedFreqArr.push(feature.properties.freq);};
			// sort frequencies
			sortedFreqArr.sort(function(a,b){return b-a;});

			$('#sFilterSlider').on('change', (e)=>{
				dynamicFilterFun = (feature) => {
					if (sortedFreqArr.indexOf(feature.properties.freq) < sliderVal) {
						return true;
					}
				};

				var sliderVal = $(e.currentTarget).val();
				try{cluster.removeLayer(stations)}catch (e) {console.log(e)};
				// removes the layer from the marker cluster control (var cluster), so it can update
				stations = new L.GeoJSON.AJAX(stationsUrl,
					{
						style : setStationsStyle,
						pointToLayer : pointToLayerStations,
						onEachFeature: onEachFeatureStations,
						filter : dynamicFilterFun,
						pane: paneIntermediate,
					});
				// wait for 0.5 sec, and then adds the stations
				setTimeout(()=>{cluster.addLayer(stations);},500);
			});

			// deactivate the loader
			loader.hide();
    }.bind(this)); // is called when the data are downloaded

	boroughs = new L.GeoJSON.AJAX(boroughsUrl,
		{
			style: setBoroughStyle,
			onEachFeature: onEachFeatureBoroughs,
			pane : 'paneBottom'
		});

	// equal-intervals of boroughs
	eqIntBoroughs = equalIntervals(nClasses,freqUrl, 'boroughs');


});

// While the window is loaded, all commands, buttons and labels are added
$(window).on('load', ()=>
{
	console.log('window-load');

	// adds the info stats label
	statsInfo.addTo(map);
	// updates the info stats label every second (date)
	setInterval(()=>{infoStatsDate($('.info-stats'))},1000);

	// adds a scale control on the map
	L.control.scale({maxWidth : 500, metric: true, imperial: true}).addTo(map);
	// Remove Attribution
	$('.leaflet-control-attribution').hide();
	// adds a label that shows the geographical coordinates of the map
	basicInfoTab.addTo(map); // adds the control scale

	// adds the menu command on the map
	menuCommand.addTo(map);
	// adds a legend on the map
	legend.addTo(map);
	// add the defaultExtent command
	L.control.defaultExtent()
		.setCenter([51.49720,0.018539])
		.setZoom(10)
		.addTo(map);


	// Panes creation
	paneBottom = map.createPane('paneBottom').style.zIndex = 250;
	paneIntermediate = map.createPane('paneIntermediate').style.zIndex = 400;
	paneTop = map.createPane('paneTop').style.zIndex = 800;

	map.addLayer(cluster);
	map.addLayer(boroughs);
	//
    map.flyToBounds(L.latLngBounds(L.latLng(51.19548,-0.35654),L.latLng(51.79624,0.39437)));


	// adds a slider bar in the legend

	$('#layersSubMenu li:first-of-type a').on('click', function() {
		activateEl(cluster,$(this));
	});
	$('#layersSubMenu li:last-of-type a').on('click', function(){
		activateEl(boroughs, $(this));
	});
	$('#heatmaps li:first-of-type a').on('click', function () {
		activateEl(heatmapStationsLayer, $(this));
    });
	$('#heatmaps li:last-of-type a').on('click', function(){
		activateEl(heatmapBoroughsLayer, $(this));
	});

	// adds the functionality of the basemap labels
	$('#basemapsSubMenu li a').on('click', function(){
		var allBasemapLab = $('#basemapsSubMenu li a');
		for(index in basemaps)
		{
			if (map.hasLayer(basemaps[index]))
			{
				map.removeLayer(basemaps[index]);
				$(allBasemapLab[index]).removeClass('activate-layer');
			}
			try {
				// for CartoDB and Esri Basemap
				if (basemaps[index]._url.replace('variant', basemaps[index].options.variant) === $(this).attr('href').slice(1))
				{
					$(this).addClass('activate-layer');
					map.addLayer(basemaps[index]);
				}
            }catch (e) {
				// for OSM basemaps
                if (basemaps[index]._url === $(this).attr('href').slice(1))
				{
					$(this).addClass('activate-layer');
					map.addLayer(basemaps[index]);
				}
            }
		}
	});
	// closes a tab when another it opens
	$('#basemapsSubMenu a.dropdown-toggle').on('click', (e)=>{
		ul = $('#basemapsSubMenu ul');
		for(var i=0; i < ul.length; i++)
		{
			ul.eq(i).removeClass('show');
		}
	});

	// adds interaction on the sidebar
    $('#sidebarCollapse').on('click', (e) => {
    	$('#sidebar').toggleClass('active');
        $(e.currentTarget).toggleClass('active');
    });

	// mousemove event over the map
	map.on('mousemove', getCoords); // mousemove event

	// adds a range slider that modifies the boroughs visibility
	boundariesRangeSlider.addTo(map);

	freezeMap($('#borough-vis-slider'));
	$('#borough-vis-slider').on('change', (e) =>
	{
		// set the default opacity
		boroughs.setStyle({fillOpacity: 0.7, opacity: 0.7});
		// gets the user specified value
		var val = (parseFloat($(e.currentTarget).val()) / 100).toFixed(1);
		// sets the user opacity
		boroughs.setStyle({fillOpacity: val, opacity: val});
	});

	$('#color-ramp-boroughs').on('change',(e)=>
	{
		colRampGlo = changeColors(e,boroughs,getColor,'boroughs',nClasses, eqIntBoroughs, colRampGlo);
	});

	$('#color-ramp-stations').on('change',(e)=>
	{
		colRampGlo = changeColors(e,stations,getColor,'stations',nClasses, eqIntStations, colRampGlo);
	});

});



// While the document is prepared, the events of the commands, buttons are added
$(document).ready(() => {
	console.log('document-onready');
	loader.show();

	$.ajax($('#heatmapStations').attr('href')).done((response)=>
		{
			console.log('heatmap stations is loaded...');
			heatmapStationsLayer = configHeatmap(response, heatmapStationsLayer, {
  				// radius should be small ONLY if scaleRadius is true (or small radius is intended)
  				// if scaleRadius is false it will be the constant radius used in pixels
  				"radius": 0.003,
  				"maxOpacity": .5,
  				// scales the radius based on map zoom
  				"scaleRadius": true,
				// if set to false the heatmap uses the global maximum for colorization
  				// if activated: uses the data maximum within the current map boundaries
  				//   (there will always be a red spot with useLocalExtremas true)
  				"useLocalExtrema": false,
				// which field name in your data represents the latitude - default "lat"
  				latField: 'lat',
  				// which field name in your data represents the longitude - default "lng"
  				lngField: 'lng',
  				// which field name in your data represents the data value - default "value"
  				valueField: 'freq'
		});

	});

	$.ajax($('#heatmapBoroughs').attr('href')).done((response)=>
		{
			console.log('heatmap stations is loaded...');
			heatmapBoroughsLayer = configHeatmap(response, heatmapBoroughsLayer, {
  				// radius should be small ONLY if scaleRadius is true (or small radius is intended)
  				// if scaleRadius is false it will be the constant radius used in pixels
  				"radius": 0.05,
  				"maxOpacity": .5,
  				// scales the radius based on map zoom
  				"scaleRadius": true,
				// if set to false the heatmap uses the global maximum for colorization
  				// if activated: uses the data maximum within the current map boundaries
  				//   (there will always be a red spot with useLocalExtremas true)
  				"useLocalExtrema": true,
				// which field name in your data represents the latitude - default "lat"
  				latField: 'lat',
  				// which field name in your data represents the longitude - default "lng"
  				lngField: 'lng',
  				// which field name in your data represents the data value - default "value"
  				valueField: 'freq'
		});

	});

	// get the colors palette from colorbrewer
	$.ajax({url : 'http://colorbrewer2.org/export/colorbrewer.json', async: false}).done((response)=>{
		colors = response;
	});

});


