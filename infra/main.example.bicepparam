using './main.bicep'

param teamIdentifier = 'team01'
param location = 'eastus2'
param appServicePlanSku = 'B1'
param tags = {
  environment: 'workshop'
  application: 'babazon'
}
