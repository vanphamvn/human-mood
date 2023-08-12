const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const app = express();

const config = JSON.parse(fs.readFileSync('configuration.json', 'utf8'));
const connection = mysql.createConnection(config.mysql);


connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL!');
});

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.maxRequestsPerMinute,
  skip: (req) => !config.rateLimitingEnabled, // Skip rate limiting if disabled in the config
});

app.use(limiter);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/submit-mood', (req, res) => {
  const mood = req.body.mood;
  const query = 'INSERT INTO moods (mood) VALUES (?)';
  connection.query(query, [mood], (err, results) => {
    if (err) {
      console.error('Error inserting mood:', err);
      return;
    }
    console.log('Mood inserted successfully!');
    res.redirect('/');
  });
});

// New route to handle fetching mood data
app.get('/moods', (req, res) => {
  const query = 'SELECT mood, COUNT(*) as count FROM moods GROUP BY mood';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching mood data:', err);
      res.status(500).json({ error: 'Failed to fetch mood data' });
    } else {
      const moodData = results.map((result) => ({
        mood: result.mood,
        count: result.count,
      }));
      res.json(moodData);
    }
  });
});

const ipAddress = config.hostIp;
const port = config.port;

app.listen(port, ipAddress, () => {
    console.log(`Server is running on ${ipAddress}:${port}`);
});
