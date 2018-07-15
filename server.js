const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
app.use(express.static(__dirname + '/public'))



io.on('connection',socket=>{
    socket.on('no_sdp',({roomName})=>{
        socket.broadcast.to(roomName).emit('no_sdp','User not started')
    })
    socket.on('ask_other_user',({roomName})=>{
        socket.broadcast.to(roomName).emit('on_ask_other_user')
    })

    socket.on('list_client',({roomName})=>{
        io.to(roomName).clients((err,clients)=>{
            if(err){
                console.error('list_client error::',err)
                return
            }
            socket.emit('on_list_client',clients.length)
        })
    })
    socket.on('leave_room',({roomName})=>{
        socket.leave(roomName).emit('on_leave_room')
    })
    socket.on('hang_up',({roomName})=>{
        socket.broadcast.to(roomName).emit('hang_up')
    })
    socket.on('on_new_client',({roomName})=>{
        io.to(roomName).clients((err,clients)=>{
            if(err){
                console.error('on_new_client error::',err)
                return
            }
            io.to(roomName).emit('on_new_client',clients.length)
        })
    })
    socket.on('on_ice_candidate',({roomName , candidate})=>{
        socket.broadcast.to(roomName).emit('on_ice_candidate',candidate)
    })
    socket.on('on_answer',({roomName , sdp})=>{
        socket.broadcast.to(roomName).emit('on_answer',sdp)
    })
    socket.on('ask_sdp',({roomName})=>{
        socket.broadcast.to(roomName).emit('on_my_sdp')
    })
    socket.on('my_sdp_is',({sdp , roomName})=>{
        socket.broadcast.to(roomName).emit('on_offer',sdp)
    })
    socket.on('join_room',({roomName})=>{
        io.to(roomName).clients((err,clients)=>{
            if(err){
                console.error('join_room error::',err)
                return
            }
            if(clients && clients.length !== 2){
                switch(clients.length){
                    case 1:
                        socket.join(roomName,err=>{
                            if(err){
                                console.error('join_room error::',err)
                                return
                            }
                            socket.emit('join_room',{
                                code: 2,
                                data:socket.rooms[roomName]
                            })
                        })
                    break;
                    default:
                        socket.join(roomName,err=>{
                            if(err){
                                console.error('join_room error::',err)
                                return
                            }
                            socket.emit('join_room',{
                                code: 1,
                                data:socket.rooms[roomName]
                            })
                        })
                    break;
                }
            }else{
                socket.emit('join_room',{
                    code: 0,
                    data:'CANNOT_JOIN_ROOM'
                })
            }
        })
    })

})



server.listen(9600 , ()=> console.log('listening on port 9600'))
