import {
    Card,
    Layout,
    List,
    Page,
    Text,
    BlockStack,
    Button,
    InlineStack,
    Thumbnail,
    FormLayout,
    TextField,
    Tag,
    InlineGrid,
    RadioButton,
    ButtonGroup,
  } from "@shopify/polaris";
  import { authenticate } from "../shopify.server";
  import { ImageIcon } from "@shopify/polaris-icons";
  
  import { json } from "@remix-run/node";
  import { useLoaderData } from "@remix-run/react";
  
  export const loader = async ({ request, params }) => {
    //---
    // 1. Authenticate the request
    //---
  
    const { admin } = await authenticate.admin(request);
  
    //---
    // 2. get discount id from params and format it
    //---
    const { id } = params;
    const ID = "gid://shopify/DiscountNode/" + id;
  
    //---
    // 3. Fetch the discount metafield passing in the discount id
    //---
    const discount = await admin.graphql(
      `query discountNodes($id: ID!) {
        discountNode(id: $id) {
          metafield(namespace:"$app:customer-tag-discount", key:"function-configuration"){
            value
          }
        }
      }`,
      {
        variables: {
          id: ID,
        },
      },
    );
  
    const parsedDiscount = await discount.json();
  
    //---
    // 4. Return the discount details
    //---
    return json({
      discount: parsedDiscount.data,
    });
  };
  
  export default function ViewDiscountDetails() {
    //---
    // 1. Use the discount details
    //---
  
    const data = useLoaderData();
  
    //---
    // 2. destructure the discount details from the data
    //
  
    const {
      discountMessage,
      discountTags,
      discountType,
      discountValue,
      productsDetails,
    } = JSON.parse(data?.discount?.discountNode?.metafield?.value);
  
    //---
    // 3. Return the page UI with the discount details
    //---
    return (
      <Page
        title="Customer Tag Discount"
        backAction={{
          onAction: () => {
            open("shopify:admin/discounts", "_self");
          },
        }}
      >
        <Layout>
          <Layout.Section>
            <FormLayout>
              <Card>
                <BlockStack gap="500">
                  <InlineGrid columns="1fr auto">
                    <Text as={"h2"} variant="headingMd">
                      Customer Tag Discount
                    </Text>
                    <Text as={"h2"} variant="regular">
                      Customer Discount
                    </Text>
                  </InlineGrid>
                  <BlockStack gap="100">
                    <Text as={"p"} variant="regular">
                      Title
                    </Text>
  
                    <TextField
                      label=""
                      value={discountMessage}
                      autoComplete="off"
                    />
                    <Text as="p" fontWeight="regular">
                      Customers will see this in their cart and at checkout.
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="500">
                  <Text as={"h2"} variant="headingMd">
                    discountTags
                  </Text>
                  {discountTags?.length > 0 ? (
                    <InlineStack gap="200">
                      {discountTags?.map((option) => (
                        <Tag key={option}>{option}</Tag>
                      ))}
                    </InlineStack>
                  ) : null}
                  {discountTags?.length != 0 && (
                    <Text as="p" fontWeight="regular">
                      Only Customer with at least one of these discountTags will
                      get the discount. discount.
                    </Text>
                  )}
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="500">
                  <InlineStack align="space-between">
                    <Text as={"h2"} variant="headingMd">
                      Discount Type
                    </Text>
                  </InlineStack>
                  <BlockStack gap="50">
                    <RadioButton
                      label="Order Discount"
                      checked={discountType === "orderDiscount"}
                      id="orderDiscount"
                      name="discountType"
                    />
                    <RadioButton
                      label="Products Discount"
                      id="productsDiscount"
                      name="discountType"
                      checked={discountType === "productsDiscount"}
                    />
                  </BlockStack>
                  <BlockStack gap="500">
                    {productsDetails.length > 0 &&
                      productsDetails.map((product) => {
                        return (
                          <InlineStack
                            key={product.id}
                            blockAlign="start"
                            gap="500"
                          >
                            <Thumbnail
                              source={product.images[0].originalSrc || ImageIcon}
                              alt={product.images[0].altText}
                            />
                            <BlockStack gap="100">
                              <Text
                                as="span"
                                variant="headingMd"
                                fontWeight="semibold"
                              >
                                {product.title}
                              </Text>
                              <BlockStack gap="100">
                                {product.variants.map((variant, index) => {
                                  return (
                                    <Text key={variant.id} as="span" variant="p">
                                      {variant.displayName}
                                      {index !== product.variants.length - 1
                                        ? ", "
                                        : ""}
                                    </Text>
                                  );
                                })}
                              </BlockStack>
                            </BlockStack>
                          </InlineStack>
                        );
                      })}
                  </BlockStack>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="500">
                  <Text as={"h2"} variant="headingMd">
                    Discount Value
                  </Text>
                  <BlockStack gap="100">
                    <TextField
                      label=""
                      type="number"
                      value={discountValue}
                      prefix="%"
                      autoComplete="off"
                    />
                  </BlockStack>
                </BlockStack>
              </Card>
            </FormLayout>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="500">
                  <BlockStack gap="100">
                    <Text as={"h2"} variant="headingLg">
                      Summary
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as={"p"} variant="bold">
                      Type and Method
                    </Text>
                    <List type="bullet">
                      <List.Item>Automatic Discount</List.Item>
                      {discountType === "productsDiscount" && (
                        <List.Item>Discount on Selected Products</List.Item>
                      )}
                      {discountType === "orderDiscount" && (
                        <List.Item>Discount on Entire Order</List.Item>
                      )}
                    </List>
                  </BlockStack>
                  {discountValue != 0 && (
                    <BlockStack gap="100">
                      <Text as={"p"} variant="bold">
                        Discount Value
                      </Text>
                      <Text as={"p"} variant="regular">
                        {discountValue} %
                      </Text>
                    </BlockStack>
                  )}
                  {discountTags?.length > 0 && (
                    <BlockStack gap="200">
                      <Text as={"p"} variant="bold">
                        Applies to customers with discountTags:
                      </Text>
                      <InlineStack gap="200">
                        {discountTags?.map((option) => (
                          <Tag key={option}>{option}</Tag>
                        ))}
                      </InlineStack>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
              <InlineStack gap="200" align="end">
                <ButtonGroup>
                  <Button
                    onClick={() => {
                      open("shopify:admin/discounts", "_self");
                    }}
                  >
                    Go Back
                  </Button>
                </ButtonGroup>
              </InlineStack>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  