// services/workspace-service/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const { sequelize } = require('./models');
const logger = require('./utils/logger');

const workspaceRoutes = require('./routes/workspace');
const documentRoutes = require('./routes/document');
const healthRoutes = require('./routes/health');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (m) => logger.info(m.trim()) } }));

app.use('/health', healthRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/workspace', documentRoutes);

app.use((err, req, res, next) => {
  logger.error({ err });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large. Max 10MB.' });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3002;
async function start() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
  app.listen(PORT, '0.0.0.0', () => logger.info(`Workspace Service on port ${PORT}`));
}
start().catch((err) => { logger.error(err); process.exit(1); });
module.exports = app;
