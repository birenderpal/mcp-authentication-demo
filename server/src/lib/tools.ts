/**
 * Tool implementations for the MCP Authentication Demo Server
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { exchangeTokenForCredentials } from './credentialExchange.js';
import { 
  S3Client, 
  ListBucketsCommand,
  ListObjectsV2Command 
} from '@aws-sdk/client-s3';
import { 
  DynamoDBClient, 
  ListTablesCommand 
} from '@aws-sdk/client-dynamodb';
import { S3TablesClient,ListTableBucketsCommand } from '@aws-sdk/client-s3tables';
import { CONFIG } from '../config/config.js';

/**
 * Register all tools with the MCP server
 * 
 * @param server - The MCP server instance
 */
export function registerTools(server: McpServer): void {
  s3BucketTools(server);
  dynamoDBTools(server);
}

/**
 * Register S3-related tools
 * 
 * @param server - The MCP server instance
 */
function s3BucketTools(server: McpServer): void {
  // List S3 buckets
  server.tool(
    "listS3Buckets",
    {},
    async (_, extra) => {
      console.log("Tool Called: listS3Buckets");
      
      try {
        // Get user token from auth info
        const userToken = extra?.authInfo?.extra?.userToken as string;
        if (!userToken) {
          throw new Error('User token not available');
        }
        
        // Exchange token for AWS credentials
        const credentials = await exchangeTokenForCredentials(userToken);
        
        // Create S3 client with temporary credentials
        const config ={
          region: CONFIG.AWS.REGION,
          credentials: credentials
       
        }
    
        const s3Client = new S3Client({ region: CONFIG.AWS.REGION, credentials: credentials});
        
        // List buckets
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);
        
        const bucketList = response.Buckets?.map(bucket => bucket.Name).join('\\n') || 'No buckets found';
        
        return {
          content: [{
            type: "text",
            text: `S3 Buckets:\\n${bucketList}`
          }]
        };
      } catch (error) {
        console.error('Error in listS3Buckets tool:', error);
        return {
          content: [{ type: "text", text: `Error listing S3 buckets: ${(error as Error).message}` }],
          isError: true
        };
      }
    }
  );
  
  // List objects in an S3 bucket
  server.tool(
    "listS3Objects",
    {
      bucketName: z.string(),
      prefix: z.string().optional()
    },
    async (args, extra) => {
      console.log("Tool Called: listS3Objects");
      console.log("Arguments:", args);
      
      try {
        // Get user token from auth info
        const userToken = extra?.authInfo?.extra?.userToken as string;
        if (!userToken) {
          throw new Error('User token not available');
        }
        
        // Exchange token for AWS credentials
        const credentials = await exchangeTokenForCredentials(userToken);
        
        // Create S3 client with temporary credentials
        const s3Client = new S3Client({
          region: CONFIG.AWS.REGION,
          credentials: credentials
        });
        
        // List objects
        const command = new ListObjectsV2Command({
          Bucket: args.bucketName,
          Prefix: args.prefix
        });
        
        const response = await s3Client.send(command);
        
        const objectList = response.Contents?.map(object => object.Key).join('\\n') || 'No objects found';
        
        return {
          content: [{
            type: "text",
            text: `Objects in ${args.bucketName}${args.prefix ? ` with prefix ${args.prefix}` : ''}:\\n${objectList}`
          }]
        };
      } catch (error) {
        console.error('Error in listS3Objects tool:', error);
        return {
          content: [{ type: "text", text: `Error listing S3 objects: ${(error as Error).message}` }],
          isError: true
        };
      }
    }
  );
}

/**
 * Register DynamoDB-related tools
 * 
 * @param server - The MCP server instance
 */
function dynamoDBTools(server: McpServer): void {
  server.tool(
    'listDynamoDBTables',
    {},
    async (_, extra) => {
      console.log("Tool Called: listDynamoDBTables");
      
      try {
        // Get user token from auth info
        const userToken = extra?.authInfo?.extra?.userToken as string;
        if (!userToken) {
          throw new Error('User token not available');
        }
        
        // Exchange token for AWS credentials
        const credentials = await exchangeTokenForCredentials(userToken);
        
        // Create DynamoDB client with temporary credentials
        const dynamoClient = new DynamoDBClient({
          region: CONFIG.AWS.REGION,
          credentials: credentials
        });
        
        // List tables
        const command = new ListTablesCommand({});
        const response = await dynamoClient.send(command);
        
        const tableList = response.TableNames?.join('\\n') || 'No tables found';
        
        return {
          content: [{
            type: "text",
            text: `DynamoDB Tables:\\n${tableList}`
          }]
        };
      } catch (error) {
        console.error('Error in listDynamoDBTables tool:', error);
        console.log(`Error details:', ${(error as Error).message}`);
        return {
          content: [{ type: "text", text: `Error listing DynamoDB tables: ${(error as Error).message}` }],
          isError: true
        };
      }
    }
  );
}

function s3TablesTools(server: McpServer): void {
  server.tool(
    'listS3TablesBuckets',
    {},
    async (_, extra) => {
      console.log("Tool Called: listS3TablesBuckets");

      try {
        // Get user token from auth info
        const userToken = extra?.authInfo?.extra?.userToken as string;
        if (!userToken) {
          throw new Error('User token not available');
        }

        // Exchange token for AWS credentials
        const credentials = await exchangeTokenForCredentials(userToken);

        // Create S3Tables client with temporary credentials
        const s3TablesClient = new S3TablesClient({
          region: CONFIG.AWS.REGION,
          credentials: credentials
        });

        // List buckets
        const command = new ListTableBucketsCommand({});
        const response = await s3TablesClient.send(command);
        const bucketList = response.tableBuckets?.map(bucket => bucket.name).join('\\n') || 'No buckets found';
        return {
          content: [{
            type: "text",
            text: `S3Tables Buckets:\\n${bucketList}`
          }]
        };
      } catch (error) {
        console.error('Error in listS3TablesBuckets tool:', error);
        return {
          content: [{ type: "text", text: `Error listing S3Tables buckets: ${(error as Error).message}` }],
          isError: true
        };
      }
    }
  );
}