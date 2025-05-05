'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useMemo } from 'react';
import ToastProvider from '@/components/ToastContainer';
import amplifyConfig from '@/amplify_outputs.json'
import { McpClientProvider } from "@/context/McpContext";
import { fetchAuthSession } from 'aws-amplify/auth';
const inter = Inter({ subsets: ['latin'] });

// Configure Amplify in the client side
const configureAmplify = () => {
  // We need to dynamically import config to avoid SSR issues    
  Amplify.configure(amplifyConfig, {
    ssr: true
  });
};
const fetchUserAccessToken = async ()=>{
    const user = await fetchAuthSession();
    if (!user) {
      throw new Error('User not authenticated');
    }
    const userToken = user.tokens?.accessToken.toString()
    return userToken;
  }


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Configure Amplify only on the client side
  useMemo(() => {
    if (typeof window !== 'undefined') {
      configureAmplify();
      
    }
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const userToken = fetchUserAccessToken();
  

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
      <McpClientProvider serverUrl="http://localhost:3001/mcp">
        <ToastProvider>
          <Authenticator>
            {({ signOut }) => (
              <div>
                <header className="bg-blue-600 text-white p-4">
                  <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-lg font-bold">MCP Client Application</h1>
                    <button 
                      onClick={signOut}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Sign Out
                    </button>
                  </div>
                </header>
                <main>{children}</main>
              </div>
            )}
          </Authenticator>
        </ToastProvider>
        </McpClientProvider>
      </body>
    </html>
  );
}