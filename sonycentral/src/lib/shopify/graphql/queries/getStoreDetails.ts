export const GET_STORE_DETAILS_QUERY = `
{
  shop {
    id
    name
    email
    plan {
      displayName
    }
    createdAt
  }
}
`;
