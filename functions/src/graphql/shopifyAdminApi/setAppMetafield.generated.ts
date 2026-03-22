import * as Types from '../../type/shopifyAdminApi';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type SetAppMetafieldMutationVariables = Types.Exact<{
  metafields: Array<Types.MetafieldsSetInput> | Types.MetafieldsSetInput;
}>;


export type SetAppMetafieldMutation = { __typename?: 'Mutation', metafieldsSet?: { __typename?: 'MetafieldsSetPayload', metafields?: Array<{ __typename?: 'Metafield', key: string, namespace: string, value: string, createdAt: string, updatedAt: string }> | null, userErrors: Array<{ __typename?: 'MetafieldsSetUserError', field?: Array<string> | null, message: string, code?: Types.MetafieldsSetUserErrorCode | null }> } | null };


export const SetAppMetafieldDocument = gql`
    mutation SetAppMetafield($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      key
      namespace
      value
      createdAt
      updatedAt
    }
    userErrors {
      field
      message
      code
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    SetAppMetafield(variables: SetAppMetafieldMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<SetAppMetafieldMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SetAppMetafieldMutation>({ document: SetAppMetafieldDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'SetAppMetafield', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;