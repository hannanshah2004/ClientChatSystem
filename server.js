const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to MongoDB
mongoose.connect('mongodb+srv://mongodb.net', { useNewUrlParser: true, useUnifiedTopology: true });
const Message = mongoose.model('Message', { name: String, message: String, deleteKey: String });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static(__dirname));

// Define your message key and delete key
const MESSAGE_KEY = 'Urooj';
const DELETE_KEY = 'Shayan';

app.get('/messages', (req, res) => {
  Message.find({}, (err, messages) => {
    res.send(messages);
  });
});

app.post('/messages', (req, res) => {
  const receivedKey = req.body.key;

  // Verify the message key before sending the message
  if (receivedKey !== MESSAGE_KEY) {
    return res.sendStatus(401); // Unauthorized
  }

  const message = new Message({
    name: req.body.name,
    message: req.body.message,
    deleteKey: DELETE_KEY, // Assign delete key
  });

  message.save((err) => {
    if (err) {
      return res.sendStatus(500);
    }

    io.emit('message', {
      _id: message._id,
      name: req.body.name,
      message: req.body.message,
      deleteKey: DELETE_KEY, // Sending delete key to client
    });

    res.sendStatus(200);
  });
});

app.delete('/messages/:id', async (req, res) => {
  const messageId = req.params.id;
  const receivedDeleteKey = req.body.deleteKey;

  // Verify the delete key before allowing deletion
  if (receivedDeleteKey !== DELETE_KEY) {
    return res.sendStatus(401); // Unauthorized
  }

  try {
    const deletedMessage = await Message.findByIdAndDelete(messageId);
    if (!deletedMessage) {
      return res.status(404).send("Message not found");
    }
    io.emit('messageDeleted', messageId);
    res.sendStatus(204); // No content
  } catch (error) {
    console.error("Error deleting message:", error);
    res.sendStatus(500);
  }
});

io.on('connection', (socket) => {
  console.log('User connected');
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
