const { DefaultAzureCredential } = require("@azure/identity");
const { ApiManagementClient } = require("@azure/arm-apimanagement");
module.exports = async function (context, _myTimer) {
    const subscriptionId = process.env["AZURE_SUBSCRIPTION_ID"];
    const serviceName = process.env["SERVICE_NAME"];
    const resourceGroupName = process.env["RESOURCE_GROUP"];

    // Use `DefaultAzureCredential` or any other credential of your choice based on https://aka.ms/azsdk/js/identity/examples
    // Please note that you can also use credentials from the `@azure/ms-rest-nodeauth` package instead.
    const creds = new DefaultAzureCredential();
    const client = new ApiManagementClient(creds, subscriptionId);

    const opts = {}
    const apisWithNoSubscriptionKey = await client.api.listByService(resourceGroupName, serviceName, opts)
        .then((result) => {
            const noSubscriptionKey = result.filter(s => s.subscriptionRequired === false)
            return Promise.resolve(noSubscriptionKey)
        })

    const PRODUCTS_WHICH_SECURE_APIS = [
        'mockAuth'
    ]

    const insecureProducts = await client.product.listByService(resourceGroupName, serviceName)
        .then(result => {
            // remove where subscription is required
            const noSubscriptions = result.filter(p => p.subscriptionRequired === false);

            // remove where wthe business acknowledges it is a secure product
            const insecure = noSubscriptions.filter(p => !PRODUCTS_WHICH_SECURE_APIS.includes(p.name))
            return Promise.resolve(insecure)
        })

    const insecureProductIds = insecureProducts.map(p => p.id)

    for (const api of apisWithNoSubscriptionKey) {
        const productsOnApi = await client.apiProduct.listByApis(resourceGroupName, serviceName, api.name)
        if (!productsOnApi.length) {
            context.log.error(api.name, 'has no products to secure it')
        }

        const knownBadProducts = productsOnApi.filter(p => insecureProductIds.includes(p.id))

        if (knownBadProducts.length) {
            context.log.error(api.name, 'has known bad product', knownBadProducts.map(p => p.name))
        }
    }















};