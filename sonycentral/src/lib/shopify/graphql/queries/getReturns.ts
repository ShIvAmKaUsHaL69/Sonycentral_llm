
export const GET_RETURNS_QUERY = `
{
  returnRequests(first: 50) {
    edges {
      node {
        id
        createdAt
        order {
          id
        }
        returnLineItems(first: 10) {
          edges {
            node {
              quantity
              returnReason
              lineItem {
                id
                discountedTotalSet {
                  shopMoney {
                    amount
                  }
                }
              }
            }
          } 
        }
      }
    }
  }
}
`
