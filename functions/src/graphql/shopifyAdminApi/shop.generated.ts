import * as Types from '../../type/shopifyAdminApi';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type GetShopLocaleQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type GetShopLocaleQuery = { __typename?: 'QueryRoot', shopLocales: Array<{ __typename?: 'ShopLocale', locale: string, primary: boolean }>, shop: { __typename?: 'Shop', email: string, contactEmail: string, primaryDomain: { __typename?: 'Domain', host: string, url: string } } };


export const GetShopLocaleDocument = gql`
    query getShopLocale {
  shopLocales {
    locale
    primary
  }
  shop {
    primaryDomain {
      host
      url
    }
    email
    contactEmail
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    getShopLocale(variables?: GetShopLocaleQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetShopLocaleQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetShopLocaleQuery>({ document: GetShopLocaleDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'getShopLocale', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;