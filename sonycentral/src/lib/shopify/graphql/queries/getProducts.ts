export const GET_PRODUCTS_QUERY = `
{
  products(first: 100, after: $AFTER_CURSOR) {
    edges {
      node {
        id
        title
        handle
        vendor
        status
        productType
        createdAt
        updatedAt
        variants(first: 100) {
          edges {
            node {
              id
              title
              sku
              price
              inventoryQuantity
              createdAt
              updatedAt
              product {
                id
              }
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
`;

// Minimal fallback query to handle cases where richer fields cause GraphQL errors
export const GET_PRODUCTS_MIN_QUERY = `
{
  products(first: 100, after: $AFTER_CURSOR) {
    edges {
      node {
        id
        title
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
`;