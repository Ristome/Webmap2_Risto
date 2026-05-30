import * as turfPractice from "./turfPractice.js";
import * as layers from "./layers.js";

let map = L.map('map', {
    center: [58.374, 26.715],
    zoom: 18,
    zoomControl: true
});

map.on('click', function(event) {
    console.log(event);
    const infoBox = document.getElementById('info-box');
    const infoWindowContent = document.getElementById('info-content');

    infoBox.style.display = "block";
    infoWindowContent.innerHTML = "";

    Object.entries(activeWmsLayers).forEach(([key, value]) => {
        if (value == true) {
            const fullUrl = buildRequestUrl(
                event,
                "https://landscape-geoinformatics.ut.ee/geoserver/pa2023/wms?",
                key
            );

            fetchWmsData(fullUrl, key);
        }
    });
});

// Base layers
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: 'OpenStreetMap contributors'
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS community'
});

const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'OpenStreetMap contributors, SRTM, OpenTopoMap'
});

osmLayer.addTo(map);

const baseLayers = {
    "OpenStreetMap": osmLayer,
    "Satellite": satelliteLayer,
    "Topographic": topoLayer
};

// Layer order

map.createPane('districtPane');
map.getPane('districtPane').style.zIndex = 300;

map.createPane('choroplethPane');
map.getPane('choroplethPane').style.zIndex = 350;


map.getPane('overlayPane').style.zIndex = 450;


let districtsLayer;
let choroplethLayer;
let heatMapLayer;
let markersLayer;

let activeWmsLayers = {};

function defaultMapSettings() {
    map.setView([58.374, 26.715], 18);
}

document.getElementById("applySettingsButton").addEventListener("click", defaultMapSettings);

// Districts layer
async function loadDistrictsLayer() {
    const response = await fetch('geojson/tartu_city_districts_edu.geojson');
    const data = await response.json();

    districtsLayer = L.geoJson(data, {
        style: function(feature) {
            return {
                fillColor: getDistrictColor(feature.properties.OBJECTID),
                fillOpacity: 0.5,
                weight: 1,
                opacity: 1,
                color: 'grey'
            };
        },
        onEachFeature: function(feature, layer) {
            layer.bindPopup(
                feature.properties.NIMI ||
                'District ' + feature.properties.OBJECTID
            );
        },
        pane: 'districtPane'
    });
}

// Color the districts layer
function getDistrictColor(id) {
    switch (id) {
        case 1: return '#ff0000';
        case 13: return '#009933';
        case 6: return '#0000ff';
        case 7: return '#ff0066';
        default: return '#ffffff';
    }
}

// Choropleth layer
async function loadChoroplethLayer() {
    const response = await fetch('geojson/tartu_city_districts_edu.geojson');
    const data = await response.json();

    choroplethLayer = L.choropleth(data, {
        valueProperty: 'TOWERS',
        scale: ['#ffffcc', '#800026'],
        steps: 5,
        mode: 'q',
        style: {
            color: 'white',
            weight: 2,
            fillOpacity: 0.7
        },
        onEachFeature: function(feature, layer) {
            layer.bindPopup(
                "District: " + feature.properties.NIMI +
                "<br>Number of cell towers: " + feature.properties.TOWERS
            );
        },
        pane: 'choroplethPane'
    });
}

// Heatmap layer
async function loadHeatMapLayer() {
    const response = await fetch('geojson/tartu_city_celltowers_edu.geojson');
    const data = await response.json();

    let heatData = [];

    data.features.forEach(function(feature) {
        let lon = feature.geometry.coordinates[0];
        let lat = feature.geometry.coordinates[1];

        heatData.push([lat, lon, 1]);
    });

    heatMapLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 18,
    });
}

// Clustered marker layer
async function loadMarkersLayer() {
    const response = await fetch('geojson/tartu_city_celltowers_edu.geojson');
    const data = await response.json();

    const points = L.geoJson(data, {
        onEachFeature: function(feature, layer) {
            layer.bindPopup(
                "Cell tower" +
                "<br>Radio: " + feature.properties.radio
            );
        }
    });

    markersLayer = L.markerClusterGroup();
    markersLayer.addLayer(points);
}

function loadWmsLayers(layersList, overlayLayers) {
    layersList.forEach(layer => {

        let paneName = `${layer.layers}-pane`;

        map.createPane(paneName);
        map.getPane(paneName).style.zIndex = layer.zIndex;

        let newLayer = L.tileLayer.wms(layer.url, {
            version: layer.version,
            layers: layer.layers,
            format: layer.format,
            transparent: layer.transparent,
            zIndex: layer.zIndex,
            pane: paneName
        });

        overlayLayers[layer.title.en] = newLayer;

        activeWmsLayers[layer.layers] = false;
    });
}

function toggleActiveState(layerId, boolean) {
    if (typeof(activeWmsLayers[layerId]) == "boolean") {
        activeWmsLayers[layerId] = boolean;
    }
}

function buildRequestUrl(e, baseUrl, layerName) {
    const bounds = map.getBounds();

    const bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
    ].join(',');

    const size = map.getSize();
    const sizeX = size.x;
    const sizeY = size.y;

    const xPoint = Math.floor(e.containerPoint.x);
    const yPoint = Math.floor(e.containerPoint.y);

    const wmsUrl = baseUrl;

    const params = new URLSearchParams({
        service: 'WMS',
        version: '1.1.1',
        request: 'GetFeatureInfo',
        query_layers: layerName,
        layers: layerName,
        info_format: 'application/json',
        x: xPoint,
        y: yPoint,
        srs: 'EPSG:4326',
        width: sizeX,
        height: sizeY,
        bbox: `${bbox}`
    });

    return wmsUrl + params;
}

function fetchWmsData(fullUrl, layerName) {
    fetch(fullUrl)
        .then(response => response.json())
        .then(data => {
            const content = document.getElementById('info-content');

            if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                const props = feature.properties;

                let html = `<h4>${layerName}</h4><ul>`;

                for (const key in props) {
                    html += `<li><strong>${key}:</strong> ${props[key]}</li>`;
                }

                html += '</ul>';

                content.innerHTML += html;
            } else {
                content.innerHTML += `<em>No features found for ${layerName}</em><br>`;
            }
        })
        .catch(error => {
            console.error('Request failed:', error);
        });
}

async function initializeLayers() {
    await Promise.all([
        loadDistrictsLayer(),
        loadChoroplethLayer(),
        loadHeatMapLayer(),
        loadMarkersLayer()
    ]);

    // districtsLayer.addTo(map);
    // choroplethLayer.addTo(map);
    // heatMapLayer.addTo(map);

    const overlayLayers = {
        "Tartu districts": districtsLayer,
        "Choropleth": choroplethLayer,
        "Heatmap": heatMapLayer,
        "Cell tower clusters": markersLayer
    };

loadWmsLayers(layers.wmsLayers, overlayLayers);

    L.control.layers(baseLayers, overlayLayers, {
        collapsed: false
    }).addTo(map);
}

initializeLayers();

map.on('overlayadd', function(event) {
    if (event.layer.options && event.layer.options.layers) {
        toggleActiveState(event.layer.options.layers, true);
    }
});

map.on('overlayremove', function(event) {
    if (event.layer.options && event.layer.options.layers) {
        toggleActiveState(event.layer.options.layers, false);
    }
});

turfPractice.turfFunctions(map);

document.getElementById("info-close").addEventListener("click", function() {
    document.getElementById("info-box").style.display = "none";


});