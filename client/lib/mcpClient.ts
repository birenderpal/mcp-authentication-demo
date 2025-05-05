/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

interface BedrockToolResponse {
  toolUseId: string | null;
  content: Array<{ text: string }>;
  status: 'success' | 'error';
}

export class McpClient {
  private transport: StreamableHTTPClientTransport | null = null;
  private client: Client | null = null;
  private serverUrl: URL;
  private isConnected = false;
  private name: string;
  private userToken: string | null = null;
  private clientToken: string | null = null;
  

  constructor(serverUrl: string, name: string) {
    this.serverUrl = new URL(serverUrl);
    this.name = name || "mcp-client";
    
    // Try to get the token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.userToken = localStorage.getItem('mcp_auth_token')||null;
      this.clientToken = localStorage.getItem('mcp_client_token')||null;
    }
    
    console.log(`McpClient initialized with URL: ${serverUrl}`);
    
    // Initialize client
    this.client = new Client(
      {
        name: this.name,
        version: "1.0.0"
      }
    );
  }

   
  async connect(userToken:string,clientToken:string): Promise<void> {
      if (!this.client) {
        this.client = new Client({
          name: this.name,
          version: "1.0.0"
        });
      }
      this.transport = new StreamableHTTPClientTransport(
        this.serverUrl,
        {
          requestInit: {
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'x-client-authorization': clientToken
            }
          }
        }
      );
      
      await this.client.connect(this.transport);      
      this.isConnected = true;
  }

  async listTools(): Promise<Tool[]> {
    if (!this.isConnected || !this.client) {
      throw new Error("Not connected to server");
    }

    try {
      const result = await this.client.listTools();
      console.log("Available tools:", result.tools.map(t => t.name));
      return result.tools;
    } catch (error) {
      console.error("Error listing tools:", error);
      throw error;
    }
  }

  public async callTool(name: string, args: Record<string, any>): Promise<CallToolResult> {
    if (!this.client) {
      throw new Error("Client not connected");
    }

    console.log(`Calling tool: ${name}`);
    console.debug(`Tool arguments:`, args);

    try {
      const response = await this.client.callTool({
        name,
        arguments: args
      }) as CallToolResult;

      console.debug("Tool call response:", response);
      return response;
    } catch (error) {
      console.error(`Error calling tool ${name}:`, error);
      throw error;
    }
  }
  
  // Format the tool response to match the Bedrock format
  async formatToolResponse(response: CallToolResult): Promise<BedrockToolResponse> {
    const isError = response.isError;
    // Initialize the tool response structure
    const toolResponse: BedrockToolResponse = {
      toolUseId: null, // To be filled by the Bedrock client
      content: [],
      status: isError ? 'error' : 'success',
    };
    // Process response      
    const textResponse = response.content
      .filter((item) => item.type === 'text' && 'text' in item)
      .map((item) => (item as { text: string }).text)
      .join('\n');

    if (textResponse) {
      toolResponse.content.push({ text: textResponse });
    }

    return toolResponse;
  }
  
  async listResources(): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error("Not connected to server");
    }
  
    try {
      const result = await this.client.listResources();
      console.log("Available resources:", result.resources);
      return result.resources; // Return the full resource objects
    } catch (error) {
      console.error("Error listing resources:", error);
      throw error;
    }
  }
  
  async readResource(uri: string): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error("Not connected to server");
    }

    try {
      console.log(`Reading resource: ${uri}`);
      const result = await this.client.readResource({ uri });
      console.log(`Resource ${uri} read successfully`);
      return result;
    } catch (error) {
      console.error(`Error reading resource ${uri}:`, error);
      throw error;
    }
  }
  
  async listPrompts(): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error("Not connected to server");
    }

    try {
      const result = await this.client.listPrompts();
      console.log("Available prompts:", result.prompts);
      return result.prompts;
    } catch (error) {
      console.error("Error listing prompts:", error);
      throw error;
    }
  }
  
  async getPrompt(name: string, args?: Record<string, string>): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error("Not connected to server");
    }

    try {
      console.log(`Getting prompt: ${name} with args:`, args);
      const result = await this.client.getPrompt({ 
        name,
        arguments: args
      });
      console.log(`Prompt ${name} retrieved successfully:`, result);
      return result;
    } catch (error) {
      console.error(`Error getting prompt ${name}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
        this.isConnected = false;
        console.log("Transport closed");
      } catch (error) {
        console.error("Error closing transport:", error);
      }
    }
    
    this.client = null;
    this.transport = null;
  }
}