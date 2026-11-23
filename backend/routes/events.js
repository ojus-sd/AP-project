// ==========================================
// StageSync: Event Operations & Financials
// Module: Member 4 (Events, Venues & Financial Auditing - Query 4.2 & Query 5)
// ==========================================

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// 1. Get all events with venue name and confirmed booking count (Query 5)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT e.id, e.title, e.event_type, e.status, e.start_time, e.end_time, e.budget,
             v.name AS venue_name,
             v.city AS venue_city,
             COUNT(b.id) AS booked_artists
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      LEFT JOIN bookings b ON e.id = b.event_id AND b.status = 'CONFIRMED'
      GROUP BY e.id, e.title, e.event_type, e.status, e.start_time, e.end_time, e.budget, v.name, v.city
      ORDER BY e.start_time ASC;
    `);

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get single event by ID with requirements
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const eventQuery = await query(
      `
      SELECT e.*, v.name AS venue_name, v.address AS venue_address,
             u.first_name || ' ' || u.last_name AS organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      LEFT JOIN venues v ON e.venue_id = v.id
      WHERE e.id = $1;
    `,
      [id]
    );

    if (eventQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const reqsQuery = await query(
      `
      SELECT er.id, er.min_experience_years, er.professional_type, er.quantity, er.is_mandatory,
             s.name AS skill_name, g.name AS genre_name
      FROM event_requirements er
      LEFT JOIN skills s ON er.skill_id = s.id
      LEFT JOIN genres g ON er.genre_id = g.id
      WHERE er.event_id = $1;
    `,
      [id]
    );

    res.json({
      success: true,
      event: eventQuery.rows[0],
      requirements: reqsQuery.rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create a new event
router.post('/', async (req, res) => {
  try {
    const { title, event_type, start_time, end_time, venue_id, organizer_id, budget } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ success: false, error: 'Missing required event fields: title, start_time, end_time' });
    }

    const result = await query(
      `
      INSERT INTO events (title, event_type, status, start_time, end_time, venue_id, organizer_id, budget)
      VALUES ($1, $2, 'PUBLISHED', $3, $4, $5, 
              COALESCE($6, '11111111-1111-1111-1111-111111111102'::uuid), $7)
      RETURNING *;
    `,
      [title, event_type || 'CONCERT', start_time, end_time, venue_id || null, organizer_id || null, budget || 75000]
    );

    const createdEvent = result.rows[0];
    res.status(201).json({ success: true, event: createdEvent });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Partner Venues List (Exported handler)
async function getVenues(req, res) {
  try {
    const result = await query(`
      SELECT id, name, city, address, capacity, hourly_rate, facilities
      FROM venues
      ORDER BY capacity DESC;
    `);

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 5. Artist Career Earnings & Settlement Audit (Query 4.2 - Exported handler)
async function getEarningsReport(req, res) {
  try {
    const result = await query(`
      SELECT ap.stage_name,
             ap.city,
             COUNT(b.id) AS total_bookings,
             COALESCE(SUM(b.fee), 0) AS total_earnings
      FROM artist_profiles ap
      JOIN bookings b ON b.artist_id = ap.id
      WHERE b.status = 'CONFIRMED'
      GROUP BY ap.stage_name, ap.city
      ORDER BY total_earnings DESC;
    `);

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Direct sub-routes on events router
router.get('/venues/list', getVenues);
router.get('/reports/earnings', getEarningsReport);

module.exports = router;
module.exports.getVenues = getVenues;
module.exports.getEarningsReport = getEarningsReport;
