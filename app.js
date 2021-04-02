const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const port = process.env.PORT || 9000;

const clients = {};
let activeUser = [];

const messages = new Array();

/**
 * max save 30 messages
 */
messages.push = function () {
    if (this.length >= 30) {
        this.shift();
    }
    return Array.prototype.push.apply(this, arguments);
}

const sendChatMsg = (clients) => {
    for (let key in clients) {
        clients[key].send(JSON.stringify({
            type: "MSG_ALL",
            messages
        }));
    }
}

const sendActiveUsers = (clients) => {
    for (let key in clients) {
        clients[key].send(JSON.stringify({
            type: "ACTIVE_USER",
            activeUser
        }));
    }
}

const webSocketServer = new WebSocket.Server({ port });

webSocketServer.on('connection', ws => {
    const clientId = uuidv4();
    clients[clientId] = ws;

    console.log(`somebody connect... clientId: ${clientId}`);

    ws.on('message', message => {
        try {

            console.log('received: %s', message);

            const msg = JSON.parse(message);

            switch (msg.type) {
                case "LOGIN": {
                    const { nickName, nickColor } = msg;

                    activeUser.push({ clientId, nickName, nickColor });

                    console.log(`clientId: ${clientId} is login`);
                    console.log(activeUser);

                    sendActiveUsers(clients);

                    clients[clientId].send(JSON.stringify({
                        type: "MSG_ALL",
                        messages
                    }));

                    break;
                }
                case "SEND_MSG": {
                    const userInfo = activeUser.find(user => user.clientId === clientId);
                    const { nickName, nickColor } = userInfo;
                    const now = new Date();
                    const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

                    messages.push({ id: uuidv4(), nickName, nickColor, message: msg.message, date: time });


                    console.log(`clientId: ${clientId} send msg`);
                    console.log(messages);

                    sendChatMsg(clients);

                    break;
                }
                case "LOGOUT": {
                    delete clients[clientId];

                    activeUser = activeUser.filter(user => user.clientId !== clientId);

                    console.log(`clientId: ${clientId} is logout`);
                    console.log(activeUser);

                    sendActiveUsers(clients);

                    break;
                }

            }
        } catch (err) { }
    });

    ws.on('close', () => {
        console.log(`some connection close... clientId: ${clientId}`);

        delete clients[clientId];

        activeUser = activeUser.filter(user => user.clientId !== clientId);

        sendActiveUsers(clients);
    })
});
