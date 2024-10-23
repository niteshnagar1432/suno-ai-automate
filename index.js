const fs = require("fs");
const path = require("path");
const axios = require("axios");
const readline = require("readline"); // Import readline module
const { Account } = require("./account");

// Create the 'audio' folder if it doesn't exist
const audioFolderPath = path.join(__dirname, "audio");
if (!fs.existsSync(audioFolderPath)) {
  fs.mkdirSync(audioFolderPath);
}

let currentAccountIndex = 0;
let songPrompt = ""; // Variable to store user input
let loadingInterval; // Variable for loading interval

// Create an interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to ask for a song description
function askForSongPrompt() {
  rl.question("Please enter a prompt for the song: ", (answer) => {
    songPrompt = answer; // Store user input
    rl.close(); // Close the readline interface
    fetchToken(); // Start the process of fetching the token
  });
}

// Start the loading animation
function startLoading() {
  const spinner = ['|', '/', '-', '\\'];
  let index = 0;
  loadingInterval = setInterval(() => {
    process.stdout.write(`\rLoading... ${spinner[index]}`);
    index = (index + 1) % spinner.length;
  }, 100);
}

// Stop the loading animation
function stopLoading() {
  clearInterval(loadingInterval);
  process.stdout.write('\r'); // Clear the loading line
}

// Fetch token for the current account
async function fetchToken() {
  startLoading(); // Start loading animation

  if (currentAccountIndex >= Account.length) {
    stopLoading();
    console.error("No more accounts available.");
    return;
  }

  const currentAccount = Account[currentAccountIndex];
  console.log(`Using Account - ${currentAccount.name}`);

  const url = `https://clerk.suno.com/v1/client/sessions/${currentAccount.sessionId}/tokens?_clerk_js_version=5.27.0`;
  const cookie = currentAccount.cookie.replace(/\s+/g, "");

  try {
    const response = await axios.post(
      url,
      {},
      {
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "*/*",
          Origin: "https://suno.com",
          Referer: "https://suno.com/",
          Cookie: cookie,
        },
        withCredentials: true,
      }
    );

    stopLoading(); // Stop loading animation

    if (response.status !== 200) {
      throw new Error(
        `Error fetching token: ${response.data.errors[0].message}`
      );
    }

    const jwtToken = response.data.jwt;
    await generateMusic(jwtToken);
  } catch (error) {
    stopLoading(); // Stop loading animation
    console.error("Request failed:", error.message);
    // Handle insufficient credits or token fetch errors
    if (
      error.response &&
      error.response.data.detail === "Insufficient credits."
    ) {
      console.log("Switching to the next account...");
      currentAccountIndex++;
      fetchToken(); // Retry with the next account
    }
  }
}

// Generate music with the provided token
async function generateMusic(authToken) {
  startLoading(); // Start loading animation

  const url = "https://studio-api.prod.suno.com/api/generate/v2/";
  const headers = {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
    accept: "*/*",
    "affiliate-id": "undefined",
  };

  const payload = {
    gpt_description_prompt: songPrompt, // Use the user-provided prompt
    mv: "chirp-v3-5",
    prompt: "",
    make_instrumental: false,
    user_uploaded_images_b64: [],
    generation_type: "TEXT",
  };

  try {
    const response = await axios.post(url, payload, { headers });

    stopLoading(); // Stop loading animation

    if (response.status === 200) {
      const clipId = response.data.clips[0].id;
      console.log("Music generation started. Clip ID:", clipId);
      await countdownAndDownload(clipId);
    } else {
      console.error(
        "Error in generating music:",
        response.status,
        response.data
      );
    }
  } catch (error) {
    stopLoading(); // Stop loading animation
    if (
        error.response &&
        error.response.data.detail === "Insufficient credits."
      ) {
        console.log("Switching to the next account...");
        currentAccountIndex++;
        fetchToken(); // Retry with the next account
      }
  }
}

// Countdown timer and download audio file
async function countdownAndDownload(clipId) {
  let secondsRemaining = 120; // 2 minutes
  const countdownIntervalId = setInterval(() => {
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;

    const formattedTime = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    process.stdout.write(`\rTime remaining: ${formattedTime}`);

    secondsRemaining--;
    if (secondsRemaining < 0) {
      clearInterval(countdownIntervalId);
      console.log("\nTime's up! Starting download...");
      downloadAudioFile(clipId);
    }
  }, 1000);
}

// Download audio file from the generated clip ID
async function downloadAudioFile(clipId) {
  const audioUrl = `https://audiopipe.suno.ai/?item_id=${clipId}`;

  startLoading(); // Start loading animation

  try {
    console.log("\nDownloading audio...");
    const response = await axios.get(audioUrl, { responseType: "arraybuffer" });

    stopLoading(); // Stop loading animation

    if (response.status === 200) {
      const audioPath = path.join(audioFolderPath, `audio-${clipId}.mp3`);
      fs.writeFile(audioPath, Buffer.from(response.data), (err) => {
        if (err) {
          console.error("Error saving audio file:", err);
        } else {
          console.log(`\nAudio file saved successfully at: ${audioPath}`);
        }
      });
    } else {
      console.error(
        "Error downloading audio file:",
        response.status,
        response.data
      );
      setTimeout(() => downloadAudioFile(clipId), 2 * 60 * 1000); // Retry after 2 minutes
    }
  } catch (error) {
    stopLoading(); // Stop loading animation
    console.error("Error fetching audio file:", error.message);
    setTimeout(() => downloadAudioFile(clipId), 2 * 60 * 1000); // Retry after 2 minutes
  }
}

// Start the process by asking for a song prompt
askForSongPrompt();
