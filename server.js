require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Stripe webhook endpoint - MUST be before express.json() middleware
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('Warning: STRIPE_WEBHOOK_SECRET not set');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Log full session data to debug
    console.log('Checkout Session metadata:', session.metadata);
    console.log('Customer details:', session.customer_details);
    console.log('Custom fields:', session.custom_fields);
    
    // Extract donor name from various possible sources
    let donorName = 'Anonymous';
    let message = '';
    
    // Priority 1: Custom fields (if using custom_fields in checkout)
    if (session.custom_fields && session.custom_fields.length > 0) {
      const nameField = session.custom_fields.find(f => f.key === 'name');
      const messageField = session.custom_fields.find(f => f.key === 'message');
      
      if (nameField?.text?.value) donorName = nameField.text.value;
      if (messageField?.text?.value) message = messageField.text.value;
    }
    
    // Priority 2: Metadata
    if (donorName === 'Anonymous' && session.metadata?.donor_name) {
      donorName = session.metadata.donor_name;
    }
    if (!message && session.metadata?.message) {
      message = session.metadata.message;
    }
    
    // Priority 3: Customer details (billing info)
    if (donorName === 'Anonymous' && session.customer_details?.name) {
      donorName = session.customer_details.name;
    }
    
    const donationData = {
      amount: session.amount_total / 100, // amount_total is in cents
      currency: session.currency.toUpperCase(),
      donorName: donorName,
      message: message,
      timestamp: new Date().toISOString()
    };

    console.log('New donation received:', donationData);
    io.emit('donation', donationData);
  }
  
  // Keep payment_intent.succeeded as fallback
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Log full metadata to debug
    console.log('Payment Intent metadata:', paymentIntent.metadata);
    console.log('Payment Intent receipt_email:', paymentIntent.receipt_email);
    
    const donationData = {
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      donorName: paymentIntent.metadata.donor_name || 'Anonymous',
      message: paymentIntent.metadata.message || '',
      timestamp: new Date().toISOString()
    };

    console.log('New donation received:', donationData);
    io.emit('donation', donationData);
  }

  res.json({received: true});
});

// Regular JSON middleware for other routes
app.use(express.json());

// Test endpoint
app.post('/test-donation', (req, res) => {
  const testDonation = {
    amount: req.body.amount || 10.00,
    currency: req.body.currency || 'USD',
    donorName: req.body.donorName || 'Test Donor',
    message: req.body.message || 'This is a test donation!',
    timestamp: new Date().toISOString()
  };

  console.log('Test donation triggered:', testDonation);
  io.emit('donation', testDonation);
  
  res.json({ success: true, donation: testDonation });
});

// Health check
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Donation Alert Server</title></head>
      <body>
        <h1>Donation Alert Server is Running!</h1>
        <p>OBS Browser Source URL: <a href="/alert.html">/alert.html</a></p>
        <p>Connected clients: <span id="count">0</span></p>
        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          socket.on('connect', () => {
            console.log('Connected to server');
          });
        </script>
      </body>
    </html>
  `);
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`==========================================`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Browser source: http://localhost:${PORT}/alert.html`);
  console.log(`Test donation:  POST http://localhost:${PORT}/test-donation`);
  console.log(`==========================================`);
});