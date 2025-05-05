/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useMcpClient } from '@/context/McpContext';
import { useToast } from '@/components/ToastContainer';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import Header from '@/components/Header';
import ClientSelector from '@/components/ClientSelector';
import ToolCard from '@/components/ToolCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent } from '@/components/Card';

export default function MCPClientPage() {
  const { clients, selectedClientId, selectClient, connectClient, isLoading } = useMcpClient();
  const { showToast } = useToast();

  const [tools, setTools] = useState<Tool[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);  
  const selectedClientMetadata = clients.find(c => c.clientId === selectedClientId);
  const activeClientRef = useRef<string|null>(null);
  
  useEffect(() => {
    return () => {
      if (selectedClientMetadata?.mcpClient && selectedClientMetadata.clientId === activeClientRef.current) {
        selectedClientMetadata.mcpClient.close().catch(err => {
          console.error('Error closing previous connection:', err);
        });
        activeClientRef.current = null;
      }
    };
  }, [selectedClientId]);

  const handleSelectClient = (clientId: string) => {
    selectClient(clientId);
    setTools([]);
  };

  const handleConnect = async () => {
    if (!selectedClientId) return;

    try {
      setIsConnecting(true);
      await connectClient(selectedClientId);
      activeClientRef.current = selectedClientId;
      const clientMetadata = clients.find(c => c.clientId === selectedClientId);            
      if (clientMetadata) {
        const toolsResponse = await clientMetadata.mcpClient.listTools();
        setTools(toolsResponse);
        showToast('Connected and tools loaded!', 'success');
      }
    } catch (error) {
      console.error('Error connecting/fetching tools:', error);
      showToast('Failed to connect or fetch tools', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCallTool = async (toolName: string, inputs: Record<string, any>) => {
    if (!selectedClientMetadata) return;

    try {
      const result = await selectedClientMetadata.mcpClient.callTool(toolName, inputs);
      showToast(`Tool ${toolName} called successfully!`, 'success');
      console.log(`Tool ${toolName} result:`, result);
      return result;
    } catch (err) {
      console.error('Failed to call tool:', err);
      showToast(`Failed to call tool ${toolName}`, 'error');
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <LoadingSpinner size="large" className="mb-4" />
          <p className="text-gray-600">Loading MCP clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Header 
        title="MCP Authentication Demo" 
        subtitle="Connect to MCP servers and explore available tools"
      />

      <div className="grid grid-cols-1 gap-6">
        <ClientSelector
          clients={clients}
          selectedClientId={selectedClientId}
          onSelectClient={handleSelectClient}
          onConnect={handleConnect}
          isConnecting={isConnecting}
        />

        {selectedClientMetadata && selectedClientId && (
          <Card>
            <CardContent>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-800">
                    Client Name: {selectedClientMetadata.clientName}
                  </h3>
                  <div className="mt-1 text-sm text-gray-600">
                    <p>Client ID: {selectedClientMetadata.clientId}</p>
                  </div>
                  {tools.length > 0 && (
                    <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                      Connected
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {tools.length > 0 ? (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Available Tools</h2>
            <div className="space-y-4">
              {tools.map((tool) => (
                <ToolCard 
                  key={tool.name} 
                  tool={tool} 
                  onCallTool={handleCallTool} 
                />
              ))}
            </div>
          </div>
        ) : selectedClientId && !isConnecting ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-600">Connect to the MCP client to view available tools</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
