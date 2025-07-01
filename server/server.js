const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId, userName }) => {
    socket.join(roomId);

    // Store username on socket for later use
    socket.data.userName = userName;

    // Send list of all users already in the room to the newly joined user
    const usersInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const usersData = usersInRoom
      .filter((id) => id !== socket.id)
      .map((id) => ({
        userId: id,
        userName: io.sockets.sockets.get(id)?.data?.userName || "User",
      }));
    socket.emit("all-users", usersData);

    // Notify others in room about new user
    socket.to(roomId).emit("user-joined", {
      userId: socket.id,
      userName,
    });

    // Relay signaling data
    socket.on("signal", ({ to, from, signal }) => {
      io.to(to).emit("signal", { from, signal });
    });

    // Notify room when a user disconnects
    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-left", { userId: socket.id });
    });
  });
});

server.listen(5001, () => {
  console.log("Signaling server running on http://localhost:5001");
});
