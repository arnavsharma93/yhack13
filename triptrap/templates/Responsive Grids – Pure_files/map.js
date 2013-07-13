  var map, markersArray=[];
  var infowindow;
  var directionsDisplay;
  var directionsService, optimal_dist=0, optimal_time=0;
  var max_results = 10;


  function initialize()
  {
    // Map center -- City location.
    // TODO : Get the latlng using city name.

    var myLatlng = new google.maps.LatLng(29.0167, 77.3833);

    var myOptions = {
      zoom: 10,
      center: myLatlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    }
    map = new google.maps.Map(document.getElementById("mapCanvas"), myOptions);

    var input = /** @type {HTMLInputElement} */(document.getElementById('target'));
    var searchBox = new google.maps.places.SearchBox(input);
    var markers = [];

    google.maps.event.addListener(searchBox, 'places_changed', function() {
    var places = searchBox.getPlaces();

    for (var i = 0, marker; marker = markers[i]; i++) {
      marker.setMap(null);
    }

    markers = [];
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0, place; place = places[i]; i++) {
      var image = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      };

      var marker = new google.maps.Marker({
        map: map,
        icon: image,
        title: place.name,
        position: place.geometry.location
      });

      markers.push(marker);

      bounds.extend(place.geometry.location);
    }

    map.fitBounds(bounds);
  });

    google.maps.event.addListener(map, 'bounds_changed', function() {
    var bounds = map.getBounds();
    searchBox.setBounds(bounds);
  });

    directionsDisplay = new google.maps.DirectionsRenderer();
    directionsService = new google.maps.DirectionsService();

    // Load the Map.
    console.log("MAP");
    console.log(map);
    directionsDisplay.setMap(map);

    // Initialise the marker array.
    for(var i=0; i < max_results; i++)
      markersArray.push(0);

    // Get tourist attractions.
    var request = {
      location: myLatlng,
      radius: 50000,
      keyword : "tourist attractions",
      types : ["amusement_park", "museum", "zoo"],
      key : "AIzaSyCm5ei45O8AYV3Wt0dAMGMclhjvQc3Pfog",
      sensor : false
    };
    // TODO : Filter the results by rating.

    infowindow = new google.maps.InfoWindow();

    console.log("infowindow");
    console.log(infowindow);
    var service = new google.maps.places.PlacesService(map);

    service.nearbySearch(request, function(results, status)
    {
      console.log("RESULTS");
      console.log(results);
      if (status == google.maps.places.PlacesServiceStatus.OK)
      {
        // TODO : First max_results results are taken. This should be done with rating.
        if(max_results > results.length)
          max_results = results.length;
        for (var i = 0; i < max_results; i++)
        {
            // Create a marker on the place.
            createMarker(results[i], i);
        }
      }
      console.log(markersArray);
      // Calculate TSP of the places.
      calcRoute(results);

    });
  }
  // This function returns a URL which is the customised marker icon, with text A/B?c.. etc.
  function get_icon(position)
  {
      position = position + 65;
      var ch = String.fromCharCode(position);
      var icon = "https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld="+ch+"|32B232|000000";
      return icon;
  }


  // Calculates TSP
  function calcRoute(places)
  {
    var i, j;
    var start, done = 0;
    var optimal_response = null;
    var jmin = -1;
    var places_copy;

    // Currently, max_results can be max 10. This is limitation of google directions api.
    //for(j=0; j<max_results-1; j++)
    j = 0;
    {

      start = places[j];
      var waypts = [];
      places_copy = [];
      for(i=0; i < max_results-1; i++)
      {
        if(i==j)
          continue;
        waypts.push({location: places[i].geometry.location, stopover:true});
        places_copy.push(i);
      }
      console.log(waypts);
      // TODO : origin and destination are same. Find a way such that TSP is independent of destination.
      var request = {
        origin: start.geometry.location,
        destination: start.geometry.location,
        waypoints: waypts,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING
      };

      directionsService.route(request, function(response, status)
      {

        if (status == google.maps.DirectionsStatus.OK)
        {
           var dist = 0;
           var time = 0;
          for(i=0; i<response.routes[0].legs.length; i++)
          {
            dist += response.routes[0].legs[i].distance.value;
            time += response.routes[0].legs[i].duration.value;
          }

          done += 1;

          if(!optimal_response || optimal_response===null || optimal_dist===0 || dist < optimal_dist)
          {
            optimal_dist = dist;
            optimal_time = time;
            optimal_response = response;
            jmin = j;
          }
        }
        if(done===1)
        {
          var len = optimal_response.routes[0].legs.length;
          dist -= optimal_response.routes[0].legs[len-1].distance.value
          time -= optimal_response.routes[0].legs[len-1].duration.value
          optimal_response.routes[0].legs.splice(len-1, len-1);

          directionsDisplay.setDirections(optimal_response);
          directionsDisplay.setOptions( { suppressMarkers: true } );

          var indx;
          console.log(optimal_response);
          markersArray[jmin].setIcon(get_icon(0));
          for(i=0; i<optimal_response.routes[0].legs.length; i++)
          {
            console.log(i);
            indx = optimal_response.routes[0].waypoint_order[i];
            markersArray[places_copy[indx]].setIcon(get_icon(i+1));
          }
        }
      });
    }
  }
  function get_modal(position)
  {
    var str = "<div aria-hidden='true' aria-labelledby='myModalLabel' role='dialog' tabindex='-1' class='modal hide fade' style='display: none;'  id='myModal"+ position + "' >SOME CONTENT</div>";
    return str;
  }
  function createMarker(place, nth)
  {

    var marker = new google.maps.Marker({
      map: map,
      position: place.geometry.location,
      title: place.name,
      //icon: place.photos[0].getUrl({'maxWidth': 35, 'maxHeight': 35})
      //icon : get_icon(j)
    });
    markersArray[nth] = marker;


    var photos = place.photos;

    var photo_url, photo_tag;
    if(!photos)
    {
       photo_tag = " ";
    }
    else
    {
      photo_url = place.photos[0].getUrl({'maxWidth': 60, 'maxHeight': 60});
      photo_tag = "<div id ='infobox-image-container' style='overflow:hidden !important;'><img class ='infobox-img' src ='"+photo_url + "' height='60' width = '50'/></div>";
    }

    var content = document.getElementById('content');
    var div = get_modal(nth);
    content.innerHTML += div;

    google.maps.event.addListener(marker, 'mouseover', function()
    {
      var str = "<table class = 'pure-table' style='overflow:hidden !important;'><tbody><tr>"+
      			"<div class='infobox pure-g-r' style='overflow:hidden !important;'>"+
      				"<div class = 'pure-u-1-3 ' style='overflow:hidden !important;'>"+
					"<a class = 'infobox-heading' data-toggle='modal' href='#myModal" + nth + "'>" +
					photo_tag +
      				"</div>"+

      				"<div class = 'pure-u-2-3' style='overflow:hidden !important;'>"+
      				place.name +
      				"</div>"+
					"</a>"+
      			"</div></tr>"+

			"<tr>"+
			"<div class = 'pure-g-r' style='overflow:hidden !important;'>"+
      				"<div class = 'pure-u-1-2' style='overflow:hidden !important;'>"+
					"<button class='pure-button pure-button-success pure-button-xsmall'>"+
				    		"<i class='icon-plus'></i>"+
					"</button>"+
      				"<div class = 'pure-u-1-2' style='overflow:hidden !important;'>"+
					"<button class='pure-button pure-button-warning pure-button-xsmall'>"+
				    		"<i class='icon-minus'></i>"+
					"</button>"+
			"</tr>"+
		"</tbody></table>"
		;

      var myOptions = {
                 content: str
                ,disableAutoPan: true
                ,maxWidth: 0
                ,pixelOffset: new google.maps.Size(-140, 0)

                ,boxStyle: {

                  opacity: 1,
                  width: "280px"
                 }
                ,closeBoxMargin: "10px 2px 2px 2px"
                ,closeBoxURL: "http://www.google.com/intl/en_us/mapfiles/close.gif"
                ,infoBoxClearance: new google.maps.Size(1, 1)
                ,isHidden: false
                ,pane: "floatPane"
                ,enableEventPropagation: false
        };
      //infowindow = new InfoBox(myOptions);
      //var str = "<div class= 'pure-g-r-infowin'> <div class='pure-u'>" +
      //"<a data-toggle='modal' href='#myModal" + nth + "'>" + place.name + "</a>" + "</br>" +
      //place.types + "</br>" + photo_tag + "</div></div>";
      infowindow.setContent(str);
      infowindow.open(map, this);

    });
  }
