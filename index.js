const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

const http = require('http');
const httpServer = http.createServer(app);



const {Server} = require("socket.io");

const io = new Server(httpServer, {
    cors:{
        methods: ['GET', 'POST']
    }
});

httpServer.listen(3001, ()=>{
    console.log("Server is running")
});