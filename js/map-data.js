window.HohhotMapData = {
  center: [111.7492, 40.8426],
  zoom: 9.8,
  pitch: 0,
  bearing: 0,
  bounds: [
    [110.95, 40.1],
    [112.75, 41.35]
  ],
  projectSite: {
    name: "民族时代广场",
    // WGS84 坐标，渲染前会自动转换为 GCJ-02
    coordinates: [111.6618, 40.8196],
    offsetMeters: {
      east: 0,
      north: 130
    }
  },
  mapStyle: {
    version: 8,
    sources: {
      gaode: {
        type: "raster",
        tiles: [
          "https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
          "https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
          "https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
          "https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
        ],
        tileSize: 256,
        attribution: "© 高德地图"
      }
    },
    layers: [
      {
        id: "gaode-raster",
        type: "raster",
        source: "gaode",
        paint: {
          "raster-saturation": -1,
          "raster-contrast": 0.2,
          "raster-brightness-min": 0.05,
          "raster-brightness-max": 0.95
        },
        minzoom: 0,
        maxzoom: 19
      }
    ]
  },
  overpassEndpoints: [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ],
  cache: {
    enabled: true,
    // 地图数据本地缓存有效期（小时）
    ttlHours: 24
  },
  supabase: {
    url: "https://oebgnmohndeurjwzdtdj.supabase.co",
    anonKey: "sb_publishable_8ws18EcSbSjc1q4ZIQ2NeA_cDRqPM93",
    table: "Huhhot POI data",
    // 你的 POI 坐标来自高德体系，默认按 GCJ-02 处理；若后续换成 WGS84 可改为 "wgs84"
    coordSystem: "gcj02",
    // POI 相对路网的人工校准（米），按当前要求持续微调：
    // 在 east=350,north=-80 基础上再“向西15m、向北10m”，得到 east=335,north=-70
    offsetMeters: {
      east: 335,
      north: -70
    },
    columns: {
      x: "x",
      y: "y",
      bigCategory: "大类"
    },
    pageSize: 1000,
    maxRows: 200000
  },
  layerIds: {
    traffic: ["traffic-lines"],
    business: [
      "business-grid-cells-coarse",
      "business-grid-outline-coarse",
      "business-grid-cells-fine",
      "business-grid-outline-fine",
      "business-poi-detail"
    ],
    green: ["green-density-heat", "green-polygons", "green-outline"]
  },
  colors: {
    trafficLine: "#1f8f68",
    businessHigh: "#b11226",
    businessMidHigh: "#f08f61",
    businessMid: "#e2d7a4",
    businessLowMid: "#74b4dc",
    businessLow: "#1b78b2",
    businessPoiStroke: "#ffffff",
    greenFill: "#8bd6b1",
    greenOutline: "#2a7f5f",
    boundaryLine: "#2a7f5f"
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
      { type: "Feature", properties: { category: "retail" }, geometry: { type: "Point", coordinates: [111.67, 40.82] } },
      { type: "Feature", properties: { category: "service" }, geometry: { type: "Point", coordinates: [111.72, 40.84] } },
      { type: "Feature", properties: { category: "office" }, geometry: { type: "Point", coordinates: [111.78, 40.8] } },
      { type: "Feature", properties: { category: "public" }, geometry: { type: "Point", coordinates: [111.74, 40.87] } },
      { type: "Feature", properties: { category: "service" }, geometry: { type: "Point", coordinates: [111.58, 40.86] } },
      { type: "Feature", properties: { category: "retail" }, geometry: { type: "Point", coordinates: [112.02, 40.74] } }
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
[out:json][timeout:120];
area["name"="呼和浩特市"]["boundary"="administrative"]->.a;
(
  way(area.a)["highway"~"motorway|trunk|primary|secondary|tertiary|residential|unclassified|service|living_street|road"];
);
out geom;`,
    poi: `
[out:json][timeout:120];
area["name"="呼和浩特市"]["boundary"="administrative"]->.a;
(
  node(area.a)["amenity"~"restaurant|cafe|fast_food|marketplace|bank|hospital|clinic|pharmacy|school|university|college|library|bus_station|subway_entrance|government|post_office"];
  node(area.a)["shop"];
  node(area.a)["office"];
  node(area.a)["tourism"];
  node(area.a)["leisure"~"sports_centre|stadium|theatre|cinema"];
  way(area.a)["amenity"~"restaurant|cafe|fast_food|marketplace|bank|hospital|clinic|pharmacy|school|university|college|library|bus_station|government|post_office"];
  way(area.a)["shop"];
  way(area.a)["office"];
  way(area.a)["tourism"];
  relation(area.a)["amenity"~"hospital|school|university|government"];
  relation(area.a)["shop"];
  relation(area.a)["office"];
);
out center;`,
    green: `
[out:json][timeout:120];
area["name"="呼和浩特市"]["boundary"="administrative"]->.a;
(
  way(area.a)["leisure"="park"];
  way(area.a)["leisure"="garden"];
  way(area.a)["landuse"~"forest|grass|village_green|recreation_ground"];
  way(area.a)["natural"~"wood|grassland|scrub"];
  relation(area.a)["leisure"="park"];
  relation(area.a)["leisure"="garden"];
  relation(area.a)["landuse"~"forest|grass|village_green|recreation_ground"];
  relation(area.a)["natural"~"wood|grassland|scrub"];
);
out geom;`
  }
};
