/*Define variables to be used later*/
var socketio = require('socket.io')
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

/*Assign guest a default name and put it in nickNames array*/
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    var name = 'Guest' + guestNumber; /*default guest name*/ 
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success:true,
        name: name,
    });
    namesUsed.push(name);
    return guestNumber + 1
};

/*Allow guest to join a room, socket.io does this very nicely*/
function joinRoom(socket, room) {
    socket.join(room);  /*Add to room*/
    currentRoom[socket.id] = room; /*Assign room to user*/
    socket.emit('joinResult', {room: room}); /*inform user they are in the room*/
    socket.broadcast.to(room).emit('message', {  /*Let everyone in the room know someone joined*/
            text: nickNames[socket.id] + ' has joined ' + room + '.'
    });

    var usersInRoom = io.sockets.clients(room);
    if (usersInRoom.length > 1) {
        var usersInRoomSummary = 'Users currently in ' + room + ': ' ;
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if (userSocketId != socket.id) {  /*if not the user that just joined*/
                if (index > 0)
                    usersInRoomSummary += ', ';
                usersInRoomSummary += nickNames[userSocketId];                
            }
        }
        usersInRoomSummary += '.';
        socket.emit('message', {text: usersInRoomSummary}) /*Send summary to user who just joined*/
    }
};

/*Handle a uesr's name change attempts*/
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', function(name) {
        if (name.indexOf('Guest') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin with "Guest".',
            });
        } else {
            if (namesUsed.indexOf(name) == -1){
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];
                socket.emit('nameResult',{
                    success: true,
                    name: name,
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousNameIndex + ' is now known as ' + name + '.', 
                });
            } else {
               socket.emit('nameResult', {
                   success: false,
                   message: 'That name is already in use.',
               });
            }
        }
    });
};

function handleMessageBroadcasting(socket){
    socket.on('message', function(message) {
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id]+': '+message.text, 
        });
    });  
};

function handleRoomJoining(socket){
    socket.on('join', function(room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
};

function handleClientDisconnection(socket) {
    socket.on('disconnect', function(){
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id]
    });
};


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
