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
  const sbCfg = cfg.supabase || {};

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
  map.on("error", (event) => {
    // 某些瓦片或单个图层请求失败不应直接覆盖整张地图，避免误判为“完全加载失败”。
    // 仅在控制台记录，保留当前可用图层继续展示。
    // eslint-disable-next-line no-console
    console.warn("Map resource error:", event && event.error ? event.error.message : event);
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

  function classifyBigCategory(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return "service";
    if (/商业|零售|购物|餐饮|消费|商超|market|retail|shop|food/.test(text)) return "retail";
    if (/办公|写字楼|园区|商务|office|enterprise|company/.test(text)) return "office";
    if (/公共|政务|教育|学校|医院|医疗|地铁|公交|交通|文化|体育|tourism|public/.test(text)) return "public";
    if (/生活|服务|酒店|住宿|家政|维修|service/.test(text)) return "service";
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

  async function fetchSupabasePoi() {
    if (!sbCfg.url || !sbCfg.anonKey || !sbCfg.table) {
      // eslint-disable-next-line no-console
      console.warn("Supabase config unavailable, fallback to local POI.");
      return { type: "FeatureCollection", features: [] };
    }

    const xField = (sbCfg.columns && sbCfg.columns.x) || "x";
    const yField = (sbCfg.columns && sbCfg.columns.y) || "y";
    const categoryField = (sbCfg.columns && sbCfg.columns.bigCategory) || "大类";
    const pageSize = sbCfg.pageSize || 1000;
    const maxRows = sbCfg.maxRows || 50000;
    const baseUrl = String(sbCfg.url).replace(/\/+$/, "");
    const tablePath = encodeURIComponent(sbCfg.table);
    const selectFields = `${encodeURIComponent(xField)},${encodeURIComponent(yField)},category:${encodeURIComponent(categoryField)}`;
    const headers = {
      apikey: sbCfg.anonKey,
      Authorization: `Bearer ${sbCfg.anonKey}`
    };

    const features = [];
    for (let from = 0; from < maxRows; from += pageSize) {
      const url = `${baseUrl}/rest/v1/${tablePath}?select=${selectFields}&limit=${pageSize}&offset=${from}`;
      let data = null;
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const errText = await res.text();
          // eslint-disable-next-line no-console
          console.warn(`Supabase POI query failed: ${res.status} ${errText}`);
          return { type: "FeatureCollection", features: [] };
        }
        data = await res.json();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Supabase POI query failed:", err && err.message ? err.message : err);
        return { type: "FeatureCollection", features: [] };
      }
      if (!data || !data.length) break;

      data.forEach((row) => {
        const lon = Number(row[xField]);
        const lat = Number(row[yField]);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
        const rawCategory = row.category ?? row[categoryField];
        features.push({
          type: "Feature",
          properties: {
            category: classifyBigCategory(rawCategory),
            bigCategory: rawCategory || "未分类"
          },
          geometry: { type: "Point", coordinates: [lon, lat] }
        });
      });

      if (data.length < pageSize) break;
    }

    // eslint-disable-next-line no-console
    console.info(`Supabase POI loaded: ${features.length}`);
    return { type: "FeatureCollection", features };
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

  function buildBusinessGridFromPoi(poiFC, cellSize) {
    const buckets = new Map();
    (poiFC.features || []).forEach((f) => {
      const coords = f.geometry && f.geometry.coordinates;
      if (!coords || coords.length < 2) return;
      const gx = Math.floor(coords[0] / cellSize) * cellSize;
      const gy = Math.floor(coords[1] / cellSize) * cellSize;
      const key = `${gx.toFixed(5)}_${gy.toFixed(5)}`;
      const bucket = buckets.get(key) || {
        count: 0,
        categoryCount: { retail: 0, service: 0, office: 0, public: 0 }
      };
      bucket.count += 1;
      const c = (f.properties && f.properties.category) || "service";
      if (!Object.prototype.hasOwnProperty.call(bucket.categoryCount, c)) bucket.categoryCount[c] = 0;
      bucket.categoryCount[c] += 1;
      buckets.set(key, bucket);
    });

    let maxCount = 1;
    buckets.forEach((b) => {
      if (b.count > maxCount) maxCount = b.count;
    });

    const gridFeatures = [];
    buckets.forEach((bucket, key) => {
      const [sx, sy] = key.split("_").map(Number);
      const ex = sx + cellSize;
      const ey = sy + cellSize;
      const categoryList = Object.entries(bucket.categoryCount);
      const categoryKinds = categoryList.filter((entry) => entry[1] > 0).length;
      let dominant = "service";
      let dominantCount = 0;
      categoryList.forEach(([k, v]) => {
        if (v > dominantCount) {
          dominant = k;
          dominantCount = v;
        }
      });

      const densityNorm = Math.min(1, bucket.count / maxCount);
      const diversityNorm = categoryKinds / 4;
      const score = densityNorm * 0.72 + diversityNorm * 0.28;

      gridFeatures.push({
        type: "Feature",
        properties: {
          score,
          count: bucket.count,
          diversity: Number(diversityNorm.toFixed(2)),
          dominant
        },
        geometry: {
          type: "Polygon",
          coordinates: [[[sx, sy], [ex, sy], [ex, ey], [sx, ey], [sx, sy]]]
        }
      });
    });

    return { type: "FeatureCollection", features: gridFeatures };
  }

  function addBusinessLayers(poiFC) {
    const businessGridCoarse = buildBusinessGridFromPoi(poiFC, 0.008);
    const businessGridFine = buildBusinessGridFromPoi(poiFC, 0.003);
    map.addSource("business-grid-coarse-source", { type: "geojson", data: businessGridCoarse });
    map.addSource("business-grid-fine-source", { type: "geojson", data: businessGridFine });
    map.addSource("business-poi-detail-source", { type: "geojson", data: poiFC });

    const businessFillColor = [
      "interpolate",
      ["linear"],
      ["get", "score"],
      0,
      cfg.colors.businessLow,
      0.25,
      cfg.colors.businessLowMid,
      0.5,
      cfg.colors.businessMid,
      0.75,
      cfg.colors.businessMidHigh,
      1,
      cfg.colors.businessHigh
    ];

    map.addLayer({
      id: "business-grid-cells-coarse",
      type: "fill",
      source: "business-grid-coarse-source",
      maxzoom: 11.8,
      paint: {
        "fill-color": businessFillColor,
        "fill-opacity": 0.76
      }
    });
    map.addLayer({
      id: "business-grid-outline-coarse",
      type: "line",
      source: "business-grid-coarse-source",
      maxzoom: 11.8,
      paint: {
        "line-color": "rgba(255,255,255,0.24)",
        "line-width": 0.35,
        "line-opacity": 0.42
      }
    });
    map.addLayer({
      id: "business-grid-cells-fine",
      type: "fill",
      source: "business-grid-fine-source",
      minzoom: 11.8,
      paint: {
        "fill-color": businessFillColor,
        "fill-opacity": 0.68
      }
    });
    map.addLayer({
      id: "business-grid-outline-fine",
      type: "line",
      source: "business-grid-fine-source",
      minzoom: 11.8,
      paint: {
        "line-color": "rgba(255,255,255,0.26)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.25, 16, 0.55],
        "line-opacity": 0.5
      }
    });
    map.addLayer({
      id: "business-poi-detail",
      type: "circle",
      source: "business-poi-detail-source",
      minzoom: 13.2,
      paint: {
        "circle-color": [
          "match",
          ["get", "category"],
          "retail",
          "#c94b59",
          "office",
          "#6d5bd0",
          "public",
          "#d0782a",
          "#2c90c6"
        ],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 13.2, 1.8, 16, 4.2],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 0.8,
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 13.2, 0.35, 16, 0.86]
      }
    });

    const showBusinessPopup = (e) => {
      const f = e.features && e.features[0];
      if (!f) return;
      const props = f.properties || {};
      const dominantMap = {
        retail: "商业零售",
        service: "生活服务",
        office: "办公园区",
        public: "公共设施"
      };
      const dominantLabel = dominantMap[props.dominant] || "生活服务";
      const html = `
        <div style="font-size:12px;line-height:1.5;">
          <div><strong>业态活跃度分区</strong></div>
          <div>POI 数量：${props.count || 0}</div>
          <div>功能多样性：${props.diversity || 0}</div>
          <div>主导功能：${dominantLabel}</div>
        </div>`;
      new maplibregl.Popup({ closeButton: false, offset: 8 })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    };

    ["business-grid-cells-coarse", "business-grid-cells-fine"].forEach((layerId) => {
      map.on("mouseenter", layerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", layerId, showBusinessPopup);
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

  function addProjectSite(site) {
    if (!site || !Array.isArray(site.coordinates) || site.coordinates.length < 2) return;
    const gcj = wgs84ToGcj02(site.coordinates[0], site.coordinates[1]);
    const projectFC = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: site.name || "项目位置" },
          geometry: { type: "Point", coordinates: gcj }
        }
      ]
    };

    map.addSource("project-site-source", { type: "geojson", data: projectFC });
    map.addLayer({
      id: "project-site-dot",
      type: "circle",
      source: "project-site-source",
      paint: {
        "circle-color": "#8b0000",
        "circle-radius": 7,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.96
      }
    });
    map.addLayer({
      id: "project-site-label",
      type: "symbol",
      source: "project-site-source",
      layout: {
        "text-field": ["get", "name"],
        "text-size": 12,
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Regular"],
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-allow-overlap": true
      },
      paint: {
        "text-color": "#6d1111",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2
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
    const greenRaw = await fetchOverpass(cfg.queries.green);
    const supabasePoiFC = await fetchSupabasePoi();

    const boundaryFC = toFeatureCollection(overpassToBoundaryFeatures(boundaryRaw));
    const roadsFC = toFeatureCollection(overpassToLineFeatures(roadsRaw).slice(0, 12000));
    const greenFC = toFeatureCollection(overpassToPolygonFeatures(greenRaw).slice(0, 4000));

    const safeRoads = roadsFC.features.length ? roadsFC : cfg.fallbackRoads;
    const useSupabasePoi = supabasePoiFC.features.length > 0;
    const safePoi = useSupabasePoi ? supabasePoiFC : cfg.fallbackPoi;
    // eslint-disable-next-line no-console
    console.info(`Business POI source: ${useSupabasePoi ? "supabase" : "fallback"}, count=${safePoi.features.length}`);
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
    addProjectSite(cfg.projectSite);

    switchMode("all");
    wireButtons();
  }

  map.on("load", () => {
    buildAllLayers();
  });
})();
