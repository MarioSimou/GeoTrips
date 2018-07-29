L.MakiMarkers.accessToken = 'pk.eyJ1IjoibWFyaW9zc2ltb3UiLCJhIjoiY2pqN3h5d3N1MjQ2ZjNrbGs0YjJ1NTEycCJ9.TFVZrQjCGGJqv8yJ8GSPXQ';

$(window).on('map:init', function (e) {
    // gets the map
    var map = e.detail.map;
    // gets the tilelayer in which the data will be plotted
    var cartoDBVouagerLabels = L.tileLayer.provider('CartoDB.VoyagerLabelsUnder').addTo(map);
    // adds the tilelayer and the stations data on the map
    map.addLayer(cartoDBVouagerLabels);
    // fits the mapView
    map.setView(new L.latLng(51.5020605,-0.129522), 11);

    var circlesFeatureGroup = L.featureGroup()
    $('table tbody tr').mouseenter(function(){
        try {
            circlesFeatureGroup.clearLayers();
            var elements = $(this).children();
            var lon = parseFloat(elements[4].textContent);
            var lat = parseFloat(elements[5].textContent);
            map.addLayer(circlesFeatureGroup.addLayer(L.marker([lat, lon], {
                radius: 500,
                icon: L.MakiMarkers.icon({icon: "bicycle", color: "#bc1a09", size: "l"})
            })).addLayer(L.circle([lat,lon], {radius: 1000, color: 'red'})));
        }catch(e){};
    });
});


