import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { BrainbaseClient } from './services/BrainbaseClient';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Store active client connections
const clients: Map<string, BrainbaseClient> = new Map();

// Create a new chat session
app.post('/api/chat/session', async (req, res) => {
  try {
    const sessionId = Date.now().toString();
    
    const workerId = process.env.WORKER_ID;
    const flowId = process.env.FLOW_ID;
    const apiKey = process.env.BRAINBASE_API_KEY;
    
    if (!workerId || !flowId || !apiKey) {
      return res.status(500).json({ 
        error: 'Missing environment variables. Please set WORKER_ID, FLOW_ID, and BRAINBASE_API_KEY.' 
      });
    }
    
    const client = new BrainbaseClient(workerId, flowId, apiKey);
    
    // Set up event handlers for collecting responses
    let responseBuffer = '';
    let isComplete = false;
    
    client.on('message', (message) => {
      responseBuffer = message;
    });
    
    client.on('stream', (chunk) => {
      responseBuffer += chunk;
    });
    
    client.on('complete', () => {
      isComplete = true;
    });
    
    client.on('error', (error) => {
      console.error('Client error:', error);
    });
    
    // Connect to Brainbase
    await client.connect();
    
    // Store the client for future messages
    clients.set(sessionId, client);
    
    // Wait for initial message from the chatbot
    await new Promise<void>((resolve) => {
      const checkComplete = () => {
        if (isComplete || responseBuffer) {
          resolve();
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      
      setTimeout(checkComplete, 500);
    });
    
    res.status(201).json({
      sessionId,
      message: responseBuffer || 'Connected to chatbot'
    });
  } catch (error) {
    const errorHandler = (err: any) => {
      console.error('Error creating chat session:', err);
      res.status(500).json({ error: 'Failed to create chat session' });
    };
    errorHandler(error);
  }
});

// Send a message to an existing chat session
app.post('/api/chat/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const client = clients.get(sessionId);
    if (!client) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    
    // Set up response collection
    let responseBuffer = '';
    let isComplete = false;
    
    const messageHandler = (msg: string) => {
      responseBuffer = msg;
    };
    
    const streamHandler = (chunk: string) => {
      responseBuffer += chunk;
    };
    
    const completeHandler = () => {
      isComplete = true;
    };
    
    client.on('message', messageHandler);
    client.on('stream', streamHandler);
    client.on('complete', completeHandler);
    
    // Send the message
    await client.sendMessage(message);
    
    // Wait for response
    await new Promise<void>((resolve) => {
      const checkComplete = () => {
        if (isComplete || responseBuffer) {
          resolve();
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      
      setTimeout(checkComplete, 500);
    });
    
    // Clean up event listeners
    client.removeListener('message', messageHandler);
    client.removeListener('stream', streamHandler);
    client.removeListener('complete', completeHandler);
    
    res.json({
      response: responseBuffer
    });
  } catch (error) {
    const errorHandler = (err: any) => {
      console.error('Error sending message:', err);
      res.status(500).json({ error: 'Failed to send message' });
    };
    errorHandler(error);
  }
});

// Close a chat session
app.delete('/api/chat/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const client = clients.get(sessionId);
    if (!client) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    
    client.disconnect();
    clients.delete(sessionId);
    
    res.json({ message: 'Chat session closed successfully' });
  } catch (error) {
    const errorHandler = (err: any) => {
      console.error('Error closing chat session:', err);
      res.status(500).json({ error: 'Failed to close chat session' });
    };
    errorHandler(error);
  }
});

// Single endpoint for complete chatbot interaction
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const workerId = process.env.WORKER_ID;
    const flowId = process.env.FLOW_ID;
    const apiKey = process.env.BRAINBASE_API_KEY;
    
    if (!workerId || !flowId || !apiKey) {
      return res.status(500).json({ 
        error: 'Missing environment variables. Please set WORKER_ID, FLOW_ID, and BRAINBASE_API_KEY.' 
      });
    }
    
    // Create a new client
    const client = new BrainbaseClient(workerId, flowId, apiKey);
    
    // Set up response collection
    let initialResponse = '';
    let messageResponse = '';
    let isComplete = false;
    
    const messageHandler = (msg: string) => {
      // If we haven't received the initial message yet, store it
      if (!initialResponse) {
        initialResponse = msg;
      } else {
        // Otherwise, this is the response to our message
        messageResponse = msg;
      }
    };
    
    const streamHandler = (chunk: string) => {
      // If we already have an initial response, this is part of the message response
      if (initialResponse) {
        messageResponse += chunk;
      } else {
        initialResponse += chunk;
      }
    };
    
    const completeHandler = () => {
      isComplete = true;
    };
    
    client.on('message', messageHandler);
    client.on('stream', streamHandler);
    client.on('complete', completeHandler);
    client.on('error', (error) => {
      console.error('Client error:', error);
    });
    
    // Connect to Brainbase
    await client.connect();
    
    // Wait for initial message from the chatbot
    await new Promise<void>((resolve) => {
      const checkComplete = () => {
        if (isComplete || initialResponse) {
          resolve();
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      
      setTimeout(checkComplete, 500);
    });
    
    // Reset completion flag for the next message
    isComplete = false;
    
    // Send the user's message
    await client.sendMessage(message);
    
    // Wait for response to the message
    await new Promise<void>((resolve) => {
      const checkComplete = () => {
        if (isComplete || messageResponse) {
          resolve();
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      
      setTimeout(checkComplete, 500);
    });
    
    // Clean up
    client.disconnect();
    
    // Return the response
    res.json({
      response: messageResponse || 'No response received'
    });
  } catch (error) {
    const errorHandler = (err: any) => {
      console.error('Error in chatbot interaction:', err);
      res.status(500).json({ error: 'Failed to process message' });
    };
    errorHandler(error);
  }
});

// Polling endpoint for chat interaction
app.post('/api/chat/polling', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const workerId = process.env.WORKER_ID;
    const flowId = process.env.FLOW_ID;
    const apiKey = process.env.BRAINBASE_API_KEY;
    
    if (!workerId || !flowId || !apiKey) {
      return res.status(500).json({ 
        error: 'Missing environment variables. Please set WORKER_ID, FLOW_ID, and BRAINBASE_API_KEY.' 
      });
    }
    
    // Create a new client
    const client = new BrainbaseClient(workerId, flowId, apiKey);
    
    // Set up response collection
    let initialResponse = '';
    let messageResponse = '';
    let isComplete = false;
    
    const messageHandler = (msg: string) => {
      // If we haven't received the initial message yet, store it
      if (!initialResponse) {
        initialResponse = msg;
      } else {
        // Otherwise, this is the response to our message
        messageResponse = msg;
      }
    };
    
    const streamHandler = (chunk: string) => {
      // If we already have an initial response, this is part of the message response
      if (initialResponse) {
        messageResponse += chunk;
      } else {
        initialResponse += chunk;
      }
    };
    
    const completeHandler = () => {
      isComplete = true;
    };
    
    client.on('message', messageHandler);
    client.on('stream', streamHandler);
    client.on('complete', completeHandler);
    client.on('error', (error) => {
      console.error('Client error:', error);
    });
    
    // Connect to Brainbase
    await client.connect();
    
    // Store job in Supabase
    let jobId = null;
    
    if (supabase) {
      try {
        const timestamp = new Date().toISOString();
        const { data, error } = await supabase
          .from('jobs')
          .insert([
            { 
              message, 
              status: 'processing',
              created_at: timestamp,
              updated_at: timestamp
            }
          ])
          .select();
        
        if (error) {
          console.error('Error storing job in Supabase:', error);
        } else if (data && data.length > 0) {
          jobId = data[0].id;
        }
      } catch (dbError) {
        console.error('Error interacting with Supabase:', dbError);
      }
    } else {
      console.warn('Supabase client not initialized. Job not stored.');
    }
    
    // Process the message asynchronously without waiting for a response
    if (jobId) {
      // Handle the message processing in the background
      client.sendMessage(message)
        .then(async () => {
          // Wait for the response to be complete
          await new Promise<void>((resolve) => {
            const checkComplete = () => {
              if (isComplete || messageResponse) {
                resolve();
              } else {
                setTimeout(checkComplete, 100);
              }
            };
            
            setTimeout(checkComplete, 500);
          });
          
          // Update job status to 'complete' in Supabase
          if (supabase) {
            try {
              const timestamp = new Date().toISOString();
              
              // First, check if the table has the response column
              const { data: tableInfo, error: tableError } = await supabase
                .from('jobs')
                .select('*')
                .limit(1);
              
              let updateData: any = { 
                status: 'complete',
                updated_at: timestamp
              };
              
              // Only include response field if it exists in the schema
              if (!tableError && tableInfo && tableInfo.length > 0) {
                const sampleRow = tableInfo[0];
                if ('response' in sampleRow) {
                  updateData.response = messageResponse || initialResponse;
                } else {
                  console.warn("The 'response' column doesn't exist in the jobs table. Skipping response update.");
                }
              }
              
              const { error } = await supabase
                .from('jobs')
                .update(updateData)
                .eq('id', jobId);
              
              if (error) {
                console.error('Error updating job status in Supabase:', error);
              } else {
                console.log(`Job ${jobId} marked as complete`);
              }
            } catch (dbError) {
              console.error('Error updating job in Supabase:', dbError);
            }
          }
          
          // Clean up
          client.disconnect();
        })
        .catch(async (error) => {
          console.error('Error sending message in polling endpoint:', error);
          
          // Update job status to 'error' in Supabase
          if (supabase) {
            try {
              const timestamp = new Date().toISOString();
              
              // First, check if the table has the error_message column
              const { data: tableInfo, error: tableError } = await supabase
                .from('jobs')
                .select('*')
                .limit(1);
              
              let updateData: any = { 
                status: 'error',
                updated_at: timestamp
              };
              
              // Only include error_message field if it exists in the schema
              if (!tableError && tableInfo && tableInfo.length > 0) {
                const sampleRow = tableInfo[0];
                if ('error_message' in sampleRow) {
                  updateData.error_message = error.message || 'Unknown error';
                } else {
                  console.warn("The 'error_message' column doesn't exist in the jobs table. Skipping error message update.");
                }
              }
              
              const { error: dbError } = await supabase
                .from('jobs')
                .update(updateData)
                .eq('id', jobId);
              
              if (dbError) {
                console.error('Error updating job error status in Supabase:', dbError);
              } else {
                console.log(`Job ${jobId} marked as error`);
              }
            } catch (updateError) {
              console.error('Error updating job error status in Supabase:', updateError);
            }
          }
          
          // Clean up
          client.disconnect();
        });
    } else {
      // If we couldn't store the job in Supabase, still process the message
      client.sendMessage(message).catch(error => {
        console.error('Error sending message in polling endpoint:', error);
      });
    }
    
    // Return with "ok" status and job ID if available
    res.json({ 
      status: 'ok',
      jobId
    });
  } catch (error) {
    const errorHandler = (err: any) => {
      console.error('Error in polling chatbot interaction:', err);
      res.status(500).json({ error: 'Failed to process message' });
    };
    errorHandler(error);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Job status endpoint
app.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }
    
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client not initialized' });
    }
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) {
      console.error('Error fetching job from Supabase:', error);
      return res.status(500).json({ error: 'Failed to fetch job information' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(data);
  } catch (error) {
    const errorHandler = (err: any) => {
      console.error('Error fetching job status:', err);
      res.status(500).json({ error: 'Failed to fetch job status' });
    };
    errorHandler(error);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to use the chat interface`);
}); 