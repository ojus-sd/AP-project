// ==========================================
// StageSync: Booking & Concurrency Engine
// Module: Member 2 (Algorithm B - Concurrency-Safe Booking & Overlap Check)
// ==========================================

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// 1. Get all bookings with event and artist details
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT b.id, b.status, b.fee, b.start_time, b.end_time,
             e.title AS event_title,
             CASE 
               WHEN ap.stage_name = 'Aarav Strings' THEN 'Chrysalis (Band)'
               ELSE ap.stage_name 
             END AS artist_name,
             ap.professional_type,
             ap.city AS artist_city
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      JOIN artist_profiles ap ON b.artist_id = ap.id
      ORDER BY b.start_time DESC;
    `);

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get single booking by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `
      SELECT b.*, e.title AS event_title, ap.stage_name AS artist_name
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      JOIN artist_profiles ap ON b.artist_id = ap.id
      WHERE b.id = $1;
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create new booking with Algorithm B Overlap Conflict Check
router.post('/', async (req, res) => {
  try {
    const { event_id, artist_id, start_time, end_time, fee } = req.body;

    // Basic input validation
    if (!event_id || !artist_id || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required booking parameters: event_id, artist_id, start_time, end_time',
      });
    }

    // Step 1: Algorithm B - Temporal overlap check
    const conflictCheck = await query(
      `
      SELECT b.id, b.start_time, b.end_time, e.title AS event_title
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      WHERE b.artist_id = $1
        AND b.status NOT IN ('CANCELLED')
        AND b.start_time < $3
        AND b.end_time > $2;
    `,
      [artist_id, start_time, end_time]
    );

    // If overlap is found, reject with 409 Conflict
    if (conflictCheck.rows.length > 0) {
      const conflict = conflictCheck.rows[0];
      return res.status(409).json({
        success: false,
        error: `Schedule Conflict: Artist is already booked for "${conflict.event_title}" between ${new Date(
          conflict.start_time
        ).toLocaleTimeString()} and ${new Date(conflict.end_time).toLocaleTimeString()}`,
        conflict: conflict,
      });
    }

    // Step 2: Insert confirmed booking into PostgreSQL
    const insertResult = await query(
      `
      INSERT INTO bookings (event_id, artist_id, status, fee, start_time, end_time, created_by)
      VALUES ($1, $2, 'CONFIRMED', $3, $4, $5,
              COALESCE((SELECT organizer_id FROM events WHERE id = $1), '11111111-1111-1111-1111-111111111102'::uuid))
      RETURNING *;
    `,
      [event_id, artist_id, fee || 15000, start_time, end_time]
    );

    res.status(201).json({ success: true, booking: insertResult.rows[0] });
  } catch (err) {
    // Catch database-level GiST exclusion constraint error (error code 23P01)
    if (err.code === '23P01') {
      return res.status(409).json({
        success: false,
        error: 'Database GiST Exclusion Error: Concurrent booking overlap prevented at storage engine level.',
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Cancel a booking
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `
      UPDATE bookings
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, status, updated_at;
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    res.json({ success: true, message: 'Booking successfully cancelled', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

