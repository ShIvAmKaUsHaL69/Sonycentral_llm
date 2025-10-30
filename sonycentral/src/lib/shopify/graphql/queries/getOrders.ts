export const GET_ORDERS_QUERY = `
{
  orders(first: 10, after: $AFTER_CURSOR) {
    edges {
      node {
        id
        customer {
          id
        }
        name
        email
        displayFinancialStatus
        currencyCode
        totalPriceSet { shopMoney { amount } }
        subtotalPriceSet { shopMoney { amount } }
        totalTaxSet { shopMoney { amount } }
        totalDiscountsSet { shopMoney { amount } }
        totalShippingPriceSet { shopMoney { amount } }

        shippingLines(first: 1) {
          edges {
            node {
              price
              code
            }
          }
        }

        billingAddress {
          firstName
          lastName
          address1
          address2
          city
          zip
          province
          country
          phone
          company
          latitude
          longitude
          name
          countryCodeV2
          provinceCode
        }

        shippingAddress {
          firstName
          lastName
          address1
          address2
          city
          zip
          province
          country
          phone
          company
          latitude
          longitude
          name
          countryCodeV2
          provinceCode
        }

        fulfillments {
          id
          createdAt
          trackingInfo {
            company
            number
            url
          }
          location {
            id
            name
          }
        }
       

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
         

        createdAt
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
`;
