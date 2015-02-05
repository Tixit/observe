var http = require('http');
var fs = require('fs')
var url = require('url')

require('./build') // build the bundles

var server = http.createServer(function (request, res) {
    try {
        var requestUrl = url.parse(request.url)
        var path = requestUrl.pathname

        if(path !== '/favicon.ico') {
            console.log("got request for: "+path)

            if(path === '/') {
                path = '/test/observe.tests.html'
            }

            res.writeHead(200)
            res.write(fs.readFileSync(__dirname+path))
            res.end()
        }
    } catch(e) {
        console.log(e.message)
    }
})

var port = 8100
server.listen(port)
console.log("listening on port "+port)