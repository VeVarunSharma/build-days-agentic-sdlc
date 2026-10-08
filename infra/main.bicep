targetScope = 'resourceGroup'

@description('Workshop team identifier used for resource naming and tagging.')
@minLength(2)
@maxLength(32)
param teamIdentifier string

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('App Service plan SKU.')
param appServicePlanSku string = 'B1'

@description('Additional tags applied to every resource.')
param tags object = {}

@description('Microsoft Foundry project endpoint. Leave empty with all other Foundry parameters to keep mission planning unconfigured.')
param foundryProjectEndpoint string = ''

@description('Deployed Microsoft Foundry prompt-agent name. Leave empty with all other Foundry parameters to keep mission planning unconfigured.')
param foundryAgentName string = ''

@description('Subscription containing the existing Microsoft Foundry project.')
param foundrySubscriptionId string = ''

@description('Resource group containing the existing Microsoft Foundry account and project.')
param foundryResourceGroupName string = ''

@description('Name of the existing Microsoft Foundry account.')
param foundryAccountName string = ''

@description('Name of the existing Microsoft Foundry project.')
param foundryProjectName string = ''

var uniqueSuffix = uniqueString(resourceGroup().id, teamIdentifier)
var logAnalyticsName = 'log-workshop-${uniqueSuffix}'
var applicationInsightsName = 'appi-workshop-${uniqueSuffix}'
var appServicePlanName = 'plan-workshop-${uniqueSuffix}'
var webAppName = 'app-workshop-${uniqueSuffix}'
var foundryAgentConsumerRoleDefinitionId = 'eed3b665-ab3a-47b6-8f48-c9382fb1dad6'
var foundryConfigured = !empty(foundryProjectEndpoint) && !empty(foundryAgentName) && !empty(foundrySubscriptionId) && !empty(foundryResourceGroupName) && !empty(foundryAccountName) && !empty(foundryProjectName)
var foundryConfigurationAbsent = empty(foundryProjectEndpoint) && empty(foundryAgentName) && empty(foundrySubscriptionId) && empty(foundryResourceGroupName) && empty(foundryAccountName) && empty(foundryProjectName)
var validatedFoundryConfiguration = foundryConfigured || foundryConfigurationAbsent ? foundryConfigured : fail('Foundry parameters must be either all configured or all empty.')
var commonTags = union(tags, {
  workload: 'babazon-workshop'
  team: teamIdentifier
  managedBy: 'bicep'
})

module logAnalytics 'br/public:avm/res/operational-insights/workspace:0.16.1' = {
  name: 'log-analytics'
  params: {
    name: logAnalyticsName
    location: location
    skuName: 'PerGB2018'
    dataRetention: 30
    dailyQuotaGb: '1'
    features: {
      disableLocalAuth: true
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    tags: commonTags
  }
}

module applicationInsights 'br/public:avm/res/insights/component:0.8.0' = {
  name: 'application-insights'
  params: {
    name: applicationInsightsName
    location: location
    applicationType: 'web'
    workspaceResourceId: logAnalytics.outputs.resourceId
    retentionInDays: 30
    tags: commonTags
  }
}

module appServicePlan 'br/public:avm/res/web/serverfarm:0.7.0' = {
  name: 'app-service-plan'
  params: {
    name: appServicePlanName
    location: location
    kind: 'linux'
    reserved: true
    skuName: appServicePlanSku
    skuCapacity: 1
    zoneRedundant: false
    tags: commonTags
  }
}

module webApp 'br/public:avm/res/web/site:0.24.0' = {
  name: 'web-app'
  params: {
    name: webAppName
    location: location
    kind: 'app,linux'
    serverFarmResourceId: appServicePlan.outputs.resourceId
    httpsOnly: true
    clientAffinityEnabled: false
    publicNetworkAccess: 'Enabled'
    managedIdentities: {
      systemAssigned: true
    }
    siteConfig: {
      alwaysOn: true
      ftpsState: 'Disabled'
      healthCheckPath: '/health'
      http20Enabled: true
      linuxFxVersion: 'NODE|22-lts'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      use32BitWorkerProcess: false
      webSocketsEnabled: false
    }
    configs: [
      {
        name: 'appsettings'
        applicationInsightResourceId: applicationInsights.outputs.resourceId
        retainCurrentAppSettings: false
        properties: union({
          NODE_ENV: 'production'
          PORT: '8080'
          WEBSITE_NODE_DEFAULT_VERSION: '~22'
          SCM_DO_BUILD_DURING_DEPLOYMENT: 'true'
          ENABLE_ORYX_BUILD: 'true'
        }, validatedFoundryConfiguration ? {
          FOUNDRY_PROJECT_ENDPOINT: foundryProjectEndpoint
          FOUNDRY_AGENT_NAME: foundryAgentName
        } : {})
      }
    ]
    basicPublishingCredentialsPolicies: [
      {
        name: 'ftp'
        allow: false
      }
      {
        name: 'scm'
        allow: false
      }
    ]
    diagnosticSettings: [
      {
        name: 'send-to-log-analytics'
        workspaceResourceId: logAnalytics.outputs.resourceId
      }
    ]
    tags: commonTags
  }
}

module foundryRoleAssignment './modules/foundry-role-assignment.bicep' = if (validatedFoundryConfiguration) {
  name: 'foundry-agent-consumer-${uniqueSuffix}'
  scope: resourceGroup(foundrySubscriptionId, foundryResourceGroupName)
  params: {
    accountName: foundryAccountName
    principalId: webApp.outputs.systemAssignedMIPrincipalId!
    projectName: foundryProjectName
    roleDefinitionId: foundryAgentConsumerRoleDefinitionId
  }
}

@description('Name of the deployed App Service web app.')
output appName string = webApp.outputs.name

@description('HTTPS URL of the deployed workshop application.')
output appUrl string = 'https://${webApp.outputs.defaultHostname}'

@description('Resource ID of the deployed web app.')
output appResourceId string = webApp.outputs.resourceId

@description('Deployment identifier used for evidence collection.')
output deploymentIdentifier string = deployment().name

@description('Whether the web app was configured to invoke the existing Microsoft Foundry mission planner.')
output foundryConfigured bool = validatedFoundryConfiguration

@description('Monitoring resources associated with the application.')
output monitoring object = {
  applicationInsightsName: applicationInsights.outputs.name
  applicationInsightsResourceId: applicationInsights.outputs.resourceId
  logAnalyticsWorkspaceName: logAnalytics.outputs.name
  logAnalyticsWorkspaceResourceId: logAnalytics.outputs.resourceId
}
