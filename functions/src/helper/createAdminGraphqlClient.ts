import { GraphQLClient } from "graphql-request";

export const createAdminGraphqlClient = (params: {
  myshopifyDomain: string;
  accessToken: string;
}): GraphQLClient => {
  return new GraphQLClient(
    `https://${params.myshopifyDomain}/admin/api/2024-10/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": params.accessToken,
      },
    }
  );
};
