/*Define variables to be used later*/
var socketio = require('socket.io')
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

/*Define the listen function used in server.js*/
/*Chat server logic*/
exports.listen = function(server) {
    io = socketio.listen(server) /*piggyback on exist http server*/
    io.set('log level',1); /*Limit logging*/       
    io.sockets.on('connection', function(socket) {
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed); /*Give the guest a nickname*/
        joinRoom(socket, 'Lobby'); /*Place user in lobby on connection*/
        /*Handle user message sends, name changes, and room joins*/
        handleMessageBroadcasting(socket, nickNames); 
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);

        socket.on('rooms', function (){ /*Provide user with room list on request*/
            socket.emit('rooms',io.sockets.manager.rooms); 
        });
        handleClientDisconnection(socket, nickNames, namesUsed);        
    });
};
