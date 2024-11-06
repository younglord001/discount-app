import {
  Page,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Link,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};

export default function Index() {
  return (
    <Page>
      <Card>
        <BlockStack gap="500">
          <BlockStack gap="100">
            <InlineStack>
              <Text as={"h2"} variant="headingLg">
                Customer Tag Discount App
              </Text>
            </InlineStack>
            <InlineStack>
              <Text as={"p"}>
                Navigate to Store Discount page and create a new discount
              </Text>
            </InlineStack>
          </BlockStack>
          <Link target="_self" url={`shopify:admin/discounts`}>
            Go to Discounts
          </Link>
        </BlockStack>
      </Card>
    </Page>
  );
}
