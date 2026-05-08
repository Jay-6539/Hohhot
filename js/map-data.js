window.HohhotMapData = {
  center: [111.7492, 40.8426],
  zoom: 9.8,
  pitch: 52,
  bearing: -18,
  bounds: [
    [110.95, 40.1],
    [112.75, 41.35]
  ],
  mapStyle: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: [
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors"
      }
    },
    layers: [
      {
        id: "osm-raster",
        type: "raster",
        source: "osm",
        minzoom: 0,
        maxzoom: 19
      }
    ]
  },
  overpassEndpoints: [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ],
  layerIds: {
    traffic: ["traffic-lines", "traffic-density-3d"],
    business: ["business-density-3d"],
    green: ["green-polygons", "green-density-3d"]
  },
  colors: {
    trafficLine: "#3ac18e",
    traffic3d: "#1ea676",
    business3d: "#0f7f58",
    greenFill: "#9ae6c7",
    green3d: "#44be8c",
    boundaryLine: "#0f7f58"
  },
  fallbackBoundary: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "呼和浩特市（示意边界）" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [110.98, 40.18],
              [111.28, 40.15],
              [111.7, 40.22],
              [112.3, 40.3],
              [112.62, 40.65],
              [112.68, 41.02],
              [112.45, 41.26],
              [112.02, 41.31],
              [111.45, 41.24],
              [111.05, 40.98],
              [110.98, 40.6],
              [110.98, 40.18]
            ]
          ]
        }
      }
    ]
  },
  fallbackRoads: {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { level: "primary" }, geometry: { type: "LineString", coordinates: [[111.15, 40.7], [111.9, 40.72], [112.45, 40.8]] } },
      { type: "Feature", properties: { level: "secondary" }, geometry: { type: "LineString", coordinates: [[111.2, 40.95], [111.76, 40.82], [112.22, 40.73]] } },
      { type: "Feature", properties: { level: "tertiary" }, geometry: { type: "LineString", coordinates: [[111.38, 40.45], [111.72, 40.66], [112.02, 40.92]] } },
      { type: "Feature", properties: { level: "secondary" }, geometry: { type: "LineString", coordinates: [[111.55, 40.42], [111.6, 40.78], [111.58, 41.09]] } }
    ]
  },
  fallbackPoi: {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { category: "business" }, geometry: { type: "Point", coordinates: [111.67, 40.82] } },
      { type: "Feature", properties: { category: "business" }, geometry: { type: "Point", coordinates: [111.72, 40.84] } },
      { type: "Feature", properties: { category: "business" }, geometry: { type: "Point", coordinates: [111.78, 40.8] } },
      { type: "Feature", properties: { category: "business" }, geometry: { type: "Point", coordinates: [111.58, 40.86] } },
      { type: "Feature", properties: { category: "business" }, geometry: { type: "Point", coordinates: [112.02, 40.74] } }
    ]
  },
  fallbackGreen: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { kind: "park", score: 0.72 },
        geometry: {
          type: "Polygon",
          coordinates: [[[111.58, 40.86], [111.64, 40.86], [111.64, 40.91], [111.58, 40.91], [111.58, 40.86]]]
        }
      },
      {
        type: "Feature",
        properties: { kind: "park", score: 0.58 },
        geometry: {
          type: "Polygon",
          coordinates: [[[111.92, 40.76], [111.99, 40.76], [111.99, 40.81], [111.92, 40.81], [111.92, 40.76]]]
        }
      }
    ]
  },
  queries: {
    boundary: `
[out:json][timeout:60];
relation["boundary"="administrative"]["name"="呼和浩特市"]["admin_level"~"5|6|7"];
out geom;`,
    roads: `
[out:json][timeout:90];
area["name"="呼和浩特市"]["boundary"="administrative"]->.a;
(
  way(area.a)["highway"~"motorway|trunk|primary|secondary|tertiary"];
);
out geom;`,
    poi: `
[out:json][timeout:90];
area["name"="呼和浩特市"]["boundary"="administrative"]->.a;
(
  node(area.a)["amenity"~"restaurant|cafe|bank|hospital|school|university|marketplace"];
  node(area.a)["shop"];
  node(area.a)["office"];
);
out body;`,
    green: `
[out:json][timeout:90];
area["name"="呼和浩特市"]["boundary"="administrative"]->.a;
(
  way(area.a)["leisure"="park"];
  way(area.a)["landuse"~"grass|forest|recreation_ground"];
  relation(area.a)["leisure"="park"];
  relation(area.a)["landuse"~"grass|forest|recreation_ground"];
);
out geom;`
  }
};
