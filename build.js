var fs = require('fs')

var build = require('build-modules')

var buildDirectory = __dirname+'/generatedBuilds/'
if(!fs.existsSync(buildDirectory)) {
    fs.mkdirSync(buildDirectory)
}

var copywrite = '/* Copyright (c) 2015 Billy Tetrud - Free to use for any purpose: MIT License*/'

console.log('building and minifying...')

build(buildDirectory, 'observe', copywrite, __dirname + '/observe.js', undefined, function(e) {
    if(e !== undefined) {
        console.error(e.stack)
    } else {
        console.log('done building main bundle')
    }
})

// test bundle

build(__dirname+'/test', 'observe.test.browser', '', __dirname + '/test/observe.test.browser.js', undefined, function(e) {
    if(e !== undefined) {
        console.error(e.stack)
    } else {
        console.log('done building test bundle')
    }
})


