/**
 * Express middleware for the MCP Authentication Demo Server
 */
import { Request, Response, NextFunction } from 'express';
import { jwtDecode } from 'jwt-decode';
import { authorizeWithToken } from './authorization.js';
import { CONFIG } from '../config/config.js';

/**
 * Interface for JWT token claims
 */
interface JwtTokenClaims {
  sub?: string;
  scope?: string;
  [key: string]: any;
}

/**
 * Authentication middleware for MCP requests
 * 
 * Extracts and verifies both user and client tokens
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip auth for OPTIONS requests (for CORS)
  console.log("Auth middleware");
  console.log("Request method:", req.method);
  
  if (req.method === 'OPTIONS') {
    next();
    return;
  }

  try {
    // Extract user token from Authorization header
    let userToken = req.headers.authorization as string;
    if (userToken) {
      userToken = userToken.replace('Bearer ', '');
    }
    
    if (!userToken) {
      res.status(401).json({
        error: 'User token required'
      });
      return;
    }

    // Extract client token from custom header
    let clientToken = req.headers['x-client-authorization'] as string;
    if (clientToken && typeof clientToken === 'string') {
      clientToken = clientToken.replace('Bearer ', '');
      
      // Verify client is authorized to connect to the MCP server
      const isAuthorized = await authorizeWithToken({
        accessToken: clientToken,
        actionId: 'connect',
        resourceType: 'MCP::Server',
        resourceName: CONFIG.SERVER.NAME,
      });
      
      if (!isAuthorized) {
        res.status(403).json({
          error: 'Client not authorized to connect to MCP server'
        });
        return;
      }
    }

    // Decode token to get client ID and scopes
    const decoded = jwtDecode<JwtTokenClaims>(clientToken);
    console.log("Decoded token:", decoded);
    
    // Extract scopes from the token
    let scopes: string[] = [];
    if (decoded.scope) {
      // Typically scopes are space-delimited in JWT tokens
      scopes = decoded.scope.split(' ');
    }
    
    console.log("Extracted scopes:", scopes);

    // Store authentication info for later use
    req.auth = {
      token: clientToken,
      scopes: scopes,
      clientId: decoded?.sub || "",
      extra: {
        userToken: userToken,
      }
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed'
    });
  }
}
