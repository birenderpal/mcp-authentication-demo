'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { McpClient } from '@/lib/mcpClient'
import amplifyConfig from '@/amplify_outputs.json';
import { fetchAuthSession } from 'aws-amplify/auth';

interface McpClientMetadata {
  clientId: string;
  clientName: string;
  mcpClient: McpClient;
  connected: boolean;
  clientAuthToken: string;
}

interface McpContextType {
  clients: McpClientMetadata[];
  selectedClientId: string | null;
  selectClient: (clientId: string) => void;
  connectClient: (clientId: string) => Promise<void>;
  isLoading: boolean;
}

const McpContext = createContext<McpContextType | undefined>(undefined);

interface McpClientProviderProps {
  children: React.ReactNode;
  serverUrl: string;
}

const appClientsConfig = [...amplifyConfig.custom.clients];
const tokenEndpoint = amplifyConfig.custom.tokenEndpoint;

// Fetch user token from Amplify Auth
async function fetchUserToken() {
  const user = await fetchAuthSession();
  const userToken = user.tokens?.idToken?.toString()
  if (!userToken) {
    throw new Error('User token not found');
  }
  return userToken;
}

// Fetch app client token
async function fetchTokenForClient(clientId: string, clientSecret: string): Promise<string> {
  const encodedCredentials = btoa(`${clientId}:${clientSecret}`);
  const tokenResponse = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${encodedCredentials}`
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get client access token: ${tokenResponse.status} ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

export const McpClientProvider = ({ children, serverUrl }: McpClientProviderProps) => {
  const [clients, setClients] = useState<McpClientMetadata[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  React.useEffect(() => {
    async function initializeClients() {
      try {
        setIsLoading(true);
        
        const createdClients: McpClientMetadata[] = [];

        for (const client of appClientsConfig) {
          const appClientToken = await fetchTokenForClient(client.clientId, client.clientSecret);

          const mcpClient = new McpClient(
            serverUrl,
            client.clientName,
          );

          createdClients.push({
            clientId: client.clientId,
            clientName: client.clientName,
            mcpClient,
            connected: false,
            clientAuthToken: appClientToken,
          });
        }

        setClients(createdClients);
      } catch (err) {
        console.error('Failed to initialize MCP clients', err);
      } finally {
        setIsLoading(false);
      }
    }

    initializeClients();
  }, [serverUrl]);

  const selectClient = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const connectClient = useCallback(async (clientId: string) => {
    const clientMetadata = clients.find(c => c.clientId === clientId);
    if (!clientMetadata) {
      throw new Error(`MCP client not found for clientId ${clientId}`);
    }

    const userToken = await fetchUserToken(); 
    if (!userToken) {
      throw new Error('User token not found');
    }
    const clientToken = clientMetadata.clientAuthToken;

    await clientMetadata.mcpClient.connect(userToken,clientToken);

    setClients(prev => {
      return prev.map(c => c.clientId === clientId ? { ...c, connected: true } : c);
    });
    
  }, [clients]);

  return (
    <McpContext.Provider value={{ clients, selectedClientId, selectClient, connectClient, isLoading }}>
      {children}
    </McpContext.Provider>
  );
};

export function useMcpClient() {
  const context = useContext(McpContext);
  if (!context) {
    throw new Error('useMcpClient must be used within a McpClientProvider');
  }
  return context;
}
