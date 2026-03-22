import * as Types from '../../type/shopifyAdminApi';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type GetCurrentAppInstallationQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type GetCurrentAppInstallationQuery = { __typename?: 'QueryRoot', currentAppInstallation: { __typename?: 'AppInstallation', id: string } };

export type GetAppMetafieldQueryVariables = Types.Exact<{
  namespace: Types.Scalars['String']['input'];
  key: Types.Scalars['String']['input'];
}>;


export type GetAppMetafieldQuery = { __typename?: 'QueryRoot', currentAppInstallation: { __typename?: 'AppInstallation', id: string, metafield?: { __typename?: 'Metafield', id: string, namespace: string, key: string, value: string, type: string } | null } };

export type GetAppMetafieldsQueryVariables = Types.Exact<{
  namespace: Types.Scalars['String']['input'];
}>;


export type GetAppMetafieldsQuery = { __typename?: 'QueryRoot', currentAppInstallation: { __typename?: 'AppInstallation', id: string, metafields: { __typename?: 'MetafieldConnection', edges: Array<{ __typename?: 'MetafieldEdge', node: { __typename?: 'Metafield', id: string, namespace: string, key: string, value: string, type: string } }> } } };


export const GetCurrentAppInstallationDocument = gql`
    query GetCurrentAppInstallation {
  currentAppInstallation {
    id
  }
}
    `;
export const GetAppMetafieldDocument = gql`
    query GetAppMetafield($namespace: String!, $key: String!) {
  currentAppInstallation {
    id
    metafield(namespace: $namespace, key: $key) {
      id
      namespace
      key
      value
      type
    }
  }
}
    `;
export const GetAppMetafieldsDocument = gql`
    query GetAppMetafields($namespace: String!) {
  currentAppInstallation {
    id
    metafields(first: 100, namespace: $namespace) {
      edges {
        node {
          id
          namespace
          key
          value
          type
        }
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    GetCurrentAppInstallation(variables?: GetCurrentAppInstallationQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetCurrentAppInstallationQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetCurrentAppInstallationQuery>({ document: GetCurrentAppInstallationDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetCurrentAppInstallation', 'query', variables);
    },
    GetAppMetafield(variables: GetAppMetafieldQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetAppMetafieldQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetAppMetafieldQuery>({ document: GetAppMetafieldDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetAppMetafield', 'query', variables);
    },
    GetAppMetafields(variables: GetAppMetafieldsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetAppMetafieldsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetAppMetafieldsQuery>({ document: GetAppMetafieldsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetAppMetafields', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;