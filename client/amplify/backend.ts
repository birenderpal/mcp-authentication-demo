import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import  * as cognito from 'aws-cdk-lib/aws-cognito';
const backend = defineBackend({
  auth
});

const userPool = backend.auth.resources.userPool;
const serverConnectScope = new cognito.ResourceServerScope({
  scopeName: 'demoserver:connect',
  scopeDescription: 'Connect to MCP Server'
},
);
const toolListS3BucketScope = new cognito.ResourceServerScope({
  scopeName: 'tool:listS3Buckets',
  scopeDescription: 'Access to tool to list S3 Buckets'
},
);
const toolListDynamoDBTablesScope = new cognito.ResourceServerScope({
  scopeName: 'tool:listDynamoDBTables',
  scopeDescription: 'Access to list DynamoDB Tables'
},
);
const toolS3TablesScope = new cognito.ResourceServerScope({
  scopeName: 'tool:listS3TablesBuckets',
  scopeDescription: 'Access to List S3 tables bucket'
},
);

const resourceServer = userPool.addResourceServer('MCPResourceServer', {
  userPoolResourceServerName: 'mcp-server',
  identifier: 'mcp',
  scopes: [serverConnectScope,toolListS3BucketScope,toolListDynamoDBTablesScope,toolS3TablesScope]
})

resourceServer.stack.addDependency(userPool.stack)
const machineClient1 = userPool.addClient('MCPClient1', {
  userPoolClientName: 'mcp-client-1',
  generateSecret: true,
  authFlows: {
    userPassword: true,
    custom: true,
  },
  oAuth: {
    flows: {
      clientCredentials: true,
    },
    scopes: [
      cognito.OAuthScope.resourceServer(resourceServer, serverConnectScope),
      cognito.OAuthScope.resourceServer(resourceServer, toolListS3BucketScope)
    ],
  },
})
machineClient1.stack.addDependency(resourceServer.stack)

const machineClient2 = userPool.addClient('MCPClient2', {
  userPoolClientName: 'mcp-client-2',
  generateSecret: true,
  authFlows: {
    userPassword: true,
    custom: true,
  },
  oAuth: {
    flows: {
      clientCredentials: true,
    },
    scopes: [
      cognito.OAuthScope.resourceServer(resourceServer, serverConnectScope),
      cognito.OAuthScope.resourceServer(resourceServer, toolListDynamoDBTablesScope),
    ],
  },
})

machineClient2.stack.addDependency(resourceServer.stack)

const machineClient3 = userPool.addClient('MCPClient3', {
  userPoolClientName: 'mcp-client-3',
  generateSecret: true,
  authFlows: {
    userPassword: true,
    custom: true,
  },
  oAuth: {
    flows: {
      clientCredentials: true,
    },
    scopes: [
      cognito.OAuthScope.resourceServer(resourceServer, serverConnectScope),
      cognito.OAuthScope.resourceServer(resourceServer, toolListS3BucketScope),      
      cognito.OAuthScope.resourceServer(resourceServer, toolS3TablesScope)      
    ]    
  },
})

machineClient3.stack.addDependency(resourceServer.stack)
const uniquePrefix = `mcp-auth-demo-${Math.floor(Date.now() / 1000).toString().slice(-8)}`;

const domain = userPool.addDomain('MCPDomain', {
  cognitoDomain: {
    domainPrefix: uniquePrefix,
  },});

  domain.stack.addDependency(resourceServer.stack)
backend.addOutput({
  custom: {
    clients:[{
      clientId: machineClient1.userPoolClientId,
      clientName: machineClient1.userPoolClientName,
      clientSecret: machineClient1.userPoolClientSecret.unsafeUnwrap(),  
    },
    {
      clientId: machineClient2.userPoolClientId,
      clientName: machineClient2.userPoolClientName,
      clientSecret: machineClient2.userPoolClientSecret.unsafeUnwrap(),
    },
    {
      clientId: machineClient3.userPoolClientId,
      clientName: machineClient3.userPoolClientName,
      clientSecret: machineClient3.userPoolClientSecret.unsafeUnwrap(),
    }],  
    resourceServerIdentifier: "mcp",
    tokenEndpoint: `https://${domain.domainName}.auth.${userPool.stack.region}.amazoncognito.com/oauth2/token`
  },
});
