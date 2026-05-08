(function () {
  function showMapError(msg) {
    const el = document.getElementById("cityMap");
    if (!el) return;
    el.innerHTML = `<div class="map-error">${msg}</div>`;
  }

  const cfg = window.HohhotMapData;
  if (!cfg) {
    showMapError("地图配置加载失败，请刷新后重试。");
    return;
  }

  if (!window.maplibregl) {
    showMapError("地图核心库加载失败，请检查网络后刷新页面。");
    return;
  }

  function outOfChina(lon, lat) {
    return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }

  function transformLat(x, y) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
    ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
    return ret;
  }

  function transformLon(x, y) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
    ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
    return ret;
  }

  function wgs84ToGcj02(lon, lat) {
    if (outOfChina(lon, lat)) return [lon, lat];
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    let dLat = transformLat(lon - 105.0, lat - 35.0);
    let dLon = transformLon(lon - 105.0, lat - 35.0);
    const radLat = (lat / 180.0) * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
    dLon = (dLon * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
    return [lon + dLon, lat + dLat];
  }

  function convertCoordsToGcj(coords, geometryType) {
    if (geometryType === "Point") return wgs84ToGcj02(coords[0], coords[1]);
    if (geometryType === "LineString") return coords.map((pt) => wgs84ToGcj02(pt[0], pt[1]));
    if (geometryType === "Polygon") return coords.map((ring) => ring.map((pt) => wgs84ToGcj02(pt[0], pt[1])));
    if (geometryType === "MultiPolygon") {
      return coords.map((poly) => poly.map((ring) => ring.map((pt) => wgs84ToGcj02(pt[0], pt[1]))));
    }
    return coords;
  }

  function convertFeatureCollectionToGcj(featureCollection) {
    return {
      type: "FeatureCollection",
      features: (featureCollection.features || []).map((f) => ({
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: convertCoordsToGcj(f.geometry.coordinates, f.geometry.type)
        }
      }))
    };
  }

  function convertBoundsToGcj(bounds) {
    const sw = wgs84ToGcj02(bounds[0][0], bounds[0][1]);
    const ne = wgs84ToGcj02(bounds[1][0], bounds[1][1]);
    return [sw, ne];
  }

  const map = new maplibregl.Map({
    container: "cityMap",
    style: cfg.mapStyle,
    center: wgs84ToGcj02(cfg.center[0], cfg.center[1]),
    zoom: cfg.zoom,
    pitch: cfg.pitch,
    bearing: cfg.bearing,
    antialias: true
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
  map.fitBounds(convertBoundsToGcj(cfg.bounds), { padding: 24, duration: 0 });
  map.on("error", () => {
    showMapError("地图底图资源加载异常，请稍后刷新重试。");
  });

  function sanitizeLevel(level) {
    if (!level) return "tertiary";
    if (level.includes("motorway")) return "motorway";
    if (level.includes("trunk")) return "trunk";
    if (level.includes("primary")) return "primary";
    if (level.includes("secondary")) return "secondary";
    if (level.includes("residential")) return "residential";
    if (level.includes("service")) return "service";
    return "tertiary";
  }

  function classifyPoi(tags = {}) {
    const amenity = tags.amenity || "";
    if (amenity && /restaurant|cafe|fast_food|marketplace/.test(amenity)) return "retail";
    if (amenity && /bank|hospital|clinic|pharmacy/.test(amenity)) return "service";
    if (amenity && /school|university|college|library|bus_station|subway_entrance/.test(amenity)) return "public";
    if (amenity && /government|post_office/.test(amenity)) return "public";
    if (tags.shop) return "retail";
    if (tags.office) return "office";
    if (tags.tourism) return "public";
    return "service";
  }

  async function fetchOverpass(query) {
    const body = query.trim();
    for (const endpoint of cfg.overpassEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: `data=${encodeURIComponent(body)}`
        });
        if (!res.ok) continue;
        const json = await res.json();
        if (json && Array.isArray(json.elements) && json.elements.length) return json;
      } catch (err) {
        // Try next endpoint
      }
    }
    return null;
  }

  function overpassToLineFeatures(overpass) {
    if (!overpass) return [];
    return overpass.elements
      .filter((el) => el.type === "way" && Array.isArray(el.geometry) && el.geometry.length > 1)
      .map((el) => ({
        type: "Feature",
        properties: { level: sanitizeLevel(el.tags && el.tags.highway) },
        geometry: {
          type: "LineString",
          coordinates: el.geometry.map((p) => [p.lon, p.lat])
        }
      }));
  }

  function overpassToPointFeatures(overpass) {
    if (!overpass) return [];
    return overpass.elements
      .filter((el) => {
        if (el.type === "node" && typeof el.lon === "number" && typeof el.lat === "number") return true;
        if ((el.type === "way" || el.type === "relation") && el.center && typeof el.center.lon === "number" && typeof el.center.lat === "number") return true;
        return false;
      })
      .map((el) => ({
        type: "Feature",
        properties: { category: classifyPoi(el.tags) },
        geometry: {
          type: "Point",
          coordinates:
            el.type === "node"
              ? [el.lon, el.lat]
              : [el.center.lon, el.center.lat]
        }
      }));
  }

  function overpassToPolygonFeatures(overpass) {
    if (!overpass) return [];
    return overpass.elements
      .filter((el) => (el.type === "way" || el.type === "relation") && Array.isArray(el.geometry) && el.geometry.length > 3)
      .map((el) => {
        const ring = el.geometry.map((p) => [p.lon, p.lat]);
        if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]);
        return {
          type: "Feature",
          properties: { kind: "green", score: 0.65 },
          geometry: { type: "Polygon", coordinates: [ring] }
        };
      });
  }

  function overpassToBoundaryFeatures(overpass) {
    const features = overpassToPolygonFeatures(overpass);
    return features.length ? features : cfg.fallbackBoundary.features;
  }

  function toFeatureCollection(features) {
    return { type: "FeatureCollection", features };
  }

  function polygonBBoxArea(coords) {
    const ring = coords && coords[0];
    if (!ring || !ring.length) return 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    ring.forEach((pt) => {
      if (pt[0] < minX) minX = pt[0];
      if (pt[1] < minY) minY = pt[1];
      if (pt[0] > maxX) maxX = pt[0];
      if (pt[1] > maxY) maxY = pt[1];
    });
    return (maxX - minX) * (maxY - minY);
  }

  function filterLargePolygons(features, maxBBoxArea) {
    return features.filter((f) => {
      if (!f.geometry) return false;
      if (f.geometry.type === "Polygon") return polygonBBoxArea(f.geometry.coordinates) <= maxBBoxArea;
      if (f.geometry.type === "MultiPolygon") {
        return f.geometry.coordinates.some((poly) => polygonBBoxArea(poly) <= maxBBoxArea);
      }
      return false;
    });
  }

  function polygonCentroid(coords) {
    const ring = coords && coords[0];
    if (!ring || ring.length < 3) return null;
    let twiceArea = 0;
    let x = 0;
    let y = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      const p1 = ring[i];
      const p2 = ring[i + 1];
      const f = p1[0] * p2[1] - p2[0] * p1[1];
      twiceArea += f;
      x += (p1[0] + p2[0]) * f;
      y += (p1[1] + p2[1]) * f;
    }
    if (!twiceArea) return null;
    return [x / (3 * twiceArea), y / (3 * twiceArea)];
  }

  function polygonAreaEstimate(coords) {
    const ring = coords && coords[0];
    if (!ring || ring.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      const p1 = ring[i];
      const p2 = ring[i + 1];
      sum += p1[0] * p2[1] - p2[0] * p1[1];
    }
    return Math.abs(sum / 2);
  }

  function buildGreenDensityPoints(greenFC) {
    const features = [];
    greenFC.features.forEach((f) => {
      if (!f.geometry) return;
      if (f.geometry.type === "Polygon") {
        const c = polygonCentroid(f.geometry.coordinates);
        if (!c) return;
        features.push({
          type: "Feature",
          properties: {
            weight: Math.min(1, Math.max(0.08, polygonAreaEstimate(f.geometry.coordinates) * 80))
          },
          geometry: { type: "Point", coordinates: c }
        });
        return;
      }
      if (f.geometry.type === "MultiPolygon") {
        f.geometry.coordinates.forEach((poly) => {
          const c = polygonCentroid(poly);
          if (!c) return;
          features.push({
            type: "Feature",
            properties: {
              weight: Math.min(1, Math.max(0.08, polygonAreaEstimate(poly) * 80))
            },
            geometry: { type: "Point", coordinates: c }
          });
        });
      }
    });
    return { type: "FeatureCollection", features };
  }

  function addBoundaryLayer(boundaryFC) {
    map.addSource("boundary-source", { type: "geojson", data: boundaryFC });
    map.addLayer({
      id: "boundary-fill",
      type: "fill",
      source: "boundary-source",
      paint: {
        "fill-color": "#ebf8f2",
        "fill-opacity": 0.2
      }
    });
    map.addLayer({
      id: "boundary-line",
      type: "line",
      source: "boundary-source",
      paint: {
        "line-color": cfg.colors.boundaryLine,
        "line-width": 1.6
      }
    });
  }

  function addTrafficLayers(roadsFC) {
    map.addSource("traffic-roads", { type: "geojson", data: roadsFC });
    map.addLayer({
      id: "traffic-lines",
      type: "line",
      source: "traffic-roads",
      paint: {
        "line-color": [
          "match",
          ["get", "level"],
          "motorway",
          "#0c6f53",
          "trunk",
          "#158664",
          "primary",
          cfg.colors.trafficLine,
          "secondary",
          "#3aaa84",
          "#6bc6a6"
        ],
        "line-width": [
          "match",
          ["get", "level"],
          "motorway",
          4.2,
          "trunk",
          3.8,
          "primary",
          3.2,
          "secondary",
          2.5,
          "residential",
          1.6,
          "service",
          1.2,
          1.9
        ],
        "line-opacity": 0.88
      }
    });
  }

  function addBusinessLayers(poiFC) {
    map.addSource("business-poi-source", { type: "geojson", data: poiFC });
    [
      { id: "business-poi-retail", category: "retail", color: cfg.colors.businessPoiRetail },
      { id: "business-poi-service", category: "service", color: cfg.colors.businessPoiService },
      { id: "business-poi-office", category: "office", color: cfg.colors.businessPoiOffice },
      { id: "business-poi-public", category: "public", color: cfg.colors.businessPoiPublic }
    ].forEach((layer) => {
      map.addLayer({
        id: layer.id,
        type: "circle",
        source: "business-poi-source",
        filter: ["==", ["get", "category"], layer.category],
        paint: {
          "circle-color": layer.color,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            2.5,
            10,
            4.6,
            12,
            6.6
          ],
          "circle-stroke-color": cfg.colors.businessPoiStroke,
          "circle-stroke-width": 1,
          "circle-opacity": 0.82
        }
      });
    });
  }

  function addGreenLayers(greenFC) {
    const greenDensityPoints = buildGreenDensityPoints(greenFC);
    map.addSource("green-density-source", { type: "geojson", data: greenDensityPoints });
    map.addLayer({
      id: "green-density-heat",
      type: "heatmap",
      source: "green-density-source",
      paint: {
        "heatmap-weight": ["get", "weight"],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 12, 1.2],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(173, 232, 197, 0)",
          0.3,
          "rgba(139, 214, 177, 0.35)",
          0.6,
          "rgba(79, 190, 146, 0.55)",
          1,
          "rgba(42, 127, 95, 0.75)"
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 18, 12, 34],
        "heatmap-opacity": 0.66
      }
    });

    map.addSource("green-polygons-source", { type: "geojson", data: greenFC });
    map.addLayer({
      id: "green-polygons",
      type: "fill",
      source: "green-polygons-source",
      paint: {
        "fill-color": cfg.colors.greenFill,
        "fill-opacity": 0.28
      }
    });
    map.addLayer({
      id: "green-outline",
      type: "line",
      source: "green-polygons-source",
      paint: {
        "line-color": cfg.colors.greenOutline,
        "line-width": 1.2,
        "line-opacity": 0.8
      }
    });
  }

  function setLayerVisible(layerId, visible) {
    if (!map.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }

  function switchMode(mode) {
    const ids = cfg.layerIds;
    const showTraffic = mode === "all" || mode === "traffic";
    const showBusiness = mode === "all" || mode === "business";
    const showGreen = mode === "all" || mode === "green";
    ids.traffic.forEach((id) => setLayerVisible(id, showTraffic));
    ids.business.forEach((id) => setLayerVisible(id, showBusiness));
    ids.green.forEach((id) => setLayerVisible(id, showGreen));
  }

  function wireButtons() {
    const buttons = document.querySelectorAll(".map-toggle-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        switchMode(btn.dataset.layerMode);
      });
    });
  }

  async function buildAllLayers() {
    const boundaryRaw = await fetchOverpass(cfg.queries.boundary);
    const roadsRaw = await fetchOverpass(cfg.queries.roads);
    const poiRaw = await fetchOverpass(cfg.queries.poi);
    const greenRaw = await fetchOverpass(cfg.queries.green);

    const boundaryFC = toFeatureCollection(overpassToBoundaryFeatures(boundaryRaw));
    const roadsFC = toFeatureCollection(overpassToLineFeatures(roadsRaw).slice(0, 12000));
    const poiFC = toFeatureCollection(overpassToPointFeatures(poiRaw).slice(0, 18000));
    const greenFC = toFeatureCollection(overpassToPolygonFeatures(greenRaw).slice(0, 4000));

    const safeRoads = roadsFC.features.length ? roadsFC : cfg.fallbackRoads;
    const safePoi = poiFC.features.length ? poiFC : cfg.fallbackPoi;
    const safeGreen = greenFC.features.length ? greenFC : cfg.fallbackGreen;
    const safeBoundary = boundaryFC.features.length ? boundaryFC : cfg.fallbackBoundary;
    const compactGreenFeatures = filterLargePolygons(safeGreen.features, 0.8);
    const compactGreen =
      compactGreenFeatures.length > 0
        ? toFeatureCollection(compactGreenFeatures)
        : cfg.fallbackGreen;

    const gcjRoads = convertFeatureCollectionToGcj(safeRoads);
    const gcjPoi = convertFeatureCollectionToGcj(safePoi);
    const gcjBoundary = convertFeatureCollectionToGcj(safeBoundary);
    const gcjGreen = convertFeatureCollectionToGcj(compactGreen);

    addBoundaryLayer(gcjBoundary);
    addTrafficLayers(gcjRoads);
    addBusinessLayers(gcjPoi);
    addGreenLayers(gcjGreen);

    switchMode("all");
    wireButtons();
  }

  map.on("load", () => {
    buildAllLayers();
  });
})();
