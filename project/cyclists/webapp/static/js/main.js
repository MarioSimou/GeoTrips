
// ------------------------------------------------- VARIABLES --------------------------------------------------------
var heatmapStationsLayer, heatmapBoroughsLayer;
let basemaps,colors,nStations,hashStations = {}  ,refRoutesFreqUrl,eqIntBoroughs,eqIntStations,eqIntRefRoutes,latestSelectedBorough, latestSelectedStation,sortedFreqArr = [], paneTop,paneIntermediate,paneBottom,groupLayer;
let map,stations,refRoutes,boroughs,routes,cusRoutes;
let colRampGlo = {'stations' : 'YlGnBu','boroughs' : 'Paired','routes' : 'Paired',}; // initial coloramps for each feature layer
const minWidth = 896; // minimum required width for a desktop device
const minHeight = 672; // minimum required height for a desktop device
const loader = $('#loader'); //
const nClasses = 6; // number of binding classes
const velocity = 15/3600 ; // constant velocity of a cyclist

// Url mappings
const refRoutesUrl =  $('#ref-routes').attr('href');// webapp_stations_pairs_routes
const boroughsUrl = $('#boroughs').attr('href'); // webapp_boroughs
const stationsUrl = $('#stations').attr('href'); // webapp_stations
const stationsPairsRoutesUrl = $('#stations-pairs-routes').attr('href'); // webapp_routes
const kMeansUrl = $('#kmeans').attr('href');
const freqUrl = $('#freq').attr('href');
const temporalRoutesUrl = $('#temporal_routes').attr('href');

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
// makimarkers token
L.MakiMarkers.accessToken = "pk.eyJ1IjoibWFyaW9zc2ltb3UiLCJhIjoiY2pqOTlyMzYzMnFuZjNrbW5maW13MXIydCJ9.a7dn8rjCN9DQ65ly7NVgQw";

// ----------------------------------------------- METHODS ------------------------------------------------------------

//---------------------------------------- BOROUGHS -------------------------------------------------------------------

// sets the style of a borough layer. The getColor function returns the corresponded color of a feature
// based on a given frequency
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
// this functions is added with the each feature of a borough (onEachFeature method) so that whenever the mouse move to
// update the tab
const highlightBorough = (e) => {
	props = e.target.feature.properties; // properties of the targeted feature
	// updates the baseicInfoTab label
	basicInfoTab.update({'bname': props.name, 'bfreq' : props.freq }, e.latLng);
};

// this methods adds a mouse event listener on the borough layer
const onEachFeatureBoroughs = (feature,layer) => {
	layer.on({'mouseover': highlightBorough});
};

// ----------------------------------- STATIONS ------------------------------------------------------------------------

// defines how stations are loaded on the map
pointToLayerStations = (geojson, latlng)=>{
	return new L.circle(latlng, { radius : 200 });
};

// this method the required style of the stations layer. The getColor methods identified the corresponded color of an
// individual feature
const setStationsStyle = (feature) => {
	return {
		color : getColor(feature.properties.freq, colRampGlo.stations, eqIntStations,nClasses),
		fillOpacity: 0.7,
		stroke : false,
	};
};

// This method changes the style of a targeted station and, updates the statsInfo and basicInfoTab label as well.
const highlightStation = (e) =>
{
	layer = e.target; // gets the targeted station
	layer.bringToFront(); // brings the targeted stations at the top
	layer.setStyle({  // sets a different style
		weight: 5,
		color: '#666',
		dashArray: '',
		fillOpacity: 0.7,
	});
	statsInfo.update(layer.feature.properties); // updates the statsInfo label
    basicInfoTab.update(
        {
			'bname' : latestSelectedBorough.bname,
			'bfreq' : latestSelectedBorough.bfreq,
			'sname' : layer.feature.properties.station_name,
			'sfreq' : layer.feature.properties.freq,
		},e.latLng);	// updates the basicInfoTab label
};
// this method resets the style of stations layer
const resetHighlightStation = (e) => {
	stations.resetStyle(e.target);
};

// this method fit the bounds of the map based on a targeted layer
const zoomStation = (e) => {
	map.fitBounds(e.target.getBounds());
};
// the onEachFeatureStations methods adds a mouseover, mouseout and double click event listeners on the stations layer
// how each listener is executed is described on each function
const onEachFeatureStations = (feature,layer) => {
	layer.on({
		mouseover : highlightStation,
		mouseout : resetHighlightStation,
		dblclick : zoomStation,
	});
};


// ----------------------------------------- Baseline Routes --------------------------------------------------------
// this method sets the style of the baseline routes layer
const setRefRoutesStyle = (feature) => {
	return {
		color : getColor(feature.properties.freq, colRampGlo.routes, eqIntRefRoutes ,nClasses)
	};
};
// this method remove the route panel that is created whenever a user hovers over the road network and reset the style
// of the layer's features
const resetHighlightRefRoutes = (e)=>{
	refRoutes.resetStyle(e.target);
	$('div.ref-routes-panel').remove();
};
// adds an event listener on the routes layer
const refRoutesOnEachFeature = (feature,layer) =>{
	layer.on({
		 'mouseover': showContentOfRoutesNetwork,
		 'mouseout': resetHighlightRefRoutes,
	})  ;
};

// ------------------------------------------ GENERAL FUNCTIONS -------------------------------------------------------
// finds the maximum value of a given array
max = (values)=>{
	return values.sort((a,b)=> b-a)[0]
};
// finds the minimum value of a given array
min = (values)=>{
	return values.sort((a,b)=> a-b)[0]
};
// equal interval is a method that determines the binding classes of an input variable. the number of binding classes is required
const equalIntervals = (nClasses, url, model) => {
	let range = [];
	let minV,classRange;
	$.ajax({ url : url, async :false }).done((response)=>
		{
			let frequencies = response[model]; // frequenies of a given model
			if (frequencies instanceof Array) {
				minV = min(frequencies); // manimum frequency
				classRange = (max(frequencies)- minV)/nClasses; // range of a class
        	}
        	// creates the binding classes and return the results
        	for(let i=1; i < nClasses+1; i++){range.push(minV+ (i*classRange));}
		});
	return range;
};

// this method is applied whenever the coloramp of a station or borough changes. It identifies the coloramp of each layer
// and change the fill color of each feature.
const changeColors = (e,feature, featureFunction, featureClassName, nClasses,eqInt,colRampGlo)=>{
	let colRamp = $(e.currentTarget).val(); // gets the selected color ramp
	colRampGlo[featureClassName] = colRamp; // updates the global variable

	// updates the fill color of the features of a layer
	feature.eachLayer((layer)=>{
		layer.setStyle({'fillColor' : featureFunction(layer.feature.properties.freq, colRamp, eqInt,nClasses)});
	});
	// update the legend panel
	legend.update(featureClassName, colRamp,nClasses);
};

// based on the equal intervals of a layer, this function finds the corresponded color of a vaue
const getColor = (freq,colorRamp,featEqInt,nClasses)=>{
	let col = colors[colorRamp][nClasses]; // gets the color ramp of the given layer

	// iterate over the equal intervals classes and if the frequency of a layer falls in that class, it returns it
	for(let i=0; i < featEqInt.length; i++){
		if(freq < featEqInt[i])	return col[i];
	}
	// if their is no match then it means that is the last class
	return col[featEqInt.length-1];
};

// create a div element with a class attribute and returns it
// it is mainly used to add labels on the leaflet map
const createDivElement = (element,classes) => {
	element.div = L.DomUtil.create('div', classes); // create the div
	element.update();
	return element.div;
};
// the current function adds two event listeners(mouseover, mouseleave) on a given element that freeze the background
// map
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

// Plugin Url : https://www.patrick-wied.at/static/heatmapjs/example-heatmap-leaflet.html
// this method is used to load a heatmap layer
const configHeatmap = (response, hlayer,cfg) => {
		var hlayer = new HeatmapOverlay(cfg); // create a Heatmap Overaly that contains the configurations
		hlayer.setData({max: 8, data : response}); // loads the data on the heatmap overaly
		return hlayer; // returns the layer
};
// the current function looks for a string pattern that is replaced by an id
const getAdjustedUrl = (url,id) =>{
	let rexp = new RegExp(`(${url.slice([url.lastIndexOf('/')+1])})$`); // creates a regular expression
	url = url.replace(rexp, id); // replace the string pattern with the given id
	return url
};
// this method finds the median of a given array
const median = (values)=> {
	// sort the values in an ascending order
    values.sort(function (a, b) {return a - b;});
    // if the length of the array is 0 returns 0
    if (values.length === 0) return 0

	// finds the half of the array length
    let half = Math.floor(values.length / 2);
	// returns the corresponded values
    if (values.length % 2)
        return values[half];
    else
        return (values[half - 1] + values[half]) / 2.0;
};
// this method returs the descriptive statistics of an array
const descriptiveStats = (values)=>{
	let sorted = values.sort((a,b)=> a - b); // sorts the array
	let n = sorted.length; // finds it length
	return {
		'min': sorted[0], // returns the  minimum value
		'max': sorted[n-1], // maximum value
		'range': sorted[n-1] - sorted[0], // range
		'lower': sorted[Math.round(0.25*n)], // quantile 0.25
		'upper': sorted[Math.round(0.75*n)], // quantil 0.75
		'iqr': sorted[Math.round(0.75*n)] - sorted[Math.round(0.25*n)] // interquantile range
	}
};

// this method add an event listener on the color ramp of the baseline routes. Whenever a user changes the color ramp,
// the content of the baseline routes changes
const changeColorsRefRoute = (refRoutes)=>{
	$('#legend-graph-container').on('change','select', (e)=> { // on change event
        let ies = $('i.refRoutes');
		let colRamp = $(e.currentTarget).val(); //  selected color ramp
        colRampGlo['routes'] = colRamp; // update the global coloramp variable

		// changes the style of each feature
        refRoutes.eachLayer((layer) => {
            layer.setStyle({'color': getColor(layer.feature.properties.freq, colRamp, eqIntRefRoutes, nClasses)});
        });

        // changes the color of the i elements in the legend
		for(var i=0; i < ies.length; i++){
        	ies.eq(i).css('background',colors[colRamp][nClasses][i]);
		}
    });
};

// this method creates a tooltip that is shown on the users
appendQuestionBtn = (el,name,position,content)=>{
	$(`<a href="#" id="${name}-question-btn" data-toggle="tooltip" data-placement="${position}" data-html="true" title="" data-original-title="${content}" class="question-btn"><i class="fas fa-info-circle"></i></a>`).appendTo(el);
	$(`	#${name}-question-btn`).tooltip();
};
// this method creates a legend of a specified model
const populateLegend = (className,cModel,colRampGloOpt,eqIntModel,nClasses,el)=>{
	for(var i=0; i < cModel.length-1;i++) {
		$(`<div><i class="${className}" style="background: ${getColor(cModel[i], colRampGloOpt, eqIntModel, nClasses)}"></i> <span>${cModel[i].toFixed(2) + (cModel[i+1] ? ' &ndash; ' + cModel[i+1].toFixed(2) + '</span><br>' : '')}</div>`).appendTo(el);
	};
};
// performs changes on the div.info.info-stats.leaflet-control
statsBtnToggle = (el)=> {
	if (el.hasClass('active')) {
        (map.hasLayer(groupLayer) ? map.removeLayer(groupLayer) : false);
        $('#station-routes').attr('disabled', true); // set the button as disable
        el.text('Activate'); // change the text to disable
    } else {
		map.addLayer(groupLayer); // add a layer
        $('#station-routes').attr('disabled', false); // se the button as active
        el.text("Hide"); // change the text to active
    }

    $('#myTabContent').fadeToggle(); // toggles the panel at the right corner
    el.toggleClass('active');
};
// ----------------------------------------- TABS / PANELS -----------------------------------------------------------

// this method updates the content of the descriptive statistics and graphs panels, which are located at the
// top-right corner. The method is called whenever a user wants to get more information related to a station
const updateContentDescriptivePanel = (map,refRoutesUrl,e, freqUrl)=> {
	loader.show(); // enables the loader

	if ($(e.currentTarget).attr('disabled') == undefined) {
        // local variables
        let sid = $(e.currentTarget).val(); // selected stations
		let cusRoutesUrl = getAdjustedUrl(stationsPairsRoutesUrl,sid); // url that requests the Cycle Hire sample date

		// requests Cycle Hire data and store them in the cusRoutes variable
		$.ajax({url: cusRoutesUrl, async: false}).done((response)=>{
			cusRoutes=response; // loaded routes of 2017
		});
		// update the content
        changePlotsAndDescriptions(map, refRoutesUrl, sid,freqUrl, cusRoutes);
        appendTemporalGraph($('#monthly-graph-container'),$('#daily-graph-container') ,sid)
    }
};
// append temporal graphs of the Cycle Hire data using a daily and monthly lag
const appendTemporalGraph = (monthlyGraphContainer, dailyGraphContainer,sid) =>{
	    // adds a div if it does not exist
	    ((monthlyGraphContainer.has($('#monthly-temporal-graph')).length) ? true : monthlyGraphContainer.append('<div id="monthly-temporal-graph" class="col-12"></div>'));
	    ((dailyGraphContainer.has($('#daily-temporal-graph')).length) ? true : dailyGraphContainer.append('<div id="daily-temporal-graph" class="col-12"></div>'));

	    // daily
	    $.ajax({url : getAdjustedUrl(temporalRoutesUrl,sid).replace('month','day'), async: true}).done((response)=>{
	    	let x=[], y=[];
	    	Object.keys(response).map((key)=>{
	    		x.push(response[key].day);
	    		y.push(response[key].count);
			});
	    	temporalLayout.yaxis = {'title': 'Flow per Day'};
	    	temporalLayout.xaxis = {'title': '', 'range': [x[0],x[x.length-1]]};
	    	Plotly.newPlot('daily-temporal-graph',[{x: x, y: y, type: 'scatter',mode: 'lines' }],temporalLayout,{staticPlot: false, displayModeBar: false});
	    });
		// monthly
		$.ajax({url : getAdjustedUrl(temporalRoutesUrl,sid) , async: true}).done((response)=>{
			let x = []; y = [];
			Object.keys(response).map((key)=>{
				x.push(response[key].month);
				y.push(response[key].count);
			});

			temporalLayout.yaxis = {'title' : 'Flow per month'}
			temporalLayout.xaxis = {'title':'', 'range': [x[0], x[x.length-1]]};
			Plotly.newPlot('monthly-temporal-graph', [{x : x, y : y , type: 'scatter', mode: 'lines'}], temporalLayout, {staticPlot: false, displayModeBar: false});
		});
};
// this method populate the content of the panel at the right content, loads the baseline routes and stations
// when a stations is selected
const changePlotsAndDescriptions = (map,refRoutesUrl,sid,freqUrl,cusRoutes) =>{
		// if the map has a group layer, remove it and clear its content
		if (map.hasLayer(groupLayer)) map.removeLayer(groupLayer.clearLayers());

		refRoutesFreqUrl = getAdjustedUrl(freqUrl,sid); // url that calls the frequencies (flow) of all layers, based on a given sid
		eqIntRefRoutes = equalIntervals(nClasses,refRoutesFreqUrl,'refRoutes'); // finds the equalIntervals of the baseline routes

		// LOADS THE BASELINE ROUTES
        refRoutesUrl = getAdjustedUrl(refRoutesUrl,sid); // url that requests the baseline routes (pairs of start-end stations) related to the given sid
		// loads the baseline routes, style them and adds interactions
        refRoutes = new L.GeoJSON.AJAX(refRoutesUrl ,{
        	style : setRefRoutesStyle,
			onEachFeature: refRoutesOnEachFeature,
        });  // webapp_stations_pairs_routes model

		// change the color of baseline routes whenever they are loaded
		if($('#ref-routes-slider-container').has($('#slider-ref-routes')).length) changeColorsRefRoute(refRoutes);

		// loads the geojson of the sid station
		let uniqStaUrl = getAdjustedUrl( $('#unique-station').attr('href') ,sid); // url that requests the unique sid station
		let station = new L.GeoJSON.AJAX(uniqStaUrl, {
			pointToLayer: (geojson,latlng)=>{return L.marker(latlng, {icon: L.MakiMarkers.icon({icon: "bicycle", color: "#bb1d3b", size: "m"})})},
		});

		// appends the unique station and baseline routes layers in the group layer
		groupLayer = L.layerGroup([refRoutes,station], {pane: paneIntermediate}).addTo(map);

		// when the baseline routes are loaded, execute the following methods
		refRoutes.on('data:loaded', ()=>
			{
				// adds the baseline routes filter bar
        		appendRefRoutesFilter($('#ref-routes-slider-container'), refRoutes, groupLayer, refRoutesUrl);
        		// adds the baseline routes legend
        		appendRefRoutesLegend($('#legend-graph-container'), eqIntRefRoutes, refRoutesFreqUrl);
        		// adds distribution graph that compares the baseline routes and the sample routes
        		appendDistributionGraph($('#distances-distribution-graph-container'),cusRoutes);

        		loader.hide(); // hide the loader when all the processes are done
			});
};

// this method creates a filter bar for the baseline routes, so that whenever a user change its value, a new layer of
// the baseline routes is returned. All the required functionalities are enclosed in the funtion below.
const appendRefRoutesFilter = (sliderContainer,refRoutes,groupLayer,refRoutesUrl)  =>{
	const refRoutesArr = refRoutes.toGeoJSON().features; // gets an array of the reference routes
	const nRefRoutes = refRoutesArr.length; // length

	sliderContainer.html(''); // removes any previous content of the slider container
	// add the following html into the slider container
	$(`<div class="row" id="ref-routes-slider-content">
					<div class="col-2"><strong>1</strong></div>
					<div class="col-8"><strong><em>Top N Routes</em></strong></div>
					<div class="col-2"><strong>${nRefRoutes}</strong></div>
			   </div>
			   <div class="row">
			   		<div class="col-12"><input id="slider-ref-routes" type="range" min="1" max="${nRefRoutes}" value="${nRefRoutes}" class="slider"></div>
			   </div>`).appendTo(sliderContainer);

	let slider = $('#slider-ref-routes'); // slider bar
	freezeMap(slider); // freeze the map when the slider is used

	// add an event listener on the slider and filters the baseline routes data based on the slider value
	slider.on('change', (e)=>{

		let sliderVal = $(e.currentTarget).val(); // slider value
		// sorted array of baseline routes' frequencies
		let sortrefRoutesArr = refRoutesArr.sort((a,b)=> parseInt(b.properties.freq) - parseInt(a.properties.freq));

		if (groupLayer.hasLayer(refRoutes)){ // if the baseline routes are contained in the grouplayer, execute the following code
			loader.show(); // enable loader
			groupLayer.removeLayer(refRoutes); // removes the previous baseline routes layer

			// call a new layer
			refRoutes = new L.GeoJSON.AJAX(refRoutesUrl,{
				style: setRefRoutesStyle,
				onEachFeature: refRoutesOnEachFeature,
				filter: (feature)=>{return (feature.properties.freq > sortrefRoutesArr[sliderVal].properties.freq ? true : false)},
			}).addTo(groupLayer);

			changeColorsRefRoute(refRoutes); // add an event listener on the baseline routes' color ramp

			// when the data is loaded, hides the loader
			refRoutes.on('data:loaded',()=>{loader.hide();});
		}
	});
};
// this method creates the required legend for the baseline routes and adds a color ramp with an event listener
// appended on it
const appendRefRoutesLegend = (graphContainer,eqIntRefRoutes,refRoutesFreqUrl) => {
	if(graphContainer.children().length == 0) {
        graphContainer.append(`<div>
							<h4>Routes</h4>
							<div></div>
						  </div>`);

        cRefRoutes = equalIntervals(nClasses, refRoutesFreqUrl, 'refRoutes'); // fins the equal intervals values of the baseliner routes
        cRefRoutes.unshift(0); // adds zero at the beginning of the array

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
		// add an event listener on the color ramp
        changeColorsRefRoute(refRoutes);
    }
};
const appendDistributionGraph = (disGraphContainer,cusRoutes) => {
	// baseline distances
	let data = {'baseline': {'refTime' : []}, 'cycleHire': {'cusTime': []}};
	let refRoutesHash = {}; // a hahmap data structure

	// populates the hashmap  {key : value}  - > {pair_id : duration}
	refRoutes.toGeoJSON().features.map((route,index,arr)=>{
		refRoutesHash[route.properties.pk] = route.properties.balanced_ref_time;
	});

	// populate an array that will contain the duration values from the cycle hire data
	// generate an identical sample, with the same length as the cycle hire data, but it will contain the values (duration)
	// of the baseline routes
	for(f of cusRoutes){
		data.baseline.refTime.push(refRoutesHash[f.fields.station_pairs_id]);
		data.cycleHire.cusTime.push(f.fields.duration);
	};

	// get the statistics of the baseline routes sample
	data.baseline.median = median(data.baseline.refTime); // median time
	data.baseline.descriptive = descriptiveStats(data.baseline.refTime);

	// get the statistics of the cycle hire data
	data.cycleHire.median = median(data.cycleHire.cusTime);
	data.cycleHire.descriptive = descriptiveStats(data.cycleHire.cusTime);

	// call the appendDescriptiveStats, which will append the results on the descriptive statistics panel (top-right)
	appendDescriptiveStats(data);

	// Append the histograms of the data on the graph panel (top-right)
	// create a div that will contains the graph if it does not exist
	(disGraphContainer.has('#distribution-container').length ? true : $(`<div class="col-12" id="distribution-container"></div>`).appendTo(disGraphContainer));
	// distances options
	let refHist = {x : data.baseline.refTime, name: 'Baseline',type: 'histogram',histfunc : 'count',histnorm:'probability density',autobinx:true,opacity:0.5, marker: {color: 'red'} };
	let cusHist = {x : data.cycleHire.cusTime, name: 'Cycle Hire data', type: 'histogram',histfunc : 'count',histnorm:'probability density', autobinx:true,opacity: 0.5, marker: {color: 'green'}};

	Plotly.newPlot('distribution-container',[refHist,cusHist], distributionLayout, {staticPlot: false, displayModeBar: false});
};

// this method adds some descriptive statistic measurements, as well as two boxplots of the baseline routes and the sample
// data in the panel at the top-right corner
const appendDescriptiveStats = (obj)=>{
	let container = $('#descriptive-statistics-container');
	// remove children elements if they already exist
	(container.children().length ? container.children().remove() : false );
	// add statistics
	container.append(`
		<div class="row">
			<div class="col-6" id="baseline-description">
				<h4>Baseline</h4>
				<ul>
					<li><span>Min:</span> ${obj.baseline.descriptive.min}</li>
					<li><span>Max:</span> ${obj.baseline.descriptive.max}</li>
					<li><span>Range:</span> ${obj.baseline.descriptive.range}</li>
					<li><span>Lower Bound:</span> ${obj.baseline.descriptive.lower}</li>
					<li><span>Median:</span> ${obj.baseline.median}</li>
					<li><span>Upper Bound:</span> ${obj.baseline.descriptive.upper}</li>
					<li><span>IQR:</span> ${obj.baseline.descriptive.iqr}</li>
				</ul>	
			</div>
			<div class="col-6" id="cycle-hire-description">
				<h4>Cycle Hire</h4>
				<ul>
					<li><span>Min:</span> ${obj.cycleHire.descriptive.min}</li>
					<li><span>Max:</span> ${obj.cycleHire.descriptive.max}</li>
					<li><span>Range:</span> ${obj.cycleHire.descriptive.range}</li>
					<li><span>Lower Bound:</span> ${obj.cycleHire.descriptive.lower}</li>
					<li><span>Median:</span> ${obj.cycleHire.median}</li>
					<li><span>Upper Bound:</span> ${obj.cycleHire.descriptive.upper}</li>
					<li><span>IQR:</span> ${obj.cycleHire.descriptive.iqr}</li>
				</ul>	
			</div>
			<div class="row boxplot-container">
				<div class="col-6" id="baseline-boxplot"></div>
				<div class="col-6" id="cycle-hire-boxplot"></div>
			</div>
		</div>
	`);
	// adds a tooltip next to the container
	appendQuestionBtn($('#cycle-hire-description').find('h4'), 'descriptive-stats','left','<h4>Description</h4><p>In the current section, using the <b>duration</b> variable of the baseline cyclists trips and the cycle hire data, some basic descriptive measures are extracted. In a second stage, the results are plotted using a <b>boxplot</b> graph</p>');

	// Creates a boxplot using the Baseline routes and adds the boxplot in the panel
		let baseline =  {
  		y: obj.baseline.refTime,
  		type: 'box',
  		name: 'Baseline',
  		marker: {color: '#0078A8'},
  		boxmean: 'sd'
	};
	boxplotLayout.margin.l=40;
	Plotly.newPlot('baseline-boxplot', [baseline], boxplotLayout, {staticPlot: false, displayModeBar: false});

	//  Creates a boxplot using the Cycle Hire Data and adds it in the panel
	let cycleHire = {
		y: obj.cycleHire.cusTime,
		type: 'box',
		name: 'Cycle Hire',
		marker: {color: '#0078A8'},
		boxmean: 'sd'
	};

	boxplotLayout.margin.l=0;
	boxplotLayout.margin.r = 40 ;
	Plotly.newPlot('cycle-hire-boxplot', [cycleHire],boxplotLayout,{staticPlot: false, displayModeBar: false} );
};


//----------------------------------------------------------------------------------------------------------------------

// add a functionality on the sidebar so that their content to change and remove or add a specified layer
activateSidebarTab = (layer, el) => {
		let elContent = el.html().replace('- (ON)',''); // main content of the layer
		if(map.hasLayer(layer)) {   // if the map has the specified layer
			map.removeLayer(layer); // removes the layer
			el.html(elContent); // updates the content
		}else {
			map.addLayer(layer); // adds the layer
			el.html(`${elContent} - (ON)`) // updates the content
			}
		el.toggleClass('activate-layer'); // toggles the class

};
// this method creates a panel whenever user is hovered over the route network and it shows the related information
const showContentOfRoutesNetwork = (e)=>{
	let feature = e.target.feature.properties; // feature properties

	// finds the average duration of the routes
	// from all routes, only the routes that are selected by the mouse are loaded
	let filteredCusRoutes = cusRoutes.filter((f)=> f.fields.station_pairs_id == feature.pk); // f.id is the pair id
	let annualFrequency = filteredCusRoutes.length; // times that the selected pair is covered
	let avgCusRoutesTime = filteredCusRoutes.reduce((a,b)=>a+parseInt(b.fields.duration),0)/annualFrequency; // average predicted distance of the routes
	// set style on the route that is selected
	e.target.bringToFront(); // bring the targeted feature in front
	e.target.setStyle({ // it change its style
		weight: 5,
		color: '#666',
		dashArray: '',
		fillOpacity: 0.7,
	});

	// creates a div (panel) inside the leaflet control container
	let  leafletControlContainer = $('#map div.leaflet-control-container').append('<div class="info ref-routes-panel"></div>');
	let panel = leafletControlContainer.find('div.ref-routes-panel'); // panel that will contain the details/descriptions
	// set its location on the map
	panel.css({
		'top': e.containerPoint.y,
		'left': e.containerPoint.x,
	});
	// sets the content
	panel.html(`<div>
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


// ----------------------------------------- STATS INFO PANEL ---------------------------------------------------------
statsInfo.onAdd = function(map) {return createDivElement(this,'info info-stats');};
statsInfo.update  = function(targetedStationProps) {};

const infoStatsUpdate = (el) =>{
	html = el.html().toString(); // get the context
	try {
		html = html.concat(`<div class="container-fluid">
								<div class="row">
									<div class="btn-group-toggle col-4" data-toggle="buttons">
										<button class="mybtn active">Hide</button>
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
											<div class="col-12" id="descriptive-statistics-container"></div>	
											<div id="legend-graph-container" class="col-12 legend"></div>		
											<div class="col-12" id="ref-routes-slider-container"></div>	
										</div>
									</div>
									<div class="tab-pane fade" id="graphs-container" role="tabpanel">		
										<div class="row">
											<div id="distances-distribution-graph-container" class="col-12"></div>
											<div id="daily-graph-container" class="col-12"></div>
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

//-------------------------------------------- BASIC INFO TAB ----------------------------------------------------------

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

// this methods calls the update method of the basicInfoTab so its content to update.
const updateBasicInfoTabContent = (e) => {
	// updates the label at the top left corner
	try {
		basicInfoTab.update({
                'bname': (latestSelectedBorough.bname ? latestSelectedBorough.bname : '-'),
				'bfreq': (latestSelectedBorough.bfreq  ? latestSelectedBorough.bfreq : 0 ),
                'sname': (latestSelectedStation.sname ? latestSelectedStation.sname : '-'),
                'sfreq': (latestSelectedStation.sfreq ? latestSelectedStation.sfreq : '-' )
            }, e.latlng);
    }catch (e) {};
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
				updateContentDescriptivePanel(map,refRoutesUrl, e, freqUrl);
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

    // add a click event listener on the tabs so whenever a user clicks on them to perform a certain functionality.
	$('#layersSubMenu li:first-of-type a').on('click', (e)=> {
		activateSidebarTab(cluster,$(e.currentTarget));
	});
	$('#layersSubMenu li:nth-of-type(2) a').on('click', (e)=>{
		activateSidebarTab(boroughs, $(e.currentTarget));
	});
	$('#heatmaps li:first-of-type a').on('click', (e)=> {
		activateSidebarTab(heatmapStationsLayer, $(e.currentTarget));
    });
	$('#heatmaps li:last-of-type a').on('click', (e)=>{
		activateSidebarTab(heatmapBoroughsLayer, $(e.currentTarget));
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
	map.on('mousemove',updateBasicInfoTabContent ); // mousemove event

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

	// set an event on the boroughs color ramp so whenever a user clicks on it to update the fill color
	$('#color-ramp-boroughs').on('change',(e)=>	{
		changeColors(e,boroughs,getColor,'boroughs',nClasses, eqIntBoroughs, colRampGlo);
	});
	// set an event on the stations's color ramp so whenever a user clicks on it to update the fill color
	$('#color-ramp-stations').on('change',(e)=> {
		changeColors(e,stations,getColor,'stations',nClasses, eqIntStations, colRampGlo);
	});

	// The minimum requirement is that the desktop devices to have an 800x600 dimension
	if($(window).width() < 800 || $(window).height() < 600){
		$('div.info.info-stats.leaflet-control').hide();
		$('div.info.legend.leaflet-control').hide();
	}
	$(window).on('resize',(e)=>{
		let display = $(e.currentTarget);
		if(display.width() < 800 || display.height() < 600){
			$('div.info.info-stats.leaflet-control').hide();
			$('div.info.legend.leaflet-control').hide();
		}else{
			$('div.info.info-stats.leaflet-control').show();
			$('div.info.legend.leaflet-control').show();
		}
	})
});

// While the document is prepared, the events of the commands, buttons are added
$(document).ready(() => {
	console.log('document-onready');
	loader.show(); // the loader is activated

	// on the current request, the data of stations is loaded show that can create a heatmap based on the frequency
	$.ajax($('#heatmapStations').attr('href')).done((response)=>
		{
			console.log('heatmap stations is loaded...');

			// calls the configHeatmap method, which creates a Heatmap Overlay and stores it in the heatmapStationsLayer variable
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

	// on the current request the data of boroughs is loaded show that can create a heatmap based on the frequency
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

	// get various colors palettes from colorbrewer
	$.ajax({url : 'http://colorbrewer2.org/export/colorbrewer.json', async: false}).done((response)=>{
		colors = response;
	});
});

