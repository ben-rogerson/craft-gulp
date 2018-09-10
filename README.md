# craft-gulp

An agency-battletested production-ready boilerplate to help you get you started in Craft CMS 3.


### Getting started

This process will get you setup with a new project locally.

1. Create a local database for your new project (Sequel Pro is a good choice)
2. In your terminal, `cd/TO/YOUR/PROJECTS/DIRECTORY` and create a new project
with this boilerplate:<br>
`create-project ben-rogerson/craft-gulp --stability dev PROJECT_NAME`<br>
and run the `craft setup` command that՚s mentioned at the end
3. Open your project directory and install the packages<br>
`cd PROJECT_NAME && npm i`
4. Add a link with Valet or Homestead to the `public` folder [ `valet link PROJECT_NAME` ]
4. Open `PROJECT_NAME/package.json` and update the dev url in `config.devUrl`
5. Start your dev server with `npm start`
6. Code like a pro.

Also remember to enable the installed plugins within Craft.


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