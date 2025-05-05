import { VerifiedPermissionsClient, IsAuthorizedWithTokenCommand } from "@aws-sdk/client-verifiedpermissions";
import { CONFIG } from '../config/config.js';

/**
 * AWS Verified Permissions client for authorization checks
 */
const vpClient = new VerifiedPermissionsClient({
    region: CONFIG.AWS.REGION,
});

/**
 * Input parameters for token-based authorization
 */
export interface AuthorizeWithTokenInput {
    accessToken: string;
    actionId: string;
    resourceType: 'MCP::Server' | 'MCP::Tool';
    resourceName: string;
}

/**
 * Authorizes a request using AWS Verified Permissions with a token
 * 
 * @param input - Authorization input parameters
 * @returns Promise resolving to boolean indicating if the request is authorized
 */
export async function authorizeWithToken(input: AuthorizeWithTokenInput): Promise<boolean> {
    try {
        // Construct full resource ID as per scope style
        let resourceEntityId = '';
        console.log('Authorization request:', input);
        
        if (input.resourceType === 'MCP::Server') {
            resourceEntityId = `mcp/${input.resourceName}:connect`;
        } else if (input.resourceType === 'MCP::Tool') {
            resourceEntityId = `mcp/tool:${input.resourceName}`;
        } else {
            throw new Error(`Unsupported resourceType: ${input.resourceType}`);
        }
        
        const entityList = [{
            'identifier': { 'entityType': input.resourceType, 'entityId': resourceEntityId },
            attributes: {
                entityId: {
                    string: resourceEntityId
                }
            }
        }];
        
        const command = new IsAuthorizedWithTokenCommand({
            policyStoreId: CONFIG.AWS.POLICY_STORE_ID,
            accessToken: input.accessToken,
            action: {
                actionType: "MCP::Action",
                actionId: input.actionId,
            },
            resource: {
                entityType: input.resourceType,
                entityId: resourceEntityId,
            },
            entities: { entityList },
        });
        
        console.log('Authorization command:', command);
        const result = await vpClient.send(command);
        console.log('Authorization result:', result.decision);

        return result.decision === "ALLOW";
    } catch (error) {
        console.error('Authorization service error:', error);
        throw new Error('Authorization service error');
    }
}
