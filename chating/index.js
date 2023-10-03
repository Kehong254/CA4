// Setup basic express server
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 8080;
const users = [];
// 在服务器端添加一个对象来跟踪用户的连接状态
const connectedUsers = {};
//在服务器端添加一个对象来跟踪用户的用户打字状态
const typingUsers = {};
//在服务器端添加一个对象来跟踪所有用户的名字列表
const allUsernames = [];

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom
let numUsers = 0;

io.on('connection', (socket) => {
  console.log('New User Connection');
  let addedUser = false;

  // 监听客户端发送的 'new message' 事件
  socket.on('new message', (data) => {
    // 通知所有客户端执行 'new message' 事件
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data,
      typing: typingUsers[socket.username] || false
    });
  });

  // 监听客户端发送的 'add user' 事件
  socket.on('add user', (username) => {
    if (addedUser) {
      // 如果用户已添加，发送消息或采取其他操作
      socket.emit('already added', { msg: '您已经添加了用户' });
      return; // 停止执行后续代码
    }

    // 检查用户名是否已存在
    if (connectedUsers[username]) {
      // 如果用户名已存在，发送错误消息
      socket.emit('loginError', { msg: '用户名已存在' });
      return; // 停止执行后续代码
    } else {
      // 用户名不存在，可以登录
      socket.username = username;
      connectedUsers[username] = socket.id; // 使用用户名作为键，存储 socket.id
      ++numUsers;
      addedUser = true;
      socket.emit('login', {
        numUsers: numUsers
      });
      // 向所有客户端广播一个用户已连接的消息
      io.emit('user joined', {
        username: socket.username,
        numUsers: numUsers
      });
      // 更新用户列表
      io.emit('userList', allUsernames); // 向客户端广播所有用户名列表
    }
  });

  // 其他事件监听器的代码...

  // 监听客户端发送的 'typing' 事件
  socket.on('typing', () => {
    typingUsers[socket.username] = true;
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // 监听客户端发送的 'stop typing' 事件
  socket.on('stop typing', () => {
    delete typingUsers[socket.username];
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });


  // 当用户断开连接时
  socket.on('disconnect', () => {
    if (addedUser) {
      // 删除断开连接的用户
      delete connectedUsers[socket.username];
      --numUsers;

      // 从用户名列表数组中删除已断开连接的用户
      const index = allUsernames.indexOf(socket.username);
      if (index !== -1) {
        allUsernames.splice(index, 1);
      }

      // 向所有客户端广播一个用户已断开连接的消息
      io.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
      // 更新用户列表
      io.emit('userList', allUsernames); // 向客户端广播所有用户名列表
    }
  });
});