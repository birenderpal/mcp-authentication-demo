/**
 * MCP Authentication Demo Server
 * 
 * Main entry point for the server that demonstrates MCP authentication
 * with AWS Verified Permissions and Cognito credential exchange.
 */
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { isInitializeRequest, JSONRPCMessage, ListToolsRequestSchema, ListToolsResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import cors from 'cors';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Import custom modules
import { CONFIG } from './config/config.js';
import { authMiddleware } from './lib/middleware.js';
import { registerTools } from './lib/tools.js';
import { authorizeWithToken } from './lib/authorization.js';

// Add auth info to Express Request
declare global {
  namespace Express {
    interface Request {
      auth?: AuthInfo;
    }
  }
}

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors({
  origin: CONFIG.CORS.ORIGIN,
  allowedHeaders: CONFIG.CORS.ALLOWED_HEADERS,
  exposedHeaders: CONFIG.CORS.EXPOSED_HEADERS,
}));

// Initialize MCP server
const server = new McpServer({
  name: CONFIG.SERVER.NAME,
  version: CONFIG.SERVER.VERSION
});

// Register all tools
registerTools(server);

// Schema for empty object
const EMPTY_OBJECT_JSON_SCHEMA = {
  type: "object" as const,
};

// Register custom handler for listing tools with authorization
server.server.setRequestHandler(
  ListToolsRequestSchema,
  async (req, extra): Promise<ListToolsResult> => {
    const authInfo = extra.authInfo;    
    
    const allTools = await Promise.all(Object.entries(server["_registeredTools"]).map(
      async ([name, tool]: [string, any]) => {
        const isAuthorized = await authorizeWithToken({
          accessToken: authInfo?.token || '',
          actionId: 'call',
          resourceType: 'MCP::Tool',
          resourceName: name,
        });
        
        if ((tool as Tool).enabled && isAuthorized) {
          return {
            tool: {
              name,
              description: tool.description,
              inputSchema: tool.inputSchema
                ? (zodToJsonSchema(tool.inputSchema, {
                  strictUnions: true,
                }) as any)
                : EMPTY_OBJECT_JSON_SCHEMA,
            },
            isAllowed: true
          };
        } else {
          return { tool, isAllowed: false };
        }
      }
    ));

    const allowedTools = allTools.filter(tool => tool.isAllowed);
    return { tools: allowedTools.map(({ tool }) => tool) };
  }
);

// Apply authentication middleware
app.use('/mcp', authMiddleware);

// Handle requests with auth
async function handleRequestWithAuth(
  transport: StreamableHTTPServerTransport,
  req: express.Request & { auth?: AuthInfo },
  res: express.Response,
  body?: unknown
) {
  // Store the original onmessage handler
  const originalOnmessage = transport.onmessage;
  
  // Create a wrapper function that will be called for each message
  const messageHandler = (message: JSONRPCMessage) => {
    // If there's an original handler, call it with the auth info
    if (originalOnmessage) {
      // We need to access the internal implementation of the protocol      
      //@ts-expect-error
      originalOnmessage(message, { authInfo: req.auth });
    }
  };

  // Replace the onmessage handler temporarily
  transport.onmessage = messageHandler;

  try {
    
    await transport.handleRequest(req, res, body);
  } finally {
    // Restore the original handler
    transport.onmessage = originalOnmessage;
  }
}

// MCP handler with stateful sessions
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

app.post('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          console.log(`Session initialized with ID: ${sessionId}`);
          transports[sessionId] = transport;
        }
      });

      // Clean up transport when closed
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {          
          delete transports[sid];
        }
      };
      
      // Connect to the MCP server
      await server.connect(transport);
      await handleRequestWithAuth(transport, req, res, req.body);
      return; 
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }
    
    await handleRequestWithAuth(transport, req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Handle session requests
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;  
  
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

// Start the server
app.listen(CONFIG.SERVER.PORT, () => {
  console.log(`MCP Server listening on port ${CONFIG.SERVER.PORT}`);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');

  // Close all active transports to properly clean up resources
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  
  console.log('Server shutdown complete');
  process.exit(0);
});
