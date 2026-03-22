import * as Types from '../../type/shopifyAdminApi';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type GetProductsByIdsQueryVariables = Types.Exact<{
  ids: Array<Types.Scalars['ID']['input']> | Types.Scalars['ID']['input'];
}>;


export type GetProductsByIdsQuery = { __typename?: 'QueryRoot', nodes: Array<{ __typename?: 'AbandonedCheckout' } | { __typename?: 'AbandonedCheckoutLineItem' } | { __typename?: 'Abandonment' } | { __typename?: 'AddAllProductsOperation' } | { __typename?: 'AdditionalFee' } | { __typename?: 'App' } | { __typename?: 'AppCatalog' } | { __typename?: 'AppCredit' } | { __typename?: 'AppInstallation' } | { __typename?: 'AppPurchaseOneTime' } | { __typename?: 'AppRevenueAttributionRecord' } | { __typename?: 'AppSubscription' } | { __typename?: 'AppUsageRecord' } | { __typename?: 'Article' } | { __typename?: 'BasicEvent' } | { __typename?: 'Blog' } | { __typename?: 'BulkOperation' } | { __typename?: 'BusinessEntity' } | { __typename?: 'CalculatedOrder' } | { __typename?: 'CartTransform' } | { __typename?: 'CashTrackingAdjustment' } | { __typename?: 'CashTrackingSession' } | { __typename?: 'CatalogCsvOperation' } | { __typename?: 'Channel' } | { __typename?: 'ChannelDefinition' } | { __typename?: 'ChannelInformation' } | { __typename?: 'CheckoutProfile' } | { __typename?: 'Collection' } | { __typename?: 'Comment' } | { __typename?: 'CommentEvent' } | { __typename?: 'Company' } | { __typename?: 'CompanyAddress' } | { __typename?: 'CompanyContact' } | { __typename?: 'CompanyContactRole' } | { __typename?: 'CompanyContactRoleAssignment' } | { __typename?: 'CompanyLocation' } | { __typename?: 'CompanyLocationCatalog' } | { __typename?: 'CompanyLocationStaffMemberAssignment' } | { __typename?: 'ConsentPolicy' } | { __typename?: 'Customer' } | { __typename?: 'CustomerAccountAppExtensionPage' } | { __typename?: 'CustomerAccountNativePage' } | { __typename?: 'CustomerPaymentMethod' } | { __typename?: 'CustomerSegmentMembersQuery' } | { __typename?: 'CustomerVisit' } | { __typename?: 'DeliveryCarrierService' } | { __typename?: 'DeliveryCondition' } | { __typename?: 'DeliveryCountry' } | { __typename?: 'DeliveryCustomization' } | { __typename?: 'DeliveryLocationGroup' } | { __typename?: 'DeliveryMethod' } | { __typename?: 'DeliveryMethodDefinition' } | { __typename?: 'DeliveryParticipant' } | { __typename?: 'DeliveryProfile' } | { __typename?: 'DeliveryProfileItem' } | { __typename?: 'DeliveryPromiseParticipant' } | { __typename?: 'DeliveryPromiseProvider' } | { __typename?: 'DeliveryProvince' } | { __typename?: 'DeliveryRateDefinition' } | { __typename?: 'DeliveryZone' } | { __typename?: 'DiscountAutomaticBxgy' } | { __typename?: 'DiscountAutomaticNode' } | { __typename?: 'DiscountCodeNode' } | { __typename?: 'DiscountNode' } | { __typename?: 'DiscountRedeemCodeBulkCreation' } | { __typename?: 'Domain' } | { __typename?: 'DraftOrder' } | { __typename?: 'DraftOrderLineItem' } | { __typename?: 'DraftOrderTag' } | { __typename?: 'Duty' } | { __typename?: 'ExchangeLineItem' } | { __typename?: 'ExchangeV2' } | { __typename?: 'ExternalVideo' } | { __typename?: 'Fulfillment' } | { __typename?: 'FulfillmentConstraintRule' } | { __typename?: 'FulfillmentEvent' } | { __typename?: 'FulfillmentHold' } | { __typename?: 'FulfillmentLineItem' } | { __typename?: 'FulfillmentOrder' } | { __typename?: 'FulfillmentOrderDestination' } | { __typename?: 'FulfillmentOrderLineItem' } | { __typename?: 'FulfillmentOrderMerchantRequest' } | { __typename?: 'GenericFile' } | { __typename?: 'GiftCard' } | { __typename?: 'GiftCardCreditTransaction' } | { __typename?: 'GiftCardDebitTransaction' } | { __typename?: 'InventoryAdjustmentGroup' } | { __typename?: 'InventoryItem' } | { __typename?: 'InventoryItemMeasurement' } | { __typename?: 'InventoryLevel' } | { __typename?: 'InventoryQuantity' } | { __typename?: 'LineItem' } | { __typename?: 'LineItemGroup' } | { __typename?: 'Location' } | { __typename?: 'MailingAddress' } | { __typename?: 'Market' } | { __typename?: 'MarketCatalog' } | { __typename?: 'MarketRegionCountry' } | { __typename?: 'MarketWebPresence' } | { __typename?: 'MarketingActivity' } | { __typename?: 'MarketingEvent' } | { __typename?: 'MediaImage' } | { __typename?: 'Menu' } | { __typename?: 'Metafield' } | { __typename?: 'MetafieldDefinition' } | { __typename?: 'Metaobject' } | { __typename?: 'MetaobjectDefinition' } | { __typename?: 'Model3d' } | { __typename?: 'OnlineStoreTheme' } | { __typename?: 'Order' } | { __typename?: 'OrderAdjustment' } | { __typename?: 'OrderDisputeSummary' } | { __typename?: 'OrderTransaction' } | { __typename?: 'Page' } | { __typename?: 'PaymentCustomization' } | { __typename?: 'PaymentMandate' } | { __typename?: 'PaymentSchedule' } | { __typename?: 'PaymentTerms' } | { __typename?: 'PaymentTermsTemplate' } | { __typename?: 'PriceList' } | { __typename?: 'PriceRule' } | { __typename?: 'PriceRuleDiscountCode' } | { __typename?: 'Product', id: string, title: string, handle: string, featuredImage?: { __typename?: 'Image', url: string } | null, variants: { __typename?: 'ProductVariantConnection', edges: Array<{ __typename?: 'ProductVariantEdge', node: { __typename?: 'ProductVariant', price: string } }> } } | { __typename?: 'ProductBundleOperation' } | { __typename?: 'ProductDeleteOperation' } | { __typename?: 'ProductDuplicateOperation' } | { __typename?: 'ProductFeed' } | { __typename?: 'ProductOption' } | { __typename?: 'ProductOptionValue' } | { __typename?: 'ProductSetOperation' } | { __typename?: 'ProductTaxonomyNode' } | { __typename?: 'ProductVariant' } | { __typename?: 'ProductVariantComponent' } | { __typename?: 'Publication' } | { __typename?: 'PublicationResourceOperation' } | { __typename?: 'QuantityPriceBreak' } | { __typename?: 'Refund' } | { __typename?: 'RefundShippingLine' } | { __typename?: 'Return' } | { __typename?: 'ReturnLineItem' } | { __typename?: 'ReturnableFulfillment' } | { __typename?: 'ReverseDelivery' } | { __typename?: 'ReverseDeliveryLineItem' } | { __typename?: 'ReverseFulfillmentOrder' } | { __typename?: 'ReverseFulfillmentOrderDisposition' } | { __typename?: 'ReverseFulfillmentOrderLineItem' } | { __typename?: 'SaleAdditionalFee' } | { __typename?: 'SavedSearch' } | { __typename?: 'ScriptTag' } | { __typename?: 'Segment' } | { __typename?: 'SellingPlan' } | { __typename?: 'SellingPlanGroup' } | { __typename?: 'ServerPixel' } | { __typename?: 'Shop' } | { __typename?: 'ShopAddress' } | { __typename?: 'ShopPolicy' } | { __typename?: 'ShopifyPaymentsAccount' } | { __typename?: 'ShopifyPaymentsBalanceTransaction' } | { __typename?: 'ShopifyPaymentsBankAccount' } | { __typename?: 'ShopifyPaymentsDispute' } | { __typename?: 'ShopifyPaymentsDisputeEvidence' } | { __typename?: 'ShopifyPaymentsDisputeFileUpload' } | { __typename?: 'ShopifyPaymentsDisputeFulfillment' } | { __typename?: 'ShopifyPaymentsPayout' } | { __typename?: 'StaffMember' } | { __typename?: 'StandardMetafieldDefinitionTemplate' } | { __typename?: 'StoreCreditAccount' } | { __typename?: 'StoreCreditAccountCreditTransaction' } | { __typename?: 'StoreCreditAccountDebitRevertTransaction' } | { __typename?: 'StoreCreditAccountDebitTransaction' } | { __typename?: 'StorefrontAccessToken' } | { __typename?: 'SubscriptionBillingAttempt' } | { __typename?: 'SubscriptionContract' } | { __typename?: 'SubscriptionDraft' } | { __typename?: 'TaxonomyAttribute' } | { __typename?: 'TaxonomyCategory' } | { __typename?: 'TaxonomyChoiceListAttribute' } | { __typename?: 'TaxonomyMeasurementAttribute' } | { __typename?: 'TaxonomyValue' } | { __typename?: 'TenderTransaction' } | { __typename?: 'TransactionFee' } | { __typename?: 'UnverifiedReturnLineItem' } | { __typename?: 'UrlRedirect' } | { __typename?: 'UrlRedirectImport' } | { __typename?: 'Validation' } | { __typename?: 'Video' } | { __typename?: 'WebPixel' } | { __typename?: 'WebhookSubscription' } | null> };


export const GetProductsByIdsDocument = gql`
    query GetProductsByIds($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Product {
      id
      title
      handle
      featuredImage {
        url
      }
      variants(first: 1) {
        edges {
          node {
            price
          }
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
    GetProductsByIds(variables: GetProductsByIdsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetProductsByIdsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetProductsByIdsQuery>({ document: GetProductsByIdsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetProductsByIds', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;