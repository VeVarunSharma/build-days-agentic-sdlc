targetScope = 'resourceGroup'

@description('Name of the existing Microsoft Foundry account.')
param accountName string

@description('Name of the existing Microsoft Foundry project.')
param projectName string

@description('Principal ID of the App Service system-assigned managed identity.')
param principalId string

@description('Built-in role definition ID granted at the Foundry project scope.')
param roleDefinitionId string

resource foundryAccount 'Microsoft.CognitiveServices/accounts@2025-06-01' existing = {
  name: accountName
}

resource foundryProject 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' existing = {
  parent: foundryAccount
  name: projectName
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundryProject.id, principalId, roleDefinitionId)
  scope: foundryProject
  properties: {
    principalId: principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitionId)
  }
}

output roleAssignmentId string = roleAssignment.id
