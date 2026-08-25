const express = require('express');
const path = require('path');
const { query } = require('./db');
const authRoutes = require('./routes/auth.routes');
const farmRoutes = require('./routes/farm.routes');
const auditRoutes = require('./routes/audit.routes');
const cropRecordRoutes = require('./routes/cropRecord.routes');
const schemeRoutes = require('./routes/scheme.routes');
const recommendationRoutes = require('./routes/recommendation.routes');
const mlRoutes = require('./routes/ml.routes');
const sustainabilityScoreRoutes = require('./routes/sustainabilityScore.routes');
const geographyRoutes = require('./routes/geography.routes');
const groundwaterHeatmapRoutes = require('./routes/groundwaterHeatmap.routes');
const groundwaterAssessmentRoutes = require('./routes/groundwaterAssessment.routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static developer demo dashboard
app.use(express.static(path.join(__dirname, '../frontend')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/geography', geographyRoutes);
app.use('/api', sustainabilityScoreRoutes);
app.use('/api/groundwater', groundwaterHeatmapRoutes);
app.use('/api/groundwater-assessments', groundwaterAssessmentRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api', cropRecordRoutes);
app.use('/api', recommendationRoutes);
app.use('/api/ml', mlRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await query('SELECT NOW()');
    res.status(200).json({
      status: 'ok',
      message: 'API is running',
      database: {
        status: 'connected',
        serverTime: dbResult.rows[0].now
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'API is running but database is unreachable',
      error: error.message
    });
  }
});

module.exports = app;

