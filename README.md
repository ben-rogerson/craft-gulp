# craft-gulp

An agency-battletested production-ready boilerplate to help you get you started in Craft CMS 3.


### Getting started

This process will get you setup with a new project locally.

1. Create a local database for your new project (Sequel Pro is a good choice)
2. In your terminal, `cd/TO/YOUR/PROJECTS/DIRECTORY` and create a new project
with this boilerplate:<br>
`create-project ben-rogerson/craft-gulp --stability dev PROJECT_NAME`<br>
and run the `./craft setup` command that՚s mentioned at the end
3. Open your project directory and install the packages<br>
`cd PROJECT_NAME && npm i`
4. Activate the asset-rev plugin `./craft install/plugin assetrev`
5. Add a link with Valet or Homestead to the `public` folder [ `valet link PROJECT_NAME` ]
6. Open `PROJECT_NAME/package.json` and update the dev url in `config.devUrl`
7. Start your dev server with `npm start`
8. Code like a pro.

Be sure to enable the rest of the installed plugins within Craft.


## Boilerplate Features

### Development

npm start

- Automatic updates with Browsersync
- Cachebusting with Querystring
- SCSS
    - Breakpoint Display Helper
    - Autoprefixer
    - Sourcemaps
- Javascript
    - First class ES6+ Transpiling
    - JS Modules (import/export)
    - Globals (browserify-shim)
    - Sourcemaps
- Images
    - Compression for GIF/JPG/PNG/SVG
- SVG Sprite Conversion
- Favicons
- Critical CSS

## Production

npm run build

- All of the above but no Browsersync or Sourcemaps
- Cachebusting with Manifest