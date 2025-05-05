/**
 * Application configuration
 * 
 * This file centralizes all configuration values for the application.
 * Environment-specific configurations are defined here and selected
 * based on the NEXT_PUBLIC_APP_ENV environment variable.
 */

interface Config {
  mcp: {
    serverUrl: string;
  };
}

// Default configuration (development)
const defaultConfig: Config = {
  mcp: {
    serverUrl: 'http://localhost:3001/mcp',
  },
};

// Production configuration
const productionConfig: Config = {
  mcp: {
    serverUrl: process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'https://production-mcp-server.example.com/mcp',
  },
};

// Staging configuration
const stagingConfig: Config = {
  mcp: {
    serverUrl: process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'https://staging-mcp-server.example.com/mcp',
  },
};

/**
 * Determines which configuration to use based on the environment
 * Falls back to development config if environment is not specified
 */
const getConfig = (): Config => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    console.log(`Using ${process.env.NEXT_PUBLIC_APP_ENV || 'development'} configuration`);
  }
  
  switch (process.env.NEXT_PUBLIC_APP_ENV) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    default:
      return defaultConfig;
  }
};

// Export the configuration
const config = getConfig();
export default config;
