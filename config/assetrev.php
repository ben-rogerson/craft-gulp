<?php

return [

    // The order of the configured strategies you'd like to try when revving
    // your asset file names. The default of: manifest|querystring|passthrough
    // should be adequate for most use-cases.

    'pipeline' => 'manifest|querystring|passthrough',

    // The strategies you'd like to try to rev your asset filename. You can
    // provide the name of a class that implements `StrategyContact` or a
    // custom closure. The defaults should cater to most requirements.

    'strategies' => [
        'manifest' => \club\assetrev\utilities\strategies\ManifestFileStrategy::class,
        'querystring' => \club\assetrev\utilities\strategies\QueryStringStrategy::class,
        'passthrough' => function ($filename, $config) {
            return $filename;
        },
    ],

    // The path to your asset manifest; most likely generated by a task runner
    // such as Gulp or Grunt. The path will be relative to your Craft base
    // directory, unless you supply an absolute path.

    'manifestPath' => 'public/assets/build/versions.json',

    // The path where your built asset files can be found. Required for query
    // string creation. Again, this is relative to your Craft base directory,
    // unless you supply an absolute path.

    'assetsBasePath' => '',

    // A prefix to apply to your asset filenames when they are output. You would
    // likely want to set this if the paths in your manifest file are going to
    // be different to the final intended asset URL.

    'assetUrlPrefix' => '/',

];
