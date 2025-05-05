/**
 * Credential exchange service for obtaining AWS credentials from Cognito tokens
 */
import { 
  CognitoIdentityClient, 
  GetCredentialsForIdentityCommand,
  GetIdCommand 
} from "@aws-sdk/client-cognito-identity";
import { CONFIG } from '../config/config.js';

// Cognito Identity client
const cognitoIdentityClient = new CognitoIdentityClient({ 
  region: CONFIG.AWS.REGION 
});
const COGNITO_PROVIDER = `cognito-idp.${CONFIG.AWS.REGION}.amazonaws.com/${CONFIG.AWS.COGNITO_USER_POOL_ID}`
/**
 * Exchange a user token for temporary AWS credentials
 * 
 * @param userToken - The user's access or ID token from Cognito
 * @returns Promise resolving to AWS credentials
 */
export async function exchangeTokenForCredentials(userToken: string) {
  try {
    console.log('Exchanging token for AWS credentials');
    
    // Step 1: Get Cognito Identity ID using the token
    
    const getIdCommand = new GetIdCommand({
      IdentityPoolId: CONFIG.AWS.COGNITO_IDENTITY_POOL_ID,
      Logins: {
        // The key depends on your Cognito setup (e.g., your User Pool domain)
        [COGNITO_PROVIDER]: userToken
      }
    });
    
    const identityResponse = await cognitoIdentityClient.send(getIdCommand);
    const identityId = identityResponse.IdentityId;
    
    if (!identityId) {
      throw new Error('Failed to obtain identity ID');
    }
    
    // Step 2: Get temporary credentials using the Identity ID
    const getCredentialsCommand = new GetCredentialsForIdentityCommand({
      IdentityId: identityId,
      Logins: {
        [COGNITO_PROVIDER]: userToken
      }
    });
    
    const credentialsResponse = await cognitoIdentityClient.send(getCredentialsCommand);
    const credentials = credentialsResponse.Credentials;
    
    if (!credentials) {
      throw new Error('Failed to obtain AWS credentials');
    }
    
    console.log('Successfully obtained temporary AWS credentials');
    
    // Return credentials in a format suitable for AWS SDK
    return {
      accessKeyId: credentials.AccessKeyId as string,
      secretAccessKey: credentials.SecretKey as string,
      sessionToken: credentials.SessionToken as string,      
    };
  } catch (error) {
    console.error('Error exchanging token for credentials:', error);
    throw new Error('Failed to exchange token for AWS credentials');
  }
}
