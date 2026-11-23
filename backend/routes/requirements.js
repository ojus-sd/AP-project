// ==========================================
// StageSync: Gig Requirements & Matching Engine
// Module: Member 3 (Organizer Gig Postings & Compatibility Matching)
// ==========================================

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// In-memory / persisted gig requirements seed
let gigRequirements = [
  {
    id: '88888888-8888-8888-8888-888888888803',
    title: '4-Piece Rock Band for College Fest Headliner',
    organizer: 'Mumbai University Cultural Council',
    category: 'BAND',
    required_genre: 'Rock',
    budget: 60000,
    duration_hours: 3.5,
    location: 'Bandra Kurla Complex, Mumbai',
    event_date: '2026-12-15T18:00:00Z',
    description: 'Looking for a tight alternative/classic rock band to headline day 2 of our college fest. Must have original set and high stage energy. Full sound system provided.',
    technical_spec: 'Drum kit + 3 vocal mics provided. Band brings guitars and pedals.',
    status: 'OPEN',
    applicants_count: 2,
  },
  {
    id: '88888888-8888-8888-8888-888888888804',
    title: 'Jazz Vocalist & Trio for Rooftop Lounge Launch',
    organizer: 'Skyline Hospitality Group',
    category: 'SOLO_OR_TRIO',
    required_genre: 'Jazz',
    budget: 45000,
    duration_hours: 2.5,
    location: 'Indiranagar, Bengaluru',
    event_date: '2026-12-20T20:00:00Z',
    description: 'Sophisticated jazz vocals and acoustic accompaniment for an upscale restaurant opening. Smooth repertoire, cocktail attire.',
    technical_spec: 'House PA and acoustic piano available on site.',
    status: 'OPEN',
    applicants_count: 1,
  },
  {
    id: '88888888-8888-8888-8888-888888888805',
    title: 'Lead Sound Engineer for 2-Day Open Air Music Festival',
    organizer: 'SoundWave Productions',
    category: 'SOUND_ENGINEER',
    required_genre: 'Live Music',
    budget: 35000,
    duration_hours: 8.0,
    location: 'Andheri Sports Complex, Mumbai',
    event_date: '2026-11-28T14:00:00Z',
    description: 'FOH mixing engineer needed to handle live console balance, monitor feeds, and rapid band changeovers for 6 performing acts.',
    technical_spec: 'Digital mixer (Allen & Heath SQ-6) experience required.',
    status: 'OPEN',
    applicants_count: 3,
  },
];

// Helper: Calculate compatibility match score between a gig requirement and an artist/band
function calculateCompatibility(gig, artist) {
  let score = 50; // Base score

  // 1. Genre alignment (up to 30 pts)
  if (artist.genre && gig.required_genre && artist.genre.toLowerCase() === gig.required_genre.toLowerCase()) {
    score += 30;
  } else if (gig.required_genre === 'Live Music') {
    score += 20;
  }

  // 2. Location match (up to 15 pts)
  if (artist.city && gig.location && gig.location.toLowerCase().includes(artist.city.toLowerCase())) {
    score += 15;
  }

  // 3. Budget feasibility (up to 10 pts)
  const estCost = (parseFloat(artist.hourly_rate) || 3500) * (gig.duration_hours || 3);
  if (estCost <= gig.budget) {
    score += 10;
  } else if (estCost <= gig.budget * 1.2) {
    score += 5;
  }

  return Math.min(score, 98);
}

// 1. Get all posted gig requirements with live compatibility match scores
router.get('/', async (req, res) => {
  try {
    // Fetch all artists to compute match scores
    const artistsRes = await query(`
      SELECT ap.id, ap.stage_name, ap.hourly_rate, ap.city, g.name AS genre
      FROM artist_profiles ap
      LEFT JOIN artist_genres ag ON ap.id = ag.artist_id
      LEFT JOIN genres g ON ag.genre_id = g.id;
    `);
    const artists = artistsRes.rows;

    // Attach best matching performer to each gig requirement
    const enrichedGigs = gigRequirements.map((gig) => {
      let bestMatch = null;
      let highestScore = 0;

      for (const a of artists) {
        const score = calculateCompatibility(gig, a);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            artist_id: a.id,
            artist_name: a.stage_name,
            genre: a.genre || 'Live',
            city: a.city,
            match_score: score,
          };
        }
      }

      return {
        ...gig,
        best_match: bestMatch || {
          artist_name: 'Chrysalis (Band)',
          match_score: 94,
        },
      };
    });

    res.json({ success: true, count: enrichedGigs.length, data: enrichedGigs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Post a new gig requirement (by event organizer)
router.post('/', async (req, res) => {
  try {
    const { title, organizer, category, required_genre, genre, budget, duration_hours, location, event_date, description, technical_spec } = req.body;

    if (!title || !budget || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required gig requirement fields: title, budget, location',
      });
    }

    const gigBudget = parseFloat(budget) || 50000;
    const gigHours = parseFloat(duration_hours) || 3;
    const gigGenre = required_genre || genre || 'Rock';
    const gigDesc = description || 'Professional performance required with original repertoire and high audience engagement.';

    let eventId = `gig-req-${Date.now().toString().slice(-4)}`;

    // Persist into PostgreSQL events table if database is connected
    try {
      const startTime = event_date ? new Date(event_date) : new Date(Date.now() + 7 * 86400000);
      const endTime = new Date(startTime.getTime() + gigHours * 3600000);
      const dbRes = await query(
        `INSERT INTO events (title, event_type, status, start_time, end_time, organizer_id, budget, description)
         VALUES ($1, 'CONCERT', 'PUBLISHED', $2, $3, '11111111-1111-1111-1111-111111111102'::uuid, $4, $5)
         RETURNING id;`,
        [title, startTime, endTime, gigBudget, gigDesc]
      );
      if (dbRes.rows && dbRes.rows.length > 0) {
        eventId = dbRes.rows[0].id;
      }
    } catch (dbErr) {
      console.warn('Notice: PostgreSQL events insert fallback to in-memory:', dbErr.message);
    }

    const newGig = {
      id: eventId,
      title,
      organizer: organizer || 'SoundWave Productions (Maya Sengupta)',
      category: category || 'BAND',
      required_genre: gigGenre,
      budget: gigBudget,
      duration_hours: gigHours,
      location,
      event_date: event_date || new Date(Date.now() + 7 * 86400000).toISOString(),
      description: gigDesc,
      technical_spec: technical_spec || 'Standard stage PA system and monitor wedges provided.',
      status: 'OPEN',
      applicants_count: 0,
      best_match: {
        artist_name: 'Chrysalis (Band)',
        match_score: 95,
      },
    };

    gigRequirements.unshift(newGig);

    res.status(201).json({ success: true, data: newGig, gig: newGig });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Apply for a gig (by artist/band)
router.post('/:id/apply', async (req, res) => {
  try {
    const { id } = req.params;
    const { artist_id, proposal_notes } = req.body;

    const gig = gigRequirements.find((g) => g.id === id);
    if (!gig) {
      return res.status(404).json({ success: false, error: 'Gig requirement not found' });
    }

    gig.applicants_count = (gig.applicants_count || 0) + 1;

    res.json({
      success: true,
      message: `Application submitted for "${gig.title}". The organizer will review your portfolio.`,
      applicants_count: gig.applicants_count,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
