/**
 * Simple Node.js client for the Story Editor API
 * 
 * This example demonstrates how to use the single-call chatbot endpoint
 * from a Node.js application.
 * 
 * Usage:
 *   node node-client.js "Your message to the chatbot"
 */

const fetch = require('node-fetch');

// API endpoint
const API_URL = 'http://localhost:3000/api/chat';

/**
 * Send a message to the chatbot and get the response
 * @param {string} message - The message to send to the chatbot
 * @returns {Promise<string>} - The chatbot's response
 */
async function sendMessage(message) {
  try {
    console.log(`Sending message: "${message}"`);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get response from chatbot');
    }
    
    return data.response;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Get the message from command line arguments
    const message = process.argv[2];
    
    if (!message) {
      console.error('Please provide a message as a command line argument');
      console.error('Example: node node-client.js "Hello, how are you?"');
      process.exit(1);
    }
    
    console.log('Connecting to chatbot...');
    
    // Send the message and get the response
    const response = await sendMessage(message);
    
    console.log('\nChatbot response:');
    console.log(response);
  } catch (error) {
    console.error('Failed to communicate with the chatbot:', error.message);
    process.exit(1);
  }
}

// Run the main function
main(); 