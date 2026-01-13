# Technical Spec: ShopDev Alliance 3D Globe

**Date:** January 12, 2026
**Tech Stack:** Shopify Liquid, Vanilla JavaScript, Globe.gl (Three.js)
**Goal:** Visualize 100+ distributed developers across 18 timezones using Shopify Metaobjects.

---

## 1. Data Structure (Shopify Admin)

Before coding, the data source must be established in the Shopify Admin.

1. Navigate to **Settings > Custom Data > Metaobjects**.
2. Click **Add definition**.
3. **Name:** `Member Location`
4. **Type:** `member_location` (Important: Keep this exact handle).
5. **Access Options:** Ensure **Storefronts** is enabled (Allow read access).
6. **Add Fields:**
* **Name** (`Single line text`): The developer's name.
* **City** (`Single line text`): The city and country (e.g., "Paris, France").
* **Coordinates** (`Single line text`): The geolocation.
* *Format:* `lat,lng` (e.g., `48.8566,2.3522`).
* *Tip:* Use [latlong.net](https://www.latlong.net/) to find these.





---

## 2. Implementation Code (Liquid Section)

Create a new file in your theme: `sections/alliance-globe.liquid`.
Copy and paste the entire block below into that file.

```html
{% schema %}
{
  "name": "Alliance 3D Globe",
  "settings": [
    {
      "type": "color",
      "id": "bg_color",
      "label": "Background Color",
      "default": "#050505"
    },
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "Global Alliance"
    }
  ],
  "presets": [
    {
      "name": "Alliance 3D Globe"
    }
  ]
}
{% endschema %}

<style>
  #alliance-globe-section {
    position: relative;
    width: 100%;
    height: 700px; /* Adjust height as needed */
    background-color: {{ section.settings.bg_color }};
    overflow: hidden;
  }

  /* Overlay Text */
  .globe-ui-layer {
    position: absolute;
    top: 40px;
    left: 5%;
    z-index: 10;
    pointer-events: none; /* Let clicks pass through to the globe */
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .globe-ui-layer h2 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 10px 0;
    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
  }

  .globe-ui-layer p {
    font-size: 1.1rem;
    opacity: 0.8;
    max-width: 400px;
  }

  /* Tooltips for Members */
  .globe-tooltip {
    background: rgba(10, 15, 30, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 12px;
    border-radius: 8px;
    color: #fff;
    font-family: sans-serif;
    font-size: 13px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
  }
</style>

<div id="alliance-globe-section">
  <div class="globe-ui-layer">
    <h2>{{ section.settings.heading }}</h2>
    <p>Connecting over 100 developers across 18 timezones.</p>
  </div>
  <div id="globe-canvas"></div>
</div>

<script src="//unpkg.com/globe.gl"></script>
<script src="//unpkg.com/topojson-client"></script>

<script>
  (function() {
    // 1. DATA HYDRATION (Liquid -> JS)
    // We strictly convert Liquid objects into a clean JSON array
    const members = [
      {% if shop.metaobjects.member_location.values.size > 0 %}
        {% for member in shop.metaobjects.member_location.values %}
          {
            name: "{{ member.name | escape }}",
            city: "{{ member.city | escape }}",
            // Parse "lat,lng" string safely
            lat: {{ member.coordinates.value | split: ',' | first | strip | default: 0 }},
            lng: {{ member.coordinates.value | split: ',' | last | strip | default: 0 }},
            size: 0.5,
            color: "#00ffcc" // Default dot color (Teal)
          }{% unless forloop.last %},{% endunless %}
        {% endfor %}
      {% endif %}
    ];

    // 2. CONFIGURATION
    const CONFIG = {
      bg: "{{ section.settings.bg_color }}",
      atmosphere: "#7c4dff", // Purple Glow
      arcColor: ["rgba(124, 77, 255, 0)", "rgba(0, 255, 204, 0.8)"], // Purple to Teal fade
      hqLat: 45.4215, // Shopify HQ (Ottawa) for connection lines
      hqLng: -75.6972
    };

    // 3. INITIALIZATION FUNCTION
    function initGlobe() {
      const container = document.getElementById('globe-canvas');
      const Globe = window.Globe;

      const world = Globe()
        (container)
        .backgroundColor(CONFIG.bg)
        
        // --- Visual Style ---
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .showAtmosphere(true)
        .atmosphereColor(CONFIG.atmosphere)
        .atmosphereAltitude(0.15)
        
        // --- Member Dots ---
        .pointsData(members)
        .pointAltitude(0.01)
        .pointColor('color')
        .pointRadius(0.5)
        .pointResolution(16) // Smoother circles
        .pointLabel(d => `
          <div class="globe-tooltip">
            <strong style="color: #00ffcc">${d.name}</strong><br/>
            <span style="opacity: 0.7">${d.city}</span>
          </div>
        `)
        
        // --- Arcs (The "Network" Effect) ---
        // Generates lines from HQ to every member
        .arcsData(members.map(m => ({
          startLat: CONFIG.hqLat,
          startLng: CONFIG.hqLng,
          endLat: m.lat,
          endLng: m.lng
        })))
        .arcColor(() => CONFIG.arcColor)
        .arcDashLength(0.4)
        .arcDashGap(2)
        .arcDashAnimateTime(2000) // Animation speed
        .arcStroke(0.5)

        // --- Camera & Controls ---
        .autoRotate(true)
        .autoRotateSpeed(0.6);

      // --- Responsive Resizing ---
      // Keeps the canvas filling the container on window resize
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
           world.width(entry.contentRect.width);
           world.height(entry.contentRect.height);
        }
      });
      resizeObserver.observe(container.parentElement);

      // --- Optional: Vector Borders (High Tech Look) ---
      fetch('//unpkg.com/world-atlas/countries-110m.json')
        .then(res => res.json())
        .then(countries => {
          world
            .polygonsData(topojson.feature(countries, countries.objects.countries).features)
            .polygonCapColor(() => 'rgba(0,0,0,0)') // Transparent land
            .polygonSideColor(() => 'rgba(0,0,0,0)')
            .polygonStrokeColor(() => '#2a2a4e'); // Dark Blue borders
        });
    }

    // 4. PERFORMANCE (Lazy Load)
    // Only loads the WebGL context when the user scrolls near the section
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          initGlobe();
          observer.disconnect();
        }
      });
    }, { rootMargin: "200px" }); // Start loading 200px before visible

    observer.observe(document.getElementById('alliance-globe-section'));

  })();
</script>

```

---

## 3. Deployment Steps

1. **Add Data:** Go to your new Metaobject definition and create 3-5 test entries with valid Lat/Lng coordinates.
2. **Publish:** Go to **Online Store > Themes > Customize**.
3. **Add Section:** Click "Add Section" and select **Alliance 3D Globe**.
4. **Verify:** Scroll to the section. It should lazy-load the library and spin up the globe automatically.

---

## 4. Customization Guide

* **Changing Colors:**
* Look for the `CONFIG` object inside the `<script>`.
* Update `atmosphere` or `arcColor` to match your brand palette.


* **Changing the Map Texture:**
* The code currently uses a "Dark Earth" texture.
* To make it a "Hologram" (wireframe only), remove `.globeImageUrl(...)` and rely solely on the `.polygonsData` borders at the bottom of the script.


* **Performance:**
* The script includes an `IntersectionObserver`. This ensures the heavy 3D engine only turns on when the user actually scrolls to it, preserving your Lighthouse score.