const express = require('express');
const app = express();

const path = require('path');

const cors = require('cors');
app.use(cors());

const http = require('http');
const httpServer = http.createServer(app);

const fs = require('fs');
const User = require('./User.js')

const {Server} = require("socket.io");

const crypto = require('crypto');
const bcrypt = require('bcrypt');

const io = new Server(httpServer, {
    cors:{
        methods: ['GET', 'POST']
    }
});

io.on("connection", socket=>{
    console.log("Connection established");

    socket.on("user_is_guest", data =>{
        console.log(socket.id + " is logged in as guest "+data.isGuest);
    });

    socket.on("request_username_check", data =>{
        const userList = JSON.parse(fs.readFileSync("./UserList.json", "utf8"));
        socket.emit("username_check_response", {isUserExist: userList.includes(data.user.username.trim().toLowerCase()), user: data.user});
    });

    socket.off("register_user", ()=>{}).on("register_user", data =>{
        const existingUsersList = JSON.parse(fs.readFileSync("./UserList.json"));
        const newUsersList = [...existingUsersList, data.user.username.trim().toLowerCase()];

        const hash = bcrypt.hashSync(data.password, 10);
        const user = {
            userID: crypto.randomUUID(),
            userName: data.user.username.trim().toLowerCase(),
            displayName: data.user.userDisplayName,
            todoItems: [],
            userSettings: data.user.userSettings,
            password: hash
        };


        const existingUsersObject = JSON.parse(fs.readFileSync("./Users.json"));
        const newUsersObject = {...existingUsersObject, [user.userName]: user};

        fs.writeFileSync("./Users.json", JSON.stringify(newUsersObject, null, 2));
        fs.writeFileSync("./UserList.json", JSON.stringify(newUsersList));

        console.log(data.user.username+" is registered");

        socket.emit("user_registered", {isUserRegistered: true});
    });


    socket.off("request_user_auth", ()=>{}).on("request_user_auth", data =>{
        
        const username = data.username.trim().toLowerCase();
        const existingUsersList = JSON.parse(fs.readFileSync("./UserList.json", "utf-8"));

        const isUserExist = existingUsersList.includes(username);
        
        if(isUserExist){
            const existingUsers = JSON.parse(fs.readFileSync("./Users.json", "utf-8"));
            const hashedPassword = existingUsers[username].password;
            const user = {
                username: existingUsers[username].userName,
                displayname: existingUsers[username].displayName,
                userTodoItems: existingUsers[username].todoItems,
                userSettings: existingUsers[username].userSettings
            };
            const isUserAuthorised = bcrypt.compareSync(data.password, hashedPassword);
            socket.emit("user_auth_response", {isUserExist: existingUsersList.includes(username), isUserAuthorised: isUserAuthorised, user: user});
        }else{
            socket.emit("user_auth_response", {isUserExist: existingUsersList.includes(username)});
        }
        
    }); 

    socket.off("save_todo_items", ()=>{}).on("save_todo_items", data=>{
        const username = data.username;
        const items = data.todoItems;

        const users = JSON.parse(fs.readFileSync("./Users.json", "utf8"));
        const user = users[username];
        user.todoItems = items; 

        delete users[username];
        const newUsers = {...users, [username]: user};

        fs.writeFileSync("./Users.json", JSON.stringify(newUsers, null, 2)); 

        
    });

    socket.off("user_settings_modified", ()=>{}).on("user_settings_modified", data=>{
        
        if(data.username === 'Guest'  || data.username.trim().length === 0) return;

        const users = JSON.parse(fs.readFileSync("./Users.json", "utf8"));
        const user = users[data.username];
        user.userSettings = data.userSettings;
        delete users[data.username];
        const newUsers= {...users, [data.username]: user};
        fs.writeFileSync("./Users.json", JSON.stringify(newUsers, null, 2)); 
        
    });
});

httpServer.listen(3001, ()=>{
    console.log("Server is running");
});
