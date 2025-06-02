// server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // to parse JSON body
app.use(express.static('public')); // serve index.html

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// POST route to insert workout
app.post('/submit-workout', async (req, res) => {
  const { username, exercise, weight, reps, sets, log_date } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).send('User not found.');
    }

    const userId = userResult.rows[0].id;

    const duplicate = await pool.query(
      `SELECT * FROM workouts 
       WHERE user_id = $1 AND exercise = $2 AND log_date = $3`,
      [userId, exercise, log_date]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({ message: 'Duplicate workout exists.' });
    }

    await pool.query(
      `INSERT INTO workouts 
       (user_id, exercise, weight, reps, sets, log_date) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, exercise, weight, reps, sets, log_date]
    );

    res.status(200).send('Workout logged.');
  } catch (err) {
    console.error('Error inserting workout:', err);
    res.status(500).send('Database error.');
  }
});
// Overwrite 
app.post('/overwrite-workout', async (req, res) => {
  const { username, exercise, weight, reps, sets, log_date } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (userResult.rows.length === 0) return res.status(400).send('User not found.');
    const userId = userResult.rows[0].id;

    await pool.query(
      `UPDATE workouts 
       SET weight = $1, reps = $2, sets = $3
       WHERE user_id = $4 AND exercise = $5 AND log_date = $6`,
      [weight, reps, sets, userId, exercise, log_date]
    );

    res.status(200).send('Workout overwritten.');
  } catch (err) {
    console.error('Error updating workout:', err);
    res.status(500).send('Database error.');
  }
});
// Get Method
app.get('/workouts', async (req, res) => {
  const { username, log_date } = req.query;

  try {
    const userResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (userResult.rows.length === 0) return res.status(400).send('User not found.');
    const userId = userResult.rows[0].id;

    const result = await pool.query(
      `SELECT exercise, weight, reps, sets 
       FROM workouts 
       WHERE user_id = $1 AND log_date = $2`,
      [userId, log_date]
    );

    res.json(result.rows); // return array of workouts
  } catch (err) {
    console.error('Error fetching workouts:', err);
    res.status(500).send('Database error.');
  }
});




app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
