# Ontario Reality Check: website files

Static website for GitHub Pages, in English and French. There's no build step and no plugins: every file here is served exactly as it is.

## What's in this folder

```
index.html              Home page with the list of maps
email-your-mpp.html     Email your MPP (find your MPP by postal code, then write to them)
about.html              About the project and Dr. Shamji
guide.html              How to use the maps, terms, data sources, FAQ
404.html                "Page not found" (one page, in both languages)
favicon.svg             Browser tab icon
fr/                     The French site: the same pages, in the same places (fr/index.html, fr/maps/<map-name>/, ...)
assets/
  css/style.css         All styling. Colours are defined at the top.
  js/main.js            Search and topic filters on the home page
  js/site.js            "Copy link", the "Search your riding" link, and the email sign-up form
  js/email-mpp.js       The Email your MPP tool
  js/map-frame.js       Fits the two family doctor maps to the screen on phones
  data/mpps.js          MPPs, their ridings and email addresses, and postal areas (used by Email your MPP)
  fonts/                Self-hosted fonts (Archivo, Atkinson Hyperlegible; SIL Open Font License)
  img/
    social-card.png     Preview image when a link is shared (social-card-fr.png for French pages)
    apple-touch-icon.png
    thumbs/             Preview image for each map (placeholders for now)
maps/
  <map-name>/
    index.html          The map's page (English): title, the MPP's comment, the map, "About this map"
    map/index.html      The map itself. Shared by the English and French pages.
```

## English and French

Every English page has a French twin at the same place under `fr/`. The **Français / English** button in the top bar switches between the two. If you change the text of a page, change its twin too.

The French page for a map loads the same map with `?lang=fr` (for example `../../../maps/family-doctor-shortage/map/?lang=fr`), so the map opens in French. The two family doctor maps and the two older housing maps (core housing need, mortgages) follow this. The other maps are still placeholders and show a French "coming soon" message.

The French name of the site is **L’Ontario à l’épreuve des faits**, shown as a small "Ontario" above **L’épreuve des faits**.

## Uploading to GitHub Pages (web interface)

1. Unzip this file on your computer.
2. In the repository, choose **Add file > Upload files**.
3. Open the unzipped folder, select **everything inside it** (not the folder itself) and drag it into the upload area. Chrome and Edge keep the folder structure when you drag folders in.
4. Choose **Commit changes**.

This version moves two map folders (see below). Uploading doesn't delete anything, so the old folders stay in your repository unless you delete them. Leave `maps/family-doctors/` and `maps/doctor-access/` as they are in this zip: each now holds only a small page that sends visitors to the new address, so old links keep working. Delete anything else left inside them, such as the old `style.json` and `.geojson` files.

To set up a new repository: create it, upload as above, then go to **Settings > Pages**, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.

## Map folders that moved

| Old folder | New folder | Map |
|---|---|---|
| `maps/family-doctors/` | `maps/family-doctor-shortage/` | The family doctor shortage, 2026 |
| `maps/doctor-access/` | `maps/no-regular-family-doctor/` | People without a regular family doctor |

## Map pages

Each map page has, from the top:

- the map's title and subtitle, a link that jumps to **About this map**, and **Open map in a new tab**;
- on the two health maps, **the MPP's comment**: larger text with a red bar. It's in `maps/<map-name>/index.html` (and the French page), in the `<p class="lede-quote">` paragraph. The "People without a regular family doctor" page has placeholder text there for now: replace it, and remove ` is-placeholder` from the class so it's no longer shown in grey italics. In the family doctor shortage comment, the "Search your riding" link scrolls to the map and puts the cursor in its search box (it has `href="#map" data-focus-search`);
- the map;
- on the two health maps, a box inviting people to email their MPP;
- **About this map**: description, areas, time period, source and full title.

The two family doctor maps hide their own title when they're shown inside a page, because the page already shows it. Opened in a new tab, they show it.

## Email your MPP

People enter their postal code (or choose their riding from a list). The first three characters of the postal code (the postal area) give the riding, using where people lived in the 2021 Census. Where a postal area spans more than one riding, people choose theirs, and there's a link to the Legislative Assembly's address lookup.

The page then shows the MPP and a suggested message they can edit. **Open in my email app** opens it in their own email program, addressed to their MPP and copied to the Premier (premier@ontario.ca) and the Minister of Health (sylvia.jones@ontario.ca). People can untick either copy. For webmail (Gmail, Outlook.com), there are buttons to copy the addresses, subject and message.

Nothing is sent from the website or stored anywhere: everything happens in the visitor's browser.

**Keeping it up to date:** the MPPs, their email addresses and the copied addresses are in `assets/data/mpps.js`, one line per riding. After a by-election or a cabinet change, edit the line in GitHub (the pencil icon). The `g` value (m, f or x) is used only for the French greeting ("Monsieur le député", "Madame la députée", or "Bonjour" and the name). The party column in your spreadsheet isn't used anywhere on the site.

**The suggested message** is in `assets/js/email-mpp.js` (search for "Dear" for English and "Monsieur le député" for French). It uses the Ontario total of 4.3 million people not registered with a family doctor, and the share of family doctors in the riding aged 60 or older, from the family doctor shortage map. It doesn't use the riding's count of residents not registered, because patients are counted where their doctor practises, so riding counts of residents can look better or worse than they are.

## Email sign-up

Every page has a "Get updates" band above the footer. It isn't connected to a mailing service yet: when someone signs up, it checks the address and the consent box, then says sign-up isn't open yet.

**Connecting the sign-up form.** Once you choose a service (for example Buttondown, MailerLite or Mailchimp), find its form address (the "action" URL in the embed code it gives you) and the name of its email field. Then, in every page (English and French), find:

```
<form class="updates-form" data-signup data-endpoint="" data-field="email"
```

and put the form address in `data-endpoint` (and the field name in `data-field`, if it isn't `email`). Use **Find and replace** in a text editor across all the `.html` files. The form then sends the address to the service, which opens in a new tab and handles the confirmation email.

**Canada's Anti-Spam Legislation (CASL):** the form asks for express consent with a box that isn't ticked in advance, and names who the emails come from. Every email you send must also identify the office with its contact information and include a working unsubscribe link (mailing services add these). Keep a record of when and how each person signed up (services do this too). If you'd like French subscribers to get French emails, set up a separate list or a language field with your service.

## Adding a finished map

Each map page shows the interactive map from the `map/` folder beside it.

1. Export your map as a web page. The main file must be named **index.html**. If it has a French version, it should switch to French when the address ends with `?lang=fr`.
2. In GitHub, open `maps/<map-name>/map/`, delete the placeholder `index.html`, and upload your exported files, including any folders the export created.
3. Open the map page on the live site, in English and French, and check it loads.

**If the map is hosted somewhere else** (ArcGIS Online, Felt, Datawrapper, etc.), edit both `maps/<map-name>/index.html` and `fr/maps/<map-name>/index.html`: replace the `src` in the `<iframe>` and the `href` of the "Open map in a new tab" link with the map's embed address.

## Editing text

- Map titles and descriptions on the home page are in `index.html` and `fr/index.html`. Each map's own page is `maps/<map-name>/index.html` and `fr/maps/<map-name>/index.html`. If you rename a map, update all four.
- To **add a map**, copy an existing folder in `maps/` and its twin in `fr/maps/`, rename both (lowercase, hyphens, no spaces), edit the two `index.html` files, add a thumbnail, and copy one `<li class="map-item">` block in `index.html` and in `fr/index.html`.
- To move a **Coming soon** item to a real map, replace its `<li class="map-item is-soon">` block with a normal map block, in both languages.
- Search keywords are in each map's `data-keywords` attribute on the home page. The French home page has French keywords.

## Replacing the preview images

The previews in `assets/img/thumbs/` are placeholders. To use a screenshot of the real map, save a **square** image (at least 176 × 176 pixels) as `assets/img/thumbs/<map-name>.png`, then in `index.html` and `fr/index.html` change that map's `.svg` to `.png`.

## Using your own domain

1. Buy the domain (for example ontariorealitycheck.ca) from a registrar, then go to **Settings > Pages > Custom domain** in GitHub, enter it and save.
2. Add the DNS records GitHub asks for at your registrar (GitHub's help page "Managing a custom domain for your GitHub Pages site" lists them).
3. Once it works, tick **Enforce HTTPS**.
4. Find and replace `https://www.YOUR-DOMAIN.ca` with your real address (for example `https://www.ontariorealitycheck.ca`) in every `.html` file, English and French. This makes link previews on social media and in messaging apps work.

The 404 page uses links that start with `/`, so it looks right only once the site is on its own domain.

## Before launch: checklist

- [ ] Replace the placeholder comment on the "People without a regular family doctor" page (English and French).
- [ ] Add the source for `affordable-housing` (marked "To be confirmed"; search for `TODO`).
- [ ] Have a French speaker review the French pages, the French map comment and the French suggested email.
- [ ] Have the office approve all copy, especially the political wording on the home page ("Why this site exists"), in `about.html`, the map comments, and the suggested email to MPPs.
- [ ] Confirm Dr. Shamji's biography and critic titles on `about.html` and the home page.
- [ ] Check that the office's use of MPP resources for this site, the email sign-up and the Email your MPP tool follows Legislative Assembly guidance on partisan content.
- [ ] Connect the sign-up form to a mailing service (see above).
- [ ] Replace placeholders in each `maps/<map-name>/map/` folder, and test every map on a phone.
- [ ] Set up the custom domain and replace `YOUR-DOMAIN` (see above).

## Map names: site versions and original titles

| Folder | Name on the site | Original full title (shown on each map page) |
|---|---|---|
| `family-doctor-shortage` | The family doctor shortage, 2026 | The family doctor shortage, provincial riding and census subdivision (CSD), Ontario, January 1, 2026 |
| `no-regular-family-doctor` | People without a regular family doctor | People without a regular family doctor, provincial riding and forward sortation area (FSA), Ontario, 2020 and 2022 |
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
