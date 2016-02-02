const argv = require('minimist')(process.argv.slice(2));

const __DEVELOPMENT__ = argv.dev;
var cssHash = __DEVELOPMENT__ ? '[name]-[local]--[hash:base64:5]' : '[hash:base64:5]';

module.exports = {
	entry: __dirname + '/demo',
	output: {
		path: __dirname,
		filename: 'bundle.js'
	},
	module: {
		loaders: [{
			test: /\.jsx?$/,
			exclude: /(node_modules|bower_components)/,
			loader: 'babel'
		},
		{
      test: /\.css$/,
      loaders: [
        'style',
        `css?modules&localIdentName=${cssHash}&importLoaders=1`,
        'postcss']
    }]
	},
	postcss: [
		require('postcss-custom-media'),
		require('postcss-cssnext')({
			sourcemap: true,
		  messages: {
		    browser: true,
		    console: true
		  }
		})
	]
};
