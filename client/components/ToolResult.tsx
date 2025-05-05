import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import React from 'react';
import Image from 'next/image';
interface ToolResultProps {
    result: CallToolResult
}

const ToolResult: React.FC<ToolResultProps> = ({ result }) => {    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderContent = (content: any) => {
        if (content.type === 'text') {
            return <div className="whitespace-pre-wrap">{content.text}</div>;
        } else if (content.type === 'json') {
            try {
                return (
                    <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-96 text-sm">
                        {JSON.stringify(JSON.parse(content.json), null, 2)}
                    </pre>
                );
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {
                return <pre className="bg-gray-100 p-3 rounded overflow-auto">{content.json}</pre>;
            }
        } else if (content.type === 'image' && content.url) {
            return (
                <div className="mt-2">
                    <Image src={content.url} alt="Tool result" className="max-w-full h-auto rounded" />
                </div>
            );
        } else {
            return <div className="text-gray-500">Content type: {content.type}</div>;
        }
    };

    return (
        <div className="bg-white shadow-md rounded-lg p-4 mt-4">
            <h3 className="text-lg font-semibold mb-2">Tool Result</h3>

            {result.isError ? (
                <div className="bg-red-100 text-red-800 p-3 rounded">
                    <p>Error: {result.content[0].text as string || 'Unknown error'}</p>
                </div>
            ) : (
                <div>
                    {result.content && result.content.length > 0 ? (
                        <div className="space-y-3">
                            {result.content.map((item, index) => (
                                <div key={index}>
                                    {renderContent(item)}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No content in response</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ToolResult;
