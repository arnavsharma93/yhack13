/* VISHRUT's HACK */
$(document).ready(function(){
        $("#num").click(function () {
            $(".pure-u-1:first").clone().appendTo("#vishrut"); 
            });
        $('#btn').click(function() {
                $('.pure-u-1:first').remove();
                  });
});
/*********************/

  var map, markersArray=[];
  var modal_done = [];
  var infowindow;
  var directionsDisplay;
  var directionsService, optimal_dist=0, optimal_time=0;
  var max_results = 10;
  var num_markers = 0;
  

  function initialize() 
  {
    // Map center -- City location.
    // TODO : Get the latlng using city name.
    var myLatlng = new google.maps.LatLng(17.3667, 78.4667);

     // Load the Map.
    var myOptions = {
      zoom: 10,
      center: myLatlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    }
    map = new google.maps.Map(document.getElementById("mapCanvas"), myOptions);
    
    /* BANSAL's AUTOCOMPLETE */
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
          createMarker(place, num_markers);
          num_markers+=1;
     
          //markers.push(marker);
     
          bounds.extend(place.geometry.location);
        }
     
        map.fitBounds(bounds);
      });
     
        google.maps.event.addListener(map, 'bounds_changed', function() {
        var bounds = map.getBounds();
        searchBox.setBounds(bounds);
      });
    /* BANSAL's AUTOCOMPLETE END*/

    /* SOMAY's AUTOCOMPLETE */
        var input = /** @type {HTMLInputElement} */(document.getElementById('target'));
        var cities = document.getElementsByClassName("city");
        
        /*
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
          createMarker(place, num_markers);
          num_markers+=1;
     
          //markers.push(marker);
     
          bounds.extend(place.geometry.location);
        }
     
        map.fitBounds(bounds);
      });
     
        google.maps.event.addListener(map, 'bounds_changed', function() {
        var bounds = map.getBounds();
        searchBox.setBounds(bounds);
      });
      */
    /* SOMAY's AUTOCOMPLETE END*/

    directionsDisplay = new google.maps.DirectionsRenderer();
    directionsService = new google.maps.DirectionsService();

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

    var service = new google.maps.places.PlacesService(map);

    service.nearbySearch(request, function(results, status) 
    {
      if (status == google.maps.places.PlacesServiceStatus.OK) 
      {
        // TODO : First max_results results are taken. This should be done with rating.
        if(max_results > results.length)
          max_results = results.length;
        for (var i = 0; i < max_results; i++) 
        {
            // Create a marker on the place.
            modal_done[i] = 0;
            createMarker(results[i], i);
            num_markers+=1;
        }
      }
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
          
          markersArray[jmin].setIcon(get_icon(0));
          for(i=0; i<optimal_response.routes[0].legs.length; i++)
          {
            
            indx = optimal_response.routes[0].waypoint_order[i];
            markersArray[places_copy[indx]].setIcon(get_icon(i+1));
          }
        }
      });
    }
  }
  function get_modal(place2, position)
  {
    console.log("IN MODAL");
    console.log(place2);
    var photos = place2.photos;
    var rating = place2.rating * 20;
    console.log("RATING");
    console.log(rating);
    var i;
    var carousel = "";
    if(!photos)
    {
       photo_url = "Responsive%20Grids%20%E2%80%93%20Pure_files/not_available.jpg";
       carousel = "<div class='item active'> <img src='"+photo_url+"'/></div>";
    } 
    else
    {
      var len = photos.length;
      for(i=0; i<len; i++)
      {
        photo_url = photos[i].getUrl({'maxWidth': 1000, 'maxHeight': 1000});
        
        if(i==0)
        {
          carousel = "<div class='item active modal-img-div'> <img class = 'cropped' src='"+photo_url+"'/></div>";
        }
        else
        {
          carousel += "<div class='item modal-img-div'> <img class = 'cropped' src='"+photo_url+"'/></div>";
        }
      }
    }


    var str = "<div aria-hidden='true' aria-labelledby='myModalLabel' role='dialog' tabindex='-1' class='modal hide fade' style='display: none;'  id='myModal"+ position + "' > \
    <table> \
    <tr> \
      <div class = 'pure-g-r'> \
        <div class='carousel slide' id='myCarousel"+ position +"'> \
          <div class='carousel-inner'> " +
          carousel +
          "</div>" +
          "<a data-slide='prev' href='#myCarousel"+ position +"' class='left carousel-control'>‹</a> \
          <a data-slide='next' href='#myCarousel"+ position +"' class='right carousel-control'>›</a>" + 
      "</div>\
    </tr> \
    <tr> \
      <div class = 'pure-g-r'> \
        <div class = 'pure-u-1-2'> \
          LEFT DIV \
        </div> \
        <div class = 'pure-u-1-2'> \
          RIGHT DIV \
          <div class='donut donut-big'> \
            <div class='donut-arrow' data-percentage='"+ rating + "'></div> \
          </div>\
        </div>\
      </div>\
    </tr>\
    </table>\
    </div>";
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
      photo_tag = "<img class ='infobox-img' src ='"+photo_url + "' height='60' width = '60'>";
    }

    var place_reference = place.reference;
    var request = {
    reference: place_reference
    };

    service = new google.maps.places.PlacesService(map);
    service.getDetails(request, callback);

    function callback(place2, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
          photos = place2.photos;
          var div = get_modal(place2, nth);
          load_donout();
          var content = document.getElementById('content');
          content.innerHTML += div;
          
      }
      modal_done[nth] = 1;
    }

    google.maps.event.addListener(marker, 'mouseover', function() 
    {
      var str = get_infobox(place, photo_tag, nth);
      infowindow.setContent(str);
      infowindow.open(map, this);
    });
    google.maps.event.addListener(marker, 'click', function() 
    {
      var str = get_infobox(place, photo_tag, nth);
      infowindow.setContent(str);
      infowindow.open(map, this);
    });
  }


  function get_infobox(place, photo_tag, nth)
  {
    console.log("PLACE");
    console.log(place);
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
    return str;

  }


/* VISHRUT's JS */
$(document).ready(function(){

        $('.add-itenary').click(function () 
        {
            console.log("toggling");
            if($('.add-itenary-pane').hasClass("slideout_inner"))
            {
              $(".add-itenary-pane").removeClass("slideout_inner");
              $(".add-itenary-pane").addClass("slideout_inner-active");
            }
            else
            {
              $(".add-itenary-pane").removeClass("slideout_inner-active");
              $(".add-itenary-pane").addClass("slideout_inner"); 
            }
        });
    
        $("#add").click(function () {
            $(".itenary-pane:first").clone().appendTo("#city-name"); 
            var div = $('.itenary-pane:last').children("form").children("fieldset").children("input");
            div.val("");
            
            });
        $('#del').click(function() {
            var list = $('.itenary-pane');
            console.log(list);
            if(list.length>1)
                $('.itenary-pane:last').remove();
        });
});

/*************************************************/