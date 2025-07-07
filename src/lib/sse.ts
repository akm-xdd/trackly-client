import { browser } from '$app/environment';
import { user } from './auth';
import { get } from 'svelte/store';

export type IssueEventHandler = (event: any) => void;

class SSEClient {
  private eventSource: EventSource | null = null;
  private handlers: Set<IssueEventHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

connect() {

  console.log('SSE connect() called');

  if (!browser) {
    console.log('Not in browser, skipping SSE');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token found, skipping SSE'); // DEBUG LOG
    return;
  }

  console.log('Attempting SSE connection with token'); 
  try {
    // Pass token as query parameter since EventSource doesn't support headers
    const url = `${import.meta.env.VITE_API_BASE_URL}/issues/events?token=${encodeURIComponent(token)}`;

    console.log('SSE URL:', url);
    
    this.eventSource = new EventSource(url); 

    this.eventSource.onopen = () => {
      console.log('SSE Connected');
      this.reconnectAttempts = 0;
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE Event received:', data);
        
        this.handlers.forEach(handler => {
          try {
            handler(data);
          } catch (err) {
            console.error('Error in SSE handler:', err);
          }
        });
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      this.handleReconnect();
    };

  } catch (err) {
    console.error('Failed to connect SSE:', err);
  }
}

  private handleReconnect() {
    this.disconnect();
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting SSE reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max SSE reconnect attempts reached');
    }
  }

  addHandler(handler: IssueEventHandler) {
    this.handlers.add(handler);
  }

  removeHandler(handler: IssueEventHandler) {
    this.handlers.delete(handler);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

export const sseClient = new SSEClient();