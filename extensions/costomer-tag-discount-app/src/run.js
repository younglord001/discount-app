import { DiscountApplicationStrategy } from "../generated/api";

const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

export function run(input) {
  if (!input?.cart?.buyerIdentity?.customer) {
    return EMPTY_DISCOUNT;
  }

  const customerTagFound = input.cart.buyerIdentity.customer.hasAnyTag;

  if (!customerTagFound) {
    return EMPTY_DISCOUNT;
  }

  //---

  // const discountType = "orderDiscount";
  // const discountProducts = [];
  // const discountValue = 10;
  // const discountMessage = "10% VIP or Loyal Customer Discount";

  // Get your parsed metafield object from function input
  const configuration = JSON.parse(
    input?.discountNode?.metafield?.value ?? "{}",
  );

  // Instead of using hardcoded values you will now use the ones passed in function input metafield
  const discountType = configuration.discountType;
  const discountProducts = configuration.discountProducts;
  const discountValue = configuration.discountValue;
  const discountMessage = configuration.discountMessage;

  console.log(discountType);
  console.log(discountProducts);
  console.log(discountValue);
  console.log(discountMessage);

  //---

  let targets = input.cart.lines
    .filter((line) => {
      return line.merchandise.__typename === "ProductVariant";
    })
    .map((line) => {
      return {
        productVariant: {
          id: line.merchandise.id,
        },
      };
    });

  if (discountType === "productsDiscount") {
    targets = targets.filter((target) => {
      return discountProducts.some((product) => {
        return product === target.productVariant.id;
      });
    });
  }

  if (targets == []) {
    return EMPTY_DISCOUNT;
  }

  const DISCOUNTED_ITEMS = {
    discountApplicationStrategy: DiscountApplicationStrategy.First,
    discounts: [
      {
        targets: targets,
        value: {
          percentage: {
            value: discountValue,
          },
        },
        message: discountMessage,
      },
    ],
  };

  return DISCOUNTED_ITEMS;
}
