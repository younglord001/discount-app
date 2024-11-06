import {
    Card,
    Layout,
    List,
    Page,
    Text,
    BlockStack,
    ButtonGroup,
    Button,
    InlineStack,
    FormLayout,
    TextField,
    Tag,
    InlineGrid,
    Banner,
    Thumbnail,
    RadioButton,
    InlineError,
  } from "@shopify/polaris";
  import { authenticate } from "../shopify.server";
  import { useCallback, useEffect, useState } from "react";
  import { ImageIcon, PlusIcon } from "@shopify/polaris-icons";
  import { useSubmit, useActionData, useNavigation } from "@remix-run/react";
  import { json } from "@remix-run/node";
  
  export const loader = async ({ request }) => {
    await authenticate.admin(request);
  
    return null;
  };
  
  export const action = async ({ request, params }) => {
    // -------
    // 1. Authenticate the request, and get the admin client
    // -------
  
    const { admin } = await authenticate.admin(request);
  
    // -------
    // 2. Get the functionId from the params
    // -------
  
    const { functionId } = params;
  
    // -------
    // 3. Parse the form data
    // -------
  
    const formData = await request.formData();
  
    // -------
    // 4. Get the discount data from the form data
    // -------
  
    const {
      title,
      tags,
      discountValue,
      products,
      productsDetails,
      discountType,
    } = JSON.parse(formData.get("discount"));
  
    // -------
    // 5. Create the base discount configuration object
    // -------
  
    const baseDiscount = {
      functionId,
      title,
      startsAt: new Date(),
    };
  
    // -------
    // 6. Create the discount in the Shopify admin and get the response
    // -------
  
    const response = await admin.graphql(
      `mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
          userErrors {
            code
            message
            field
          }
        }
      }`,
      {
        variables: {
          automaticAppDiscount: {
            ...baseDiscount,
            metafields: [
              {
                namespace: "$app:customer-tag-discount",
                key: "function-configuration",
                type: "json",
                value: JSON.stringify({
                  discountMessage: title,
                  discountTags: tags,
                  discountValue: discountValue,
                  discountType: discountType,
                  discountProducts: products,
                  productsDetails: productsDetails,
                }),
              },
            ],
          },
        },
      },
    );
  
    const responseJson = await response?.json();
  
    // -------
    //  7. Get the errors and success from the response
    // -------
  
    const errors = responseJson?.data?.discountAutomaticAppCreate?.userErrors;
    const success = errors?.length === 0 ? true : false;
  
    // -------
    //  8. Return errors and success as JSON to the client
    // -------
  
    return json({ errors, success });
  };
  
  export default function CreateDiscount() {
    // -------
    // 1. Get the navigation object from the useNavigation hook, This will be used to check the form method and state in order to show the loading spinner when the form is submitting
    // -------
  
    const nav = useNavigation();
    const isLoading =
      ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";
  
    // -------
    // 2. Get the submit function from the useSubmit hook, this will be used to submit the form
    // -------
  
    const submit = useSubmit();
  
    // -------
    // 3. Get the action data from the useActionData hook, this will be used to display the errors if there are any, or redirect the user to the discounts page if the discount was created successfully
    // -------
  
    const actionData = useActionData();
  
    useEffect(() => {
      if (actionData?.success) {
        // https://shopify.dev/docs/api/app-bridge-library/apis/navigation - Learn more about App Bridge navigation
        open("shopify:admin/discounts", "_self");
      }
    }, [actionData, nav]);
  
    // -------
    // 4. Set the initial state of the form
    // -------
  
    const [tagInputValue, setTagInputValue] = useState("");
    const [formState, setFormState] = useState({
      title: "Enter Discount Title",
      tags: [],
      discountType: "orderDiscount",
      products: null,
      productsDetails: [],
      discountValue: "",
    });
  
    // -------
    // 5. Create handle funtions to update the form state when the user interacts with the form
    // -------
  
    // - handleProductsDiscountChange: updates the discount value
    const handleProductsDiscountChange = useCallback(
      (newValue) => {
        setFormState({ ...formState, discountValue: newValue });
      },
      [formState],
    );
  
    // - handleChangeMessage: updates the title
    const handleChangeMessage = useCallback(
      (newValue) => setFormState({ ...formState, title: newValue }),
      [formState],
    );
  
    // - handleRadioButtonsChange: updates the discount type
    const handleRadioButtonsChange = useCallback(
      (_, newValue) => {
        if (newValue === "orderDiscount") {
          setFormState({
            ...formState,
            products: null,
            productsDetails: [],
            discountType: newValue,
          });
        } else {
          setFormState({ ...formState, discountType: newValue });
        }
      },
      [formState],
    );
  
    // - handleRemoveTag: removes a tag from the tags array
    const handleRemoveTag = useCallback(
      (tag) => () => {
        setFormState({
          ...formState,
          tags: formState.tags.filter((item) => item !== tag),
        });
      },
      [formState],
    );
  
    // - handleAddTag: adds a tag to the tags array
    const handleAddTag = useCallback(() => {
      if (!tagInputValue || formState.tags.includes(tagInputValue)) {
        return;
      }
      setFormState({
        ...formState,
        tags: [...formState.tags, tagInputValue],
      });
  
      setTagInputValue("");
    }, [tagInputValue, formState]);
  
    // - handleSelectProduct: opens the Shopify resource picker to select products
    async function handleSelectProduct() {
      // a. Get the selected products ids
      const selectedIds = formState.productsDetails.map((product) => {
        return {
          id: product.id,
          variants: product.variants.map((variant) => {
            return {
              id: variant.id,
            };
          }),
        };
      });
  
      // b. Open the Shopify resource picker
      const products = await shopify.resourcePicker({
        multiple: true, // whether to allow multiple selection or not
        type: "product", // resource type, either 'product' or 'collection'
        action: "select", // customized action verb, either 'select' or 'add',
        selectionIds: selectedIds, // currentlySelected resources
      });
  
      // c. If the user selected products, update the form state with selected variant ids
      if (products) {
        const allVariantsIds = [];
        products.forEach((product) => {
          product.variants.forEach((variant) => {
            allVariantsIds.push(variant.id);
          });
        });
  
        if (allVariantsIds.length > 0) {
          setFormState({
            ...formState,
            products: allVariantsIds,
            productsDetails: products,
          });
        }
      }
    }
  
    // -------
    // 6. Handle the form submission
    // -------
  
    const handleFormSubmit = () => {
      const formData = new FormData();
      formData.append("discount", JSON.stringify(formState));
      submit(formData, { method: "post" });
    };
  
    // -------
    // 7. Return the UI
    // -------
  
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
          {actionData?.errors?.length > 0 ? (
            <Layout.Section>
              <Banner title="Error" tone="warning">
                <p>There were some when creating your Discount:</p>
                <ul>
                  {actionData?.errors?.map(({ message, field }, index) => {
                    return (
                      <li key={`${message}${index}`}>
                        {field.join(".")}: {message}
                      </li>
                    );
                  })}
                </ul>
              </Banner>
            </Layout.Section>
          ) : null}
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
                      value={formState.title}
                      onChange={handleChangeMessage}
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
                    Tags
                  </Text>
                  <BlockStack gap="100">
                    <Text as={"p"} variant="regular">
                      Enter Customer tag
                    </Text>
                    <InlineStack gap={200}>
                      <TextField
                        value={tagInputValue}
                        onChange={setTagInputValue}
                        autoComplete="off"
                        id="tagInput"
                      />
                      <Button icon={PlusIcon} onClick={handleAddTag}>
                        Add
                      </Button>
                    </InlineStack>
                    <InlineError
                      message={
                        formState.tags.includes(tagInputValue)
                          ? "Tag already added"
                          : null
                      }
                      fieldID="tagInput"
                    />
                  </BlockStack>
                  {formState.tags.length > 0 ? (
                    <InlineStack gap="200">
                      {formState.tags.map((option) => (
                        <Tag key={option} onRemove={handleRemoveTag(option)}>
                          {option}
                        </Tag>
                      ))}
                    </InlineStack>
                  ) : null}
                  {formState.tags.length != 0 && (
                    <Text as="p" fontWeight="regular">
                      Only Customer with at least one of these tags will get the
                      discount. discount.
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
                    {formState.productsDetails.length > 0 ? (
                      <Button variant="plain" onClick={handleSelectProduct}>
                        Change products
                      </Button>
                    ) : null}
                  </InlineStack>
                  <BlockStack gap="50">
                    <RadioButton
                      label="Order Discount"
                      checked={formState.discountType === "orderDiscount"}
                      id="orderDiscount"
                      name="discountType"
                      onChange={handleRadioButtonsChange}
                    />
                    <RadioButton
                      label="Products Discount"
                      id="productsDiscount"
                      name="discountType"
                      checked={formState.discountType === "productsDiscount"}
                      onChange={handleRadioButtonsChange}
                    />
                  </BlockStack>
                  <BlockStack gap="500">
                    {formState.productsDetails.length > 0 &&
                      formState.productsDetails.map((product) => {
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
                    {formState.discountType === "productsDiscount" &&
                      formState.productsDetails.length === 0 && (
                        <BlockStack gap="200">
                          <Button
                            onClick={handleSelectProduct}
                            id="select-product"
                          >
                            Select Products
                          </Button>
                        </BlockStack>
                      )}
                  </BlockStack>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="500">
                  <Text as={"h2"} variant="headingMd">
                    Discount Value
                  </Text>
  
                  <BlockStack gap="100">
                    <Text as={"p"} variant="regular">
                      Enter Discount Value 1-100
                    </Text>
                    <TextField
                      label=""
                      type="number"
                      value={formState.discountValue}
                      error={
                        (formState.discountValue <= 0 ||
                          formState.discountValue > 100) &&
                        formState.discountValue != ""
                          ? "Discount value must be between 1 and 100"
                          : null
                      }
                      prefix="%"
                      onChange={handleProductsDiscountChange}
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
                      {formState.discountType === "productsDiscount" && (
                        <List.Item>Discount on Selected Products</List.Item>
                      )}
                      {formState.discountType === "orderDiscount" && (
                        <List.Item>Discount on Entire Order</List.Item>
                      )}
                    </List>
                  </BlockStack>
                  {formState.discountValue != 0 && (
                    <BlockStack gap="100">
                      <Text as={"p"} variant="bold">
                        Discount Value
                      </Text>
                      <Text as={"p"} variant="regular">
                        {formState.discountValue} %
                      </Text>
                    </BlockStack>
                  )}
                  {formState?.tags.length > 0 && (
                    <BlockStack gap="200">
                      <Text as={"p"} variant="bold">
                        Applies to customers with tags:
                      </Text>
                      <InlineStack gap="200">
                        {formState.tags.map((option) => (
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
                    Discard
                  </Button>
                  <Button
                    loading={isLoading}
                    variant="primary"
                    onClick={() => handleFormSubmit()}
                  >
                    Save discount
                  </Button>
                </ButtonGroup>
              </InlineStack>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  