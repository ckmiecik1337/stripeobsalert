# Stripe Donation Alerts for OBS

A real-time donation alert system that integrates Stripe payments with OBS Studio for live streaming. When viewers make donations through Stripe, animated alerts appear on your stream instantly.

![Donation Alert Demo](https://i.ibb.co/BVfjWmh8/ezgif-4df2ad2800fd208c.gif)


## Features

-  Real-time donation alerts via WebSockets
-  Animated entrance/exit effects with confetti
-  Displays donor name, amount, and custom message
-  Optional sound alerts
-  Customizable styling and animations
-  Test endpoint for development
-  Works with Cloudflare Tunnel for public webhooks

##  Prerequisites

- Node.js 14+ installed
- Stripe account with API keys
- OBS Studio
- A publicly accessible server (via Cloudflare Tunnel, ngrok, or similar)

##  Installation

### 1. Clone or Download

```bash
git clone https://github.com/ckmiecik1337/stripeobsalert
cd stripeobsdonationalerts
```

### 2. Install Dependencies
Ensure you have npm installed, if not:


```bash
sudo apt-get install npm
```


```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
PORT=3001
```

**Get your Stripe keys:**
- Secret Key: [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys)
- Webhook Secret: Set up webhook endpoint first (see step 4)

### 4. Setup Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Endpoint URL: `https://yourdomain.com/webhook`
4. Select event to listen for: `payment_intent.succeeded`
5. Copy the **Signing secret** (starts with `whsec_`) to your `.env` file

**Important:** When creating Stripe Payment Intents, include metadata:
```javascript
{
  amount: 2500,
  currency: 'usd',
  metadata: {
    donor_name: 'John Doe',
    message: 'Great stream!'
  }
}
```

### 5. Add Custom Background (Optional)

Place your background image in the `public` folder:

```
public/
├── alert.html
└── background.png  ← Your custom PNG here (recommended: 800x600 to 1920x1080)
```

The alert will automatically use this as the background.

##  Usage

### Start the Server

```bash
npm start
or
node server.js
```

You should see:
```
Server running on port 3001
Browser source: http://localhost:3001/alert.html
Test donation:  POST http://localhost:3001/test-donation
```

### Add to OBS

1. In OBS, add a new **Browser Source**
2. Set URL to: `https://yourdomain.com/alert.html` (or `http://localhost:3001/alert.html` for local testing)
3. Recommended settings:
   - Width: **1920**
   - Height: **1080**
   - ☑ Refresh browser when scene becomes active
   - ☐ Shutdown source when not visible (for testing)
4. Click **OK**

### Testing Alerts

**Test without making a real donation:**

```bash
curl -X POST http://localhost:3001/test-donation \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25.00,
    "currency": "USD",
    "donorName": "John Doe",
    "message": "Great stream! Keep it up!"
  }'
```

##  Project Structure

```
stripe-obs-donation-alerts/
├── server.js              # Backend Node.js server
├── package.json           # Dependencies
├── .env                   # Environment variables (create this)
├── .env.example           # Template for environment variables
├── public/
│   ├── alert.html         # OBS Browser Source (frontend)
│   └── background.png     # Custom background (optional)
└── README.md
```

##  Customization

### Change Alert Duration

In `alert.html`, find this line:
```javascript
setTimeout(() => {
  alertContainer.classList.remove('show');
}, 8000); // 8000ms = 8 seconds
```

Change `8000` to your desired duration in milliseconds.

### Change Colors

In `alert.html`, find the `.alert-container` CSS:
```css
background: url('/background.png') center/cover no-repeat;
```

Or use a gradient:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Add Custom Sound

1. Add your sound file to the `public` folder (e.g., `alert-sound.mp3`)
2. In `alert.html`, uncomment and update:
```html
<audio id="alertSound" preload="auto">
  <source src="alert-sound.mp3" type="audio/mpeg">
</audio>
```

### Adjust Animation Speed

In `alert.html` CSS, find:
```css
transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

Change `0.5s` to speed up or slow down animations.


##  Dependencies

- **express** - Web server framework
- **socket.io** - Real-time WebSocket communication
- **stripe** - Stripe API integration
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management


