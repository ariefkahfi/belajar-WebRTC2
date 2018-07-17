let socket = io()
let pConn = null
let roomName = null
const mediaOpts = { 
    video: true,
    audio: true
}

let roomNameEl = document.getElementById('roomNameEl')
let roomDescEl = document.getElementById('roomDescEl')
let createBtnEl = document.getElementById('createBtnEl')
let localVidEl = document.getElementById('localVidEl')
let remoteVidEl = document.getElementById('remoteVidEl')
let startBtnEl = document.getElementById('startBtnEl')
let statusEl = document.getElementById('statusEl')
let hangUpBtnEl = document.getElementById('hangUpBtnEl')
let listOfClientsEl = document.getElementById('listOfClientsEl')
let closeMyCallEl = document.getElementById('closeMyCallEl')
closeMyCallEl.style.display = 'none'


function onInput(ev){
    roomName = ev.value
}

function onCreateRoom(){
    if(roomName){
        socket.emit('join_room',{
            roomName
        })
    }
}

function handleAddStream(ev){
    console.log('handleAddStream called::')
    remoteVidEl.srcObject = ev.stream
    hangUpBtnEl.disabled = false
}
function handleIceCandidate(ev){
    console.log('handleIceCandidate called::')
    if(pConn){
        if(ev.candidate){
            socket.emit('on_ice_candidate',{
                roomName,
                candidate:ev.candidate
            })
        }
    }
}
function handleSignallingStateChange(ev){
    console.log('handleSignallingStateChange called::')
    // if(pConn){
        // if(pConn.signalingState === 'closed'){
            // closeVideoCall()
            // socket.emit('leave_room',{
                // roomName
            // })
        // }
    // }
}
function handleConnectionStateChange(ev){
    console.log('handleConnectionStateChange called::')
    if(pConn){
        console.log('pConn state::',pConn.iceConnectionState)
        if(pConn.iceConnectionState === 'failed'){
            console.log('failed...')
        }
    }
    // if(pConn){
        // if(pConn.iceConnectionState === 'disconnected' 
        // || pConn.iceConnectionState === 'closed'){
            // closeVideoCall()
            // socket.emit('leave_room',{
                // roomName
            // })
        // }
    // }
}


function createPeerConnection(){
    let rtcConn = new RTCPeerConnection({
        iceServers:[
            {
                urls:'stun:stun.l.google.com:19302'
            },
            {
                urls: 'stun:stun1.l.google.com:19302',
            },
            {
                urls:'stun:stun2.l.google.com:19302'
            }
            ,
            {
                urls: 'turn:numb.viagenie.ca',
                credential: 'muazkh',
                username: 'webrtc@live.com'
            },
            {
                urls: 'turn:192.158.29.39:3478?transport=udp',
                credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                username: '28224511:1379330808'
            },
            {
                urls: 'turn:192.158.29.39:3478?transport=tcp',
                credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                username: '28224511:1379330808'
            },
            {
                urls: 'turn:turn.bistri.com:80',
                credential: 'homeo',
                username: 'homeo'
             },
             {
                urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
                credential: 'webrtc',
                username: 'webrtc'
            }
        ]
    })
    rtcConn.onicecandidate = handleIceCandidate
    rtcConn.onaddstream = handleAddStream
    rtcConn.onsignalingstatechange = handleSignallingStateChange    
    rtcConn.oniceconnectionstatechange = handleConnectionStateChange
    return rtcConn
}

socket.on('on_my_sdp',_=>{
    console.log('on_my_sdp called::')
    if(!pConn){
        socket.emit('no_sdp',{
            roomName,
            sdp:null
        })
        return
    }
        socket.emit('my_sdp_is',{
            roomName,
            sdp:pConn.localDescription
        })
})


socket.on('on_new_client',data=>{
    let isMany = data > 1 ? 'clients' : 'client'
    listOfClientsEl.innerHTML = `${data} ${isMany} in this room`
})

socket.on('no_sdp',message=>{
    console.log('no_sdp called::')
    console.log(message)
})

socket.on('on_ice_candidate',candidate=>{
    console.log('on_ice_candidate called::')
    if(pConn){
        pConn.addIceCandidate(new RTCIceCandidate(candidate))
    }
})

socket.on('on_answer',sdp=>{
    console.log('on_answer called::')
    pConn.setRemoteDescription(new RTCSessionDescription(sdp))
        .catch(_=>{
            console.error('error on_answer setRemote::')
            pConn.createOffer({iceRestart:true})
                .then(sdp=>{
                    console.log('pConn::failed sdp::','get new sdp')
                    return pConn.setLocalDescription(sdp)
                })
                .then(_=>{
                    socket.emit('my_sdp_is',{
                        roomName,
                        sdp:pConn.localDescription
                    })
                })
                .catch(err=>{
                    console.error('pConn::failed error::',err)
                })
        })
    statusEl.innerHTML = ``    
})

socket.on('on_offer',sdp=>{
    console.log('on_offer called::')
    pConn = createPeerConnection()
    pConn.setRemoteDescription(new RTCSessionDescription(sdp))
        .then(_=>{  
            return navigator.mediaDevices.getUserMedia(mediaOpts)
        })
        .then(mStream=>{
            localVidEl.srcObject = mStream
            pConn.addStream(mStream)
            return pConn.createAnswer()
        })
        .then(sdp=>{
            return pConn.setLocalDescription(sdp)
        })
        .then(_=>{
            socket.emit('on_answer',{
                roomName,
                sdp:pConn.localDescription
            })
        })
        .catch(err=>{
            console.error('on_offer error::',err)
        })
})

function onHangUp(){
    closeVideoCall()
    socket.emit('hang_up',{
        roomName
    })
    socket.emit('leave_room',{
        roomName
    })
}


socket.on('on_leave_room',_=>{
    console.log('on_leave_room called::')
    roomName = null
    roomDescEl.innerHTML = ``
    listOfClientsEl.innerHTML = ``
})

socket.on('hang_up',_=>{
    closeVideoCall()
    socket.emit('leave_room',{
        roomName
    })
})


socket.on('my_hang_up',_=>{
    if(pConn){
        if (remoteVidEl.srcObject) {
            remoteVidEl.srcObject.getTracks().forEach(track => track.stop());
            remoteVidEl.srcObject = null;
        }
    }
})

function onCloseMyCall(){
    let aRoomName = roomName
    closeVideoCall()
    socket.emit('leave_room',{
        roomName
    })
    socket.emit('on_new_client',{
        roomName:aRoomName
    })
    socket.emit('my_hang_up',{
        roomName:aRoomName
    })
    closeMyCallEl.style.display = 'none'
}

function closeVideoCall(){
    if(pConn){
        if (remoteVidEl.srcObject) {
            remoteVidEl.srcObject.getTracks().forEach(track => track.stop());
            remoteVidEl.srcObject = null;
        }
        if (localVidEl.srcObject) {
            localVidEl.srcObject.getTracks().forEach(track => track.stop());
            localVidEl.srcObject = null;
        }
            pConn.close();
            pConn = null;

            hangUpBtnEl.disabled = true
            createBtnEl.disabled = false
    }
}


function onStart(){
    pConn = createPeerConnection()
    navigator.mediaDevices.getUserMedia(mediaOpts)
        .then(mStream=>{
            localVidEl.srcObject = mStream
            pConn.addStream(mStream)
            return pConn.createOffer()
        })
        .then(sdp=>{
            return pConn.setLocalDescription(sdp)
        })
        .then(_=>{
            startBtnEl.disabled = true
            statusEl.innerHTML = `
                Waiting for other user...
            `
        })
        .then(_=>{
            socket.emit('list_client',{
                roomName
            })
        })
        .catch(err=>{
            console.error('onStart error::',err)
        })
}

socket.on('on_list_client',data=>{
    console.log(`number of clients in ${roomName} = ${data}`)
    if(data === 2){
        socket.emit('my_sdp_is',{
            roomName,
            sdp:pConn.localDescription
        })
    }
})



socket.on('join_room',({code , data})=>{
    if(data === 'CANNOT_JOIN_ROOM'){
        roomDescEl.innerHTML = 'This room is full !!'
        roomNameEl.value = ''
        roomName = null
        return
    }
    switch(code){
        case 1:
            roomDescEl.innerHTML = `My Room : ${data}`
            roomNameEl.value = ''
            createBtnEl.disabled = true
            startBtnEl.disabled = false
        break;
        case 2:
            roomDescEl.innerHTML = `My Room : ${data}`
            roomNameEl.value = ''
            createBtnEl.disabled = true
            socket.emit('ask_sdp',{
                roomName
            })
            closeMyCallEl.style.display = 'inline-block'
        break;
    }
    socket.emit('on_new_client',{roomName})
})




