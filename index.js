const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 9755 })

const rooms = new Map()

function joinRoom(ws, roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set())
  }

  rooms.get(roomId).add(ws)

  if (!ws.rooms) {
    ws.rooms = new Set()
  }

  ws.rooms.add(roomId)
}

function leaveRoom(ws, roomId) {
  const room = rooms.get(roomId)

  if (!room) return

  room.delete(ws)

  if (room.size === 0) {
    rooms.delete(roomId)
  }

  ws.rooms?.delete(roomId)
}

function broadcast(roomId, data) {
  const room = rooms.get(roomId)

  if (!room) return

  for (const ws of room) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }
}

wss.on('connection', ws => {

  ws.rooms = new Set()

  ws.on('message', raw => {
    const data = JSON.parse(raw)

    if (data.type === 'join') {
      joinRoom(ws, data.roomId)

      return
    }

    if (data.type === 'leave') {
      leaveRoom(ws, data.roomId)

      return
    }

    if (data.type === 'message') {
      broadcast(data.roomId, {
        type: 'message',
        roomId: data.roomId,
        sender: data.sender,
        message: data.message
      })
    }
  })

  ws.on('close', () => {
    // keluarkan connection dari semua room
    for (const roomId of ws.rooms) {
      leaveRoom(ws, roomId)
    }
  })
})