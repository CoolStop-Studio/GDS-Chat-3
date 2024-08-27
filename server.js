const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // First, check if the username already exists
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error checking username' });
    }

    if (user) {
      // Username already exists
      return res.status(400).json({ success: false, message: 'Username already taken. Try a different name' });
    }

    // If username doesn't exist, proceed with account creation
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error creating account' });
      }
      res.json({ success: true, message: 'Account created successfully' });
    });
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) {
      res.status(500).json({ success: false, message: 'Error during login' });
    } else if (!user) {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    } else {
      res.json({ success: true, message: 'Logged in successfully' });
    }
  });
});

app.post('/send-message', (req, res) => {
  const { sender, recipient, message } = req.body;
  db.run('INSERT INTO messages (sender, recipient, message) VALUES (?, ?, ?)', [sender, recipient, message], (err) => {
    if (err) {
      res.status(500).json({ success: false, message: 'Error sending message' });
    } else {
      res.json({ success: true, message: 'Message sent successfully' });
    }
  });
});

app.get('/conversations/:username', (req, res) => {
  const { username } = req.params;
  db.all(
    `SELECT DISTINCT
      CASE
        WHEN sender = ? THEN recipient
        ELSE sender
      END AS conversation_partner
    FROM messages
    WHERE sender = ? OR recipient = ?
    ORDER BY conversation_partner`,
    [username, username, username],
    (err, rows) => {
      if (err) {
        res.status(500).json({ success: false, message: 'Error retrieving conversations' });
      } else {
        res.json({ success: true, conversations: rows });
      }
    }
  );
});

app.get('/new-messages/:username/:partner/:lastTimestamp', (req, res) => {
  const { username, partner, lastTimestamp } = req.params;
  db.all(
    'SELECT * FROM messages WHERE ((sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)) AND timestamp > ? ORDER BY timestamp',
    [username, partner, partner, username, lastTimestamp],
    (err, rows) => {
      if (err) {
        res.status(500).json({ success: false, message: 'Error retrieving messages' });
      } else {
        res.json({ success: true, messages: rows });
      }
    }
  );
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
