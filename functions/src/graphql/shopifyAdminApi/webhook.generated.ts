import * as Types from '../../type/shopifyAdminApi';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type GetRegisteredWebhooksQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type GetRegisteredWebhooksQuery = { __typename?: 'QueryRoot', webhookSubscriptions: { __typename?: 'WebhookSubscriptionConnection', edges: Array<{ __typename?: 'WebhookSubscriptionEdge', node: { __typename?: 'WebhookSubscription', id: string, topic: Types.WebhookSubscriptionTopic, endpoint: { __typename: 'WebhookEventBridgeEndpoint' } | { __typename: 'WebhookHttpEndpoint', callbackUrl: string } | { __typename: 'WebhookPubSubEndpoint' } } }> } };

export type SubscribeAppUninstallMutationVariables = Types.Exact<{
  webhookSubscription: Types.WebhookSubscriptionInput;
}>;


export type SubscribeAppUninstallMutation = { __typename?: 'Mutation', webhookSubscriptionCreate?: { __typename?: 'WebhookSubscriptionCreatePayload', webhookSubscription?: { __typename?: 'WebhookSubscription', id: string } | null, userErrors: Array<{ __typename?: 'UserError', field?: Array<string> | null, message: string }> } | null };

export type SubscribeAppSubscriptionsUpdateMutationVariables = Types.Exact<{
  webhookSubscription: Types.WebhookSubscriptionInput;
}>;


export type SubscribeAppSubscriptionsUpdateMutation = { __typename?: 'Mutation', webhookSubscriptionCreate?: { __typename?: 'WebhookSubscriptionCreatePayload', webhookSubscription?: { __typename?: 'WebhookSubscription', id: string } | null, userErrors: Array<{ __typename?: 'UserError', field?: Array<string> | null, message: string }> } | null };

export type WebhookSubscriptionCreateMutationVariables = Types.Exact<{
  topic: Types.WebhookSubscriptionTopic;
  webhookSubscription: Types.WebhookSubscriptionInput;
}>;


export type WebhookSubscriptionCreateMutation = { __typename?: 'Mutation', webhookSubscriptionCreate?: { __typename?: 'WebhookSubscriptionCreatePayload', webhookSubscription?: { __typename?: 'WebhookSubscription', id: string, topic: Types.WebhookSubscriptionTopic, endpoint: { __typename: 'WebhookEventBridgeEndpoint' } | { __typename: 'WebhookHttpEndpoint', callbackUrl: string } | { __typename: 'WebhookPubSubEndpoint' } } | null, userErrors: Array<{ __typename?: 'UserError', field?: Array<string> | null, message: string }> } | null };


export const GetRegisteredWebhooksDocument = gql`
    query getRegisteredWebhooks {
  webhookSubscriptions(first: 20) {
    edges {
      node {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
      }
    }
  }
}
    `;
export const SubscribeAppUninstallDocument = gql`
    mutation subscribeAppUninstall($webhookSubscription: WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(
    topic: APP_UNINSTALLED
    webhookSubscription: $webhookSubscription
  ) {
    webhookSubscription {
      id
    }
    userErrors {
      field
      message
    }
  }
}
    `;
export const SubscribeAppSubscriptionsUpdateDocument = gql`
    mutation subscribeAppSubscriptionsUpdate($webhookSubscription: WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(
    topic: APP_SUBSCRIPTIONS_UPDATE
    webhookSubscription: $webhookSubscription
  ) {
    webhookSubscription {
      id
    }
    userErrors {
      field
      message
    }
  }
}
    `;
export const WebhookSubscriptionCreateDocument = gql`
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(
    topic: $topic
    webhookSubscription: $webhookSubscription
  ) {
    webhookSubscription {
      id
      topic
      endpoint {
        __typename
        ... on WebhookHttpEndpoint {
          callbackUrl
        }
      }
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
    getRegisteredWebhooks(variables?: GetRegisteredWebhooksQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetRegisteredWebhooksQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetRegisteredWebhooksQuery>({ document: GetRegisteredWebhooksDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'getRegisteredWebhooks', 'query', variables);
    },
    subscribeAppUninstall(variables: SubscribeAppUninstallMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<SubscribeAppUninstallMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SubscribeAppUninstallMutation>({ document: SubscribeAppUninstallDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'subscribeAppUninstall', 'mutation', variables);
    },
    subscribeAppSubscriptionsUpdate(variables: SubscribeAppSubscriptionsUpdateMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<SubscribeAppSubscriptionsUpdateMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SubscribeAppSubscriptionsUpdateMutation>({ document: SubscribeAppSubscriptionsUpdateDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'subscribeAppSubscriptionsUpdate', 'mutation', variables);
    },
    webhookSubscriptionCreate(variables: WebhookSubscriptionCreateMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<WebhookSubscriptionCreateMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<WebhookSubscriptionCreateMutation>({ document: WebhookSubscriptionCreateDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'webhookSubscriptionCreate', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;