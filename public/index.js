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
}
function handleConnectionStateChange(ev){
    console.log('handleConnectionStateChange called::')
}


function createPeerConnection(){
    let rtcConn = new RTCPeerConnection({
        iceServers:[
            {urls:'stun:stun.l.google.com:19302'}
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
        break;
    }
    socket.emit('on_new_client',{roomName})
})




