import * as Types from '../../type/shopifyAdminApi';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type DeleteMetafieldsMutationVariables = Types.Exact<{
  metafields: Array<Types.MetafieldIdentifierInput> | Types.MetafieldIdentifierInput;
}>;


export type DeleteMetafieldsMutation = { __typename?: 'Mutation', metafieldsDelete?: { __typename?: 'MetafieldsDeletePayload', deletedMetafields?: Array<{ __typename?: 'MetafieldIdentifier', key: string, namespace: string, ownerId: string } | null> | null, userErrors: Array<{ __typename?: 'UserError', field?: Array<string> | null, message: string }> } | null };


export const DeleteMetafieldsDocument = gql`
    mutation DeleteMetafields($metafields: [MetafieldIdentifierInput!]!) {
  metafieldsDelete(metafields: $metafields) {
    deletedMetafields {
      key
      namespace
      ownerId
    }
    userErrors {
      field
      message
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    DeleteMetafields(variables: DeleteMetafieldsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DeleteMetafieldsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteMetafieldsMutation>({ document: DeleteMetafieldsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DeleteMetafields', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;