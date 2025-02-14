const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

const users = new Set();

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('un utilisateur s\'est connecté');

  socket.on('chat message', (msg) => {
    socket.broadcast.emit('chat message', msg);
  });

  socket.on('typing', (username) => {
    socket.broadcast.emit('user typing', username);
  });

  socket.on('stop typing', (username) => {
    socket.broadcast.emit('stop typing', username);
  });

  socket.on('disconnect', () => {
    console.log('un utilisateur s\'est déconnecté');
  });
});

server.listen(3000, () => {
  console.log('serveur en marche sur http://localhost:3000');
});