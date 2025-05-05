import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from './Button';

interface ClientSelectorProps {
  clients: Array<{
    clientId: string;
    clientName: string;
    connected: boolean;
  }>;
  selectedClientId: string | null;
  onSelectClient: (clientId: string) => void;
  onConnect: () => Promise<void>;
  isConnecting: boolean;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({
  clients,
  selectedClientId,
  onSelectClient,
  onConnect,
  isConnecting,
}) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Select MCP Client</CardTitle>
        <CardDescription>Choose a client to connect to the MCP server</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col">
          <label htmlFor="client-select" className="text-sm font-medium text-gray-700 mb-1">
            Available Clients
          </label>
          <select
            id="client-select"
            className="border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedClientId ?? ''}
            onChange={(e) => onSelectClient(e.target.value)}
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.clientId} value={client.clientId}>
                {client.clientName}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        {selectedClientId && (
          <Button
            onClick={onConnect}
            disabled={isConnecting}
            variant="default"
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ClientSelector;
