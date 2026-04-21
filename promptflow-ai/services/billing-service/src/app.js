// services/billing-service/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const billingRoutes = require('./routes/billing');
const healthRoutes = require('./routes/health');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json());
app.use(morgan('combined', { stream: { write: (m) => logger.info(m.trim()) } }));
app.use('/health', healthRoutes);
app.use('/api/billing', billingRoutes);
app.use((err, req, res, next) => { logger.error({ err }); res.status(err.status || 500).json({ error: err.message }); });

const PORT = process.env.PORT || 3004;
async function start() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
  app.listen(PORT, '0.0.0.0', () => logger.info(`Billing Service on port ${PORT}`));
}
start().catch((err) => { logger.error(err); process.exit(1); });
module.exports = app;
