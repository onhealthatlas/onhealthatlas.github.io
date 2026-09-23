# Ontario Insights: website files

Static website for GitHub Pages. No build step, no plugins: every file here is served exactly as it is.

## What's in this folder

```
index.html            Home page with the list of maps
about.html            About the project and Dr. Shamji
guide.html            How to use the maps, terms, data sources, FAQ
404.html              "Page not found" page
favicon.svg           Browser tab icon
.nojekyll             Tells GitHub Pages not to process the files (optional, see below)
assets/
  css/style.css       All styling. Colours are defined at the top.
  js/main.js          Search and topic filters on the home page
  fonts/              Self-hosted fonts (Archivo, Atkinson Hyperlegible; SIL Open Font License)
  img/
    social-card.png   Preview image shown when a link is shared on social media
    apple-touch-icon.png
    thumbs/           Preview image for each map (placeholders for now)
maps/
  <map-name>/
    index.html        The map's page: title, the map, and "About this map"
    map/index.html    PLACEHOLDER: replace with your exported map
```

## Uploading to GitHub Pages (web interface)

1. Create a new repository on GitHub (it can be public or private, depending on your GitHub plan).
2. Unzip this file on your computer.
3. In the repository, choose **Add file > Upload files**.
4. Open the unzipped folder, select **everything inside it** (not the folder itself) and drag it into the upload area. Chrome and Edge keep the folder structure when you drag folders in.
5. Choose **Commit changes**.
6. Go to **Settings > Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then branch **main** and folder **/ (root)**. Save.
7. After a minute or two the site will be live at the address GitHub shows on that page.

About `.nojekyll`: macOS hides files that start with a dot, so it may not upload. That's fine: the site works without it.

## Adding a finished map

Each map page shows the interactive map from the `map/` folder beside it.

1. Export your map as a web page (for example from QGIS with qgis2web, or Leaflet or Mapbox code). The main file must be named **index.html**.
2. In GitHub, open `maps/<map-name>/map/`, delete the placeholder `index.html`, and upload your exported files, including any folders the export created (such as `data/`, `css/` or `js/`).
3. Open the map page on the live site and check it loads.

**If the map is hosted somewhere else** (ArcGIS Online, Felt, Datawrapper, etc.), edit `maps/<map-name>/index.html` and replace `src="map/"` in the `<iframe>` and `href="map/"` in the "Open map in a new tab" link with the map's embed URL.

## Replacing the preview images

The previews in `assets/img/thumbs/` are placeholders: a stylized map of Ontario with a topic icon. To use a screenshot of the real map:

1. Save a **square** image, at least 176 x 176 pixels, as `assets/img/thumbs/<map-name>.png`.
2. In `index.html`, find that map's `<img class="thumb" ...>` and change `.svg` to `.png`.

## Editing text

- Map titles and descriptions on the home page are in `index.html`. Each map's own page is `maps/<map-name>/index.html`. If you rename a map, update both.
- To **add a map**, copy an existing folder in `maps/`, rename it (lowercase, hyphens, no spaces), edit its `index.html`, add a thumbnail, and copy one `<li class="map-item">` block in `index.html`.
- To move a **Coming soon** item to a real map, replace its `<li class="map-item is-soon">` block with a normal map block.
- Search keywords (such as technical terms like CMA or FSA) are in each map's `data-keywords` attribute in `index.html`.

## Using your own domain

1. Buy the domain from a registrar, then go to **Settings > Pages > Custom domain** in GitHub, enter it and save.
2. Add the DNS records GitHub asks for at your registrar (GitHub's help page "Managing a custom domain for your GitHub Pages site" lists them).
3. Once it works, tick **Enforce HTTPS**.
4. Find and replace `https://www.YOUR-DOMAIN.ca` with your real address in every `.html` file. This makes link previews on social media and in messaging apps work.

The 404 page uses links that start with `/`, so it looks right only once the site is on its own domain.

## Before launch: checklist

- [ ] Add sources for maps currently marked "To be confirmed": `family-doctors`, `doctor-access`, `affordable-housing`. Search each page for `TODO`.
- [ ] Confirm every other source listed on the map pages is correct.
- [ ] Have the office approve all copy, especially the political wording on the home page ("Why this site exists") and in `about.html`.
- [ ] Confirm Dr. Shamji's biography and critic titles on `about.html` and the home page, and add details you want included (such as his medical background).
- [ ] Check that the office's use of MPP resources for this site follows Legislative Assembly guidance on partisan content.
- [ ] Replace placeholders in each `maps/<map-name>/map/` folder, and test every map on a phone.
- [ ] Set up the custom domain and replace `YOUR-DOMAIN` (see above).

## Map names: original and site versions

| Folder | Name on the site | Original full title (shown on each map page) |
|---|---|---|
| `family-doctors` | Family doctors and their patients | Rostering physician and patient counts, census subdivision (CSD) and provincial riding, Ontario, January 1, 2026 |
| `doctor-access` | Who has a family doctor | Primary care attachment rates, forward sortation area (FSA) and provincial riding, Ontario, 2020 and 2022 |
| `core-housing-need` | Households in core housing need | Incidence of households in core housing need, census metropolitan area (CMA), Ontario, 2018–2024 |
| `mortgage-payments` | Mortgage payments and loan sizes | Average monthly mortgage payment and new mortgage loan value, census metropolitan area (CMA), Ontario, 2012–2025 quarterly |
| `new-home-prices` | New home prices | Average price for single, semi-detached, and row units by census subdivision (CSD) over 50,000 population, Ontario, 2023 |
| `new-homes-sold-by-price` | New homes sold, by price | Sold newly built units (single, semi, row, apartment, other) by price range, census agglomeration (CA) over 50,000 population, Ontario, Q1–Q2 2026 |
| `rent-and-vacancy-trends` | Rent and vacancy since 2006 | Average rent and apartment vacancy rates, census metropolitan area and census agglomeration (CMA/CA), Ontario, 2006–2023 |
| `two-bedroom-rents` | Two-bedroom rents and turnover | Average 2-bedroom apartment rent, vacancy rates, and turnover rates, census metropolitan area (CMA), Ontario, 2024–2025 |
| `rents-larger-communities` | Rents in larger communities | Average apartment rent, total number of units, and vacancy rates, census subdivisions (CSD) over 10,000 population, Ontario, 2023 |
| `rents-small-towns` | Rents in small towns | Average apartment rent, total number of units, and vacancy rates, census subdivisions (CSD) of 2,500–10,000 population, Ontario, 2025 |
| `rent-by-bedrooms` | Rent by number of bedrooms | Median apartment rent by number of bedrooms in urban centres, Rental Market Survey (RMS) zones, Ontario, 2025 |
| `housing-construction` | Homes started, finished and under construction | Housing unit starts, completions, and under construction, census subdivision (CSD) over 50,000 population, Ontario, 2026 |
| `starts-by-type` | What kinds of homes are being built | Housing starts by unit type (single, semi, row, apartment, other), census subdivision (CSD) over 10,000 population, Ontario, 2026 |
| `affordable-housing` | Community and affordable housing | Affordable housing: average rent, total number of units, management and ownership, construction year, building condition, deficit funding, and rent determination method, census subdivision (CSD), Ontario, July 2026 |
| `seniors-housing` | Seniors’ housing | Senior housing: number of standard units, vacancy rates, census metropolitan area (CMA), Ontario, 2010–2021 |

## Changing the colours

All colours are at the top of `assets/css/style.css`. `--red` is the main accent. `--ramp-1` to `--ramp-5` are the light-to-dark reds used in the map graphics.
