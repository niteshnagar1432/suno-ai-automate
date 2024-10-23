const express = require('express');
const app = express();

// Set the local redirect URI (e.g., for Google OAuth)
const LOCAL_REDIRECT_URI = 'https://clerk.suno.com/v1/oauth_callback';

// The original Google OAuth URL you have
const GOOGLE_OAUTH_URL = `https://accounts.google.com/o/oauth2/auth/oauthchooseaccount?access_type=offline&client_id=864619725951-na3uleaalbekeilaalb3ak9qdpuoddeo.apps.googleusercontent.com&redirect_uri=${encodeURIComponent(LOCAL_REDIRECT_URI)}&response_type=code&scope=openid%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&state=random_state_string`;

// Route to start OAuth login flow (Google login)
app.get('/auth/google', (req, res) => {
  res.redirect(GOOGLE_OAUTH_URL);
});

// OAuth callback (where Google will redirect with the data)
app.get('/oauth_callback', (req, res) => {
  const queryParams = req.query;

  // Log the entire query params object to see what Google returns
  console.log('Google OAuth Response:', queryParams);

  // Display the data in the browser
  res.send(`
    <h1>OAuth Callback Data</h1>
    <pre>${JSON.stringify(queryParams, null, 2)}</pre>
  `);
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
