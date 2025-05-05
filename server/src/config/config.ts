/**
 * Configuration settings for the MCP Authentication Demo Server
 */

export const CONFIG = {
  // Server configuration
  SERVER: {
    NAME: "demoserver",
    VERSION: "1.0.0",
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 3001,
  },
  
  // AWS configuration
  AWS: {
    REGION: process.env.AWS_REGION || 'us-west-2',
    POLICY_STORE_ID: process.env.POLICY_STORE_ID || "your-avp-policy-store-id",
    COGNITO_IDENTITY_POOL_ID: process.env.COGNITO_IDENTITY_POOL_ID || "your-cognito-identity-pool-id",
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || "your-cognito-user-pool-id",    
  },
  
  // CORS configuration
  CORS: {
    ORIGIN: '*',
    ALLOWED_HEADERS: [
      'Authorization',
      'x-client-authorization',
      'Content-Type',
      'mcp-session-id'
    ],
    EXPOSED_HEADERS: [
      'mcp-session-id',
    ],
  }
};
