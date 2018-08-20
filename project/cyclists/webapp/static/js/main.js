// Variables Declaration
var loader = $('#loader');
var basemaps,colors,nStations,hashStations = {}  ,refRoutesFreqUrl,eqIntBoroughs,eqIntStations,eqIntRefRoutes,latestSelectedBorough, latestSelectedStation,heatmapStationsLayer,heatmapBoroughsLayer,sortedFreqArr = [], paneTop,paneIntermediate,paneBottom,groupLayer;
var map, stations,refRoutes,boroughs,routes;
const days = ['Monday', 'Tuesday', 'Wednesday','Thursday','Friday','Saturday','Sunday'];
let minWidth = 896; minHeight = 672;

var colRampGlo = {
	'stations' : 'YlGnBu',
	'boroughs' : 'Paired',
	'routes' : 'Paired',
};
var graphLayout = {
	  	font: {
          family: 'Poppins, sans-serif',
          size: 14,
          color: '#7f7f7f'
      	},
		yaxis: '',
		xaxis: '',
		showlegend:true,
		legend: {
   			 x: 0.5,
			 y: 0.5,
			 "orientation": 'v' ,
  		},
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
		scene: {
            aspectratio: {
                x: 1,
                y: 1,
                z: 1
            },
            camera: {
                center: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                eye: {
                    x: 1.25,
                    y: 1.25,
                    z: 1.25
                },
                up: {
                    x: 0,
                    y: 0,
                    z: 1
                }
            },
            xaxis: {
                type: 'linear',
                zeroline: false
            },
            yaxis: {
                type: 'linear',
                zeroline: false
            },
            zaxis: {
                type: 'linear',
                zeroline: false
            }
        },
		margin : {
			l:65,
			r:20,
			b:40,
			t:40,
			pad:4
		},
		autosize: true,
};
var scatterLayout = {
		font: {
          family: 'Poppins, sans-serif',
          size: 14,
          color: '#7f7f7f'
      	},
		margin : {
			l:0,
			r:0,
			b:0,
			t:0,
			pad: 10
		},
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
		showlegend: false,
		autosize: false,
		width: 180,
		height: 180,
		scene: {
            aspectratio: {
                x: 1,
                y: 1,
                z: 1
            },
            camera: {
                center: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                eye: {
                    x: 1.25,
                    y: 1.25,
                    z: 1.25
                },
                up: {
                    x: 0,
                    y: 0,
                    z: 1
                }
            },
            xaxis: {
                type: 'linear',
				gridcolor: 'rgb(255, 255, 255)',
            	zerolinecolor: 'rgb(255, 255, 255)',
            	showbackground: true,
            	backgroundcolor: 'rgb(230, 230,230)'
            },
            yaxis: {
                type: 'linear',
            	gridcolor:'rgb(255, 255, 255)',
            	zerolinecolor:'rgb(255, 255, 255)',
            	showbackground:true,
            	backgroundcolor:'rgb(230, 230,230)'
            },
            zaxis: {
                type: 'linear',
				gridcolor:'rgb(255, 255, 255)',
            	zerolinecolor:'rgb(255, 255, 255)',
            	showbackground:true,
            	backgroundcolor:'rgb(230, 230,230)'
            },
            aspectratio : { x:1, y:1, z:0.7 },
        	aspectmode : 'manual',
        }
};
// number of classes during the classification of the cloropleth maps
const nClasses = 6;
// makimarkers token
L.MakiMarkers.accessToken = "pk.eyJ1IjoibWFyaW9zc2ltb3UiLCJhIjoiY2pqOTlyMzYzMnFuZjNrbW5maW13MXIydCJ9.a7dn8rjCN9DQ65ly7NVgQw";
// link that refers on the routes
const refRoutesUrl =  $('#ref-routes').attr('href');// webapp_stations_pairs_routes
const boroughsUrl = $('#boroughs').attr('href'); // webapp_boroughs
const stationsUrl = $('#stations').attr('href'); // webapp_stations
const stationsPairsRoutesUrl = $('#stations-pairs-routes').attr('href'); // webapp_routes
const kMeansUrl = $('#kmeans').attr('href');
const freqUrl = $('#freq').attr('href');
const monthlyRoutesUrl = $('#monthly_routes').attr('href');

// Panels
const statsInfo = L.control({position: 'topright'});
const legend = L.control({position : 'bottomleft'});
const basicInfoTab = L.control({position : 'topleft'});
const boundariesRangeSlider = L.control({position: 'bottomright'});
const menuCommand = L.control({position : 'topleft'});
const velocity = 15/3600 ;
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
		color : getColor(feature.properties.freq, colRampGlo.routes, eqIntRefRoutes ,nClasses)
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
	el.mouseover(()=>{
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
const refRoutesPanel = (e)=>{
	var feature = e.target.feature.properties;

	// finds the average duration of the routes
	// from all routes, only the routes that are selected by the mouse are loaded
	var filteredCusRoutes = cusRoutes.filter((f)=> {return f.fields.station_pairs_id == feature.pk}); // f.id is the pair id
	// times that the selected pair is covered
	var annualFrequency = filteredCusRoutes.length;
	// average predicted distance of the routes
	var avgCusRoutesTime = filteredCusRoutes.reduce((a,b)=>a+parseInt(b.fields.duration),0)/annualFrequency;

	// set style on the route that is selected
	e.target.bringToFront();
	e.target.setStyle({
		weight: 5,
		color: '#666',
		dashArray: '',
		fillOpacity: 0.7,
	});

	// creates a div (panel)
	var leafletControlContainer = $('#map div.leaflet-control-container');
	leafletControlContainer.append('<div class="info ref-routes-panel"></div>');
	// variable of the created div
	var refRoutesPanel = leafletControlContainer.find('div.ref-routes-panel');
	// set its location on the map
	refRoutesPanel.css({
		'top': e.containerPoint.y,
		'left': e.containerPoint.x,
	});
	// fil the content of the div
	refRoutesPanel.html(`<div>
							<h4><b>Routes of ${hashStations[feature.start_station_id].station_name}</b></h4>
						 	<ul>
						 		<li><span>Start Station Name:</span>  ${hashStations[feature.start_station_id].station_name}</li>
						 		<li><span>End Station Name:</span>  ${hashStations[feature.end_station_id].station_name}</li>		
								<li><span>Baseline Time:</span> ${feature.balanced_ref_time} s</li>	
								<li><span>Avg Predicted Time:</span> ${avgCusRoutesTime.toFixed(2)} s</li>
								<li><span>Baseline Dist:</span> ${feature.balanced_ref_dist} m</li>
								<li><span>Avg Predicted Distance:</span> ${(avgCusRoutesTime*velocity*1000).toFixed(2)} m</li>
								<li><span>Annual Flow:</span> ${annualFrequency}</li>
								<li><span>Global Flow:</span> ${feature.freq} </li>
							</ul>
						 </div>`);
};
const resetHighlightRefRoutes = (e)=>{
	refRoutes.resetStyle(e.target);
	$('div.ref-routes-panel').remove();
};
const refRoutesOnEachFeature = (feature,layer) =>{
	layer.on({
		 'mouseover': refRoutesPanel,
		 'mouseout': resetHighlightRefRoutes,
	})  ;
};
const callSpatialData = (map,refRoutesUrl,sid,freqUrl,cusRoutes) =>{
		// if the map has staRoutes layer removes it
		(map.hasLayer(groupLayer) ? map.removeLayer(groupLayer.clearLayers()) : false);

        // calls the routes layer frequencies
		refRoutesFreqUrl = getAdjustedUrl(freqUrl,sid);
		// adjust the stations-pairs-routes layer
        refRoutesUrl = getAdjustedUrl(refRoutesUrl,sid);
        // finds the corresponded equal interval ranges - global
		eqIntRefRoutes = equalIntervals(nClasses,refRoutesFreqUrl,'refRoutes');
		// updates the staRoutes layer

        refRoutes = new L.GeoJSON.AJAX(refRoutesUrl ,{
        	style : setRefRoutesStyle,
			onEachFeature: refRoutesOnEachFeature,
        });  // webapp_stations_pairs_routes model

		if($('#ref-routes-slider-container').has($('#slider-ref-routes')).length) changeColorsRefRoute(refRoutes);

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
        		appendRefRoutesLegend($('#legend-graph-container'), eqIntRefRoutes, refRoutesFreqUrl);

        		//(counter === 0 ?  appendRefRoutesLegend($('#legend-graph-container'), eqIntRefRoutes, refRoutesFreqUrl) : false);
        		appendDistributionGraph($('#distances-distribution-graph-container'),cusRoutes);

        		loader.hide();
			});
};

const appendDistributionGraph = (disGraphContainer,cusRoutes) => {
	// baseline distances
	var refRoutesArr = refRoutes.toGeoJSON().features;
	//var sumRefDistances = refRoutesArr.reduce((a,b)=> a+b.properties.balanced_ref_dist,0);
	var refDistances = refRoutesArr.map((f)=>{ return (f.properties.balanced_ref_time)}); // expressed in km

	var cusDistances = cusRoutes.map((f)=>{return (f.fields.duration)});
	// create a div that will contains the graph if it does not exist
	(disGraphContainer.has('#distribution-container').length ? true : $(`<div class="col-12" id="distribution-container"></div>`).appendTo(disGraphContainer));
	// distances options
	var refHist = {x : refDistances,name: 'Baseline',type: 'histogram',histfunc : 'count',histnorm:'probability density',autobinx:true,opacity:0.5, marker: {color: 'red'} };
	var cusHist = {x : cusDistances,name: 'Cycle Hire data', type: 'histogram',histfunc : 'count',histnorm:'probability density', autobinx:true,opacity: 0.5, marker: {color: 'green'}};

	// modifies the axis values
	graphLayout.yaxis = {'title' : 'P( X = duration )'}, graphLayout.xaxis = {'title':'duration (s)', 'range': [0,5000]}, graphLayout['barmode'] = "overlay";
	//graphLayout.title = 'Baseline vs Cycle Hire Data Distribution';
	graphLayout.legend = true;
	Plotly.newPlot('distribution-container',[refHist,cusHist], graphLayout, {staticPlot: false, displayModeBar: false});
};

const appendRefRoutesLegend = (graphContainer,eqIntRefRoutes,refRoutesFreqUrl) => {
	if(graphContainer.children().length == 0) {
        graphContainer.append(`<div>
							<h4>Routes</h4>
							<div></div>
						  </div>`);
        cRefRoutes = equalIntervals(nClasses, refRoutesFreqUrl, 'refRoutes');
        cRefRoutes.unshift(0);

        // append question mark
		appendQuestionBtn(graphContainer.find('h4'),'ref-routes','left','<h4>Route Layer Description</h4><p>The color of a road segment demonstrates the cycling flow since 1st January 2015, by which the flow is calculated by the number of times that a road segment had been used by a cyclists. It is expected that the majority of road segments to maintain a similar color, which means low bicycle flow. In contrast, a small portion of road segments with exceptionally high flow are expected to have different color.</p><h4>Color Ramp</h4><p>A color ramp is available so that a user to choose the best combination for its screen.</p>');


        populateLegend('refRoutes', cRefRoutes, colRampGlo.routes, eqIntRefRoutes, nClasses, graphContainer.find('div').find('div'));
        // dropdown list
        $(`<select id='color-ramp-refroutes' class="color-ramp">
							<option value="YlGnBu">YlGnBu</option>
							<option value="Reds">Reds</option>
							<option value="YlGn">YlGn</option>
							<option value="Paired" selected>Paired</option>
							<option value="Pastel2">Pastel2</option><option value="Set3">Set3</option>
							<option value="Accent">Accent</option>
						</select>`).appendTo(graphContainer.find('div').find('div').eq(0));

        changeColorsRefRoute(refRoutes);
    }
};
const changeColorsRefRoute = (refRoutes)=>{
	$('#legend-graph-container').on('change','select', (e)=> {

		var colRamp = $(e.currentTarget).val();
        colRampGlo['routes'] = colRamp;
        refRoutes.eachLayer((layer) => {
            layer.setStyle({'color': getColor(layer.feature.properties.freq, colRamp, eqIntRefRoutes, nClasses)});
        });

        let ies = $('i.refRoutes');
		for(var i=0; i < ies.length; i++){
        	ies.eq(i).css('background',colors[colRamp][nClasses][i]);
		}
    });
};

const appendSpatialDataFilter = (sliderContainer,refRoutes,groupLayer,refRoutesUrl)  =>{
	const refRoutesArr = refRoutes.toGeoJSON().features; // gets an array of the reference routes
	const nRefRoutes = refRoutesArr.length; // length

	// append the following content
	sliderContainer.html('');
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
				onEachFeature: refRoutesOnEachFeature,
				filter: (feature)=>{return (feature.properties.freq > sorrefRoutesArr[sliderVal].properties.freq ? true : false)},
			}).addTo(groupLayer);

			changeColorsRefRoute(refRoutes); // updates the changecolor ramp events
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

var cusRoutes;
const updateStaRoutesList = (map,refRoutesUrl,e, freqUrl)=> {
	// shows a loader
	ajaxStartLoader();

	if ($(e.currentTarget).attr('disabled') == undefined) {
        // local variables
        var sid = $(e.currentTarget).val();
        // Request the routes of the selected station(sid)
        var cusRoutesUrl = getAdjustedUrl(stationsPairsRoutesUrl,sid);
		// request the layer
		$.ajax({url: cusRoutesUrl, async: false}).done((response)=>{
			cusRoutes=response; // loaded routes of 2017
		});

        // adds the spatial structure
        callSpatialData(map, refRoutesUrl, sid,freqUrl, cusRoutes);
        appendMonthlyGraph($('#monthly-graph-container'), sid)
    }
};

const appendMonthlyGraph = (monthlyGraphContainer, sid) =>{
	    // adds a div if it does not exist
	    ((monthlyGraphContainer.has($('#monthly-temporal-graph')).length) ? true : monthlyGraphContainer.append('<div id="monthly-temporal-graph" class="col-12"></div>'));

		$.ajax({url : getAdjustedUrl(monthlyRoutesUrl,sid) , async: true}).done((response)=>{
			let x = []; y = [];
			Object.keys(response).map((key)=>{
				x.push(response[key].month);
				y.push(response[key].count);
			});

			graphLayout.yaxis = {'title' : 'Flow per month'}, graphLayout.xaxis = {'title':'', 'range': [x[0], x[x.length-1]]}, graphLayout.showlegend = false;
			//graphLayout.title = 'Temporal Graph of Flow per Month';

			Plotly.newPlot('monthly-temporal-graph', [{x : x, y : y , type: 'scatter', mode: 'lines'}], graphLayout, {staticPlot: false, displayModeBar: false});
		});
};
appendQuestionBtn = (el,name,position,content)=>{

	$(`<a href="#" id="${name}-question-btn" data-toggle="tooltip" data-placement="${position}" data-html="true" title="" data-original-title="${content}" class="question-btn"><i class="fas fa-info-circle"></i></a>`).appendTo(el);
	$(`	#${name}-question-btn`).tooltip();
	//$(`<button id="${name}-question-btn" type="button" class="btn btn-secondary question-btn" data-toggle="tooltip" data-placement="top" title="${content}" disabled><i class="fas fa-question"></i></button>`).appendTo(el);
};

//----------------------------------------------------------------------------------------------------------------------
// Panels
statsInfo.onAdd = function(map) {return createDivElement(this,'info info-stats');};
statsInfo.update  = function(targetedStationProps) {};

const infoStatsUpdate = (el) =>{
	html = el.html().toString(); // get the context
	try {
		html = html.concat(`<div class="container-fluid">
								<div class="row">
									<div class="btn-group-toggle col-4" data-toggle="buttons">
										<button class="mybtn active">Active</button>
									</div>
									<div class="col-8">
										<select id="station-routes" class="custom-select">
											<option value="">Select a Station Route</option>`
		);

        for (station of stations.toGeoJSON().features) {
            html = html.concat(`<option value="${station.properties.pk}">${station.properties.station_name}</option>`.toString());
        }
        html = html.concat(`</select></div></div>
								<ul class="nav nav-tabs" id="myTab" role="tablist">
 									<li class="nav-item">
    									<a class="nav-link active" id="descriptive-tab" data-toggle="tab" href="#descriptive-container" role="tab" aria-selected="true">Descriptive</a>
  									</li>
  									<li class="nav-item">
    									<a class="nav-link" id="graphs-tab" data-toggle="tab" href="#graphs-container" role="tab" aria-selected="true">Graphs</a>
  									</li>	
								</ul>
								<div class="tab-content" id="myTabContent">
									<div class="tab-pane fade show active" id="descriptive-container" role="tabpanel">
										<div class="row">
											<div class="col-12" id="ref-routes-slider-container"></div>	
											<div id="legend-graph-container" class="col-12 legend"></div>		
										</div>
									</div>
									<div class="tab-pane fade" id="graphs-container" role="tabpanel">		
										<div class="row">
											<div id="distances-distribution-graph-container" class="col-12"></div>
											<div id="monthly-graph-container" class="col-12"></div>	
										</div>
									</div>
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
        this.div.innerHTML += `<br><b>% of Stations within Borough: </b> ${((props.bfreq/nStations)*100).toFixed(2).toString()} %`;
        latestSelectedBorough = {
        	'bname' : props.bname,
        	'bfreq' : props.bfreq,
        };
	}catch (e){};
	// Try-catch block of stations layer
    try{
		this.div.innerHTML += (props ? '<br><b>Station: </b>' + props.sname : '<br>Hover over the station');
		this.div.innerHTML += '<br><b>Station Global Flow: </b>' + props.sfreq;
		latestSelectedStation = {
			'sname' : props.sname,
			'sfreq' : props.sfreq,
		}
	}catch(e){};
};

const populateLegend = (className,cModel,colRampGloOpt,eqIntModel,nClasses,el)=>{
	for(var i=0; i < cModel.length-1;i++)
	{
		$(`<div><i class="${className}" style="background: ${getColor(cModel[i], colRampGloOpt, eqIntModel, nClasses)}"></i> <span>${cModel[i].toFixed(2) + (cModel[i+1] ? ' &ndash; ' + cModel[i+1].toFixed(2) + '</span><br>' : '')}</div>`).appendTo(el);
	};
};

legend.onAdd = function(map)
{
	var div = L.DomUtil.create('div', 'info legend');
	var el = $('div.info.legend');
	var cBoroughs = equalIntervals(nClasses,freqUrl, 'boroughs');
	var cStations = equalIntervals(nClasses,freqUrl,'stations');

	cBoroughs.unshift(0);
	cStations.unshift(0);

	// content of BOROUGHS
	$(div).append(`<div class="container-fluid">
						<div class="row">
							<div class="col-11" id="legend-container">
								<div class="row">
									<div class="col-6 left-legend-panel">
										<h4>Boroughs </h4>
										<div></div>
									</div>
									<div class="col-6 right-legend-panel">
										<div id="3d-scatter-boroughs"></div>
									</div>	
								</div>
								<hr>
								<div class="row">
									<div class="col-6 left-legend-panel">
										<h4>Stations </h4>
										<div></div>
									</div>		
									<div class="col-6 right-legend-panel">
										<div id="3d-scatter-stations"></div>
									</div>
								</div>
					  		</div>
					  	<div class="col-1" id="animation-btn-container">
					  		<button id="animation-btn">
					  			<span></span>
					  			<span></span>
					  			<span></span>
							</button>
						</div>
					</div>
				</div>`);
	// legend
	populateLegend('boroughs',cBoroughs,colRampGlo.boroughs,eqIntBoroughs,nClasses,$(div).find('.left-legend-panel').eq(0).find('div'));

	// dropdown list
	$(`<select id='color-ramp-boroughs' class="color-ramp">
							<option value="YlGnBu">YlGnBu</option>
							<option value="Reds">Reds</option>
							<option value="YlGn">YlGn</option>
							<option value="Paired" selected>Paired</option>
							<option value="Pastel2">Pastel2</option><option value="Set3">Set3</option>
							<option value="Accent">Accent</option>
						</select>`).appendTo($(div).find('.left-legend-panel').eq(0));

	// content of STATIONS
	populateLegend('stations',cStations,colRampGlo.stations,eqIntStations,nClasses,$(div).find('.left-legend-panel').eq(1).find('div'));
	$(`<select id='color-ramp-stations' class="color-ramp">
						<option value="YlGnBu" selected>YlGnBu</option>
						<option value="Reds">Reds</option>
						<option value="YlGn">YlGn</option>
						<option value="Paired">Paired</option>
						<option value="Pastel2">Pastel2</option>
						<option value="Set3">Set3</option>
						<option value="Accent">Accent</option>
					</select>
				</div>
			</div>
		</div>`).appendTo($(div).find('.left-legend-panel').eq(1));

	return div;
};
// adds the 3d-scatterplot
var layer;
append3dScatterPlotPoint = (elName, scatterLayout,requestUrl,coloRamp = colors)=>{
	console.log(requestUrl);
	//var layer;
	$.ajax({url : requestUrl, async: false}).done((response)=>{
		layer = response;
	});
	var data = [];
	layer.map((cluster,i)=>{
		data.push({
            x: cluster[0], y: cluster[1], z: cluster[2],
            mode: 'markers',
            marker: {color: coloRamp.Set1[cluster.length][i], size: 2},
            type: 'scatter3d',
			name: `cluster ${i}`,
        }, {
        alphahull: 0, // creates a convex hull of the cluster
        color: coloRamp.Set1[cluster.length][i],
		opacity: 0.3,
        type: 'mesh3d',
        x: cluster[0],
        y: cluster[1],
        z: cluster[2],
    	})
    });

	Plotly.newPlot(elName, data,scatterLayout, {displayModeBar: false});

};

// triggers whenever a user changes a coloramp
legend.update = function(option, colorRamp, nClasses){
	var iElements = $(`div.info.legend i.${option}`);
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
	console.log('marios');
	this.div.innerHTML = `<button type="button" id="sidebarCollapse" class="navbar-btn">
								<span></span>
								<span></span>
								<span></span>
						  </button>`;
	// if the window size is less than the minimum required width, then close the sidebar
	if($(window).width() < minWidth || $(window).height() < minHeight){
		$('#sidebar').toggleClass('active');
        $('#sidebarCollapse').toggleClass('active');
	}
};

// performs changes on the div.info.info-stats.leaflet-control
statsBtnToggle = (el)=> {
	if (el.hasClass('active')) {
        (map.hasLayer(groupLayer) ? map.removeLayer(groupLayer) : false);
        $('#station-routes').attr('disabled', true); // set the button as disable
        el.text('Hidden'); // change the text to disable
    } else {
        $('#station-routes').attr('disabled', false); // se the button as active
        el.text("Active"); // change the text to active
    }
    $('#graphs-container').children().children().remove(); // removes the children of the sub-elements
    //$('#main-container').fadeToggle(500);
    el.toggleClass('active');
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

	// create a hash map of the stations, so it can accessed easily
	stations.on('data:loaded', function(){
    		console.log('stations are loaded..');
		    stations.toGeoJSON().features.map((f)=>{
		    	hashStations[f.properties.pk] =  {
		    		'station_name' : f.properties.station_name,
					'fre': f.properties.freq,
				};
			});

    		// adds the 3d scatter plot on the legend panel
			append3dScatterPlotPoint('3d-scatter-stations',scatterLayout,getAdjustedUrl(kMeansUrl.replace(new RegExp('none'),'stations'),5), colors);

    		// updates the info stats all
			infoStatsUpdate($('.info-stats'));
			freezeMap($('.info-stats'));

			// adds an event on the dropdown list of .info-stats
			$('#station-routes').on('change', (e) =>{
				updateStaRoutesList(map,refRoutesUrl, e, freqUrl);
			});

			$('div.info.info-stats.leaflet-control button').on('click', (e)=>{
				statsBtnToggle($(e.currentTarget));
			});

    		// adds the cluster group on the map, containing a featureGroup
            cluster.addLayer(stations);
			// number of stations
			nStations = stations.toGeoJSON().features.length;

			$('#legend-container div.row').eq(1).append(`
			   <div class="col-12 stations-slider">
			   		<div class="row">
			  			<div class="col-2"><strong>1</strong></div> 
			  			<div class="col-8"><b><em>N stations</em></b></div>
			  			<div class="col-2"><strong>${nStations}</strong></div>
			  		</div>
			  		<div class="row">
			  			<div class="col-12">
			  		    	<input type="range" class="slider" value="${nStations}" min="1" max="${nStations}" id="sFilterSlider">
						</div>
					</div>
			  </div>
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

	boroughs.on('data:loaded',function(){
		// adds the 3d scatter plot on the legend panel
		append3dScatterPlotPoint('3d-scatter-boroughs',scatterLayout,getAdjustedUrl(kMeansUrl.replace('none','boroughs'),3),colors);
	}.bind(this));

	// equal-intervals of boroughs
	eqIntBoroughs = equalIntervals(nClasses,freqUrl, 'boroughs');
});

// While the window is loaded, all commands, buttons and labels are added
$(window).on('load', ()=>
{
	console.log('window-load');

	// adds the info stats label
	statsInfo.addTo(map);

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
	// appends the tooltip buttons
	appendQuestionBtn($('#legend-container div.row div.col-6.left-legend-panel h4').eq(0),'boroughs','right','<h4>Boroughs Layer Description</h4><p>The color of each borough corresponds on the number of stations that are contained within it. Boroughs that preserve the same color present similar properties in terms of the contained stations.</p> <h4>Color Ramp</h4><p>A color ramp is available so that a user to choose the best combination for its screen</p><h4>Plot</h4><p>The displayed graph clusters the boroughs based on the variables of <b>longitude</b>, <b>latitude</b>, and <b>number of stations within a borough</b>. The optimal number of clusters is <b>three</b>.');
	appendQuestionBtn($('#legend-container div.row div.col-6.left-legend-panel h4').eq(1),'stations','right','<h4>Stations Layer Description</h4><p>The color of each station corresponds on the number of routes that either started or ended on a station (undirected network). This means that station which have similar color demonstrate similar properties.</p><h4>Color Ramp</h4><p>A color ramp is available so that a user to choose the best combination for its screen.</p><h4>Plot</h4><p>The displayed graph classifies the stations based on the variables of <b>longitude</b>, <b>latitude</b>, and <b>number of routes that either started or ended on a stations</b>.The optimal number of clusters is <b>5</b>.</p><h4>Filtering</h4><p>A <b>filtering</b> option is available below so that only a certain portion of stations is shown. The stations are ranked based on their flow, and only the <b>N</b> selected stations with the highest flow are displayed.</p>');
	//$('.question-btn').tooltip();

	// freeze the the map whenever the legend panel is enabled
	freezeMap($('div.info.legend.leaflet-control'));
	// adds interaction on the legend button
	 $('#animation-btn').on('click',(e)=>{
	 	var rightPanel = $('div.right-legend-panel');
		// fades the right panels of the legend
	 	rightPanel.fadeToggle(800);
	 	// sets the button to active
        $(e.currentTarget).toggleClass('active');
        // determines the delay-time of the following process execution
		var time = ($(e.currentTarget).hasClass('active') ? 800 : 0);
		setTimeout(()=> {
            $('div.info.legend').toggleClass('active'); // set legend to active
            $('div.left-legend-panel').toggleClass('col-12');  // changes the width of the left panels
        },time);
	 });
	// add the defaultExtent command
	L.control.defaultExtent()
		.setCenter([51.537366, -0.298690])
		.setZoom(10)
		.addTo(map);


	// Panes creation
	paneBottom = map.createPane('paneBottom').style.zIndex = 250;
	paneIntermediate = map.createPane('paneIntermediate').style.zIndex = 400;
	paneTop = map.createPane('paneTop').style.zIndex = 800;

	map.addLayer(cluster);
	map.addLayer(boroughs);
	//
    map.flyToBounds(L.latLngBounds(L.latLng(51.19548,-0.65654),L.latLng(51.79624,0.09437)));


	// adds a slider bar in the legend

	$('#layersSubMenu li:first-of-type a').on('click', (e)=> {
		activateEl(cluster,$(e.currentTarget));
	});
	$('#layersSubMenu li:nth-of-type(2) a').on('click', (e)=>{
		activateEl(boroughs, $(e.currentTarget));
	});
	$('#heatmaps li:first-of-type a').on('click', (e)=> {
		activateEl(heatmapStationsLayer, $(e.currentTarget));
    });
	$('#heatmaps li:last-of-type a').on('click', (e)=>{
		activateEl(heatmapBoroughsLayer, $(e.currentTarget));
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

	// changes the display of the webapp when its size changes
	$(window).on('resize',(e)=>{

		thisEl = $(e.currentTarget);
		if((thisEl.width() < minWidth && thisEl.height() < minHeight ) || (thisEl.width() < minWidth || thisEl.height() < minHeight)){
			$('div.info.info-stats.leaflet-control').fadeOut(300);
			$('div.info.legend.leaflet-control').fadeOut(300);
			statsBtnToggle($('div.info.info-stats.leaflet-control button'));
		}else{
			$('div.info.info-stats.leaflet-control').fadeIn(300);
			$('div.info.legend.leaflet-control').fadeIn(300);

		}
	});

});

