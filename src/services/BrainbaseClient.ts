import WebSocket from 'ws';
import { EventEmitter } from 'events';

interface BrainbaseMessage {
  action: string;
  data: any;
}

export class BrainbaseClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private streamBuffer: string = '';
  private isConnected: boolean = false;

  constructor(
    private workerId: string,
    private flowId: string,
    private apiKey: string,
    private host: string = 'wss://brainbase-engine-python.onrender.com'
  ) {
    super();
    this.url = `${this.host}/${this.workerId}/${this.flowId}?api_key=${this.apiKey}`;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          console.log(`Connected to ${this.url}`);
          this.isConnected = true;
          this.initialize();
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
        });

        this.ws.on('close', () => {
          console.log('WebSocket connection closed');
          this.isConnected = false;
          this.emit('disconnected');
        });
      } catch (error) {
        const errorHandler = (err: any) => {
          console.error('Error connecting to Brainbase:', err);
          reject(err);
        };
        errorHandler(error);
      }
    });
  }

  public async sendMessage(message: string): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to Brainbase');
    }

    const chatMessage: BrainbaseMessage = {
      action: 'message',
      data: { message }
    };

    try {
      this.ws.send(JSON.stringify(chatMessage));
    } catch (error) {
      const errorHandler = (err: any) => {
        console.error('Failed to send message:', err);
        throw err;
      };
      errorHandler(error);
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  private initialize(): void {
    const initData = {
      streaming: true,
      deploymentType: process.env.DEPLOYMENT_TYPE || 'production'
    };

    const initMessage: BrainbaseMessage = {
      action: 'initialize',
      data: JSON.stringify(initData)
    };

    if (this.ws) {
      this.ws.send(JSON.stringify(initMessage));
      console.log('Initialization message sent.');
    }
  }

  private handleMessage(messageData: string): void {
    try {
      const messageObj = JSON.parse(messageData) as BrainbaseMessage;
      const action = messageObj.action;

      switch (action) {
        case 'message':
        case 'response':
          // Regular non-streaming message
          this.streamBuffer = '';
          this.emit('message', messageObj.data.message);
          break;

        case 'stream':
          // Handle streaming content
          const streamChunk = messageObj.data.message || '';
          this.streamBuffer += streamChunk;
          this.emit('stream', streamChunk);
          break;

        case 'function_call':
          this.streamBuffer = '';
          this.emit('function_call', messageObj.data.function);
          break;

        case 'error':
          this.streamBuffer = '';
          this.emit('error', messageObj.data.message);
          break;

        case 'done':
          // End of a streamed message
          if (this.streamBuffer) {
            this.emit('complete', this.streamBuffer);
            this.streamBuffer = '';
          }
          this.emit('done', messageObj.data);
          break;

        default:
          this.streamBuffer = '';
          this.emit('unknown', { action, data: messageObj.data });
          break;
      }
    } catch (error) {
      const errorHandler = (err: any) => {
        console.error('Error parsing message:', err);
        this.emit('error', 'Error parsing message from Brainbase');
      };
      errorHandler(error);
    }
  }
} 