require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/gov', require('./routes/admin'));
app.use('/api/decision-support', require('./routes/decisionSupport'));
app.use('/api/predictive', require('./routes/predictive'));
app.use('/api/worker', require('./routes/worker'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/sla', require('./routes/sla'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/governance', require('./routes/governance'));
app.use('/api/public', require('./routes/public'));
app.use('/api/government/intelligence', require('./routes/intelligence'));

const PORT = process.env.PORT || 5000;

// Start Server strictly AFTER DB Connection
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB Connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server Running on Port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
