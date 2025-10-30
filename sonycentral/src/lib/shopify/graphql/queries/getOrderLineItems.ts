export const GET_ORDER_LINE_ITEMS_QUERY = `
query GetOrderLineItems($orderId: ID!) {
  order(id: $orderId) {
    id
    name
    lineItems(first: 50) {
      edges {
        node {
          id
          name
          quantity
          sku
          product {
            id
          }
          variant {
            id
          }
          originalUnitPriceSet {
            shopMoney {
              amount
            }
          }
          taxLines {
            rate
            priceSet {
              shopMoney {
                amount
              }
            }
          }
          discountAllocations {
            allocatedAmountSet {
              shopMoney {
                amount
              }
            }
          }
          discountedTotalSet {
            shopMoney {
              amount
            }
          }
          customAttributes {
          
            key
            value
          }
        }
      }
    }
  }
}
`; 