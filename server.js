var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};


/*HELPER FUNCTIONS*/

/*Sent when file to send doesn't exist*/
function send404(response){
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
};

function sendFile(response, filePath, fileContents) {
    /*Send a file to the client after reading it's file type*/
    response.writeHead(
        200,
        {"content-type": mime.lookup(path.basename(filePath))}
    );
    response.end(fileContents);
};

function serveStatic(response, cache, absPath) {
    /*Check if the file is in our cache. If it is then send it*/
    if (cache[absPath])
        sendFile(response,absPath,cache,cache[absPath]);
    else {
        /*Otherwise grab it from the file system, store it in the cache, and send it to the client*/
        fs.exists(absPath, function(exists) {
            if (exists) {
                fs.readFile(absPath, function(err, data) {
                    if (err) {
                        send404(response);
                    } else {
                        cache[absPath]=data;
                        sendFile(response, absPath, data);
                    } 
                });
            }
            else{
                send404(response);
            }
        });
    }
};

/*Actual Server Logic*/
var server = http.createServer(function(req, res) {
    var filePath = false;

    if (req.url == '/') {
        filePath = 'public/index.html';
    } else {
        filePath = 'public' + req.url ;
    }
    var absPath = './' + filePath;
    serveStatic(res, cache, absPath);
});

server.listen(3000, function() {
    console.log("Server listening on port 3000");
});

/*Use of a chat-server module we define*/
var chatServer = require('./lib/chat_server')
chatServer.listen(server);
