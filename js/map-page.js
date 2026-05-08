(function () {
  const cfg = window.HohhotMapData;
  if (!cfg || !window.maplibregl) return;

  const map = new maplibregl.Map({
    container: "cityMap",
    style: cfg.mapStyle,
    center: cfg.center,
    zoom: cfg.zoom,
    pitch: cfg.pitch,
    bearing: cfg.bearing,
    antialias: true
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
  map.fitBounds(cfg.bounds, { padding: 24, duration: 0 });

  function sanitizeLevel(level) {
    if (!level) return "tertiary";
    if (level.includes("motorway")) return "motorway";
    if (level.includes("trunk")) return "trunk";
    if (level.includes("primary")) return "primary";
    if (level.includes("secondary")) return "secondary";
    return "tertiary";
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
      .filter((el) => el.type === "node" && typeof el.lon === "number" && typeof el.lat === "number")
      .map((el) => ({
        type: "Feature",
        properties: { category: "business" },
        geometry: { type: "Point", coordinates: [el.lon, el.lat] }
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

  function centroidOfLine(coords) {
    if (!coords || !coords.length) return null;
    const mid = coords[Math.floor(coords.length / 2)];
    return mid ? [mid[0], mid[1]] : null;
  }

  function centroidOfPolygon(poly) {
    const ring = poly && poly[0];
    if (!ring || !ring.length) return null;
    let x = 0;
    let y = 0;
    ring.forEach((pt) => {
      x += pt[0];
      y += pt[1];
    });
    return [x / ring.length, y / ring.length];
  }

  function buildGridExtrusions(points, cellSize, minHeight, stepHeight) {
    const cellMap = new Map();
    points.forEach((p) => {
      const gx = Math.floor(p[0] / cellSize) * cellSize;
      const gy = Math.floor(p[1] / cellSize) * cellSize;
      const key = `${gx.toFixed(5)}_${gy.toFixed(5)}`;
      cellMap.set(key, (cellMap.get(key) || 0) + 1);
    });

    const features = [];
    cellMap.forEach((count, key) => {
      const [sx, sy] = key.split("_").map(Number);
      const ex = sx + cellSize;
      const ey = sy + cellSize;
      features.push({
        type: "Feature",
        properties: {
          density: count,
          height: minHeight + count * stepHeight
        },
        geometry: {
          type: "Polygon",
          coordinates: [[[sx, sy], [ex, sy], [ex, ey], [sx, ey], [sx, sy]]]
        }
      });
    });
    return toFeatureCollection(features);
  }

  function roadDensityPoints(roads) {
    return roads
      .map((f) => centroidOfLine(f.geometry.coordinates))
      .filter(Boolean);
  }

  function greenDensityPoints(greens) {
    return greens
      .map((f) => centroidOfPolygon(f.geometry.coordinates))
      .filter(Boolean);
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

  function addTrafficLayers(roadsFC, trafficGridFC) {
    map.addSource("traffic-roads", { type: "geojson", data: roadsFC });
    map.addLayer({
      id: "traffic-lines",
      type: "line",
      source: "traffic-roads",
      paint: {
        "line-color": cfg.colors.trafficLine,
        "line-width": [
          "match",
          ["get", "level"],
          "motorway",
          3.8,
          "trunk",
          3.4,
          "primary",
          2.8,
          "secondary",
          2.2,
          1.6
        ],
        "line-opacity": 0.78
      }
    });

    map.addSource("traffic-grid", { type: "geojson", data: trafficGridFC });
    map.addLayer({
      id: "traffic-density-3d",
      type: "fill-extrusion",
      source: "traffic-grid",
      paint: {
        "fill-extrusion-color": cfg.colors.traffic3d,
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-opacity": 0.72
      }
    });
  }

  function addBusinessLayers(businessGridFC) {
    map.addSource("business-grid", { type: "geojson", data: businessGridFC });
    map.addLayer({
      id: "business-density-3d",
      type: "fill-extrusion",
      source: "business-grid",
      paint: {
        "fill-extrusion-color": cfg.colors.business3d,
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-opacity": 0.8
      }
    });
  }

  function addGreenLayers(greenFC, greenGridFC) {
    map.addSource("green-polygons-source", { type: "geojson", data: greenFC });
    map.addLayer({
      id: "green-polygons",
      type: "fill",
      source: "green-polygons-source",
      paint: {
        "fill-color": cfg.colors.greenFill,
        "fill-opacity": 0.42
      }
    });

    map.addSource("green-grid", { type: "geojson", data: greenGridFC });
    map.addLayer({
      id: "green-density-3d",
      type: "fill-extrusion",
      source: "green-grid",
      paint: {
        "fill-extrusion-color": cfg.colors.green3d,
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-opacity": 0.64
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
    const roadsFC = toFeatureCollection(overpassToLineFeatures(roadsRaw).slice(0, 1600));
    const poiFC = toFeatureCollection(overpassToPointFeatures(poiRaw).slice(0, 3500));
    const greenFC = toFeatureCollection(overpassToPolygonFeatures(greenRaw).slice(0, 800));

    const safeRoads = roadsFC.features.length ? roadsFC : cfg.fallbackRoads;
    const safePoi = poiFC.features.length ? poiFC : cfg.fallbackPoi;
    const safeGreen = greenFC.features.length ? greenFC : cfg.fallbackGreen;
    const safeBoundary = boundaryFC.features.length ? boundaryFC : cfg.fallbackBoundary;

    const trafficPoints = roadDensityPoints(safeRoads.features);
    const businessPoints = safePoi.features.map((f) => f.geometry.coordinates).filter(Boolean);
    const greenPoints = greenDensityPoints(safeGreen.features);

    const trafficGridFC = buildGridExtrusions(trafficPoints, 0.03, 40, 22);
    const businessGridFC = buildGridExtrusions(businessPoints, 0.025, 60, 28);
    const greenGridFC = buildGridExtrusions(greenPoints, 0.04, 16, 10);

    addBoundaryLayer(safeBoundary);
    addTrafficLayers(safeRoads, trafficGridFC);
    addBusinessLayers(businessGridFC);
    addGreenLayers(safeGreen, greenGridFC);

    switchMode("all");
    wireButtons();
  }

  map.on("load", () => {
    buildAllLayers();
  });
})();
