const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(uploadsDir));

// =============================================
// CHARACTER ROUTES
// =============================================

// GET all characters
app.get('/api/characters', (req, res) => {
  const sql = 'SELECT * FROM characters ORDER BY name ASC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

// GET single character
app.get('/api/characters/:id', (req, res) => {
  const sql = 'SELECT * FROM characters WHERE id = ?';
  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Character not found' });
    res.json({ success: true, data: row });
  });
});

// POST create character
app.post('/api/characters', upload.single('image'), (req, res) => {
  const { name, description } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Character name is required' });
  }
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  const sql = 'INSERT INTO characters (name, description, image) VALUES (?, ?, ?)';
  db.run(sql, [name.trim(), description || '', imagePath], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      success: true,
      message: 'Character created successfully',
      data: { id: this.lastID, name: name.trim(), description, image: imagePath }
    });
  });
});

// PUT update character
app.put('/api/characters/:id', upload.single('image'), (req, res) => {
  const id = req.params.id;
  const { name, description } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Character name is required' });
  }

  db.get('SELECT image FROM characters WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Character not found' });

    let imagePath = row.image;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
      if (row.image) {
        const oldPath = path.join(__dirname, '../public', row.image);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    const sql = 'UPDATE characters SET name = ?, description = ?, image = ? WHERE id = ?';
    db.run(sql, [name.trim(), description || '', imagePath, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        success: true,
        message: 'Character updated successfully',
        data: { id, name: name.trim(), description, image: imagePath }
      });
    });
  });
});

// DELETE character
app.delete('/api/characters/:id', (req, res) => {
  const id = req.params.id;
  // Get image path first to delete the file
  db.get('SELECT image FROM characters WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Character not found' });

    // Delete from duel_participants first
    db.run('DELETE FROM duel_participants WHERE character_id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Delete character
      db.run('DELETE FROM characters WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Delete image file if exists
        if (row.image) {
          const imgPath = path.join(__dirname, '../public', row.image);
          if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
          }
        }

        res.json({ success: true, message: 'Character deleted successfully' });
      });
    });
  });
});

// =============================================
// DUEL ROUTES
// =============================================

// GET all duels with participants
app.get('/api/duels', (req, res) => {
  const duelSql = 'SELECT * FROM duels ORDER BY day ASC, order_index ASC, created_at DESC';
  db.all(duelSql, [], (err, duels) => {
    if (err) return res.status(500).json({ error: err.message });

    if (duels.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const participantSql = `
      SELECT dp.duel_id, dp.side, dp.is_dead, c.id as character_id, c.name, c.image
      FROM duel_participants dp
      JOIN characters c ON dp.character_id = c.id
    `;
    db.all(participantSql, [], (err, participants) => {
      if (err) return res.status(500).json({ error: err.message });

      const result = duels.map(duel => {
        const duelParticipants = participants.filter(p => p.duel_id === duel.id);
        return {
          ...duel,
          rama_army: duelParticipants.filter(p => p.side === 'rama').map(p => ({ id: p.character_id, name: p.name, image: p.image, is_dead: !!p.is_dead })),
          ravana_army: duelParticipants.filter(p => p.side === 'ravana').map(p => ({ id: p.character_id, name: p.name, image: p.image, is_dead: !!p.is_dead }))
        };
      });

      res.json({ success: true, data: result });
    });
  });
});

// GET single duel
app.get('/api/duels/:id', (req, res) => {
  db.get('SELECT * FROM duels WHERE id = ?', [req.params.id], (err, duel) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!duel) return res.status(404).json({ error: 'Duel not found' });

    const participantSql = `
      SELECT dp.side, dp.is_dead, c.id as character_id, c.name, c.image
      FROM duel_participants dp
      JOIN characters c ON dp.character_id = c.id
      WHERE dp.duel_id = ?
    `;
    db.all(participantSql, [req.params.id], (err, participants) => {
      if (err) return res.status(500).json({ error: err.message });
      duel.rama_army = participants.filter(p => p.side === 'rama').map(p => ({ id: p.character_id, name: p.name, image: p.image, is_dead: !!p.is_dead }));
      duel.ravana_army = participants.filter(p => p.side === 'ravana').map(p => ({ id: p.character_id, name: p.name, image: p.image, is_dead: !!p.is_dead }));
      res.json({ success: true, data: duel });
    });
  });
});

// POST create duel
app.post('/api/duels', upload.single('image'), (req, res) => {
  const { day, order_index, description, rama_ids, ravana_ids, rama_dead_ids, ravana_dead_ids } = req.body;
  const duelDay = day ? parseInt(day, 10) : 1;
  const duelOrder = order_index ? parseInt(order_index, 10) : 0;

  let ramaIds = [];
  let ravanaIds = [];
  let ramaDeadIds = [];
  let ravanaDeadIds = [];

  try {
    ramaIds = rama_ids ? JSON.parse(rama_ids) : [];
    ravanaIds = ravana_ids ? JSON.parse(ravana_ids) : [];
    ramaDeadIds = rama_dead_ids ? JSON.parse(rama_dead_ids) : [];
    ravanaDeadIds = ravana_dead_ids ? JSON.parse(ravana_dead_ids) : [];
  } catch (e) {
    ramaIds = Array.isArray(rama_ids) ? rama_ids : (rama_ids ? [rama_ids] : []);
    ravanaIds = Array.isArray(ravana_ids) ? ravana_ids : (ravana_ids ? [ravana_ids] : []);
    ramaDeadIds = Array.isArray(rama_dead_ids) ? rama_dead_ids : (rama_dead_ids ? [rama_dead_ids] : []);
    ravanaDeadIds = Array.isArray(ravana_dead_ids) ? ravana_dead_ids : (ravana_dead_ids ? [ravana_dead_ids] : []);
  }

  if (ramaIds.length === 0 && ravanaIds.length === 0) {
    return res.status(400).json({ error: 'At least one participant is required' });
  }

  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  const sql = 'INSERT INTO duels (day, order_index, description, image) VALUES (?, ?, ?, ?)';
  db.run(sql, [duelDay, duelOrder, description || '', imagePath], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    const duelId = this.lastID;
    const participants = [
      ...ramaIds.map(id => [duelId, id, 'rama', ramaDeadIds.includes(id) ? 1 : 0]),
      ...ravanaIds.map(id => [duelId, id, 'ravana', ravanaDeadIds.includes(id) ? 1 : 0])
    ];

    if (participants.length === 0) {
      return res.status(201).json({ success: true, message: 'Duel created', data: { id: duelId } });
    }

    const placeholders = participants.map(() => '(?, ?, ?, ?)').join(', ');
    const flatValues = participants.flat();
    const participantSql = `INSERT INTO duel_participants (duel_id, character_id, side, is_dead) VALUES ${placeholders}`;

    db.run(participantSql, flatValues, function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ success: true, message: 'Duel created successfully', data: { id: duelId } });
    });
  });
});

// PUT update duel
app.put('/api/duels/:id', upload.single('image'), (req, res) => {
  const id = req.params.id;
  const { day, order_index, description, rama_ids, ravana_ids, rama_dead_ids, ravana_dead_ids } = req.body;
  const duelDay = day ? parseInt(day, 10) : 1;
  const duelOrder = order_index ? parseInt(order_index, 10) : 0;

  let ramaIds = [];
  let ravanaIds = [];
  let ramaDeadIds = [];
  let ravanaDeadIds = [];

  try {
    ramaIds = rama_ids ? JSON.parse(rama_ids) : [];
    ravanaIds = ravana_ids ? JSON.parse(ravana_ids) : [];
    ramaDeadIds = rama_dead_ids ? JSON.parse(rama_dead_ids) : [];
    ravanaDeadIds = ravana_dead_ids ? JSON.parse(ravana_dead_ids) : [];
  } catch (e) {
    ramaIds = Array.isArray(rama_ids) ? rama_ids : (rama_ids ? [rama_ids] : []);
    ravanaIds = Array.isArray(ravana_ids) ? ravana_ids : (ravana_ids ? [ravana_ids] : []);
    ramaDeadIds = Array.isArray(rama_dead_ids) ? rama_dead_ids : (rama_dead_ids ? [rama_dead_ids] : []);
    ravanaDeadIds = Array.isArray(ravana_dead_ids) ? ravana_dead_ids : (ravana_dead_ids ? [ravana_dead_ids] : []);
  }

  if (ramaIds.length === 0 && ravanaIds.length === 0) {
    return res.status(400).json({ error: 'At least one participant is required' });
  }

  db.get('SELECT image FROM duels WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Duel not found' });

    let imagePath = row.image;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
      if (row.image) {
        const oldPath = path.join(__dirname, '../public', row.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    const sql = 'UPDATE duels SET day = ?, order_index = ?, description = ?, image = ? WHERE id = ?';
    db.run(sql, [duelDay, duelOrder, description || '', imagePath, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.run('DELETE FROM duel_participants WHERE duel_id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        const participants = [
          ...ramaIds.map(charId => [id, charId, 'rama', ramaDeadIds.includes(charId) ? 1 : 0]),
          ...ravanaIds.map(charId => [id, charId, 'ravana', ravanaDeadIds.includes(charId) ? 1 : 0])
        ];

        if (participants.length === 0) {
          return res.json({ success: true, message: 'Duel updated successfully' });
        }

        const placeholders = participants.map(() => '(?, ?, ?, ?)').join(', ');
        const flatValues = participants.flat();
        const participantSql = `INSERT INTO duel_participants (duel_id, character_id, side, is_dead) VALUES ${placeholders}`;

        db.run(participantSql, flatValues, function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, message: 'Duel updated successfully' });
        });
      });
    });
  });
});

// DELETE duel
app.delete('/api/duels/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT image FROM duels WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Duel not found' });

    db.run('DELETE FROM duel_participants WHERE duel_id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.run('DELETE FROM duels WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        if (row.image) {
          const imgPath = path.join(__dirname, '../public', row.image);
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }

        res.json({ success: true, message: 'Duel deleted successfully' });
      });
    });
  });
});

// Fallback: serve index.html for any unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Ramayana War Archive running at http://localhost:${PORT}`);
  console.log(`📁 Uploads folder: ${uploadsDir}`);
  console.log(`🗄️  Database: ${path.join(__dirname, 'ramayana.db')}\n`);
});
