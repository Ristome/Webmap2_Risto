import { pointsCollection } from "./points.js";

function turfFunctions(map) {

    // define point coordinates
    const pointCoords = [26.71552, 58.37393];

    const myPoint = turf.point(pointCoords);

    // convert the point to Gjson
    const geoJSON_point = L.geoJSON(myPoint);
    geoJSON_point.addTo(map);


    // second point for distance
    const newPointCoords = [26.71489, 58.37439];

    const myNewPoint = turf.point(newPointCoords);

    L.geoJSON(myNewPoint).addTo(map);

    // define line
    const lineCoords = [
        [26.71379, 58.37476],
        [26.71554, 58.37349],
        [26.71553, 58.37434],
        [26.71630, 58.37378],
        [26.71473, 58.37407]
    ];
    const myLine = turf.lineString(lineCoords);

    L.geoJSON(myLine).addTo(map);

    // define polygon coordinates
    const polygonCoords = [[
        [26.71355, 58.37468],
        [26.71404, 58.37430],
        [26.71433, 58.37429],
        [26.71550, 58.37345],
        [26.71660, 58.37388],
        [26.71615, 58.37420],
        [26.71589, 58.37431],
        [26.71552, 58.37461],
        [26.71521, 58.37496],
        [26.71480, 58.37481],
        [26.71449, 58.37502],
        [26.71355, 58.37468]
    ]];

    const myPolygon = turf.polygon(polygonCoords);

    L.geoJSON(myPolygon).addTo(map);

    const points = turf.points(pointsCollection);

    // add all points to map temporarily
    const pointsLayer = L.geoJSON(points).addTo(map);

    // find points that are inside the polygon
    const pointsWithinBorders = turf.pointsWithinPolygon(points, myPolygon);

    console.log(pointsWithinBorders);

    // remove all points layer from map
    map.removeLayer(pointsLayer);

    // add only filtered points to map
    L.geoJSON(pointsWithinBorders).addTo(map);

    // measure distance
    const options = { units: 'meters' };

    const distance = turf.distance(myPoint, myNewPoint, options);

    const distanceRounded = Math.round(distance);

    console.log(`Distance is ${distanceRounded} meters`);


    // measure area
    const areaMeasurement = turf.area(myPolygon);

    const areaRounded = Math.round(areaMeasurement);

    console.log(`Rounded area is ${areaRounded} square meters`);


    // create buffer around point
    const statueBuffer = turf.buffer(myPoint, 20, {
        units: 'meters'
    });

    L.geoJSON(statueBuffer).addTo(map);


    // create envelope
    const features = turf.featureCollection([myPoint, myNewPoint, myLine, myPolygon]);

    const enveloped = turf.envelope(features);

    L.geoJSON(enveloped).addTo(map);

    // CenterOfMass Turf function
    const polygonCenter = turf.centerOfMass(myPolygon);

    L.geoJSON(polygonCenter, {
        pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 7,
                color: "red",
                fillColor: "red",
                fillOpacity: 1
            });
        }
    }).bindPopup("The red point is created with turf.centerOfMass()").addTo(map);

    console.log("Result of turf.centerOfMass():", polygonCenter);
}

export { turfFunctions };