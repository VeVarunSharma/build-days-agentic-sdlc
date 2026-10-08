using './main.bicep'

param teamIdentifier = 'team01'
param location = 'eastus2'
param appServicePlanSku = 'B1'
param foundryProjectEndpoint = ''
param foundryAgentName = ''
param foundrySubscriptionId = ''
param foundryResourceGroupName = ''
param foundryAccountName = ''
param foundryProjectName = ''
param tags = {
  environment: 'workshop'
  application: 'babazon'
}
