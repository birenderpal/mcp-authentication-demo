/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Button } from './Button';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import ToolResult from './ToolResult';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

interface ToolCardProps {
  tool: Tool;
  onCallTool: (toolName: string, inputs: Record<string, any>) => Promise<any>;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onCallTool }) => {
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleInputChange = (prop: string, value: string) => {
    setInputs(prev => ({
      ...prev,
      [prop]: value
    }));
  };

  const handleCallTool = async () => {
    setIsLoading(true);
    try {
      const result = await onCallTool(tool.name, inputs);
      setResult(result);
    } catch (error) {
      console.error('Error calling tool:', error);
      setResult({ isError: true, error: { message: error instanceof Error ? error.message : 'Unknown error' } });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <div 
        className="flex justify-between items-center cursor-pointer px-6 pt-6"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardHeader className="p-0">
          <CardTitle>{tool.name}</CardTitle>
          <CardDescription>{tool.description}</CardDescription>
        </CardHeader>
        <div className="text-gray-500">
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          <CardContent className="pt-4">
            {tool.inputSchema?.properties && Object.keys(tool.inputSchema.properties).length > 0 ? (
              <div className="space-y-4">
                {Object.keys(tool.inputSchema.properties).map((prop) => (
                  <div key={prop} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">{prop}</label>
                    <input
                      type="text"
                      className="border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      value={inputs[prop] ?? ''}
                      onChange={(e) => handleInputChange(prop, e.target.value)}
                      placeholder={`Enter ${prop}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">This tool doesn&apos;t require any inputs.</p>
            )}
          </CardContent>

          <CardFooter className="justify-end">
            <Button
              onClick={handleCallTool}
              disabled={isLoading}
              variant="default"
            >
              {isLoading ? 'Calling...' : 'Call Tool'}
            </Button>
          </CardFooter>

          {result && (
            <CardContent className="pt-0">
              <ToolResult result={result} />
            </CardContent>
          )}
        </>
      )}
    </Card>
  );
};

export default ToolCard;
