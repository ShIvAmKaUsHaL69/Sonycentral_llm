interface PaginatedParams {
  shop: string;
  accessToken: string;
  query: string;
  extractor: (data: any) => any;
}

export async function fetchAllPaginatedData({ shop, accessToken, query, extractor }: PaginatedParams) {
  const apiVersions = ['2024-01', '2023-10', '2023-07', '2023-04'];
  let lastError: any = null;

  for (const version of apiVersions) {
    try {
      let edges: any[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        const paginatedQuery = query.replace('$AFTER_CURSOR', cursor ? `"${cursor}"` : 'null');

        const response = await fetch(`https://${shop}/admin/api/${version}/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({ query: paginatedQuery }),
        });

        const raw = await response.text();
        let data: any;
        try {
          data = JSON.parse(raw);
        } catch (parseErr) {
          console.error(`fetchAllPaginated: Failed to parse response for version ${version}`);
          console.error(raw);
          throw parseErr;
        }

        if (!response.ok) {
          console.error(`fetchAllPaginated: HTTP error ${response.status} on ${version}`);
          lastError = data;
          throw new Error(`HTTP ${response.status}`);
        }

        if (data.errors) {
          console.error(`fetchAllPaginated: GraphQL errors on ${version}:`, data.errors);
          lastError = data.errors;
          throw new Error('GraphQL errors');
        }

        console.log(`fetchAllPaginated: OK ${version}`);

        const extracted = extractor(data.data);
        if (!extracted || !extracted.edges) {
          console.warn('fetchAllPaginated: extractor returned no edges. Extracted:', extracted);
          return { edges: [] };
        }

        edges.push(...extracted.edges);
        hasNextPage = extracted.pageInfo?.hasNextPage;
        cursor = extracted.pageInfo?.endCursor ?? null;
      }

      return { edges };
    } catch (err) {
      console.warn(`fetchAllPaginated: falling back from ${version} due to error`);
      continue;
    }
  }

  console.error('fetchAllPaginated: All API versions failed. Last error:', lastError);
  return { edges: [] };
}
