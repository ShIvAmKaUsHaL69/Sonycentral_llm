interface GraphQLParams {
  shop: string;
  accessToken: string;
  query: string;
  variables?: Record<string, any>;
}

export async function fetchShopifyGraphQL({ shop, accessToken, query, variables = {} }: GraphQLParams) {
  console.log(`🔍 Making GraphQL request to: https://${shop}/admin/api/2024-01/graphql.json`);
  console.log(`🔍 Access token: ${accessToken.substring(0, 10)}...`);
  
  // Try different API versions in order of preference
  const apiVersions = ['2023-10', '2023-07', '2023-04', '2024-01'];
  
  for (const version of apiVersions) {
    try {
      console.log(`🔍 Trying API version: ${version}`);
      const response = await fetch(`https://${shop}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

      console.log(`🔍 Response status: ${response.status}`);
      console.log(`🔍 Response ok: ${response.ok}`);

      const raw = await response.text();

      let json: any;
      try {
        json = JSON.parse(raw);
      } catch (err) {
        console.error(`❌ Failed to parse response as JSON for version ${version}`);
        console.error(raw); // likely HTML error page
        continue; // Try next version
      }
      
      console.log(`🔍 Response data:`, json);
      
      if (!response.ok) {
        console.error(`❌ HTTP Error with version ${version}: ${response.status} ${response.statusText}`);
        continue; // Try next version
      }
      
      if (json.errors) {
        console.error(`❌ GraphQL Errors with version ${version}:`, json.errors);
        continue; // Try next version
      }
      
      console.log(`✅ Success with API version: ${version}`);
      return json.data;
    } catch (error) {
      console.error(`❌ Error with API version ${version}:`, error);
      continue; // Try next version
    }
  }
  
  // If we get here, all versions failed
  throw new Error('All API versions failed. Check your access token and permissions.');
}
