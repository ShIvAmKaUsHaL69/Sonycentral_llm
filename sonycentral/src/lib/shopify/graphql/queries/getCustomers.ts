export const GET_CUSTOMERS_QUERY = `
{
  customers(first: 100, after: $AFTER_CURSOR) {
    edges {
      node {
        id
        firstName
        lastName
        email
        phone
        createdAt
        orders(first: 1) {
          edges {
            node {
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
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
