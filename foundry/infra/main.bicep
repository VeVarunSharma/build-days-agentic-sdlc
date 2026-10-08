targetScope = 'resourceGroup'

@description('Azure region for the Foundry account, project, and model deployment.')
param location string = resourceGroup().location

@description('Object ID of the participant identity that will create and invoke the prompt agent.')
param principalId string

@minLength(2)
@maxLength(48)
@description('Globally unique Microsoft Foundry account name.')
param accountName string = take('aibabazon${uniqueString(resourceGroup().id)}', 24)

@minLength(2)
@maxLength(64)
@description('Microsoft Foundry project name.')
param projectName string = 'babazon-shopping-missions'

@description('Display name shown for the Microsoft Foundry project.')
param projectDisplayName string = 'Babazon shopping missions'

@description('Name of the chat model deployed to the Foundry account.')
param modelName string = 'gpt-4.1-mini'

@description('Version of the chat model deployment.')
param modelVersion string = '2025-04-14'

@description('Name used by applications and prompt agents to address the model deployment.')
param modelDeploymentName string = 'babazon-chat'

@description('Model deployment SKU. Availability varies by subscription and region.')
param modelSkuName string = 'GlobalStandard'

@minValue(1)
@description('Small configurable model capacity. This does not assert that quota is available.')
param modelCapacity int = 1

resource account 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: accountName
  location: location
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    allowProjectManagement: true
    customSubDomainName: toLower(accountName)
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      virtualNetworkRules: []
      ipRules: []
    }
  }
}

resource project 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = {
  parent: account
  name: projectName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    description: 'Prompt-agent project for deterministic Babazon shopping mission proposals.'
    displayName: projectDisplayName
  }
}

resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: account
  name: modelDeploymentName
  sku: {
    name: modelSkuName
    capacity: modelCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: modelName
      version: modelVersion
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

var foundryUserRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '53ca6127-db72-4b80-b1b0-d745d6d5456d'
)

resource participantFoundryUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(project.id, principalId, foundryUserRoleDefinitionId)
  scope: project
  properties: {
    principalId: principalId
    principalType: 'User'
    roleDefinitionId: foundryUserRoleDefinitionId
    description: 'Allows the workshop participant to create and invoke the Babazon prompt agent.'
  }
}

output AZURE_RESOURCE_GROUP string = resourceGroup().name
output AZURE_AI_ACCOUNT_NAME string = account.name
output AZURE_AI_ACCOUNT_ID string = account.id
output AZURE_AI_PROJECT_NAME string = project.name
output AZURE_AI_PROJECT_ID string = project.id
output AZURE_AI_PROJECT_ENDPOINT string = '${account.properties.endpoint}api/projects/${project.name}'
output FOUNDRY_PROJECT_ENDPOINT string = '${account.properties.endpoint}api/projects/${project.name}'
output AZURE_AI_MODEL_DEPLOYMENT_NAME string = modelDeployment.name
