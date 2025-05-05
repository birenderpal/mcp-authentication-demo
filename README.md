
# 🔐 MCP Authorization Demo using Amazon Verified Permissions

This repo shows how to control access to [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) servers using **Amazon Verified Permissions (AVP)** and **OAuth2-based authentication with Cognito**.  

It's a working example where different clients (agentic apps) connect to an MCP server, but each client only gets access to the tools it's allowed to use. That control comes from scopes in their access token and policies defined in AVP.

---

## 🧭 Why this demo?

In enterprise settings, teams responsible for backend systems (like CRM, ERP, or fulfillment platforms) may expose their services via **MCP servers**, while separate teams build **agentic applications** that interact with them.


Take a CRM system as an example:
- The **CRM team** exposes tools (like get customer, update customer) through an MCP server.
- Different **agent apps** connect to that server — some might just fetch data, others might also update it.

Here’s where access control becomes important:
- You want to **control which client apps** can connect to your MCP server.
- And for those that can connect, you want to **limit which tools they can use**.
- On top of that, once a human user logs into the agent app, **they should only see the data they’re allowed to access** — for example, based on their region or role.

This demo shows how to do all that:
- **Client access** is controlled using OAuth scopes and AVP.
- **Tool-level access** is checked before sending the list of tools.
- **User-level data access** is based on Cognito identity + IAM role mapping.

---

## 🧠 What is MCP?

[MCP](https://modelcontextprotocol.io/introduction) is a protocol for making AI apps (like LLM agents) work better with tools and external systems. It gives you a standard way for:
- Discovering what tools are available
- Letting agents send tool calls (based on natural language intent)
- RInteract with tools via structured input/output


---

## ⚙️ How this works (high level)

```plaintext
+------------------+                     +-------------------+                     +-------------------------------+
|   Agent Client   |  -- client token -->|     MCP Server     | -- authorize -->   | Amazon Verified Permissions   |
|                  |  -- user token ---->|                   | -- context+scope -->| (Policy Store + Cognito)      |
+------------------+                     +-------------------+                     +-------------------------------+
      |                                          |
      |----------- listTools ------------------->| (scopes filtered via AVP)
      |<---------- allowed tools ----------------|
      |----------- callTool(tool) -------------->| (user ID token → AWS credentials)
```

---

## 📁 Project Structure

This repo has both client and server:

```
.
├── client/                          # Next.js app with Amplify Gen2
│   ├── amplify/                     # Amplify backend setup
│   ├── amplify.yaml                 # Build settings for Amplify
│   ├── config/                      # Environment configs
│   │   └── index.ts
│   └── amplify_outputs.json         # Cognito values after deploy
├── server/                          # MCP server with auth logic
│   └── src/
│       └── config/
│           └── config.ts
```
---

## ⚠️ Manual Setup Requirements

This demo provisions Cognito resources using Amplify Gen2. However, **you must manually configure**:

- Cognito user groups (optional, based on use case)
- IAM roles for authenticated users
- Cognito Identity Pool role mappings
- Amazon Verified Permissions (AVP) policy store, schema, and policies

---


## 🔧 Setup (Step-by-step)

### 1. Clone and install everything

```bash
git clone https://github.com/birenderpal/mcp-authentication-demo.git
cd mcp-authentication-demo
npm run install:all
```

### 2. Deploy the Amplify backend

```bash
cd client

# Deploy your backend

npx amplify deploy   # For deploying to your AWS account

# OR

npx ampx sandbox  # For local testing with a sandbox environment

```

This sets up:
- Cognito User Pool
- Identity Pool
- OAuth App Clients

### 3. Update the server config

Use the values from `client/amplify_outputs.json` and set them in `.env` or config file:

```env
PORT=3001
AWS_REGION=us-west-2
COGNITO_USER_POOL_ID=us-west-2_XXXXX
COGNITO_IDENTITY_POOL_ID=us-west-2:xxxx-xxxx-xxxx
AVP_POLICY_STORE_ID=ps-xxxxxxxx
```

---

## 🧪 Running the demo

To run both frontend and server:

```bash
npm run dev
```

Or separately:

```bash
npm run client:dev
npm run server:dev
```

---

## 🔐 AVP Setup (Authorization Policies)

You’ll need to create a policy store and load a schema/policy manually.

### 1. Create the policy store

```bash
aws verifiedpermissions create-policy-store   --validation-settings mode=ON   --region us-west-2
```

### 2. Upload your schema

Save this as `schema.json`:

```json
{
  "MCP": {
    "entityTypes": {
      "Server": {
        "shape": {
          "type": "Record",
          "attributes": {
            "entityId": { "type": "String", "required": true }
          }
        }
      },
      "Tool": {
        "shape": {
          "type": "Record",
          "attributes": {
            "entityId": { "type": "String", "required": true }
          }
        }
      },
      "Client": {
        "shape": {
          "type": "Record",
          "attributes": {
            "entityId": { "type": "String" },
            "scope": {
              "type": "Set",
              "element": { "type": "String" }
            }
          }
        }
      }
    },
    "actions": {
      "connect": {
        "appliesTo": {
          "context": { "type": "Context" },
          "principalTypes": ["Client"],
          "resourceTypes": ["Server"]
        }
      },
      "call": {
        "appliesTo": {
          "context": { "type": "Context" },
          "principalTypes": ["Client"],
          "resourceTypes": ["Tool"]
        }
      }
    },
    "commonTypes": {
      "Context": {
        "type": "Record",
        "attributes": {
          "token": {
            "type": "Record",
            "attributes": {
              "scope": {
                "type": "Set",
                "element": { "type": "String" }
              },
              "client_id": { "type": "String" }
            }
          }
        }
      }
    }
  }
}
```

Then apply it:

```bash
aws verifiedpermissions put-schema   --policy-store-id <your-policy-store-id>   --definition file://schema.json   --region us-west-2
```

---

### 3. Link your Cognito user pool

```bash
aws verifiedpermissions create-identity-source   --policy-store-id <your-policy-store-id>   --principal-entity-type "MCP::Client"   --configuration cognitoUserPoolConfiguration="{userPoolArn='arn:aws:cognito-idp:us-west-2:<account-id>:userpool/us-west-2_xxxx'}"   --region us-west-2
```

---

### 4. Add a Cedar policy

Save this as `policy.cedar`:

```cedar
permit (principal, action, resource)
when {
  context has token &&
  context.token has scope &&
  context.token.scope.contains(resource.entityId)
};
```

Create it:

```bash
aws verifiedpermissions create-policy   --policy-store-id <your-policy-store-id>   --definition file://policy.cedar   --region us-west-2
```

---

## 🔧 Identity Pool Role Mapping

After deploying Amplify:

1. Go to **Cognito Identity Pools** in AWS Console
2. Edit the pool created by Amplify
3. Assign an IAM role to **authenticated users**
4. Save changes

This is required so users can get temporary AWS credentials when they log in.

## 📄 License

MIT
